import { Component, computed, inject } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { EMPTY, catchError, distinctUntilChanged, filter, map, switchMap } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { IconComponent } from '../../../core/ui/icon.component';
import { ProjectListComponent } from '../projects/project-list/project-list.component';
import { ClientListQuery, toId } from '../tree-utils/tree-utils';

type Level = 'projects' | 'tasks' | 'task';

interface Ids {
  client: number | null;
  project: number | null;
  task: number | null;
}

@Component({
  selector: 'app-tree-details',
  imports: [RouterOutlet, IconComponent, ProjectListComponent],
  templateUrl: './tree-details.component.html',
})
export class TreeDetailsComponent {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private listQuery = inject(ClientListQuery);

  private ids = toSignal(
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      map(() => this.readIds()),
    ),
    { initialValue: this.readIds() },
  );

  clientId = computed(() => this.ids().client);
  projectId = computed(() => this.ids().project);
  taskId = computed(() => this.ids().task);

  level = computed<Level>(() => (this.taskId() ? 'task' : this.projectId() ? 'tasks' : 'projects'));

  clientName = computed(() => {
    const id = this.clientId();
    return id ? (this.api.clientNames()[id] ?? `Client #${id}`) : '';
  });

  clientDescription = computed(() => {
    const id = this.clientId();
    return id ? (this.api.knownClients()[id]?.description ?? '') : '';
  });

  projectName = computed(() => {
    const id = this.projectId();
    return id ? (this.api.projectNames()[id] ?? `Project #${id}`) : '';
  });

  taskName = computed(() => {
    const id = this.taskId();
    return id ? (this.api.taskNames()[id] ?? `Task #${id}`) : '';
  });

  backLabel = computed(() => {
    switch (this.level()) {
      case 'task':
        return 'Back to tasks';
      case 'tasks':
        return 'Back to projects';
      default:
        return 'All clients';
    }
  });

  constructor() {
    toObservable(this.clientId)
      .pipe(
        filter((id): id is number => id !== null),
        distinctUntilChanged(),
        switchMap(id => {
          if (!this.api.knownClients()[id]) this.api.getClient(id).subscribe({ error: () => undefined });
          return this.api.getProjects(id).pipe(catchError(() => EMPTY));
        }),
        takeUntilDestroyed(),
      )
      .subscribe();
  }

  back() {
    if (this.level() === 'task') this.toProject();
    else if (this.level() === 'tasks') this.toProjects();
    else this.toClients();
  }

  toClients() {
    this.router.navigate(['/tree'], { queryParams: this.listQuery.params() });
  }

  toProjects() {
    this.router.navigate(['/tree', this.clientId()]);
  }

  toProject() {
    this.router.navigate(['/tree', this.clientId(), 'projects', this.projectId()]);
  }

  private readIds(): Ids {
    const child = this.route.firstChild?.snapshot?.paramMap;
    return {
      client: toId(this.route.snapshot?.paramMap.get('clientId') ?? null),
      project: toId(child?.get('projectId') ?? null),
      task: toId(child?.get('taskId') ?? null),
    };
  }
}
