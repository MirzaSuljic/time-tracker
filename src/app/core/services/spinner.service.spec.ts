import { TestBed } from '@angular/core/testing';
import { SPINNER_DELAY_MS, SpinnerService } from './spinner.service';

describe('SpinnerService', () => {
  let spinner: SpinnerService;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({});
    spinner = TestBed.inject(SpinnerService);
  });

  afterEach(() => vi.useRealTimers());

  it('shows the spinner only when a request takes longer than the delay', () => {
    spinner.show();
    expect(spinner.loading()).toBe(true);
    expect(spinner.visible()).toBe(false);
    vi.advanceTimersByTime(SPINNER_DELAY_MS);
    expect(spinner.visible()).toBe(true);
  });

  it('never flashes for a quick request', () => {
    spinner.show();
    spinner.hide();
    vi.advanceTimersByTime(SPINNER_DELAY_MS);
    expect(spinner.visible()).toBe(false);
  });

  it('stays until the last of several requests is done', () => {
    spinner.show();
    spinner.show();
    vi.advanceTimersByTime(SPINNER_DELAY_MS);
    spinner.hide();
    expect(spinner.visible()).toBe(true);
    spinner.hide();
    expect(spinner.visible()).toBe(false);
    expect(spinner.loading()).toBe(false);
  });

  it('never counts below zero', () => {
    spinner.hide();
    spinner.show();
    expect(spinner.loading()).toBe(true);
  });
});
