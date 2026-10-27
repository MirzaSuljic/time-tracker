import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { authGuard, guestGuard } from './auth.guard';

describe('auth guards', () => {
  const route = {} as ActivatedRouteSnapshot;
  const state = { url: '/tree?page=2' } as RouterStateSnapshot;
  let auth: AuthService;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] });
    auth = TestBed.inject(AuthService);
  });

  it('sends a signed-out user to the login page and remembers where they wanted to go', () => {
    const result = TestBed.runInInjectionContext(() => authGuard(route, state)) as UrlTree;
    expect(TestBed.inject(Router).serializeUrl(result)).toBe('/login?returnUrl=%2Ftree%3Fpage%3D2');
  });

  it('lets a signed-in user through', () => {
    auth.startSession({ name: 'Demo User', email: 'demo@memtime.com' }, false);
    expect(TestBed.runInInjectionContext(() => authGuard(route, state))).toBe(true);
  });

  it('keeps a signed-in user away from the login page', () => {
    auth.startSession({ name: 'Demo User', email: 'demo@memtime.com' }, false);
    const result = TestBed.runInInjectionContext(() => guestGuard(route, state)) as UrlTree;
    expect(TestBed.inject(Router).serializeUrl(result)).toBe('/tree');
  });
});
