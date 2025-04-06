import { Injectable, signal, inject, effect } from '@angular/core';
import { Router } from '@angular/router';
import { RegisterRequest } from '../models/register-request.model';
import { firstValueFrom, Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { TrpcService } from './trpc.service';
import { RouterTypes } from '@concert-poster-marketplace/shared';

// Use type imports from shared package
type User = RouterTypes.Auth.MeOutput;
type LoginOutput = RouterTypes.Auth.LoginOutput;
type LogoutOutput = RouterTypes.Auth.LogoutOutput;

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private router = inject(Router);
  private tokenKey = 'token'; // Consistent token key
  private appInitialized = false;

  // Signals
  private currentUserSignal = signal<User | null>(null);
  private loadingSignal = signal<boolean>(true);
  private errorSignal = signal<string | null>(null);
  private initializedSignal = signal<boolean>(false);

  // Public readonly signals
  public currentUser = this.currentUserSignal.asReadonly();
  public loading = this.loadingSignal.asReadonly();
  public error = this.errorSignal.asReadonly();
  public initialized = this.initializedSignal.asReadonly();

  // DEBUG flag for console logs
  private DEBUG = true;

  constructor(private trpcService: TrpcService) {
    this.debug('AuthService constructor called');

    // This ensures auth is initialized before the app fully loads
    this.initAuthState();

    // Debug effect to track auth state changes
    effect(() => {
      this.debug(`Auth state changed: 
        user: ${!!this.currentUserSignal()}, 
        loading: ${this.loadingSignal()}, 
        initialized: ${this.initializedSignal()},
        error: ${this.errorSignal()}`);
    });
  }

  // Initialize auth state immediately on service creation
  async initAuthState(): Promise<void> {
    if (!this.appInitialized) {
      this.debug('Delaying auth initialization until app is ready');
      return Promise.resolve();
    }

    this.debug('Initializing auth state');
    this.loadingSignal.set(true);

    try {
      const token = localStorage.getItem(this.tokenKey);
      this.debug(`Token from storage: ${!!token}`);

      if (!token) {
        this.debug('No token found, marking as initialized');
        this.loadingSignal.set(false);
        this.initializedSignal.set(true);
        return Promise.resolve();
      }

      // Fetch current user using tRPC
      this.debug('Attempting to use stored token');
      await this.fetchCurrentUser();
      return Promise.resolve();
    } catch (err) {
      this.debug('Error during auth initialization', err);
      this.loadingSignal.set(false);
      this.initializedSignal.set(true);
      return Promise.reject(err);
    }
  }

  setAppInitialized(): void {
    this.appInitialized = true;
    this.initAuthState();
  }

  /**
   * Fetch current user with the token in storage using tRPC
   * @returns Promise that resolves when user is fetched
   */
  fetchCurrentUser(): Promise<User | null> {
    this.debug('Fetching current user with tRPC');
    this.loadingSignal.set(true);

    const token = localStorage.getItem(this.tokenKey);
    if (!token) {
      this.debug('No token available, skipping user fetch');
      this.loadingSignal.set(false);
      this.initializedSignal.set(true);
      return Promise.resolve(null);
    }

    return firstValueFrom(this.trpcService.getCurrentUser())
      .then(user => {
        this.debug('User fetched successfully', user);
        this.currentUserSignal.set(user);
        this.loadingSignal.set(false);
        this.initializedSignal.set(true);
        return user;
      })
      .catch(error => {
        this.debug('Error fetching user with tRPC', error);

        // Handle errors appropriately
        if (error.code === 'UNAUTHORIZED') {
          this.debug('Unauthorized error, clearing token');
          localStorage.removeItem(this.tokenKey);
          this.currentUserSignal.set(null);
          this.errorSignal.set('Session expired. Please login again.');
        } else {
          // For other errors, keep the token but show error
          this.errorSignal.set(
            'Error loading profile. Please try again later.'
          );
        }

        this.loadingSignal.set(false);
        this.initializedSignal.set(true);
        return Promise.reject(error);
      });
  }

  /**
   * Set session data after login
   */
  private setSession(authResult: LoginOutput): void {
    localStorage.setItem(this.tokenKey, authResult.token);
  }

  /**
   * Login user with tRPC
   */
  login(email: string, passwordHash: string): Observable<LoginOutput> {
    this.debug('Login attempt with tRPC', email);
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.trpcService.login(email, passwordHash).pipe(
      tap((response: LoginOutput) => {
        this.debug('Login successful', response);
        this.setSession(response);
        this.loadingSignal.set(false);
      }),
      catchError(error => {
        this.debug('Login error', error);
        this.errorSignal.set(error.message || 'Login failed');
        this.loadingSignal.set(false);
        throw error;
      })
    );
  }

  /**
   * Register a new user (using tRPC if available on backend)
   * @returns Promise that resolves to user when registration is successful
   */
  register(userData: RegisterRequest): Promise<LoginOutput> {
    this.debug('Registration attempt', userData.email);
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return firstValueFrom(
      this.trpcService.register(
        userData.email,
        userData.passwordHash,
        userData.name || undefined
      )
    );
  }

  /**
   * Logout user with tRPC
   */
  logout(): Observable<LogoutOutput> {
    this.debug('Logging out user with tRPC');

    const token = localStorage.getItem(this.tokenKey) || '';
    return this.trpcService.logout(token).pipe(
      tap(() => {
        localStorage.removeItem(this.tokenKey);
        this.currentUserSignal.set(null);
        this.debug('Token removed from localStorage');
        this.router.navigate(['/login']);
      }),
      catchError(error => {
        this.debug('Logout error', error);
        // Clean up anyway on error
        localStorage.removeItem(this.tokenKey);
        this.currentUserSignal.set(null);
        throw error;
      })
    );
  }

  /**
   * Check if the auth token exists
   */
  isLoggedIn(): boolean {
    const loggedIn = !!localStorage.getItem(this.tokenKey);
    this.debug(`isLoggedIn called, result: ${loggedIn}`);
    return loggedIn;
  }

  /**
   * Get token from localStorage
   */
  getToken(): string | null {
    const token = localStorage.getItem(this.tokenKey);
    this.debug(`getToken called, token present: ${!!token}`);
    return token;
  }

  /**
   * Debug logger
   */
  private debug(message: string, data?: unknown): void {
    if (this.DEBUG) {
      if (data) {
        console.log(`[AuthService] ${message}`, data);
      } else {
        console.log(`[AuthService] ${message}`);
      }
    }
  }
}
