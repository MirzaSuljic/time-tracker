import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink, RouterOutlet } from '@angular/router';
import { DatePipe } from '@angular/common';
import { EMPTY, Subject, catchError, combineLatest, map, merge, startWith, switchMap, tap } from 'rxjs';
import { ApiService, EntrySortField, SortOrder } from '../../core/services/api.service';
import { RecentTasks } from '../../core/services/recent-tasks';
import { AppError } from '../../core/interceptors/error-interceptor';
import { TimeEntry } from '../../core/models/time-entry.model';
import { dayKey, dayLabel, formatDuration } from '../../core/utils/dates';
import { IconComponent } from '../../core/ui/icon.component';
import { QuickAddComponent } from './quick-add.component';

const SIZES = [10, 25, 50];
const SORT_FIELDS: EntrySortField[] = ['id', 'taskId', 'comment', 'start', 'end', 'createdAt'];

export interface DayGroup {
  key: string;
  label: string;
  total: string;
  entries: TimeEntry[];
}

const durationMs = (e: TimeEntry) => Math.max(0, new Date(e.end).getTime() - new Date(e.start).getTime());

export function groupByDay(entries: TimeEntry[]): DayGroup[] {
  const groups: (DayGroup & { ms: number })[] = [];
  for (const e of entries) {
    const key = dayKey(e.start);
    let group = groups.at(-1);
    if (!group || group.key !== key) {
      group = { key, label: dayLabel(e.start), total: '', entries: [], ms: 0 };
      groups.push(group);
    }
    group.entries.push(e);
    group.ms += durationMs(e);
  }
  return groups.map(({ ms, ...g }) => ({ ...g, total: formatDuration(ms) }));
}

@Component({
  selector: 'app-entries',
  imports: [DatePipe, RouterLink, RouterOutlet, IconComponent, QuickAddComponent],
  templateUrl: './entries.component.html',
  host: { '(document:keydown.escape)': 'cancelDelete()' },
})
export class EntriesComponent {
  private api = inject(ApiService);
  private recentTasks = inject(RecentTasks);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private reload$ = new Subject<void>();
  private noticeTimer?: ReturnType<typeof setTimeout>;

  readonly sizes = SIZES;

  items = signal<TimeEntry[]>([]);
  hasNext = signal(false);
  loading = signal(true);
  error = signal('');
  page = signal(1);
  size = signal(10);
  sortBy = signal<EntrySortField | null>(null);
  order = signal<SortOrder>('asc');
  readonly sortOptions: { value: EntrySortField; label: string }[] = [
    { value: 'start', label: 'Start' },
    { value: 'end', label: 'End' },
    { value: 'createdAt', label: 'Created at' },
    { value: 'id', label: 'ID' },
    { value: 'taskId', label: 'Task ID' },
    { value: 'comment', label: 'Comment' },
  ];

  toDelete = signal<TimeEntry | null>(null);
  deleting = signal(false);
  deleteError = signal('');
  notice = signal('');

  groups = computed(() => groupByDay(this.items()));
  pageTotal = computed(() => formatDuration(this.items().reduce((sum, e) => sum + durationMs(e), 0)));

  range = computed(() => {
    const from = (this.page() - 1) * this.size() + 1;
    return `${from}–${from + this.items().length - 1}`;
  });

  private recentById = computed(() => new Map(this.recentTasks.items().map(t => [t.id, t])));

  constructor() {
    const refresh$ = merge(this.reload$, this.api.entriesChanged$).pipe(startWith(undefined));

    combineLatest([this.route.queryParamMap, refresh$])
      .pipe(
        map(([q]) => ({
          page: Math.max(1, Number(q.get('page')) || 1),
          size: SIZES.includes(Number(q.get('size'))) ? Number(q.get('size')) : 10,
          sortBy: SORT_FIELDS.find(f => f === q.get('sortBy')) ?? null,
          order: (q.get('order') === 'desc' ? 'desc' : 'asc') as SortOrder,
        })),
        tap(({ page, size, sortBy, order }) => {
          this.page.set(page);
          this.size.set(size);
          this.sortBy.set(sortBy);
          this.order.set(order);
          this.loading.set(true);
          this.error.set('');
        }),
        switchMap(({ page, size, sortBy, order }) =>
          this.api.getTimeEntries(page, size, sortBy ?? undefined, order).pipe(
            catchError((e: AppError) => {
              this.error.set(e.message);
              this.loading.set(false);
              return EMPTY;
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe(result => {
        this.items.set(result.items);
        this.hasNext.set(result.hasNext);
        this.loading.set(false);
      });

    inject(DestroyRef).onDestroy(() => clearTimeout(this.noticeTimer));
  }

  taskName(taskId: number) {
    return this.api.taskNames()[taskId] ?? this.recentById().get(taskId)?.name ?? null;
  }

  taskPath(taskId: number) {
    return this.api.taskPath(taskId) ?? this.recentById().get(taskId)?.path ?? null;
  }

  sameDay(e: TimeEntry) {
    return dayKey(e.start) === dayKey(e.end);
  }

  go(page: number, size = this.size()) {
    this.navigate({ page, size, sortBy: this.sortBy(), order: this.order() });
  }

  setSortBy(value: string) {
    const sortBy = SORT_FIELDS.find(f => f === value) ?? null;
    this.navigate({ page: 1, size: this.size(), sortBy, order: this.order() });
  }

  setOrder(value: string) {
    const order: SortOrder = value === 'desc' ? 'desc' : 'asc';
    this.navigate({ page: 1, size: this.size(), sortBy: this.sortBy(), order });
  }

  retry() {
    this.reload$.next();
  }

  duration(e: TimeEntry) {
    return formatDuration(durationMs(e));
  }

  askDelete(entry: TimeEntry) {
    this.deleteError.set('');
    this.toDelete.set(entry);
  }

  cancelDelete() {
    if (!this.deleting()) this.toDelete.set(null);
  }

  confirmDelete() {
    const entry = this.toDelete();
    if (!entry) return;
    this.deleting.set(true);
    this.api.deleteTimeEntry(entry.id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.toDelete.set(null);
        this.showNotice(`Entry #${entry.id} was deleted.`);
      },
      error: (e: AppError) => {
        this.deleting.set(false);
        this.deleteError.set(e.message);
      },
    });
  }

  private navigate(queryParams: Record<string, string | number | null>) {
    this.router.navigate([], { relativeTo: this.route, queryParams });
  }

  private showNotice(message: string) {
    this.notice.set(message);
    clearTimeout(this.noticeTimer);
    this.noticeTimer = setTimeout(() => this.notice.set(''), 4000);
  }
}
