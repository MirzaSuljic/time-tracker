import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { EMPTY, Subject, catchError, combineLatest, startWith, switchMap, tap } from 'rxjs';
import { ApiService } from '../../../../core/services/api.service';
import { AppError } from '../../../../core/interceptors/error-interceptor';
import { Task } from '../../../../core/models/task.model';
import { IconComponent } from '../../../../core/ui/icon.component';
import { LoadState, TreeParams, statusClass, treeParams } from '../../tree-utils/tree-utils';

@Component({
  selector: 'app-task-details',
  imports: [RouterLink, IconComponent],
  templateUrl: './task-details.component.html',
})
export class TaskDetailsComponent {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private reload$ = new Subject<void>();

  readonly statusClass = statusClass;

  params = signal<TreeParams>({ client: null, project: null, task: null });
  tasks = signal<Task[]>([]);
  state = signal<LoadState>({ status: 'loading' });

  task = computed(() => this.tasks().find(t => t.id === this.params().task) ?? null);

  parent = computed(() => {
    const task = this.task();
    if (!task || !task.parent || task.parent === task.id) return null;
    return this.tasks().find(t => t.id === task.parent) ?? null;
  });

  subTasks = computed(() => {
    const task = this.task();
    return task ? this.tasks().filter(t => t.parent === task.id && t.id !== task.id) : [];
  });

  projectName = computed(() => {
    const id = this.params().project;
    return id ? (this.api.projectNames()[id] ?? `Project #${id}`) : '';
  });

  constructor() {
    combineLatest([treeParams(this.route), this.reload$.pipe(startWith(undefined))])
      .pipe(
        tap(([p]) => {
          this.params.set(p);
          this.state.set({ status: 'loading' });
        }),
        switchMap(([p]) =>
          p.project === null
            ? EMPTY
            : this.api.getTasks(p.project).pipe(
                tap(tasks => {
                  this.tasks.set(tasks);
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

  taskLink(id: number) {
    const p = this.params();
    return ['/tree', p.client, 'projects', p.project, 'tasks', id];
  }

  projectLink() {
    const p = this.params();
    return ['/tree', p.client, 'projects', p.project];
  }
}
