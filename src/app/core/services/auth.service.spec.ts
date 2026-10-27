import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService, DEMO_ACCOUNTS, initials } from './auth.service';
import { ApiService } from './api.service';
import { RecentTasks } from './recent-tasks';

describe('AuthService', () => {
  let auth: AuthService;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    auth = TestBed.inject(AuthService);
  });

  it('signs in with a demo account', async () => {
    const demo = DEMO_ACCOUNTS[0];
    const user = await firstValueFrom(auth.login(demo.email, demo.password, false));
    expect(user.email).toBe(demo.email);
    expect(auth.isLoggedIn()).toBe(true);
    expect(auth.user()?.name).toBe(demo.name);
  });

  it('ignores case and spaces in the email', async () => {
    const demo = DEMO_ACCOUNTS[0];
    await firstValueFrom(auth.login(`  ${demo.email.toUpperCase()} `, demo.password, false));
    expect(auth.isLoggedIn()).toBe(true);
  });

  it('rejects a wrong password', async () => {
    await expect(firstValueFrom(auth.login(DEMO_ACCOUNTS[0].email, 'wrong', false))).rejects.toThrow('incorrect');
    expect(auth.isLoggedIn()).toBe(false);
  });

  it('keeps the session in localStorage only when asked to remember', () => {
    auth.startSession({ name: 'Demo User', email: 'demo@memtime.com' }, true);
    expect(localStorage.getItem('time-tracker.session')).not.toBeNull();
    auth.startSession({ name: 'Demo User', email: 'demo@memtime.com' }, false);
    expect(localStorage.getItem('time-tracker.session')).toBeNull();
    expect(sessionStorage.getItem('time-tracker.session')).not.toBeNull();
  });

  it('signs out and forgets the session', () => {
    auth.startSession({ name: 'Demo User', email: 'demo@memtime.com' }, true);
    auth.logout();
    expect(auth.isLoggedIn()).toBe(false);
    expect(localStorage.getItem('time-tracker.session')).toBeNull();
  });

  it('forgets cached API data and recent tasks on sign out', () => {
    const api = TestBed.inject(ApiService);
    const http = TestBed.inject(HttpTestingController);
    const recent = TestBed.inject(RecentTasks);
    recent.add({ id: 1, name: 'Task 1', path: null });

    api.getClients().subscribe();
    http.expectOne(r => r.url === '/api/v1/clients').flush([{ id: 1, name: 'Client 1', description: '', status: 'active' }]);
    expect(api.clientNames()[1]).toBe('Client 1');

    auth.logout();
    expect(api.clientNames()).toEqual({});
    expect(recent.items()).toEqual([]);

    api.getClients().subscribe();
    http.expectOne(r => r.url === '/api/v1/clients').flush([]);
    http.verify();
  });

  it('builds initials from the name', () => {
    expect(initials('Demo User')).toBe('DU');
    expect(initials('Lejla')).toBe('L');
    expect(initials('')).toBe('');
  });
});
