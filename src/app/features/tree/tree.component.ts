import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, ParamMap, Router, RouterLink } from '@angular/router';
import { EMPTY, Observable, Subject, catchError, combineLatest, map, startWith, switchMap, tap } from 'rxjs';
import { ApiService, ClientSortField, SortOrder } from '../../core/services/api.service';
import { AppError } from '../../core/interceptors/error-interceptor';
import { Client } from '../../core/models/client.model';
import { Project } from '../../core/models/project.model';
import { Task } from '../../core/models/task.model';
import { IconComponent } from '../../core/ui/icon.component';

const SIZES = [10, 25, 50];
const SORT_FIELDS: ClientSortField[] = ['name', 'id', 'status'];

type View = 'clients' | 'projects' | 'tasks';

interface LoadState {
  status: 'loading' | 'loaded' | 'error';
  message?: string;
}

interface Query {
  page: number;
  size: number;
  sortBy: ClientSortField | null;
  order: SortOrder;
  client: number | null;
  project: number | null;
}

export interface TaskRow {
  task: Task;
  depth: number;
}

export function flattenTasks(tasks: Task[]): TaskRow[] {
  const ids = new Set(tasks.map(t => t.id));
  const children = new Map<number, Task[]>();
  const roots: Task[] = [];
  for (const t of tasks) {
    if (t.parent && t.parent !== t.id && ids.has(t.parent)) {
      children.set(t.parent, [...(children.get(t.parent) ?? []), t]);
    } else {
      roots.push(t);
    }
  }
  const rows: TaskRow[] = [];
  const seen = new Set<number>();
  const walk = (list: Task[], depth: number) => {
    for (const t of list) {
      if (seen.has(t.id)) continue;
      seen.add(t.id);
      rows.push({ task: t, depth });
      walk(children.get(t.id) ?? [], depth + 1);
    }
  };
  walk(roots, 0);
  return rows;
}

function toId(value: string | null): number | null {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

@Component({
  selector: 'app-tree',
  imports: [RouterLink, IconComponent],
  templateUrl: './tree.component.html',
})
export class TreeComponent {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private reload$ = new Subject<void>();

  readonly sizes = SIZES;
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
  clientId = signal<number | null>(null);
  projectId = signal<number | null>(null);

  clients = signal<Client[]>([]);
  projects = signal<Project[]>([]);
  tasks = signal<Task[]>([]);
  state = signal<LoadState>({ status: 'loading' });

  view = computed<View>(() => (this.projectId() ? 'tasks' : this.clientId() ? 'projects' : 'clients'));
  taskRows = computed(() => flattenTasks(this.tasks()));

  clientName = computed(() => {
    const id = this.clientId();
    return id ? (this.api.clientNames()[id] ?? `Client #${id}`) : '';
  });

  projectName = computed(() => {
    const id = this.projectId();
    if (!id) return '';
    return this.projects().find(p => p.id === id)?.name ?? `Project #${id}`;
  });

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
          this.clientId.set(q.client);
          this.projectId.set(q.project);
          this.state.set({ status: 'loading' });
        }),
        switchMap(q => this.load(q)),
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
    this.navigate({ client: client.id, project: null });
  }

  openProject(project: Project) {
    this.navigate({ project: project.id });
  }

  toClients() {
    this.navigate({ client: null, project: null });
  }

  toProjects() {
    this.navigate({ project: null });
  }

  back() {
    if (this.view() === 'tasks') this.toProjects();
    else this.toClients();
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

  statusClass(status: string | undefined): string {
    const s = (status ?? '').toLowerCase();
    if (s === 'active') return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
    if (s.includes('progress')) return 'bg-amber-50 text-amber-800 ring-amber-200';
    if (s.includes('block')) return 'bg-red-50 text-red-700 ring-red-200';
    if (s.includes('done') || s.includes('complete')) return 'bg-indigo-50 text-indigo-700 ring-indigo-200';
    return 'bg-slate-100 text-slate-600 ring-slate-200';
  }

  private parse(q: ParamMap): Query {
    const client = toId(q.get('client'));
    return {
      page: Math.max(1, Number(q.get('page')) || 1),
      size: SIZES.includes(Number(q.get('size'))) ? Number(q.get('size')) : 10,
      sortBy: SORT_FIELDS.find(f => f === q.get('sortBy')) ?? null,
      order: q.get('order') === 'desc' ? 'desc' : 'asc',
      client,
      project: client ? toId(q.get('project')) : null,
    };
  }

  private load(q: Query): Observable<unknown> {
    const fail = catchError((e: AppError) => {
      this.state.set({ status: 'error', message: e.message });
      return EMPTY;
    });

    if (q.client && !this.api.clientNames()[q.client]) {
      this.api.getClient(q.client).subscribe({ error: () => undefined });
    }

    if (q.client && q.project) {
      return combineLatest([this.api.getProjects(q.client), this.api.getTasks(q.project)]).pipe(
        tap(([projects, tasks]) => {
          this.projects.set(projects);
          this.tasks.set(tasks);
          this.state.set({ status: 'loaded' });
        }),
        fail,
      );
    }

    if (q.client) {
      return this.api.getProjects(q.client).pipe(
        tap(projects => {
          this.projects.set(projects);
          this.state.set({ status: 'loaded' });
        }),
        fail,
      );
    }

    return this.api.getClientsPage(q.page, q.size, q.sortBy ?? undefined, q.order).pipe(
      tap(result => {
        this.clients.set(result.items);
        this.hasNext.set(result.hasNext);
        this.state.set({ status: 'loaded' });
      }),
      fail,
    );
  }

  private navigate(queryParams: Record<string, string | number | null>) {
    this.router.navigate([], { relativeTo: this.route, queryParams, queryParamsHandling: 'merge' });
  }
}
