const pad = (n: number) => String(n).padStart(2, '0');

export const localToIso = (v: string) => new Date(v).toISOString();

export function isoToLocal(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const nowLocal = (minusMinutes = 0) =>
  isoToLocal(new Date(Date.now() - minusMinutes * 60_000).toISOString());

export function shiftLocal(value: string, minutes: number): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return isoToLocal(new Date(d.getTime() + minutes * 60_000).toISOString());
}

export const nowTime = (minusMinutes = 0) => nowLocal(minusMinutes).slice(11, 16);

export function todayAt(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

export function timeMs(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return Number.isFinite(h) && Number.isFinite(m) ? (h * 60 + m) * 60_000 : NaN;
}

export function dayKey(iso: string): string {
  return isoToLocal(iso).slice(0, 10);
}

export function dayLabel(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '–';
  const totalMinutes = Math.round(ms / 60_000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (!h) return `${m}m`;
  return m ? `${h}h ${m}m` : `${h}h`;
}
