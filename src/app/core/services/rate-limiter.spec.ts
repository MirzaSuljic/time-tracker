import { TestBed } from '@angular/core/testing';
import { RateLimiter } from './rate-limiter';

describe('RateLimiter', () => {
  it('lets 15 requests through, then makes the 16th wait about a minute', () => {
    const limiter = TestBed.inject(RateLimiter);
    for (let i = 0; i < 15; i++) expect(limiter.reserve()).toBe(0);
    expect(limiter.reserve()).toBeGreaterThan(59_000);
    expect(limiter.waitSeconds()).toBeGreaterThan(0);
    expect(limiter.remaining()).toBe(0);
  });
});
