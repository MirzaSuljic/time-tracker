import { Injectable, computed, signal } from '@angular/core';

export const SPINNER_DELAY_MS = 250;

@Injectable({ providedIn: 'root' })
export class SpinnerService {
  private readonly active = signal(0);
  private readonly shown = signal(false);
  private timer?: ReturnType<typeof setTimeout>;

  readonly loading = computed(() => this.active() > 0);
  readonly visible = this.shown.asReadonly();

  show(): void {
    this.active.update(n => n + 1);
    if (this.active() === 1) {
      clearTimeout(this.timer);
      this.timer = setTimeout(() => this.shown.set(this.active() > 0), SPINNER_DELAY_MS);
    }
  }

  hide(): void {
    this.active.update(n => Math.max(0, n - 1));
    if (this.active() === 0) {
      clearTimeout(this.timer);
      this.shown.set(false);
    }
  }
}
