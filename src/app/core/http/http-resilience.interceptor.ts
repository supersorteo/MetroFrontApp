import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { Observable, throwError, timer } from 'rxjs';
import { catchError, retry, timeout } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { extractApiErrorMessage } from './api-error.util';

function normalizeHttpError(error: unknown): unknown {
  if (!(error instanceof HttpErrorResponse)) {
    const fallbackMessage =
      error instanceof Error ? error.message : 'Error de red o timeout';

    return new HttpErrorResponse({
      error: { message: fallbackMessage, raw: error ?? null },
      status: 0,
      statusText: 'Client Error',
    });
  }

  const normalizedMessage = extractApiErrorMessage(error);

  if (error.error && typeof error.error === 'object' && !(error.error instanceof ErrorEvent)) {
    const payload = error.error as Record<string, unknown>;
    if (typeof payload['message'] === 'string' && payload['message'].trim()) {
      return error;
    }

    return new HttpErrorResponse({
      error: { ...payload, message: normalizedMessage },
      headers: error.headers,
      status: error.status,
      statusText: error.statusText,
      url: error.url ?? undefined,
    });
  }

  return new HttpErrorResponse({
    error: { message: normalizedMessage, raw: error.error ?? null },
    headers: error.headers,
    status: error.status,
    statusText: error.statusText,
    url: error.url ?? undefined,
  });
}

export const httpResilienceInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  let stream = next(req).pipe(timeout(environment.requestTimeoutMs));

  if (environment.retryGetRequests && req.method.toUpperCase() === 'GET') {
    stream = stream.pipe(
      retry({
        count: 1,
        delay: () => timer(300),
      })
    );
  }

  return stream.pipe(
    catchError((error: unknown) => throwError(() => normalizeHttpError(error)))
  );
};
