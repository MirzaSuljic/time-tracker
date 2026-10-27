import { Injectable, computed, signal } from '@angular/core';
import { Observable, map, switchMap, throwError, timer } from 'rxjs';
import { Session, User } from '../models/user.model';

interface DemoAccount extends User {
  password: string;
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  { name: 'Demo User', email: 'demo@memtime.com', password: 'demo1234' },
];

const KEY = 'time-tracker.session';
const LOGIN_DELAY_MS = 500;

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0].toUpperCase())
    .join('');
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly session = signal<Session | null>(this.restore());

  readonly user = computed(() => this.session()?.user ?? null);
  readonly signedInAt = computed(() => this.session()?.signedInAt ?? null);
  readonly isLoggedIn = computed(() => this.session() !== null);
  readonly initials = computed(() => initials(this.user()?.name ?? ''));

  login(email: string, password: string, remember: boolean): Observable<User> {
    return timer(LOGIN_DELAY_MS).pipe(
      switchMap(() => {
        const account = DEMO_ACCOUNTS.find(a => a.email === email.trim().toLowerCase() && a.password === password);
        return account
          ? [account]
          : throwError(() => new Error('Email or password is incorrect. Check them and try again.'));
      }),
      map(account => this.startSession({ name: account.name, email: account.email }, remember)),
    );
  }

  startSession(user: User, remember: boolean): User {
    const session: Session = { user, signedInAt: new Date().toISOString() };
    this.session.set(session);
    this.clearStorage();
    try {
      (remember ? localStorage : sessionStorage).setItem(KEY, JSON.stringify(session));
    } catch {
      return user;
    }
    return user;
  }

  logout() {
    this.session.set(null);
    this.clearStorage();
  }

  private clearStorage() {
    try {
      localStorage.removeItem(KEY);
      sessionStorage.removeItem(KEY);
    } catch {
      return;
    }
  }

  private restore(): Session | null {
    try {
      const raw = localStorage.getItem(KEY) ?? sessionStorage.getItem(KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : null;
      const s = parsed as Session | null;
      return s && typeof s.user?.name === 'string' && typeof s.user?.email === 'string' && typeof s.signedInAt === 'string'
        ? s
        : null;
    } catch {
      return null;
    }
  }
}
