import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApiService } from './api.service';
import { TimeEntry } from '../models/time-entry.model';

const entry = (id: number): TimeEntry => ({
  id,
  taskId: 1,
  comment: 'Work',
  start: '2026-10-23T09:00:00.000Z',
  end: '2026-10-23T10:00:00.000Z',
  createdAt: '2026-10-23T10:00:00.000Z',
  updatedAt: '2026-10-23T10:00:00.000Z',
});

describe('ApiService', () => {
  let service: ApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(ApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('asks for one extra entry and reports a next page', () => {
    let result: { items: TimeEntry[]; hasNext: boolean } | undefined;
    service.getTimeEntries(2, 10).subscribe(r => (result = r));

    const req = http.expectOne(r => r.url === '/api/v1/time-entries');
    expect(req.request.params.get('limit')).toBe('11');
    expect(req.request.params.get('offset')).toBe('10');
    expect(req.request.params.has('sortBy')).toBe(false);
    expect(req.request.params.get('order')).toBe('asc');
    req.flush(Array.from({ length: 11 }, (_, i) => entry(i + 1)));

    expect(result?.items.length).toBe(10);
    expect(result?.hasNext).toBe(true);
  });

  it('sends sortBy only when a sort field is chosen', () => {
    service.getTimeEntries(1, 10, 'createdAt', 'desc').subscribe();

    const req = http.expectOne(r => r.url === '/api/v1/time-entries');
    expect(req.request.params.get('sortBy')).toBe('createdAt');
    expect(req.request.params.get('order')).toBe('desc');
    req.flush([]);
  });

  it('shares one request for the same client list', () => {
    service.getClients().subscribe();
    service.getClients().subscribe();
    http.expectOne(r => r.url === '/api/v1/clients').flush([]);
  });
});
