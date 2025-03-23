import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../environment.dev';
import { AuthResponse } from '../models/auth-response.model';
import { LoginRequest } from '../models/login-request.model';
import { RegisterRequest } from '../models/register-request.model';
import { User } from '../models/user.model';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private apiUrl = `${environment.apiUrl}/auth`;
  private tokenKey = 'auth_token';

  // Signals
  private currentUserSignal = signal<User | null>(null);
  private loadingSignal = signal<boolean>(true); // Start with loading=true
  private errorSignal = signal<string | null>(null);
  private refreshingSignal = signal<boolean>(false);
  private refreshSuccessSignal = signal<boolean | null>(null);

  // Computed signals
  public isLoggedIn = computed(() => !!this.currentUserSignal());
  public currentUser = this.currentUserSignal.asReadonly();
  public loading = this.loadingSignal.asReadonly();
  public error = this.errorSignal.asReadonly();
  public isRefreshing = this.refreshingSignal.asReadonly();
  public refreshSuccess = this.refreshSuccessSignal.asReadonly();

  constructor() {
    // Debug effect to log auth state changes
    effect(() => {
      console.log('Auth state changed:', {
        isLoggedIn: this.isLoggedIn(),
        currentUser: this.currentUserSignal(),
        token: this.getToken(),
      });
    });

    // Initialize auth state immediately when service is created
    this.initializeAuthState();
  }

  // Initialize auth state on startup
  public initializeAuthState(): Promise<boolean> {
    console.log('Initializing auth state...');
    this.loadingSignal.set(true);

    const token = localStorage.getItem(this.tokenKey);

    if (token && this.isTokenValid(token)) {
      console.log('Valid token found, fetching user data');
      return this.fetchCurrentUserPromise();
    } else {
      if (token && !this.isTokenValid(token)) {
        console.log('Token expired, removing from storage');
        localStorage.removeItem(this.tokenKey);
      }

      console.log('No valid token found');
      this.loadingSignal.set(false);
      return Promise.resolve(false);
    }
  }

  register(userData: RegisterRequest): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    this.http
      .post<{
        message: string;
        user: User;
      }>(`${this.apiUrl}/register`, userData)
      .subscribe({
        next: () => {
          // Automatically log in after registration
          this.login({
            email: userData.email,
            password: userData.password,
          });
        },
        error: error => {
          this.errorSignal.set(error.error?.message || 'Registration failed');
          this.loadingSignal.set(false);
        },
      });
  }

  login(credentials: LoginRequest): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    this.http
      .post<AuthResponse>(`${this.apiUrl}/login`, credentials)
      .subscribe({
        next: response => {
          this.setSession(response);
          this.currentUserSignal.set(response.user);
          console.log('User logged in:', response.user);
          this.router.navigate(['/profile']);
          this.loadingSignal.set(false);
        },
        error: error => {
          console.error('Login error:', error);
          this.errorSignal.set(error.error?.message || 'Login failed');
          this.loadingSignal.set(false);
        },
      });
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    this.currentUserSignal.set(null);
    console.log('User logged out');
    this.router.navigate(['/login']);
  }

  fetchCurrentUser(): void {
    if (!this.getToken()) {
      console.log('No token found, skipping user fetch');
      this.loadingSignal.set(false);
      return;
    }

    this.loadingSignal.set(true);

    this.http.get<{ user: User }>(`${this.apiUrl}/me`).subscribe({
      next: response => {
        console.log('User fetched:', response.user);
        this.currentUserSignal.set(response.user);
        this.loadingSignal.set(false);
      },
      error: error => {
        console.error('Error fetching user:', error);
        // If token is invalid, clear storage
        this.logout();
        this.loadingSignal.set(false);
      },
    });
  }

  private fetchCurrentUserPromise(): Promise<boolean> {
    return new Promise(resolve => {
      const token = this.getToken();
      if (!token) {
        this.loadingSignal.set(false);
        resolve(false);
        return;
      }

      this.http.get<{ user: User }>(`${this.apiUrl}/me`).subscribe({
        next: response => {
          console.log('User fetched successfully:', response.user);
          this.currentUserSignal.set(response.user);
          this.loadingSignal.set(false);
          resolve(true);
        },
        error: error => {
          console.error('Error fetching user:', error);
          this.logout();
          this.loadingSignal.set(false);
          resolve(false);
        },
      });
    });
  }

  getToken(): string | null {
    const token = localStorage.getItem(this.tokenKey);

    if (!token) {
      return null;
    }

    // Only return valid tokens
    if (this.isTokenValid(token)) {
      return token;
    } else {
      // Remove expired token from storage
      console.log('Token expired, removing from storage');
      localStorage.removeItem(this.tokenKey);
      return null;
    }
  }

  private setSession(authResult: AuthResponse): void {
    localStorage.setItem(this.tokenKey, authResult.token);
    console.log('Token stored in localStorage');
  }

  private isTokenValid(token: string): boolean {
    try {
      // For JWT tokens
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp > Date.now() / 1000;
    } catch (e) {
      console.warn('Error validating token:', e);
      return false;
    }
  }

  /**
   * Refresh token using signals instead of Observable
   * Returns Promise<boolean> indicating success/failure
   */
  async refreshToken(): Promise<boolean> {
    const token = this.getToken();

    if (!token) {
      this.errorSignal.set('No token available');
      return false;
    }

    // Signal that refresh is in progress
    this.refreshingSignal.set(true);
    this.refreshSuccessSignal.set(null);
    this.errorSignal.set(null);

    try {
      // If your backend uses refresh tokens:
      // const refreshToken = localStorage.getItem('refresh_token');

      const response = await this.http
        .post<AuthResponse>(`${this.apiUrl}/refresh`, { token })
        .toPromise();

      if (response) {
        this.setSession(response);
        this.currentUserSignal.set(response.user);
        this.refreshSuccessSignal.set(true);
        this.refreshingSignal.set(false);
        return true;
      } else {
        throw new Error('Empty response from refresh token');
      }
    } catch (error: unknown) {
      console.error('Token refresh failed:', error);
      this.errorSignal.set(
        (error as { error?: { message?: string } }).error?.message ||
          'Token refresh failed'
      );
      this.refreshSuccessSignal.set(false);
      this.refreshingSignal.set(false);
      this.logout();
      return false;
    }

    // If your backend doesn't support token refresh yet, use this temporary solution:
    // this.refreshSuccessSignal.set(true);
    // this.refreshingSignal.set(false);
    // return true;
  }
}
