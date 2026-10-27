import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { RATE_LIMIT, RateLimiter } from './core/services/rate-limiter';
import { AuthService } from './core/services/auth.service';
import { IconComponent } from './core/ui/icon.component';
import { ModalComponent } from './core/ui/modal.component';
import { SpinnerComponent } from './core/ui/spinner.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconComponent, ModalComponent, SpinnerComponent],
  templateUrl: './app.html',
  host: {
    '(document:click)': 'closeMenuOnOutsideClick($event)',
    '(document:keydown.escape)': 'menuOpen.set(false)',
  },
})
export class App {
  private router = inject(Router);
  protected readonly limiter = inject(RateLimiter);
  protected readonly auth = inject(AuthService);
  protected readonly limit = RATE_LIMIT;
  protected readonly menuOpen = signal(false);

  protected readonly bars = computed(() => {
    const filled = Math.ceil((this.limiter.remaining() / RATE_LIMIT) * 5);
    const low = this.limiter.remaining() <= 3;
    return [0, 1, 2, 3, 4].map(i => (i < filled ? (low ? 'bg-amber-500' : 'bg-emerald-500') : 'bg-slate-300'));
  });

  protected readonly signedInSince = computed(() => {
    const at = this.auth.signedInAt();
    return at ? new Date(at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '';
  });

  protected toggleMenu() {
    this.menuOpen.update(open => !open);
  }

  protected closeMenuOnOutsideClick(event: MouseEvent) {
    if (!(event.target as HTMLElement | null)?.closest('[data-user-menu]')) this.menuOpen.set(false);
  }

  protected signOut() {
    this.menuOpen.set(false);
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
