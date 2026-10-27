import { TimeEntry } from '../../../core/models/time-entry.model';
import { formatDuration } from '../../../core/utils/dates';

export const HOUR_PX = 48;
export const MIN_GAP_MINUTES = 15;
const DEFAULT_FROM_HOUR = 7;
const DEFAULT_TO_HOUR = 19;

export interface WeekBlock {
  entry: TimeEntry;
  startMin: number;
  endMin: number;
  lane: number;
  lanes: number;
  overlaps: boolean;
}

export interface WeekGap {
  startMin: number;
  endMin: number;
}

export interface WeekDay {
  index: number;
  date: Date;
  key: string;
  blocks: WeekBlock[];
  gaps: WeekGap[];
  totalMin: number;
  overlapMin: number;
  gapMin: number;
}

interface Part {
  entry: TimeEntry;
  startMin: number;
  endMin: number;
}

const pad = (n: number) => String(n).padStart(2, '0');

export function startOfWeek(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function parseDateKey(value: string | null): Date | null {
  const m = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return toDateKey(d) === value ? d : null;
}

export function toLocalInput(date: Date): string {
  return `${toDateKey(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function clockLabel(minutes: number): string {
  return `${pad(Math.floor(minutes / 60))}:${pad(Math.round(minutes % 60))}`;
}

export function minutesLabel(minutes: number): string {
  return formatDuration(minutes * 60_000);
}

function merge(parts: Part[]): WeekGap[] {
  const merged: WeekGap[] = [];
  for (const p of parts) {
    const last = merged.at(-1);
    if (last && p.startMin <= last.endMin) last.endMin = Math.max(last.endMin, p.endMin);
    else merged.push({ startMin: p.startMin, endMin: p.endMin });
  }
  return merged;
}

function layout(parts: Part[]): WeekBlock[] {
  const blocks: WeekBlock[] = [];
  let cluster: WeekBlock[] = [];
  let laneEnds: number[] = [];
  let clusterEnd = -Infinity;

  const close = () => {
    for (const b of cluster) b.lanes = laneEnds.length;
    cluster = [];
    laneEnds = [];
  };

  for (const p of parts) {
    if (p.startMin >= clusterEnd) close();
    let lane = laneEnds.findIndex(end => end <= p.startMin);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(p.endMin);
    } else {
      laneEnds[lane] = p.endMin;
    }
    const block: WeekBlock = { ...p, lane, lanes: 1, overlaps: false };
    cluster.push(block);
    blocks.push(block);
    clusterEnd = Math.max(clusterEnd, p.endMin);
  }
  close();

  for (const b of blocks) {
    b.overlaps = blocks.some(o => o !== b && o.startMin < b.endMin && b.startMin < o.endMin);
  }
  return blocks;
}

export function buildWeek(entries: TimeEntry[], weekStart: Date): WeekDay[] {
  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(weekStart, index);
    const dayStart = date.getTime();
    const dayMinutes = (addDays(weekStart, index + 1).getTime() - dayStart) / 60_000;

    const parts: Part[] = entries
      .map(entry => ({
        entry,
        startMin: Math.max(0, (new Date(entry.start).getTime() - dayStart) / 60_000),
        endMin: Math.min(dayMinutes, (new Date(entry.end).getTime() - dayStart) / 60_000),
      }))
      .filter(p => p.endMin > p.startMin)
      .sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);

    const merged = merge(parts);
    const totalMin = parts.reduce((sum, p) => sum + p.endMin - p.startMin, 0);
    const coveredMin = merged.reduce((sum, m) => sum + m.endMin - m.startMin, 0);

    const gaps: WeekGap[] = [];
    for (let i = 1; i < merged.length; i++) {
      const gap = { startMin: merged[i - 1].endMin, endMin: merged[i].startMin };
      if (gap.endMin - gap.startMin >= MIN_GAP_MINUTES) gaps.push(gap);
    }

    return {
      index,
      date,
      key: toDateKey(date),
      blocks: layout(parts),
      gaps,
      totalMin,
      overlapMin: totalMin - coveredMin,
      gapMin: gaps.reduce((sum, g) => sum + g.endMin - g.startMin, 0),
    };
  });
}

export function hourRange(days: WeekDay[]): { from: number; to: number } {
  let from = DEFAULT_FROM_HOUR;
  let to = DEFAULT_TO_HOUR;
  for (const d of days) {
    for (const b of d.blocks) {
      from = Math.min(from, Math.floor(b.startMin / 60));
      to = Math.max(to, Math.ceil(b.endMin / 60));
    }
  }
  return { from: Math.max(0, from), to: Math.min(24, to) };
}
