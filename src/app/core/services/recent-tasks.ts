import { Injectable, signal } from '@angular/core';

export interface RecentTask {
  id: number;
  name: string;
  path: string | null;
}

const KEY = 'time-tracker.recent-tasks';
const MAX = 5;

@Injectable({ providedIn: 'root' })
export class RecentTasks {
  readonly items = signal<RecentTask[]>(this.read());

  add(task: RecentTask) {
    const next = [task, ...this.items().filter(t => t.id !== task.id)].slice(0, MAX);
    this.items.set(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      return;
    }
  }

  clear() {
    this.items.set([]);
    try {
      localStorage.removeItem(KEY);
    } catch {
      return;
    }
  }

  private read(): RecentTask[] {
    try {
      const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]');
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter((t): t is RecentTask => typeof t?.id === 'number' && typeof t?.name === 'string')
        .slice(0, MAX);
    } catch {
      return [];
    }
  }
}
