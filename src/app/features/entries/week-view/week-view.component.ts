import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EMPTY, Subject, catchError, combineLatest, distinctUntilChanged, map, merge, startWith, switchMap, tap } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { RecentTasks } from '../../../core/services/recent-tasks';
import { TimeEntry } from '../../../core/models/time-entry.model';
import { IconComponent } from '../../../core/ui/icon.component';
import {
  HOUR_PX,
  WeekBlock,
  WeekDay,
  WeekGap,
  addDays,
  buildWeek,
  clockLabel,
  hourRange,
  minutesLabel,
  parseDateKey,
  startOfWeek,
  toDateKey,
  toLocalInput,
} from './week-utils';

const COLORS = [
  'border-indigo-200 bg-indigo-50 text-indigo-950 hover:bg-indigo-100',
  'border-teal-200 bg-teal-50 text-teal-950 hover:bg-teal-100',
  'border-amber-200 bg-amber-50 text-amber-950 hover:bg-amber-100',
  'border-sky-200 bg-sky-50 text-sky-950 hover:bg-sky-100',
  'border-violet-200 bg-violet-50 text-violet-950 hover:bg-violet-100',
  'border-emerald-200 bg-emerald-50 text-emerald-950 hover:bg-emerald-100',
];
const SLOT_MINUTES = 30;
const NEW_ENTRY_MINUTES = 60;

@Component({
  selector: 'app-week-view',
  imports: [RouterLink, IconComponent],
  templateUrl: './week-view.component.html',
})
export class WeekViewComponent {
  private api = inject(ApiService);
  private recentTasks = inject(RecentTasks);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private reload$ = new Subject<void>();

  readonly hourPx = HOUR_PX;
  readonly gridLines = `repeating-linear-gradient(to bottom, #e2e8f0 0, #e2e8f0 1px, transparent 1px, transparent ${HOUR_PX}px)`;
  readonly clock = clockLabel;
  readonly minutes = minutesLabel;

  weekStart = signal(startOfWeek(new Date()));
  entries = signal<TimeEntry[]>([]);
  loading = signal(true);
  error = signal(false);
  truncated = signal(false);
  now = signal(new Date());

  days = computed(() => buildWeek(this.entries(), this.weekStart()));
  range = computed(() => hourRange(this.days()));
  gridHeight = computed(() => (this.range().to - this.range().from) * HOUR_PX);
  hours = computed(() => {
    const { from, to } = this.range();
    return Array.from({ length: to - from }, (_, i) => ({ top: i * HOUR_PX, label: clockLabel((from + i) * 60) }));
  });

  weekTotal = computed(() => minutesLabel(this.days().reduce((sum, d) => sum + d.totalMin, 0)));
  issues = computed(() => {
    const gaps = this.days().reduce((n, d) => n + d.gaps.length, 0);
    const overlaps = this.days().filter(d => d.overlapMin > 0).length;
    return { gaps, overlaps };
  });

  title = computed(() => {
    const start = this.weekStart();
    const end = addDays(start, 6);
    const sameMonth = start.getMonth() === end.getMonth();
    const first = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const last = end.toLocaleDateString('en-US', sameMonth ? { day: 'numeric' } : { month: 'short', day: 'numeric' });
    return `${first} – ${last}, ${end.getFullYear()}`;
  });

  todayKey = computed(() => toDateKey(this.now()));
  isCurrentWeek = computed(() => toDateKey(startOfWeek(this.now())) === toDateKey(this.weekStart()));
  nowTop = computed(() => {
    const n = this.now();
    const minutes = n.getHours() * 60 + n.getMinutes() - this.range().from * 60;
    return minutes >= 0 && minutes <= (this.range().to - this.range().from) * 60 ? (minutes * HOUR_PX) / 60 : null;
  });

  private recentById = computed(() => new Map(this.recentTasks.items().map(t => [t.id, t])));

  constructor() {
    const week$ = this.route.queryParamMap.pipe(
      map(q => toDateKey(startOfWeek(parseDateKey(q.get('week')) ?? new Date()))),
      distinctUntilChanged(),
    );
    const refresh$ = merge(this.reload$, this.api.entriesChanged$).pipe(startWith(undefined));

    combineLatest([week$, refresh$])
      .pipe(
        map(([key]) => parseDateKey(key)!),
        tap(week => {
          this.weekStart.set(week);
          this.loading.set(true);
          this.error.set(false);
        }),
        switchMap(week =>
          this.api.getWeekEntries(week).pipe(
            catchError(() => {
              this.error.set(true);
              this.loading.set(false);
              return EMPTY;
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe(result => {
        this.entries.set(result.items);
        this.truncated.set(result.truncated);
        this.loading.set(false);
      });

    const timer = setInterval(() => this.now.set(new Date()), 60_000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  retry() {
    this.reload$.next();
  }

  goWeek(offset: number) {
    this.setWeek(addDays(this.weekStart(), offset * 7));
  }

  goToday() {
    this.setWeek(null);
  }

  top(minutes: number) {
    return ((minutes - this.range().from * 60) * HOUR_PX) / 60;
  }

  height(start: number, end: number) {
    return ((end - start) * HOUR_PX) / 60;
  }

  left(b: WeekBlock) {
    return `calc(${(b.lane * 100) / b.lanes}% + 2px)`;
  }

  width(b: WeekBlock) {
    return `calc(${100 / b.lanes}% - 4px)`;
  }

  color(taskId: number) {
    return COLORS[Math.abs(taskId) % COLORS.length];
  }

  weekday(day: WeekDay, style: 'short' | 'long') {
    return day.date.toLocaleDateString('en-US', { weekday: style });
  }

  taskName(taskId: number): string {
    return this.api.taskNames()[taskId] ?? this.recentById().get(taskId)?.name ?? `Task #${taskId}`;
  }

  blockLabel(day: WeekDay, b: WeekBlock) {
    const date = day.date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    const warning = b.overlaps ? ', overlaps another entry' : '';
    return `${b.entry.comment}, ${this.taskName(b.entry.taskId)}, ${date}, ${clockLabel(b.startMin)} to ${clockLabel(b.endMin)}${warning}. Edit`;
  }

  gapLabel(day: WeekDay, g: WeekGap) {
    const date = day.date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    return `Not logged: ${date}, ${clockLabel(g.startMin)} to ${clockLabel(g.endMin)}. Add an entry`;
  }

  addAt(day: WeekDay, event: MouseEvent) {
    const column = event.currentTarget as HTMLElement;
    const y = event.clientY - column.getBoundingClientRect().top;
    const raw = this.range().from * 60 + (y / HOUR_PX) * 60;
    const start = Math.floor(raw / SLOT_MINUTES) * SLOT_MINUTES;
    this.openNew(day, start, Math.min(24 * 60, start + NEW_ENTRY_MINUTES));
  }

  fillGap(day: WeekDay, g: WeekGap) {
    this.openNew(day, g.startMin, g.endMin);
  }

  private openNew(day: WeekDay, startMin: number, endMin: number) {
    const at = (min: number) => {
      const d = new Date(day.date);
      d.setMinutes(min);
      return toLocalInput(d);
    };
    this.router.navigate(['new'], {
      relativeTo: this.route,
      queryParams: { start: at(startMin), end: at(endMin) },
      queryParamsHandling: 'merge',
    });
  }

  private setWeek(date: Date | null) {
    const week = date && !this.isSameWeek(date, this.now()) ? toDateKey(startOfWeek(date)) : null;
    this.router.navigate([], { relativeTo: this.route, queryParams: { week }, queryParamsHandling: 'merge' });
  }

  private isSameWeek(a: Date, b: Date) {
    return toDateKey(startOfWeek(a)) === toDateKey(startOfWeek(b));
  }
}
