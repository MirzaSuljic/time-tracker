import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../../../core/services/api.service';
import { TaskListComponent } from '../../tasks/task-list/task-list.component';
import { TreeParams, treeParams } from '../../tree-utils/tree-utils';

@Component({
  selector: 'app-project-details',
  imports: [TaskListComponent],
  templateUrl: './project-details.component.html',
})
export class ProjectDetailsComponent {
  private api = inject(ApiService);

  params = toSignal(treeParams(inject(ActivatedRoute)), {
    initialValue: { client: null, project: null, task: null } as TreeParams,
  });

  projectName = computed(() => {
    const id = this.params().project;
    return id ? (this.api.projectNames()[id] ?? `Project #${id}`) : '';
  });
}
