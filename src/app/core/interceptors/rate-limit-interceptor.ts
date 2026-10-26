import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { defer, retry, switchMap, throwError, timer } from 'rxjs';
import { RateLimiter } from '../services/rate-limiter';

const MAX_429_RETRIES = 2;

function retryAfterMs(e: HttpErrorResponse): number {
  const seconds = Number(e.headers.get('Retry-After'));
  return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : 20_000;
}

export const rateLimitInterceptor: HttpInterceptorFn = (req, next) => {
  const limiter = inject(RateLimiter);
  return defer(() => timer(limiter.reserve())).pipe(
    switchMap(() => next(req)),
    retry({
      count: MAX_429_RETRIES,
      delay: (e: unknown) => {
        if (e instanceof HttpErrorResponse && e.status === 429) {
          const ms = retryAfterMs(e);
          limiter.noteWait(ms);
          return timer(ms);
        }
        return throwError(() => e);
      },
    }),
  );
};
