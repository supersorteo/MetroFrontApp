import { HttpErrorResponse } from '@angular/common/http';

export function extractApiErrorMessage(
  error: HttpErrorResponse | unknown,
  fallback = 'Error desconocido'
): string {
  if (!(error instanceof HttpErrorResponse)) {
    if (error instanceof Error && error.message) {
      return error.message;
    }
    return fallback;
  }

  if (error.error instanceof ErrorEvent) {
    return error.error.message || fallback;
  }

  const payload = error.error;
  if (typeof payload === 'string' && payload.trim()) {
    return payload;
  }

  if (payload && typeof payload === 'object') {
    const objectPayload = payload as Record<string, unknown>;
    for (const key of ['message', 'error', 'email', 'details']) {
      const value = objectPayload[key];
      if (typeof value === 'string' && value.trim()) {
        return value;
      }
    }
  }

  return error.message || fallback;
}
