import { Routes } from '@angular/router';
import { TreeComponent } from './features/tree/tree.component';
import { EntriesComponent } from './features/entries/entries.component';
import { EntryFormComponent } from './features/entry-form/entry-form.component';

export const routes: Routes = [
  { path: '', redirectTo: 'entries', pathMatch: 'full' },
  { path: 'tree', component: TreeComponent, title: 'Clients & projects · Time Tracker' },
  {
    path: 'entries',
    component: EntriesComponent,
    title: 'Time entries · Time Tracker',
    children: [
      { path: 'new', component: EntryFormComponent, title: 'New time entry · Time Tracker' },
      { path: ':id/edit', component: EntryFormComponent, title: 'Edit time entry · Time Tracker' },
    ],
  },
  { path: '**', redirectTo: 'entries' },
];
