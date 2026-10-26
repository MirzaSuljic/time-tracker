import { Injectable, signal } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { Observable, combineLatest, map } from 'rxjs';
import { Task } from '../../../core/models/task.model';

export interface LoadState {
  status: 'loading' | 'loaded' | 'error';
  message?: string;
}

export interface TreeParams {
  client: number | null;
  project: number | null;
  task: number | null;
}

export function treeParams(route: ActivatedRoute): Observable<TreeParams> {
  return combineLatest([(route.parent ?? route).paramMap, route.paramMap]).pipe(
    map(([parent, own]) => ({
      client: toId(parent.get('clientId') ?? own.get('clientId')),
      project: toId(own.get('projectId')),
      task: toId(own.get('taskId')),
    })),
  );
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

export function toId(value: string | null): number | null {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export function statusClass(status: string | undefined): string {
  const s = (status ?? '').toLowerCase();
  if (s === 'active') return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
  if (s.includes('progress')) return 'bg-amber-50 text-amber-800 ring-amber-200';
  if (s.includes('block')) return 'bg-red-50 text-red-700 ring-red-200';
  if (s.includes('done') || s.includes('complete')) return 'bg-indigo-50 text-indigo-700 ring-indigo-200';
  return 'bg-slate-100 text-slate-600 ring-slate-200';
}

@Injectable({ providedIn: 'root' })
export class ClientListQuery {
  readonly params = signal<Params>({});
}
