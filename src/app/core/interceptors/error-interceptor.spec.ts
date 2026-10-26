import { TestBed } from '@angular/core/testing';
import { HttpContext, HttpErrorResponse, HttpRequest } from '@angular/common/http';
import { throwError } from 'rxjs';
import { AppError, SILENT_ERRORS, describeError, errorInterceptor } from './error-interceptor';
import { ModalService } from '../services/modal.service';

describe('errorInterceptor', () => {
  const fail = (status: number, error: unknown = null, silent = false) => {
    const req = new HttpRequest('GET', '/api/v1/clients', { context: new HttpContext().set(SILENT_ERRORS, silent) });
    let caught: unknown;
    TestBed.runInInjectionContext(() =>
      errorInterceptor(req, () => throwError(() => new HttpErrorResponse({ status, error }))),
    ).subscribe({ error: e => (caught = e) });
    return caught;
  };

  beforeEach(() => TestBed.configureTestingModule({}));

  it('shows the server message in the modal with the status title', () => {
    const modal = TestBed.inject(ModalService);
    const error = fail(404, { error: 'Time entry #5 not found' });

    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).message).toBe('Time entry #5 not found');
    expect(modal.isOpen).toBe(true);
    expect(modal.modal().title).toBe('404 Not Found');
    expect(modal.modal().content).toBe('Time entry #5 not found');
  });

  it('falls back to the documented description', () => {
    fail(500);
    expect(TestBed.inject(ModalService).modal().content).toBe('Server error. Please try again later.');
  });

  it('does not open the modal for silent requests', () => {
    fail(404, null, true);
    expect(TestBed.inject(ModalService).isOpen).toBe(false);
  });

  it('does not replace a modal that is already open', () => {
    fail(400, { error: 'Invalid JSON body' });
    fail(500);
    expect(TestBed.inject(ModalService).modal().title).toBe('400 Bad Request');
  });
});

describe('describeError', () => {
  it('maps documented statuses to titles', () => {
    expect(describeError(new HttpErrorResponse({ status: 429 })).title).toBe('429 Too Many Requests');
    expect(describeError(new HttpErrorResponse({ status: 503 })).title).toBe('503 Server Error');
  });
});
