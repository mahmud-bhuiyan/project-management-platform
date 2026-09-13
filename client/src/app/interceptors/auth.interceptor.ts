import {
  HttpErrorResponse,
  HttpInterceptorFn,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthStore } from '../core/state/auth.store';

const AUTH_RETRY_HEADER = 'X-Auth-Retry';

function shouldSkipTokenRefresh(url: string): boolean {
  return (
    url.includes('/auth/refresh') ||
    url.includes('/auth/login') ||
    url.includes('/auth/demo-login') ||
    url.includes('/auth/logout')
  );
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authStore = inject(AuthStore);
  const router = inject(Router);

  const token = authStore.getAccessToken();
  const authReq =
    token && !req.headers.has('Authorization')
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (
        error.status !== 401 ||
        shouldSkipTokenRefresh(req.url) ||
        req.headers.has(AUTH_RETRY_HEADER)
      ) {
        return throwError(() => error);
      }

      return authStore.refresh().pipe(
        switchMap(() => {
          const newToken = authStore.getAccessToken();

          if (!newToken) {
            return throwError(() => error);
          }

          const retryReq = authReq.clone({
            setHeaders: {
              Authorization: `Bearer ${newToken}`,
              [AUTH_RETRY_HEADER]: 'true',
            },
          });

          return next(retryReq);
        }),
        catchError((refreshError) => {
          authStore.clearSession();
          void router.navigate(['/login']);
          return throwError(() => refreshError);
        }),
      );
    }),
  );
};
