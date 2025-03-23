import {
  HttpInterceptorFn,
  HttpHandlerFn,
  HttpRequest,
  HttpEvent,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, from, throwError, firstValueFrom } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

// Simple static flag to prevent multiple simultaneous refresh attempts
let isRefreshing = false;

/**
 * Authentication interceptor that adds JWT tokens to requests and handles 401 errors
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
      // Only handle 401 Unauthorized errors
      if (error instanceof HttpErrorResponse && error.status === 401) {
        return from(handleAuthError(req, next, authService));
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
  return (
    url.includes('/auth/login') ||
    url.includes('/auth/register') ||
    url.includes('/auth/refresh')
  );
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

/**
 * Handles 401 Unauthorized errors, attempting to refresh the token
 */
async function handleAuthError(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
  authService: AuthService
): Promise<HttpEvent<unknown>> {
  // Simple polling function to wait for refresh to complete
  const waitForRefreshToComplete = (timeoutMs = 10000): Promise<boolean> => {
    return new Promise(resolve => {
      const startTime = Date.now();

      const checkRefreshStatus = () => {
        // If no longer refreshing, return the success state
        if (!isRefreshing) {
          return resolve(!!authService.getToken());
        }

        // Check for timeout
        if (Date.now() - startTime > timeoutMs) {
          return resolve(false);
        }

        // Poll again
        setTimeout(checkRefreshStatus, 100);
      };

      checkRefreshStatus();
    });
  };

  // If already refreshing, wait for it to complete
  if (isRefreshing) {
    console.log('Token refresh already in progress, waiting...');
    const refreshSucceeded = await waitForRefreshToComplete();

    if (refreshSucceeded) {
      const newToken = authService.getToken();
      if (newToken) {
        return firstValueFrom(next(addAuthHeader(req, newToken)));
      }
    }

    // If refresh failed or timed out, throw error
    throw new Error('Authentication required');
  }

  // Start the token refresh process
  try {
    isRefreshing = true;
    console.log('Attempting to refresh token...');

    const refreshSucceeded = await authService.refreshToken();
    isRefreshing = false;

    if (refreshSucceeded) {
      console.log('Token refresh succeeded, retrying request');
      const newToken = authService.getToken();
      if (newToken) {
        return firstValueFrom(next(addAuthHeader(req, newToken)));
      }
    }

    // If refresh failed, throw error
    console.log('Token refresh failed');
    throw new Error('Authentication required');
  } catch (error) {
    isRefreshing = false;
    console.error('Error during token refresh:', error);
    throw error;
  }
}
