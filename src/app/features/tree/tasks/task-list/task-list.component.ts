import { Component, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { EMPTY, Subject, catchError, combineLatest, startWith, switchMap, tap } from 'rxjs';
import { ApiService } from '../../../../core/services/api.service';
import { AppError } from '../../../../core/interceptors/error-interceptor';
import { Task } from '../../../../core/models/task.model';
import { IconComponent } from '../../../../core/ui/icon.component';
import { LoadState, flattenTasks, statusClass } from '../../tree-utils/tree-utils';

@Component({
  selector: 'app-task-list',
  imports: [RouterLink, IconComponent],
  templateUrl: './task-list.component.html',
})
export class TaskListComponent {
  private api = inject(ApiService);
  private reload$ = new Subject<void>();

  readonly clientId = input.required<number>();
  readonly projectId = input.required<number>();
  readonly statusClass = statusClass;

  tasks = signal<Task[]>([]);
  state = signal<LoadState>({ status: 'loading' });
  rows = computed(() => flattenTasks(this.tasks()));

  constructor() {
    combineLatest([toObservable(this.projectId), this.reload$.pipe(startWith(undefined))])
      .pipe(
        tap(() => this.state.set({ status: 'loading' })),
        switchMap(([projectId]) =>
          this.api.getTasks(projectId).pipe(
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
}
