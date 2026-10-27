import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink, RouterOutlet } from '@angular/router';
import { DatePipe } from '@angular/common';
import { EMPTY, Subject, catchError, combineLatest, map, merge, startWith, switchMap, take, tap } from 'rxjs';
import { ApiService, EntrySortField, SortOrder } from '../../core/services/api.service';
import { RecentTasks } from '../../core/services/recent-tasks';
import { ModalService } from '../../core/services/modal.service';
import { ModalActionButton } from '../../core/models/modal.model';
import { AppError } from '../../core/interceptors/error-interceptor';
import { TimeEntry } from '../../core/models/time-entry.model';
import { dayKey, dayLabel, formatDuration } from '../../core/utils/dates';
import { IconComponent } from '../../core/ui/icon.component';
import { QuickAddComponent } from './quick-add.component';
import { WeekViewComponent } from './week-view/week-view.component';

const SIZES = [10, 25, 50];

export type EntriesView = 'list' | 'week';
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
  imports: [DatePipe, RouterLink, RouterOutlet, IconComponent, QuickAddComponent, WeekViewComponent],
  templateUrl: './entries.component.html',
})
export class EntriesComponent {
  private api = inject(ApiService);
  private recentTasks = inject(RecentTasks);
  private modalService = inject(ModalService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private reload$ = new Subject<void>();
  private noticeTimer?: ReturnType<typeof setTimeout>;

  readonly sizes = SIZES;

  view = signal<EntriesView>('list');
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

  deleting = signal<number | null>(null);
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
          view: (q.get('view') === 'week' ? 'week' : 'list') as EntriesView,
          page: Math.max(1, Number(q.get('page')) || 1),
          size: SIZES.includes(Number(q.get('size'))) ? Number(q.get('size')) : 10,
          sortBy: SORT_FIELDS.find(f => f === q.get('sortBy')) ?? null,
          order: (q.get('order') === 'desc' ? 'desc' : 'asc') as SortOrder,
        })),
        tap(({ view, page, size, sortBy, order }) => {
          this.view.set(view);
          this.page.set(page);
          this.size.set(size);
          this.sortBy.set(sortBy);
          this.order.set(order);
          this.loading.set(true);
          this.error.set('');
        }),
        switchMap(({ view, page, size, sortBy, order }) => {
          if (view === 'week') {
            this.loading.set(false);
            return EMPTY;
          }
          return this.api.getTimeEntries(page, size, sortBy ?? undefined, order).pipe(
            catchError((e: AppError) => {
              this.error.set(e.message);
              this.loading.set(false);
              return EMPTY;
            }),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe(result => {
        this.items.set(result.items);
        this.hasNext.set(result.hasNext);
        this.loading.set(false);
      });

    inject(DestroyRef).onDestroy(() => clearTimeout(this.noticeTimer));
  }

  taskName(taskId: number): string | null {
    return this.api.taskNames()[taskId] ?? this.recentById().get(taskId)?.name ?? null;
  }

  taskPath(taskId: number): string | null {
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

  setView(view: EntriesView) {
    if (view === this.view()) return;
    if (view === 'week') this.router.navigate([], { relativeTo: this.route, queryParams: { view: 'week' } });
    else this.navigate({ page: 1, size: this.size(), sortBy: this.sortBy(), order: this.order() });
  }

  retry() {
    this.reload$.next();
  }

  duration(e: TimeEntry) {
    return formatDuration(durationMs(e));
  }

  askDelete(entry: TimeEntry) {
    this.modalService.getData({
      title: `Delete entry #${entry.id}?`,
      content: `"${entry.comment}" (${this.duration(entry)}) will be removed. This cannot be undone.`,
      tone: 'info',
      buttons: [
        { title: 'Cancel', action: ModalActionButton.Cancel },
        { title: 'Delete entry', action: ModalActionButton.Confirm, danger: true },
      ],
    });
    this.modalService.open();
    this.modalService.confirmAction$.pipe(take(1)).subscribe(() => this.remove(entry));
  }

  private remove(entry: TimeEntry) {
    this.deleting.set(entry.id);
    this.api.deleteTimeEntry(entry.id).subscribe({
      next: () => {
        this.deleting.set(null);
        this.showNotice(`Entry #${entry.id} was deleted.`);
      },
      error: () => this.deleting.set(null),
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
