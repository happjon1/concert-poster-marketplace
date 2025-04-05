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
import { RegisterRequest } from '../models/register-request.model';
import { environment } from '../../environments/environment';
import { firstValueFrom } from 'rxjs';

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

      // Bypass token validation completely and just try to use it
      // The server will reject an invalid token anyway
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
   * Fetch current user with the token in storage
   * @returns Promise that resolves when user is fetched
   */
  fetchCurrentUser(): Promise<User | null> {
    this.debug('Fetching current user');
    this.loadingSignal.set(true);

    const token = localStorage.getItem(this.tokenKey);
    if (!token) {
      this.debug('No token available, skipping user fetch');
      this.loadingSignal.set(false);
      this.initializedSignal.set(true);
      return Promise.resolve(null);
    }

    return firstValueFrom(this.http.get<{ user: User }>(`${this.apiUrl}/me`))
      .then(response => {
        this.debug('User fetched successfully', response.user);
        this.currentUserSignal.set(response.user);
        this.loadingSignal.set(false);
        this.initializedSignal.set(true);
        return response.user;
      })
      .catch(error => {
        this.debug('Error fetching user', error);

        // Only clear token if it's an auth error (401)
        if (error.status === 401) {
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
  private setSession(authResult: AuthResponse): void {
    localStorage.setItem(this.tokenKey, authResult.token);
    this.debug('Token stored in localStorage');
  }

  /**
   * Login user
   * @returns Promise that resolves to user when login is successful
   */
  login(credentials: LoginRequest): Promise<User> {
    this.debug('Login attempt', credentials.email);
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    // FIX: Transform field names to match backend expectations
    const backendCredentials = {
      email: credentials.email,
      passwordHash: credentials.passwordHash, // Transform password to passwordHash
    };

    return firstValueFrom(
      this.http.post<AuthResponse>(`${this.apiUrl}/login`, backendCredentials)
    )
      .then(response => {
        this.debug('Login successful', response);
        this.setSession(response);
        this.currentUserSignal.set(response.user);
        this.loadingSignal.set(false);
        this.router.navigate(['/profile']);
        return response.user;
      })
      .catch(error => {
        this.debug('Login error', error);
        this.errorSignal.set(error.error?.message || 'Login failed');
        this.loadingSignal.set(false);
        return Promise.reject(error);
      });
  }

  /**
   * Register a new user
   * @returns Promise that resolves to user when registration is successful
   */
  register(userData: RegisterRequest): Promise<User> {
    this.debug('Registration attempt', userData.email);
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    // FIX: Transform field names to match backend expectations
    const backendUserData = {
      email: userData.email,
      passwordHash: userData.passwordHash, // Transform password to passwordHash
      name: userData.name,
    };

    return firstValueFrom(
      this.http.post<AuthResponse>(`${this.apiUrl}/register`, backendUserData)
    )
      .then(response => {
        this.debug('Registration successful', response);
        this.setSession(response);
        this.currentUserSignal.set(response.user);
        this.loadingSignal.set(false);
        this.router.navigate(['/profile']);
        return response.user;
      })
      .catch(error => {
        this.debug('Registration error', error);
        this.errorSignal.set(error.error?.message || 'Registration failed');
        this.loadingSignal.set(false);
        return Promise.reject(error);
      });
  }

  /**
   * Logout user
   * @returns Promise that resolves when logout is complete
   */
  logout(): Promise<void> {
    this.debug('Logging out user');

    try {
      // First try to call the logout endpoint if user is logged in
      if (this.isLoggedIn()) {
        return firstValueFrom(this.http.post<void>(`${this.apiUrl}/logout`, {}))
          .then(() => {
            localStorage.removeItem(this.tokenKey);
            this.currentUserSignal.set(null);
            this.router.navigate(['/login']);
            return Promise.resolve();
          })
          .catch(() => {
            // Even if the logout endpoint fails, clear local state
            localStorage.removeItem(this.tokenKey);
            this.currentUserSignal.set(null);
            this.router.navigate(['/login']);
            return Promise.resolve();
          });
      } else {
        // If not logged in, just clear local state
        localStorage.removeItem(this.tokenKey);
        this.currentUserSignal.set(null);
        this.router.navigate(['/login']);
        return Promise.resolve();
      }
    } catch (error) {
      // Still try to clear local state even if an error occurs
      localStorage.removeItem(this.tokenKey);
      this.currentUserSignal.set(null);
      this.router.navigate(['/login']);
      return Promise.reject(error);
    }
  }

  /**
   * Get token from localStorage
   * @returns The authentication token or null if not available
   */
  getToken(): string | null {
    const token = localStorage.getItem(this.tokenKey);
    this.debug(`getToken called, token present: ${!!token}`);
    return token;
  }

  /**
   * Check if the auth token exists
   * @returns True if token exists in localStorage
   */
  hasToken(): boolean {
    return !!this.getToken();
  }

  /**
   * Create authorization headers for HTTP requests
   * @returns Headers object with Authorization header if token exists
   */
  getAuthHeaders(): { Authorization?: string } {
    const token = this.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
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
