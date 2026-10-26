import { Component, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { EMPTY, Subject, catchError, combineLatest, startWith, switchMap, tap } from 'rxjs';
import { ApiService } from '../../../../core/services/api.service';
import { AppError } from '../../../../core/interceptors/error-interceptor';
import { Project } from '../../../../core/models/project.model';
import { IconComponent } from '../../../../core/ui/icon.component';
import { ClientListQuery, LoadState, statusClass } from '../../tree-utils/tree-utils';

@Component({
  selector: 'app-project-list',
  imports: [RouterLink, IconComponent],
  templateUrl: './project-list.component.html',
})
export class ProjectListComponent {
  private api = inject(ApiService);
  private router = inject(Router);
  private listQuery = inject(ClientListQuery);
  private reload$ = new Subject<void>();

  readonly clientId = input.required<number>();
  readonly statusClass = statusClass;

  projects = signal<Project[]>([]);
  state = signal<LoadState>({ status: 'loading' });

  constructor() {
    combineLatest([toObservable(this.clientId), this.reload$.pipe(startWith(undefined))])
      .pipe(
        tap(() => this.state.set({ status: 'loading' })),
        switchMap(([clientId]) =>
          this.api.getProjects(clientId).pipe(
            tap(projects => {
              this.projects.set(projects);
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

  toClients() {
    this.router.navigate(['/tree'], { queryParams: this.listQuery.params() });
  }
}
