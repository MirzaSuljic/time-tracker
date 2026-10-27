import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApiService } from './api.service';
import { TimeEntry } from '../models/time-entry.model';

const entry = (id: number, start = '2026-10-23T09:00:00.000Z', end = '2026-10-23T10:00:00.000Z'): TimeEntry => ({
  id,
  taskId: 1,
  comment: 'Work',
  start,
  end,
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

  it('reads entries newest first until it passes the start of the week', () => {
    const weekStart = new Date(2026, 9, 19);
    let result: { items: TimeEntry[]; truncated: boolean } | undefined;
    service.getWeekEntries(weekStart).subscribe(r => (result = r));

    const at = (day: number, hour: number) => new Date(2026, 9, day, hour).toISOString();
    const first = http.expectOne(r => r.url === '/api/v1/time-entries' && r.params.get('offset') === '0');
    expect(first.request.params.get('sortBy')).toBe('start');
    expect(first.request.params.get('order')).toBe('desc');
    const nextWeek = Array.from({ length: 49 }, (_, i) => entry(100 - i, at(27, 10), at(27, 11)));
    first.flush([...nextWeek, entry(51, at(21, 9), at(21, 10))]);

    http
      .expectOne(r => r.url === '/api/v1/time-entries' && r.params.get('offset') === '50')
      .flush([entry(50, at(20, 9), at(20, 10)), entry(49, at(17, 9), at(17, 10))]);

    expect(result?.items.map(e => e.id)).toEqual([51, 50]);
    expect(result?.truncated).toBe(false);
  });

  it('loads a week once and again after an entry changes', () => {
    const weekStart = new Date(2026, 9, 19);
    service.getWeekEntries(weekStart).subscribe();
    http.expectOne(r => r.url === '/api/v1/time-entries').flush([]);
    service.getWeekEntries(weekStart).subscribe();
    http.expectNone(r => r.url === '/api/v1/time-entries');

    service.deleteTimeEntry(1).subscribe();
    http.expectOne(r => r.method === 'DELETE').flush(null);
    service.getWeekEntries(weekStart).subscribe();
    http.expectOne(r => r.url === '/api/v1/time-entries').flush([]);
  });
});
