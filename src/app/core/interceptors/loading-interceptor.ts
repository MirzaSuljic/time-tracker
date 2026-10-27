import { HttpContextToken, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { SpinnerService } from '../services/spinner.service';

export const SKIP_SPINNER = new HttpContextToken<boolean>(() => false);

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.context.get(SKIP_SPINNER)) return next(req);
  const spinner = inject(SpinnerService);
  spinner.show();
  return next(req).pipe(finalize(() => spinner.hide()));
};
