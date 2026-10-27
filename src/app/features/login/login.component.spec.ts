import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LoginComponent, safeReturnUrl } from './login.component';

describe('LoginComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
  });

  it('does not submit an empty form', () => {
    const component = TestBed.createComponent(LoginComponent).componentInstance;
    component.submit();
    expect(component.loading()).toBe(false);
    expect(component.form.controls.email.touched).toBe(true);
  });

  it('fills in the demo account', () => {
    const component = TestBed.createComponent(LoginComponent).componentInstance;
    component.useDemo();
    expect(component.form.valid).toBe(true);
  });
});

describe('safeReturnUrl', () => {
  it('keeps an in-app path', () => {
    expect(safeReturnUrl('/tree?page=2')).toBe('/tree?page=2');
  });

  it('falls back to clients and projects for missing, external or login urls', () => {
    expect(safeReturnUrl(null)).toBe('/tree');
    expect(safeReturnUrl('https://evil.example')).toBe('/tree');
    expect(safeReturnUrl('//evil.example')).toBe('/tree');
    expect(safeReturnUrl('/login')).toBe('/tree');
  });
});
