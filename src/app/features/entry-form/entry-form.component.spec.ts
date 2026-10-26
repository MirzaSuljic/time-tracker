import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { FormControl, FormGroup } from '@angular/forms';
import { EntryFormComponent, endAfterStart, findOverlap } from './entry-form.component';
import { TimeEntry } from '../../core/models/time-entry.model';

describe('EntryFormComponent', () => {
  it('should create', async () => {
    await TestBed.configureTestingModule({
      imports: [EntryFormComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    const fixture = TestBed.createComponent(EntryFormComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});

describe('endAfterStart', () => {
  const group = (start: string, end: string) =>
    new FormGroup({ start: new FormControl(start), end: new FormControl(end) });

  it('returns an error when end is not after start', () => {
    expect(endAfterStart(group('2026-10-23T10:00', '2026-10-23T09:00'))).toEqual({ endBeforeStart: true });
    expect(endAfterStart(group('2026-10-23T10:00', '2026-10-23T10:00'))).toEqual({ endBeforeStart: true });
  });

  it('returns null when end is after start', () => {
    expect(endAfterStart(group('2026-10-23T09:00', '2026-10-23T10:00'))).toBeNull();
  });
});

describe('findOverlap', () => {
  const entry = (id: number, start: string, end: string): TimeEntry => ({
    id, taskId: 1, comment: 'Work', start, end, createdAt: end, updatedAt: end,
  });
  const at = (time: string) => new Date(`2026-10-23T${time}:00`).getTime();
  const entries = [entry(43, '2026-10-23T08:00:00', '2026-10-23T09:15:00')];

  it('reports the overlapping entry and the overlap in minutes', () => {
    const result = findOverlap(entries, at('09:00'), at('10:30'), null);
    expect(result?.entry.id).toBe(43);
    expect(result?.minutes).toBe(15);
  });

  it('ignores the entry being edited and back-to-back entries', () => {
    expect(findOverlap(entries, at('09:00'), at('10:30'), 43)).toBeNull();
    expect(findOverlap(entries, at('09:15'), at('10:30'), null)).toBeNull();
  });
});
