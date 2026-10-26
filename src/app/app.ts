import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { RATE_LIMIT, RateLimiter } from './core/services/rate-limiter';
import { IconComponent } from './core/ui/icon.component';
import { ModalComponent } from './core/ui/modal.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconComponent, ModalComponent],
  templateUrl: './app.html',
})
export class App {
  protected readonly limiter = inject(RateLimiter);
  protected readonly limit = RATE_LIMIT;
  protected readonly bars = computed(() => {
    const filled = Math.ceil((this.limiter.remaining() / RATE_LIMIT) * 5);
    const low = this.limiter.remaining() <= 3;
    return [0, 1, 2, 3, 4].map(i => (i < filled ? (low ? 'bg-amber-500' : 'bg-emerald-500') : 'bg-slate-300'));
  });
}
