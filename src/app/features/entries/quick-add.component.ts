import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { RecentTasks } from '../../core/services/recent-tasks';
import { AppError } from '../../core/interceptors/error-interceptor';
import { formatDuration, nowTime, timeMs, todayAt } from '../../core/utils/dates';
import { IconComponent } from '../../core/ui/icon.component';

export function timeOrder(group: AbstractControl): ValidationErrors | null {
  const { start, end } = group.value;
  return start && end && timeMs(end) <= timeMs(start) ? { endBeforeStart: true } : null;
}

function addMinutes(time: string, minutes: number): string {
  const total = Math.min(23 * 60 + 59, timeMs(time) / 60_000 + minutes);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

@Component({
  selector: 'app-quick-add',
  imports: [ReactiveFormsModule, RouterLink, IconComponent],
  templateUrl: './quick-add.component.html',
})
export class QuickAddComponent {
  private api = inject(ApiService);
  private recentTasks = inject(RecentTasks);
  private fb = inject(FormBuilder);
  private noticeTimer?: ReturnType<typeof setTimeout>;

  readonly recent = this.recentTasks.items;
  readonly todayLabel = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  form = this.fb.nonNullable.group(
    {
      taskId: [this.recentTasks.items()[0]?.id ?? (null as number | null), Validators.required],
      comment: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(500)]],
      start: [nowTime(60), Validators.required],
      end: [nowTime(), Validators.required],
    },
    { validators: timeOrder },
  );

  saving = signal(false);
  error = signal('');
  notice = signal('');
  submitted = signal(false);

  protected value = toSignal(this.form.valueChanges.pipe(map(() => this.form.getRawValue())), {
    initialValue: this.form.getRawValue(),
  });

  durationLabel = computed(() => {
    const { start, end } = this.value();
    return formatDuration(timeMs(end) - timeMs(start));
  });

  selectedPath = computed(() => {
    const id = this.value().taskId;
    if (!id) return null;
    return this.api.taskPath(id) ?? this.recent().find(t => t.id === id)?.path ?? null;
  });

  constructor() {
    effect(() => {
      const first = this.recent()[0];
      const control = this.form.controls.taskId;
      if (first && (!control.value || control.pristine)) control.setValue(first.id);
    });
    inject(DestroyRef).onDestroy(() => clearTimeout(this.noticeTimer));
  }

  showError(field: 'comment' | 'taskId') {
    const control = this.form.controls[field];
    return control.invalid && (control.touched || this.submitted());
  }

  timeError() {
    return this.form.hasError('endBeforeStart') && (this.submitted() || this.form.controls.end.touched);
  }

  setLast(minutes: number) {
    this.form.patchValue({ start: nowTime(minutes), end: nowTime() });
  }

  submit() {
    this.submitted.set(true);
    this.error.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const task = this.recent().find(t => t.id === v.taskId);
    this.saving.set(true);
    this.api
      .createTimeEntry({ taskId: v.taskId!, comment: v.comment.trim(), start: todayAt(v.start), end: todayAt(v.end) })
      .subscribe({
        next: entry => {
          this.saving.set(false);
          this.submitted.set(false);
          if (task) this.recentTasks.add(task);
          const now = nowTime();
          this.form.reset({ taskId: v.taskId, comment: '', start: v.end, end: now > v.end ? now : addMinutes(v.end, 30) });
          this.notice.set(`Entry #${entry.id} added. The next one starts at ${v.end}.`);
          clearTimeout(this.noticeTimer);
          this.noticeTimer = setTimeout(() => this.notice.set(''), 5000);
        },
        error: (e: AppError) => {
          this.saving.set(false);
          this.error.set(e.message);
        },
      });
  }
}
