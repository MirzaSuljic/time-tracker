import { Injectable, signal } from '@angular/core';

export const RATE_LIMIT = 15;
const WINDOW_MS = 60_000;

@Injectable({ providedIn: 'root' })
export class RateLimiter {
  private sendTimes: number[] = [];
  private waitUntil = 0;
  private countdown?: ReturnType<typeof setInterval>;
  private refreshTimer?: ReturnType<typeof setTimeout>;

  readonly waitSeconds = signal(0);
  readonly remaining = signal(RATE_LIMIT);

  reserve(): number {
    const now = Date.now();
    this.prune(now);
    const sendAt = this.sendTimes.length >= RATE_LIMIT
      ? Math.max(now, this.sendTimes[this.sendTimes.length - RATE_LIMIT] + WINDOW_MS + 50)
      : now;
    this.sendTimes.push(sendAt);
    this.noteWait(sendAt - now);
    this.refreshRemaining();
    return sendAt - now;
  }

  noteWait(ms: number): void {
    if (ms <= 0) return;
    this.waitUntil = Math.max(this.waitUntil, Date.now() + ms);
    if (this.countdown) return;
    const tick = () => {
      const left = Math.ceil((this.waitUntil - Date.now()) / 1000);
      this.waitSeconds.set(Math.max(0, left));
      if (left <= 0) {
        clearInterval(this.countdown);
        this.countdown = undefined;
      }
    };
    tick();
    this.countdown = setInterval(tick, 1000);
  }

  private prune(now: number) {
    while (this.sendTimes.length && this.sendTimes[0] <= now - WINDOW_MS) {
      this.sendTimes.shift();
    }
  }

  private refreshRemaining() {
    const now = Date.now();
    this.prune(now);
    this.remaining.set(Math.max(0, RATE_LIMIT - this.sendTimes.length));
    clearTimeout(this.refreshTimer);
    if (this.sendTimes.length) {
      this.refreshTimer = setTimeout(() => this.refreshRemaining(), this.sendTimes[0] + WINDOW_MS - now + 10);
    }
  }
}
