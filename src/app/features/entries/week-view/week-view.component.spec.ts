import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { WeekViewComponent } from './week-view.component';

describe('WeekViewComponent', () => {
  it('loads the current week and shows seven days', async () => {
    await TestBed.configureTestingModule({
      imports: [WeekViewComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    const fixture = TestBed.createComponent(WeekViewComponent);
    fixture.detectChanges();
    TestBed.inject(HttpTestingController)
      .expectOne(r => r.url === '/api/v1/time-entries' && r.params.get('sortBy') === 'start')
      .flush([]);
    fixture.detectChanges();

    expect(fixture.componentInstance.loading()).toBe(false);
    expect(fixture.componentInstance.days().length).toBe(7);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Week');
  });
});
