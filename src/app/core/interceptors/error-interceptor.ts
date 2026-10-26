import { HttpContextToken, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ModalActionButton } from '../models/modal.model';
import { ModalService } from '../services/modal.service';

export const SILENT_ERRORS = new HttpContextToken<boolean>(() => false);

export class AppError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
    this.name = 'AppError';
  }
}

const STATUS: Record<number, { title: string; description: string }> = {
  0: { title: 'No connection', description: 'Cannot reach the server. Check your connection and try again.' },
  400: { title: '400 Bad Request', description: 'Invalid request parameters or body.' },
  401: { title: '401 Unauthorized', description: 'The API key is missing or not valid.' },
  404: { title: '404 Not Found', description: 'Resource not found. It may have been deleted.' },
  429: { title: '429 Too Many Requests', description: 'Rate limit exceeded. Please wait a minute and try again.' },
  500: { title: '500 Internal Server Error', description: 'Server error. Please try again later.' },
};

export function describeError(e: HttpErrorResponse): { title: string; message: string } {
  const known = STATUS[e.status] ?? (e.status >= 500 ? { ...STATUS[500], title: `${e.status} Server Error` } : null);
  const server = typeof e.error?.error === 'string' ? (e.error.error as string) : null;
  return {
    title: known?.title ?? `Error ${e.status}`,
    message: server ?? known?.description ?? 'Something went wrong. Please try again.',
  };
}

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const modalService = inject(ModalService);

  return next(req).pipe(
    catchError((e: unknown) => {
      if (!(e instanceof HttpErrorResponse)) return throwError(() => e);
      const { title, message } = describeError(e);
      if (!req.context.get(SILENT_ERRORS) && !modalService.isOpen) {
        modalService.getData({
          title,
          content: message,
          buttons: [{ title: 'OK', action: ModalActionButton.Confirm }],
        });
        modalService.open();
      }
      return throwError(() => new AppError(e.status, message));
    }),
  );
};
