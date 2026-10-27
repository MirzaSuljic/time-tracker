import { TestBed } from '@angular/core/testing';
import { HttpClient, HttpContext, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { SKIP_SPINNER, loadingInterceptor } from './loading-interceptor';
import { SpinnerService } from '../services/spinner.service';

describe('loadingInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let spinner: SpinnerService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([loadingInterceptor])), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
    spinner = TestBed.inject(SpinnerService);
  });

  it('counts a request while it runs, also when it fails', () => {
    http.get('/api/v1/clients').subscribe();
    http.get('/api/v1/tasks/1').subscribe({ error: () => undefined });
    expect(spinner.loading()).toBe(true);

    backend.expectOne('/api/v1/clients').flush([]);
    expect(spinner.loading()).toBe(true);
    backend.expectOne('/api/v1/tasks/1').flush('', { status: 404, statusText: 'Not Found' });
    expect(spinner.loading()).toBe(false);
  });

  it('ignores background requests', () => {
    http.get('/api/v1/tasks/2', { context: new HttpContext().set(SKIP_SPINNER, true) }).subscribe();
    expect(spinner.loading()).toBe(false);
    backend.expectOne('/api/v1/tasks/2').flush({});
  });
});
