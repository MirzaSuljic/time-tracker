import { TimeEntry } from '../../../core/models/time-entry.model';
import { buildWeek, clockLabel, hourRange, parseDateKey, startOfWeek, toDateKey } from './week-utils';

const weekStart = new Date(2026, 9, 19);
const at = (day: number, time: string) => {
  const [h, m] = time.split(':').map(Number);
  return new Date(2026, 9, day, h, m).toISOString();
};
const entry = (id: number, day: number, start: string, end: string): TimeEntry => ({
  id,
  taskId: id,
  comment: 'Work ' + id,
  start: at(day, start),
  end: at(day, end),
  createdAt: at(day, end),
  updatedAt: at(day, end),
});

describe('week dates', () => {
  it('starts the week on Monday', () => {
    expect(toDateKey(startOfWeek(new Date(2026, 9, 21)))).toBe('2026-10-19');
    expect(toDateKey(startOfWeek(new Date(2026, 9, 25)))).toBe('2026-10-19');
    expect(toDateKey(startOfWeek(new Date(2026, 9, 19)))).toBe('2026-10-19');
  });

  it('accepts only real dates in the url', () => {
    expect(parseDateKey('2026-10-19')).toEqual(new Date(2026, 9, 19));
    expect(parseDateKey('2026-02-30')).toBeNull();
    expect(parseDateKey('next week')).toBeNull();
    expect(parseDateKey(null)).toBeNull();
  });
});

describe('buildWeek', () => {
  it('puts entries on their day with totals', () => {
    const days = buildWeek([entry(1, 19, '08:00', '10:30'), entry(2, 20, '09:00', '10:00')], weekStart);
    expect(days.length).toBe(7);
    expect(days[0].blocks.map(b => b.entry.id)).toEqual([1]);
    expect(days[0].totalMin).toBe(150);
    expect(days[1].totalMin).toBe(60);
    expect(days[6].blocks).toEqual([]);
  });

  it('marks gaps of 15 minutes or more between entries', () => {
    const [mon] = buildWeek(
      [entry(1, 19, '08:00', '10:00'), entry(2, 19, '10:10', '12:00'), entry(3, 19, '13:00', '14:00')],
      weekStart,
    );
    expect(mon.gaps).toEqual([{ startMin: 12 * 60, endMin: 13 * 60 }]);
    expect(mon.gapMin).toBe(60);
  });

  it('places overlapping entries side by side and counts the overlap', () => {
    const [mon] = buildWeek([entry(1, 19, '08:00', '10:00'), entry(2, 19, '09:30', '11:00'), entry(3, 19, '12:00', '13:00')], weekStart);
    const [a, b, c] = mon.blocks;
    expect([a.lane, a.lanes, a.overlaps]).toEqual([0, 2, true]);
    expect([b.lane, b.lanes, b.overlaps]).toEqual([1, 2, true]);
    expect([c.lane, c.lanes, c.overlaps]).toEqual([0, 1, false]);
    expect(mon.overlapMin).toBe(30);
    expect(mon.gaps).toEqual([{ startMin: 11 * 60, endMin: 12 * 60 }]);
  });

  it('splits an entry that runs past midnight', () => {
    const late: TimeEntry = { ...entry(1, 19, '22:00', '23:00'), end: at(20, '01:00') };
    const days = buildWeek([late], weekStart);
    expect(days[0].totalMin).toBe(120);
    expect(days[1].totalMin).toBe(60);
  });
});

describe('hourRange', () => {
  it('shows 07–19 by default and grows to fit early or late entries', () => {
    expect(hourRange(buildWeek([], weekStart))).toEqual({ from: 7, to: 19 });
    expect(hourRange(buildWeek([entry(1, 19, '06:15', '07:00'), entry(2, 20, '18:00', '20:30')], weekStart))).toEqual({ from: 6, to: 21 });
  });

  it('formats clock times', () => {
    expect(clockLabel(9 * 60 + 5)).toBe('09:05');
  });
});
