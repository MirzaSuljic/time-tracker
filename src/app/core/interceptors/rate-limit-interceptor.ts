import { HttpErrorResponse, HttpHeaders, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { defer, retry, switchMap, tap, throwError, timer } from 'rxjs';
import { RateLimiter } from '../services/rate-limiter';

const MAX_429_RETRIES = 2;
const FALLBACK_WAIT_MS = 20_000;

function readLimitHeaders(headers: HttpHeaders, limiter: RateLimiter) {
  const remaining = headers.get('RateLimit-Remaining');
  const reset = headers.get('RateLimit-Reset');
  if (remaining !== null && reset !== null) limiter.syncFromServer(Number(remaining), Number(reset));
}

export function retryAfterMs(e: HttpErrorResponse, limiter: RateLimiter): number {
  const retryAfter = Number(e.headers.get('Retry-After'));
  if (Number.isFinite(retryAfter) && retryAfter > 0) return retryAfter * 1000;
  const untilReset = limiter.msUntilReset();
  return untilReset !== null ? untilReset + 250 : FALLBACK_WAIT_MS;
}

export const rateLimitInterceptor: HttpInterceptorFn = (req, next) => {
  const limiter = inject(RateLimiter);
  return defer(() => timer(limiter.reserve())).pipe(
    switchMap(() => next(req)),
    tap({
      next: event => {
        if (event instanceof HttpResponse) readLimitHeaders(event.headers, limiter);
      },
      error: (e: unknown) => {
        if (e instanceof HttpErrorResponse) readLimitHeaders(e.headers, limiter);
      },
    }),
    retry({
      count: MAX_429_RETRIES,
      delay: (e: unknown) => {
        if (e instanceof HttpErrorResponse && e.status === 429) {
          const ms = retryAfterMs(e, limiter);
          limiter.noteWait(ms);
          return timer(ms);
        }
        return throwError(() => e);
      },
    }),
  );
};
