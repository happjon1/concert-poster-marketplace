import {
  Injectable,
  signal,
  computed,
  inject,
  effect,
  Inject,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { User } from '../models/user.model';
import { AuthResponse } from '../models/auth-response.model';
import { LoginRequest } from '../models/login-request.model';
import { RegisterRequest } from '../models/register-request.model'; // Import RegisterRequest
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private apiUrl = `${environment.apiUrl}/auth`;
  private tokenKey = 'auth_token';
  private appInitialized = false;

  // Signals
  private currentUserSignal = signal<User | null>(null);
  private loadingSignal = signal<boolean>(true); // Start loading
  private errorSignal = signal<string | null>(null);
  private initializedSignal = signal<boolean>(false);

  // Public readonly signals
  public currentUser = this.currentUserSignal.asReadonly();
  public loading = this.loadingSignal.asReadonly();
  public error = this.errorSignal.asReadonly();
  public initialized = this.initializedSignal.asReadonly();
  public isLoggedIn = computed(() => !!this.currentUserSignal());

  // DEBUG flag for console logs
  private DEBUG = true;

  constructor(@Inject('NoAuthHttpClient') private noAuthHttp: HttpClient) {
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
  initAuthState(): void {
    if (!this.appInitialized) {
      this.debug('Delaying auth initialization until app is ready');
      return;
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
        return;
      }

      if (!this.isTokenValid(token)) {
        this.debug('Invalid or expired token, removing');
        localStorage.removeItem(this.tokenKey);
        this.loadingSignal.set(false);
        this.initializedSignal.set(true);
        return;
      }

      this.debug('Valid token found, fetching user data');
      this.fetchCurrentUser();
    } catch (err) {
      this.debug('Error during auth initialization', err);
      this.loadingSignal.set(false);
      this.initializedSignal.set(true);
    }
  }

  setAppInitialized(): void {
    this.appInitialized = true;
    this.initAuthState();
  }

  /**
   * Fetch current user with the token in storage
   */
  fetchCurrentUser(): void {
    this.debug('Fetching current user');
    this.loadingSignal.set(true);

    const token = this.getToken();
    if (!token) {
      this.debug('No token available, skipping user fetch');
      this.loadingSignal.set(false);
      this.initializedSignal.set(true);
      return;
    }

    this.http.get<{ user: User }>(`${this.apiUrl}/me`).subscribe({
      next: response => {
        this.debug('User fetched successfully', response.user);
        this.currentUserSignal.set(response.user);
        this.loadingSignal.set(false);
        this.initializedSignal.set(true);
      },
      error: error => {
        this.debug('Error fetching user', error);
        // Token is invalid, clear it
        localStorage.removeItem(this.tokenKey);
        this.currentUserSignal.set(null);
        this.errorSignal.set('Session expired. Please login again.');
        this.loadingSignal.set(false);
        this.initializedSignal.set(true);
      },
    });
  }

  /**
   * Get token from localStorage
   */
  getToken(): string | null {
    const token = localStorage.getItem(this.tokenKey);

    if (!token) {
      return null;
    }

    // Validate token before returning
    if (this.isTokenValid(token)) {
      return token;
    } else {
      this.debug('Token is invalid or expired');
      localStorage.removeItem(this.tokenKey);
      return null;
    }
  }

  /**
   * Validate JWT token
   */
  private isTokenValid(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      // Check if token is expired
      const isValid = payload.exp > Date.now() / 1000;
      this.debug(`Token validation result: ${isValid}`);
      return isValid;
    } catch (e) {
      this.debug('Error validating token', e);
      return false;
    }
  }

  /**
   * Set session data after login
   */
  private setSession(authResult: AuthResponse): void {
    localStorage.setItem(this.tokenKey, authResult.token);
    this.debug('Token stored in localStorage');
  }

  /**
   * Login user
   */
  login(credentials: LoginRequest): void {
    this.debug('Login attempt', credentials.email);
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    this.http
      .post<AuthResponse>(`${this.apiUrl}/login`, credentials)
      .subscribe({
        next: response => {
          this.debug('Login successful', response);
          this.setSession(response);
          this.currentUserSignal.set(response.user);
          this.loadingSignal.set(false);
          this.router.navigate(['/profile']);
        },
        error: error => {
          this.debug('Login error', error);
          this.errorSignal.set(error.error?.message || 'Login failed');
          this.loadingSignal.set(false);
        },
      });
  }

  /**
   * Register a new user
   */
  register(userData: RegisterRequest): void {
    this.debug('Registration attempt', userData.email);
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    this.http
      .post<AuthResponse>(`${this.apiUrl}/register`, userData)
      .subscribe({
        next: response => {
          this.debug('Registration successful', response);
          this.setSession(response);
          this.currentUserSignal.set(response.user);
          this.loadingSignal.set(false);
          this.router.navigate(['/profile']);
        },
        error: error => {
          this.debug('Registration error', error);
          this.errorSignal.set(error.error?.message || 'Registration failed');
          this.loadingSignal.set(false);
        },
      });
  }

  /**
   * Logout user
   */
  logout(): void {
    this.debug('Logging out user');
    localStorage.removeItem(this.tokenKey);
    this.currentUserSignal.set(null);
    this.router.navigate(['/login']);
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
