import { Routes } from '@angular/router';
import { TreeComponent } from './features/tree/tree.component';
import { TreeDetailsComponent } from './features/tree/tree-details/tree-details.component';
import { ProjectDetailsComponent } from './features/tree/projects/project-details/project-details.component';
import { TaskDetailsComponent } from './features/tree/tasks/task-details/task-details.component';
import { EntriesComponent } from './features/entries/entries.component';
import { EntryFormComponent } from './features/entry-form/entry-form.component';
import { LoginComponent } from './features/login/login.component';
import { authGuard, guestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'tree', pathMatch: 'full' },
  { path: 'login', component: LoginComponent, canActivate: [guestGuard], title: 'Sign in · Time Tracker' },
  { path: 'tree', component: TreeComponent, canActivate: [authGuard], title: 'Clients & projects · Time Tracker' },
  {
    path: 'tree/:clientId',
    component: TreeDetailsComponent,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', children: [], title: 'Projects · Time Tracker' },
      { path: 'projects/:projectId', component: ProjectDetailsComponent, title: 'Tasks · Time Tracker' },
      { path: 'projects/:projectId/tasks/:taskId', component: TaskDetailsComponent, title: 'Task · Time Tracker' },
    ],
  },
  {
    path: 'entries',
    component: EntriesComponent,
    canActivate: [authGuard],
    title: 'Time entries · Time Tracker',
    children: [
      { path: 'new', component: EntryFormComponent, title: 'New time entry · Time Tracker' },
      { path: ':id/edit', component: EntryFormComponent, title: 'Edit time entry · Time Tracker' },
    ],
  },
  { path: '**', redirectTo: 'tree' },
];
