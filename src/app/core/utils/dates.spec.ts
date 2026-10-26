import { formatDuration, isoToLocal, localToIso, shiftLocal, timeMs } from './dates';

describe('dates', () => {
  it('round-trips a datetime-local value through ISO 8601', () => {
    expect(isoToLocal(localToIso('2026-10-23T09:30'))).toBe('2026-10-23T09:30');
  });

  it('formats durations', () => {
    expect(formatDuration(8_100_000)).toBe('2h 15m');
    expect(formatDuration(2 * 3_600_000)).toBe('2h');
    expect(formatDuration(45 * 60_000)).toBe('45m');
    expect(formatDuration(-1)).toBe('–');
  });

  it('shifts a local value by minutes', () => {
    expect(shiftLocal('2026-10-23T09:50', 15)).toBe('2026-10-23T10:05');
    expect(shiftLocal('2026-10-23T09:50', -15)).toBe('2026-10-23T09:35');
  });

  it('turns HH:mm into milliseconds', () => {
    expect(timeMs('01:30')).toBe(90 * 60_000);
  });
});
