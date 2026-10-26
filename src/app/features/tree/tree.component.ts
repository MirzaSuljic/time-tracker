import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { EMPTY, Subject, catchError, combineLatest, map, startWith, switchMap, tap } from 'rxjs';
import { ApiService, ClientSortField, SortOrder } from '../../core/services/api.service';
import { AppError } from '../../core/interceptors/error-interceptor';
import { Client } from '../../core/models/client.model';
import { IconComponent } from '../../core/ui/icon.component';
import { ClientListQuery, statusClass } from './tree-utils/tree-utils';

const SIZES = [10, 25, 50];
const SORT_FIELDS: ClientSortField[] = ['name', 'id', 'status'];

interface LoadState {
  status: 'loading' | 'loaded' | 'error';
  message?: string;
}

interface Query {
  page: number;
  size: number;
  sortBy: ClientSortField | null;
  order: SortOrder;
}

@Component({
  selector: 'app-tree',
  imports: [IconComponent],
  templateUrl: './tree.component.html',
})
export class TreeComponent {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private listQuery = inject(ClientListQuery);
  private reload$ = new Subject<void>();

  readonly sizes = SIZES;
  readonly statusClass = statusClass;
  readonly sortOptions: { value: ClientSortField; label: string }[] = [
    { value: 'name', label: 'Name' },
    { value: 'id', label: 'ID' },
    { value: 'status', label: 'Status' },
  ];

  page = signal(1);
  size = signal(10);
  sortBy = signal<ClientSortField | null>(null);
  order = signal<SortOrder>('asc');
  hasNext = signal(false);
  clients = signal<Client[]>([]);
  state = signal<LoadState>({ status: 'loading' });


  range = computed(() => {
    const from = (this.page() - 1) * this.size() + 1;
    return `${from}–${from + this.clients().length - 1}`;
  });

  constructor() {
    combineLatest([this.route.queryParamMap, this.reload$.pipe(startWith(undefined))])
      .pipe(
        map(([q]) => this.parse(q)),
        tap(q => {
          this.page.set(q.page);
          this.size.set(q.size);
          this.sortBy.set(q.sortBy);
          this.order.set(q.order);
          this.listQuery.params.set(this.route.snapshot.queryParams);
          this.state.set({ status: 'loading' });
        }),
        switchMap(q =>
          this.api.getClientsPage(q.page, q.size, q.sortBy ?? undefined, q.order).pipe(
            tap(result => {
              this.clients.set(result.items);
              this.hasNext.set(result.hasNext);
              this.state.set({ status: 'loaded' });
            }),
            catchError((e: AppError) => {
              this.state.set({ status: 'error', message: e.message });
              return EMPTY;
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe();
  }

  retry() {
    this.reload$.next();
  }

  hasProjects(client: Client) {
    return this.api.projectsPerClient()[client.id] !== 0;
  }

  openClient(client: Client) {
    this.router.navigate(['/tree', client.id]);
  }

  go(page: number, size = this.size()) {
    this.navigate({ page, size });
  }

  setSortBy(value: string) {
    this.navigate({ page: 1, sortBy: SORT_FIELDS.find(f => f === value) ?? null, order: this.order() });
  }

  setOrder(value: string) {
    this.navigate({ page: 1, order: value === 'desc' ? 'desc' : 'asc' });
  }

  private parse(q: ParamMap): Query {
    return {
      page: Math.max(1, Number(q.get('page')) || 1),
      size: SIZES.includes(Number(q.get('size'))) ? Number(q.get('size')) : 10,
      sortBy: SORT_FIELDS.find(f => f === q.get('sortBy')) ?? null,
      order: q.get('order') === 'desc' ? 'desc' : 'asc',
    };
  }

  private navigate(queryParams: Record<string, string | number | null>) {
    this.router.navigate([], { relativeTo: this.route, queryParams, queryParamsHandling: 'merge' });
  }
}
