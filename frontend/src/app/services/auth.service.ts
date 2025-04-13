import { Injectable, signal, inject, effect } from '@angular/core';
import { Router } from '@angular/router';
import {
  LoginOutput,
  User,
  RegisterInput,
  TrpcService,
  LoginInput,
} from './trpc.service';

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
  async fetchCurrentUser(): Promise<User | null> {
    this.loadingSignal.set(true);

    const token = localStorage.getItem(this.tokenKey);
    if (!token) {
      this.loadingSignal.set(false);
      this.initializedSignal.set(true);
      return Promise.resolve(null);
    }

    try {
      const currentUser = await this.trpcService.getCurrentUser();
      if (!currentUser) {
        this.debug('No current user found');
        this.loadingSignal.set(false);
        this.initializedSignal.set(true);
        return null;
      }
      this.debug('Current user found', currentUser);
      this.currentUserSignal.set(currentUser);
      this.loadingSignal.set(false);
      this.initializedSignal.set(true);
      return currentUser;
    } catch (error) {
      this.debug('Error fetching current user', error);
      this.loadingSignal.set(false);
      this.initializedSignal.set(true);
      throw error;
    }
  }

  /**
   * Verify token validity with the server
   * @returns Promise<boolean> indicating if token is valid according to the server
   */
  async verifyToken(): Promise<boolean> {
    const token = localStorage.getItem(this.tokenKey);

    if (!token) {
      this.debug('No token to verify');
      return false;
    }

    try {
      // First do a local check for obvious expiry
      if (!this.isLoggedIn()) {
        return false;
      }

      // Then verify with the server by getting current user
      const user = await this.trpcService.getCurrentUser();
      this.currentUserSignal.set(user);
      this.debug('Token verified with server', user);
      return true;
    } catch (error) {
      this.debug('Token verification failed', error);
      localStorage.removeItem(this.tokenKey);
      this.currentUserSignal.set(null);
      return false;
    }
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
  async login(loginInput: LoginInput): Promise<LoginOutput> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      const response = await this.trpcService.login(loginInput);
      this.debug('Login successful', response);
      this.setSession(response);
      this.loadingSignal.set(false);
      return response;
    } catch (error: unknown) {
      this.debug('Login error', error);
      if (error instanceof Error) {
        this.errorSignal.set(error.message || 'Login failed');
      } else {
        this.errorSignal.set('An unknown error occurred');
      }
      this.loadingSignal.set(false);
      throw error;
    }
  }

  /**
   * Register a new user (using tRPC if available on backend)
   * @returns Promise that resolves to user when registration is successful
   */
  async register(userData: RegisterInput): Promise<LoginOutput> {
    this.debug('Registration attempt', userData.email);
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      const response = await this.trpcService.register(userData);
      this.debug('Registration successful', response);
      this.setSession(response);
      this.loadingSignal.set(false);
      return response;
    } catch (error: unknown) {
      this.debug('Registration error', error);
      if (error instanceof Error) {
        this.errorSignal.set(error.message || 'Registration failed');
      } else {
        this.errorSignal.set('An unknown error occurred');
      }
      this.loadingSignal.set(false);
      throw error;
    }
  }

  /**
   * Logout user with tRPC
   */
  async logout(): Promise<void> {
    this.debug('Logging out user with tRPC');

    const token = localStorage.getItem(this.tokenKey) || '';
    try {
      await this.trpcService.logout({ token });
      localStorage.removeItem(this.tokenKey);
      this.currentUserSignal.set(null);
      this.debug('Token removed from localStorage');
      this.router.navigate(['/login']);
    } catch (error: unknown) {
      this.debug('Logout error', error);
      // Clean up anyway on error
      localStorage.removeItem(this.tokenKey);
      this.currentUserSignal.set(null);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unknown error occurred during logout');
    }
  }

  /**
   * Check if the user is logged in with a valid token
   * @returns boolean indicating if the user has a valid token
   */
  isLoggedIn(): boolean {
    const token = localStorage.getItem(this.tokenKey);

    // First check if token exists
    if (!token) {
      this.debug(`isLoggedIn called, no token found`);
      return false;
    }

    try {
      // Check if token is expired by examining JWT payload
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiry = payload.exp * 1000; // Convert to milliseconds
      const now = Date.now();

      const isValid = now < expiry;
      this.debug(
        `isLoggedIn called, token valid: ${isValid}, expires in: ${Math.floor((expiry - now) / 1000)}s`
      );

      // If token is expired, clean up
      if (!isValid) {
        this.debug('Token expired, cleaning up');
        localStorage.removeItem(this.tokenKey);
        this.currentUserSignal.set(null);
      }

      return isValid;
    } catch (error) {
      // If we can't parse the token, it's invalid
      this.debug('Error validating token, considering as invalid', error);
      localStorage.removeItem(this.tokenKey);
      this.currentUserSignal.set(null);
      return false;
    }
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
