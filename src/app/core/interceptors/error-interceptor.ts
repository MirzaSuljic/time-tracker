import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

export class AppError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
    this.name = 'AppError';
  }
}

function toMessage(e: HttpErrorResponse): string {
  const server = typeof e.error?.error === 'string' ? (e.error.error as string) : undefined;
  switch (e.status) {
    case 0:
      return 'Cannot reach the server. Check your connection.';
    case 400:
      return server === 'Invalid JSON body'
        ? 'The entry could not be saved. Check that every field is filled in correctly.'
        : server ?? 'Some of the data is invalid. Please check the fields.';
    case 401:
      return 'The API key is missing or not valid.';
    case 404:
      return server ?? 'That item was not found. It may have been deleted.';
    case 429:
      return 'The API is busy right now. Please wait a minute and try again.';
    default:
      return 'Something went wrong on the server. Please try again.';
  }
}

export const errorInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(
    catchError((e: unknown) =>
      throwError(() => (e instanceof HttpErrorResponse ? new AppError(e.status, toMessage(e)) : e)),
    ),
  );
