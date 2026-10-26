import { Component, ElementRef, OnInit, afterNextRender, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { map } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { RecentTask, RecentTasks } from '../../core/services/recent-tasks';
import { AppError } from '../../core/interceptors/error-interceptor';
import { Client } from '../../core/models/client.model';
import { Project } from '../../core/models/project.model';
import { Task } from '../../core/models/task.model';
import { TimeEntry, TimeEntryInput } from '../../core/models/time-entry.model';
import { formatDuration, isoToLocal, localToIso, nowLocal, shiftLocal } from '../../core/utils/dates';
import { IconComponent } from '../../core/ui/icon.component';

const LONG_ENTRY_HOURS = 12;

export function endAfterStart(group: AbstractControl): ValidationErrors | null {
  const { start, end } = group.value;
  return start && end && new Date(end) <= new Date(start) ? { endBeforeStart: true } : null;
}

export function findOverlap(entries: TimeEntry[], startMs: number, endMs: number, ignoreId: number | null) {
  for (const e of entries) {
    if (e.id === ignoreId) continue;
    const s = new Date(e.start).getTime();
    const f = new Date(e.end).getTime();
    const minutes = Math.round((Math.min(f, endMs) - Math.max(s, startMs)) / 60_000);
    if (minutes > 0) return { entry: e, minutes };
  }
  return null;
}

type Field = 'taskId' | 'comment' | 'start' | 'end';

@Component({
  selector: 'app-entry-form',
  imports: [ReactiveFormsModule, DatePipe, IconComponent],
  templateUrl: './entry-form.component.html',
  host: { '(document:keydown.escape)': 'close()' },
})
export class EntryFormComponent implements OnInit {
  private api = inject(ApiService);
  private recentTasks = inject(RecentTasks);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private panel = viewChild<ElementRef<HTMLElement>>('panel');

  entryId: number | null = null;

  form = this.fb.nonNullable.group(
    {
      taskId: [null as number | null, [Validators.required, Validators.min(1)]],
      comment: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(500)]],
      start: [nowLocal(60), Validators.required],
      end: [nowLocal(), Validators.required],
    },
    { validators: endAfterStart },
  );

  loadingEntry = signal(false);
  saving = signal(false);
  saved = signal<TimeEntry | null>(null);
  savedAction = signal<'created' | 'updated'>('created');
  error = signal('');
  notFound = signal(false);
  createdAt = signal<string | null>(null);
  deleteArmed = signal(false);
  deleting = signal(false);

  clients = signal<Client[]>([]);
  projects = signal<Project[]>([]);
  tasks = signal<Task[]>([]);
  pickerError = signal('');
  pickerOpen = signal(false);
  manualId = signal(false);

  readonly recent = computed(() => this.recentTasks.items().filter(t => t.id !== this.value().taskId));

  protected value = toSignal(this.form.valueChanges.pipe(map(() => this.form.getRawValue())), {
    initialValue: this.form.getRawValue(),
  });

  durationMs = computed(() => {
    const { start, end } = this.value();
    return start && end ? new Date(end).getTime() - new Date(start).getTime() : 0;
  });
  durationLabel = computed(() => formatDuration(this.durationMs()));
  isLong = computed(() => this.durationMs() > LONG_ENTRY_HOURS * 3_600_000);

  taskName = computed(() => {
    const id = this.value().taskId;
    if (!id) return '';
    return this.api.taskNames()[id] ?? `Task #${id}`;
  });

  taskPath = computed(() => {
    const id = this.value().taskId;
    return id ? this.api.taskPath(id) : null;
  });

  overlap = computed(() => {
    const { start, end } = this.value();
    if (!start || !end || this.durationMs() <= 0) return null;
    return findOverlap(this.api.loadedEntries(), new Date(start).getTime(), new Date(end).getTime(), this.entryId);
  });

  constructor() {
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.saved.set(null));
    afterNextRender(() => this.panel()?.nativeElement.focus());
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    const taskId = Number(this.route.snapshot.queryParamMap.get('taskId'));
    if (taskId) this.selectTask(taskId);
    else if (!id) this.openPicker();

    if (id) {
      this.entryId = Number(id);
      this.loadingEntry.set(true);
      this.form.disable();
      this.api.getTimeEntry(this.entryId).subscribe({
        next: e => {
          this.fill(e);
          this.form.enable();
          this.loadingEntry.set(false);
        },
        error: (e: AppError) => {
          this.loadingEntry.set(false);
          if (e.status === 404) this.notFound.set(true);
          else this.error.set(e.message);
        },
      });
    }
  }

  invalid(field: Field) {
    const control = this.form.controls[field];
    return control.touched && control.invalid;
  }

  openPicker() {
    this.pickerOpen.set(true);
    if (this.clients().length) return;
    this.api.getClients().subscribe({
      next: c => this.clients.set(c),
      error: (e: AppError) => this.pickerError.set(e.message),
    });
  }

  pickClient(id: string) {
    this.projects.set([]);
    this.tasks.set([]);
    this.pickerError.set('');
    if (!id) return;
    this.api.getProjects(+id).subscribe({
      next: p => this.projects.set(p),
      error: (e: AppError) => this.pickerError.set(e.message),
    });
  }

  pickProject(id: string) {
    this.tasks.set([]);
    this.pickerError.set('');
    if (!id) return;
    this.api.getTasks(+id).subscribe({
      next: t => this.tasks.set(t),
      error: (e: AppError) => this.pickerError.set(e.message),
    });
  }

  pickTask(id: string) {
    if (!id) return;
    this.selectTask(+id);
    this.pickerOpen.set(false);
  }

  pickRecent(task: RecentTask) {
    this.selectTask(task.id);
    this.pickerOpen.set(false);
  }

  setLast(minutes: number) {
    this.form.patchValue({ start: nowLocal(minutes), end: nowLocal() });
  }

  shiftEnd(minutes: number) {
    this.form.patchValue({ end: shiftLocal(this.form.controls.end.value, minutes) });
  }

  endNow() {
    this.form.patchValue({ end: nowLocal() });
  }

  close() {
    if (this.saving() || this.deleting()) return;
    this.router.navigate(['/entries'], {
      queryParams: { taskId: null },
      queryParamsHandling: 'merge',
    });
  }

  remove() {
    if (this.entryId === null) return;
    if (!this.deleteArmed()) {
      this.deleteArmed.set(true);
      return;
    }
    this.deleting.set(true);
    this.api.deleteTimeEntry(this.entryId).subscribe({
      next: () => {
        this.deleting.set(false);
        this.close();
      },
      error: (e: AppError) => {
        this.deleting.set(false);
        this.deleteArmed.set(false);
        if (e.status === 404) this.notFound.set(true);
        else this.error.set(e.message);
      },
    });
  }

  submit() {
    this.saved.set(null);
    this.error.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const body: TimeEntryInput = {
      taskId: v.taskId!,
      comment: v.comment.trim(),
      start: localToIso(v.start),
      end: localToIso(v.end),
    };
    const isUpdate = this.entryId !== null;
    const request = isUpdate ? this.api.updateTimeEntry(this.entryId!, body) : this.api.createTimeEntry(body);

    this.saving.set(true);
    request.subscribe({
      next: entry => {
        this.saving.set(false);
        this.recentTasks.add({ id: entry.taskId, name: this.taskName(), path: this.taskPath() });
        if (!isUpdate) {
          const now = nowLocal();
          this.form.patchValue({ comment: '', start: v.end, end: now > v.end ? now : shiftLocal(v.end, 30) });
          this.form.controls.comment.markAsUntouched();
        }
        this.savedAction.set(isUpdate ? 'updated' : 'created');
        this.saved.set(entry);
      },
      error: (e: AppError) => {
        this.saving.set(false);
        if (e.status === 404) this.notFound.set(true);
        else this.error.set(e.message);
      },
    });
  }

  private fill(e: TimeEntry) {
    this.createdAt.set(e.createdAt);
    this.form.patchValue({ comment: e.comment, start: isoToLocal(e.start), end: isoToLocal(e.end) });
    this.selectTask(e.taskId);
  }

  private selectTask(id: number) {
    this.form.patchValue({ taskId: id });
    this.form.controls.taskId.markAsTouched();
    if (!this.api.taskNames()[id]) this.api.getTask(id).subscribe({ error: () => undefined });
  }
}
