import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('renders the main navigation', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const nav = (fixture.nativeElement as HTMLElement).querySelector('nav');
    expect(nav?.textContent).toContain('Clients & projects');
    expect(nav?.textContent).toContain('Timesheet');
  });
});
