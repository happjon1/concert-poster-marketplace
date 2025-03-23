import {
  HttpInterceptorFn,
  HttpHandlerFn,
  HttpRequest,
  HttpEvent,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

/**
 * Authentication interceptor that adds JWT tokens to requests.
 */
export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  const authService = inject(AuthService);

  // Skip authentication for auth-related endpoints
  if (shouldSkipAuth(req.url)) {
    return next(req);
  }

  // Add token if available
  const token = authService.getToken();
  if (token) {
    req = addAuthHeader(req, token);
  }

  // Process the request and handle auth errors
  return next(req).pipe(
    catchError(error => {
      // For now, simply re-throw 401 errors
      if (error instanceof HttpErrorResponse && error.status === 401) {
        // Force user to login again
        authService.logout();
        return throwError(() => error);
      }

      // Pass through all other errors
      return throwError(() => error);
    })
  );
};

/**
 * Determines if a request should skip authentication
 */
function shouldSkipAuth(url: string): boolean {
  return url.includes('/auth/login') || url.includes('/auth/register');
}

/**
 * Adds authorization header to a request
 */
function addAuthHeader(
  req: HttpRequest<unknown>,
  token: string
): HttpRequest<unknown> {
  return req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`,
    },
  });
}
