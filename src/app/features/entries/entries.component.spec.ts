import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { EntriesComponent, groupByDay } from './entries.component';
import { TimeEntry } from '../../core/models/time-entry.model';

describe('EntriesComponent', () => {
  it('should create', async () => {
    await TestBed.configureTestingModule({
      imports: [EntriesComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    const fixture = TestBed.createComponent(EntriesComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});

describe('groupByDay', () => {
  const entry = (id: number, start: string, end: string): TimeEntry => ({
    id, taskId: 1, comment: 'Work', start, end, createdAt: end, updatedAt: end,
  });

  it('groups entries of the same day and sums their time', () => {
    const groups = groupByDay([
      entry(1, '2026-10-23T09:00:00', '2026-10-23T10:30:00'),
      entry(2, '2026-10-23T11:00:00', '2026-10-23T11:45:00'),
      entry(3, '2026-10-22T09:00:00', '2026-10-22T10:00:00'),
    ]);
    expect(groups.length).toBe(2);
    expect(groups[0].entries.length).toBe(2);
    expect(groups[0].total).toBe('2h 15m');
    expect(groups[1].total).toBe('1h');
  });
});
