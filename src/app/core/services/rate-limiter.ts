import { Injectable, signal } from '@angular/core';

export const RATE_LIMIT = 15;
const WINDOW_MS = 60_000;

@Injectable({ providedIn: 'root' })
export class RateLimiter {
  private sendTimes: number[] = [];
  private waitUntil = 0;
  private countdown?: ReturnType<typeof setInterval>;
  private refreshTimer?: ReturnType<typeof setTimeout>;
  private serverRemaining: number | null = null;
  private serverResetAt = 0;

  readonly waitSeconds = signal(0);
  readonly remaining = signal(RATE_LIMIT);

  reserve(): number {
    const now = Date.now();
    this.prune(now);
    const localAt = this.sendTimes.length >= RATE_LIMIT
      ? Math.max(now, this.sendTimes[this.sendTimes.length - RATE_LIMIT] + WINDOW_MS + 50)
      : now;

    let serverAt = now;
    if (this.serverKnown(now)) {
      if (this.serverRemaining! > 0) this.serverRemaining!--;
      else serverAt = this.serverResetAt + 50;
    }

    const sendAt = Math.max(localAt, serverAt);
    this.sendTimes.push(sendAt);
    this.noteWait(sendAt - now);
    this.refreshRemaining();
    return sendAt - now;
  }

  syncFromServer(remaining: number, resetSeconds: number) {
    if (!Number.isFinite(remaining) || !Number.isFinite(resetSeconds)) return;
    this.serverRemaining = Math.max(0, remaining);
    this.serverResetAt = Date.now() + resetSeconds * 1000;
    this.refreshRemaining();
  }

  msUntilReset(): number | null {
    const now = Date.now();
    return this.serverResetAt > now ? this.serverResetAt - now : null;
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

  private serverKnown(now: number) {
    if (this.serverRemaining !== null && now >= this.serverResetAt) this.serverRemaining = null;
    return this.serverRemaining !== null;
  }

  private prune(now: number) {
    while (this.sendTimes.length && this.sendTimes[0] <= now - WINDOW_MS) {
      this.sendTimes.shift();
    }
  }

  private refreshRemaining() {
    const now = Date.now();
    this.prune(now);
    const local = Math.max(0, RATE_LIMIT - this.sendTimes.length);
    this.remaining.set(this.serverKnown(now) ? Math.min(local, this.serverRemaining!) : local);
    clearTimeout(this.refreshTimer);
    const next = [this.sendTimes[0] !== undefined ? this.sendTimes[0] + WINDOW_MS : Infinity, this.serverRemaining !== null ? this.serverResetAt : Infinity];
    const at = Math.min(...next);
    if (Number.isFinite(at)) this.refreshTimer = setTimeout(() => this.refreshRemaining(), Math.max(0, at - now) + 10);
  }
}
