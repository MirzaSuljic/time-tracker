import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { EMPTY, Observable, Subject, catchError, expand, map, reduce, shareReplay, tap, throwError } from 'rxjs';
import { Client } from '../models/client.model';
import { Project } from '../models/project.model';
import { Task } from '../models/task.model';
import { TimeEntry, TimeEntryInput } from '../models/time-entry.model';
import { SILENT_ERRORS } from '../interceptors/error-interceptor';

const BASE = '/api/v1';

export type SortOrder = 'asc' | 'desc';
export type ClientSortField = 'name' | 'id' | 'status';
export type EntrySortField = 'id' | 'taskId' | 'comment' | 'start' | 'end' | 'createdAt';
const PAGE_SIZE = 50;
const WEEK_SCAN_LIMIT = 500;
const silent = () => ({ context: new HttpContext().set(SILENT_ERRORS, true) });

export interface WeekEntries {
  items: TimeEntry[];
  truncated: boolean;
}

interface TaskInfo {
  name: string;
  projectId?: number;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private cache = new Map<string, Observable<unknown>>();
  private changed = new Subject<void>();
  private clientInfo = signal<Record<number, string>>({});
  private clientData = signal<Record<number, Client>>({});
  private projectInfo = signal<Record<number, { name: string; clientId: number }>>({});
  private taskInfo = signal<Record<number, TaskInfo>>({});
  private projectCounts = signal<Record<number, number>>({});
  private entries = signal<TimeEntry[]>([]);

  readonly entriesChanged$ = this.changed.asObservable();
  readonly loadedEntries = this.entries.asReadonly();
  readonly clientNames = this.clientInfo.asReadonly();
  readonly knownClients = this.clientData.asReadonly();
  readonly projectsPerClient = this.projectCounts.asReadonly();
  readonly projectNames = computed(() => {
    const names: Record<number, string> = {};
    for (const [id, p] of Object.entries(this.projectInfo())) names[Number(id)] = p.name;
    return names;
  });
  readonly taskNames = computed(() => {
    const names: Record<number, string> = {};
    for (const [id, t] of Object.entries(this.taskInfo())) names[Number(id)] = t.name;
    return names;
  });

  getAll<T>(path: string): Observable<T[]> {
    const page = (offset: number) =>
      this.http
        .get<T[]>(`${BASE}${path}`, { params: { limit: PAGE_SIZE, offset } })
        .pipe(map(items => ({ items, offset })));
    return page(0).pipe(
      expand(({ items, offset }) => (items.length === PAGE_SIZE ? page(offset + items.length) : EMPTY)),
      map(({ items }) => items),
      reduce((all, items) => all.concat(items), [] as T[]),
    );
  }

  getClients() {
    return this.cached('clients', () => this.getAll<Client>('/clients').pipe(tap(c => this.rememberClients(c))));
  }

  getClientsPage(page: number, pageSize: number, sortBy?: ClientSortField, order: SortOrder = 'asc') {
    return this.cached(`clients:${page}:${pageSize}:${sortBy ?? ''}:${order}`, () =>
      this.http
        .get<Client[]>(`${BASE}/clients`, { params: this.listParams(page, pageSize, sortBy, order) })
        .pipe(
          tap(c => this.rememberClients(c)),
          map(items => ({ items: items.slice(0, pageSize), hasNext: items.length > pageSize })),
        ),
    );
  }

  getClient(id: number) {
    return this.cached(`client:${id}`, () =>
      this.http.get<Client>(`${BASE}/clients/${id}`, silent()).pipe(tap(c => this.rememberClients([c]))),
    );
  }

  getProjects(clientId: number) {
    return this.cached(`projects:${clientId}`, () =>
      this.getAll<Project>(`/clients/${clientId}/projects`).pipe(
        tap(projects => {
          this.projectInfo.update(m => {
            const next = { ...m };
            for (const p of projects) next[p.id] = { name: p.name, clientId: p.clientId ?? clientId };
            return next;
          });
          this.projectCounts.update(m => ({ ...m, [clientId]: projects.length }));
        }),
      ),
    );
  }

  getTasks(projectId: number) {
    return this.cached(`tasks:${projectId}`, () =>
      this.getAll<Task>(`/projects/${projectId}/tasks`).pipe(tap(tasks => this.rememberTasks(tasks, projectId))),
    );
  }

  getTask(id: number) {
    return this.cached(`task:${id}`, () =>
      this.http.get<Task>(`${BASE}/tasks/${id}`, silent()).pipe(tap(task => this.rememberTasks([task]))),
    );
  }

  taskPath(taskId: number): string | null {
    const projectId = this.taskInfo()[taskId]?.projectId;
    if (projectId === undefined) return null;
    const project = this.projectInfo()[projectId];
    if (!project) return null;
    const client = this.clientInfo()[project.clientId];
    return client ? `${client} › ${project.name}` : project.name;
  }

  getTimeEntries(page: number, pageSize: number, sortBy?: EntrySortField, order: SortOrder = 'asc') {
    return this.http
      .get<TimeEntry[]>(`${BASE}/time-entries`, { params: this.listParams(page, pageSize, sortBy, order) })
      .pipe(
        map(items => ({ items: items.slice(0, pageSize), hasNext: items.length > pageSize })),
        tap(result => this.entries.set(result.items)),
      );
  }

  getWeekEntries(weekStart: Date): Observable<WeekEntries> {
    const from = weekStart.getTime();
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const to = weekEnd.getTime();
    const page = (offset: number) =>
      this.http
        .get<TimeEntry[]>(`${BASE}/time-entries`, { params: { limit: PAGE_SIZE, offset, sortBy: 'start', order: 'desc' } })
        .pipe(map(items => ({ items, offset })));
    const reachesBack = (items: TimeEntry[]) => {
      const last = items.at(-1);
      return items.length === PAGE_SIZE && !!last && new Date(last.start).getTime() >= from;
    };

    return this.cached(`week:${from}`, () =>
      page(0).pipe(
        expand(({ items, offset }) =>
          reachesBack(items) && offset + PAGE_SIZE < WEEK_SCAN_LIMIT ? page(offset + PAGE_SIZE) : EMPTY,
        ),
        reduce(
          (acc, { items, offset }) => ({
            items: acc.items.concat(items),
            truncated: reachesBack(items) && offset + PAGE_SIZE >= WEEK_SCAN_LIMIT,
          }),
          { items: [] as TimeEntry[], truncated: false },
        ),
        map(r => ({
          items: r.items.filter(e => new Date(e.start).getTime() < to && new Date(e.end).getTime() > from),
          truncated: r.truncated,
        })),
      ),
    ).pipe(tap(r => this.entries.set(r.items)));
  }

  getTimeEntry(id: number) {
    return this.http.get<TimeEntry>(`${BASE}/time-entries/${id}`);
  }

  createTimeEntry(body: TimeEntryInput) {
    return this.http.post<TimeEntry>(`${BASE}/time-entries`, body).pipe(tap(() => this.entriesUpdated()));
  }

  updateTimeEntry(id: number, body: TimeEntryInput) {
    return this.http.put<TimeEntry>(`${BASE}/time-entries/${id}`, body).pipe(tap(() => this.entriesUpdated()));
  }

  deleteTimeEntry(id: number) {
    return this.http.delete(`${BASE}/time-entries/${id}`).pipe(tap(() => this.entriesUpdated()));
  }

  private entriesUpdated() {
    for (const key of [...this.cache.keys()]) if (key.startsWith('week:')) this.cache.delete(key);
    this.changed.next();
  }

  private listParams(page: number, pageSize: number, sortBy?: string, order: SortOrder = 'asc') {
    const params: Record<string, string | number> = { limit: pageSize + 1, offset: (page - 1) * pageSize, order };
    if (sortBy) params['sortBy'] = sortBy;
    return params;
  }

  private cached<T>(key: string, load: () => Observable<T>): Observable<T> {
    let request = this.cache.get(key) as Observable<T> | undefined;
    if (!request) {
      request = load().pipe(
        catchError(e => {
          this.cache.delete(key);
          return throwError(() => e);
        }),
        shareReplay(1),
      );
      this.cache.set(key, request);
    }
    return request;
  }

  private rememberClients(clients: Client[]) {
    this.clientInfo.update(m => {
      const next = { ...m };
      for (const c of clients) next[c.id] = c.name;
      return next;
    });
    this.clientData.update(m => {
      const next = { ...m };
      for (const c of clients) next[c.id] = c;
      return next;
    });
  }

  private rememberTasks(tasks: Task[], projectId?: number) {
    this.taskInfo.update(m => {
      const next = { ...m };
      for (const t of tasks) next[t.id] = { name: t.name, projectId: projectId ?? m[t.id]?.projectId };
      return next;
    });
  }
}
