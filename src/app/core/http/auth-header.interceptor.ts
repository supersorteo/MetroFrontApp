import { HttpInterceptorFn } from '@angular/common/http';
import { API_BASE_URL } from '../api/api.config';

export const authHeaderInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(API_BASE_URL + '/api/')) {
    return next(req);
  }
  const userCode = localStorage.getItem('userCode');
  if (!userCode || userCode === 'demo') {
    return next(req);
  }
  return next(req.clone({ setHeaders: { 'X-User-Code': userCode } }));
};
