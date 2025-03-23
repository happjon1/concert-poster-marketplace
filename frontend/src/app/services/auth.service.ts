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
  private loadingSignal = signal<boolean>(false);
  private errorSignal = signal<string | null>(null);

  // Computed signals
  public isLoggedIn = computed(() => !!this.currentUserSignal());
  public currentUser = this.currentUserSignal.asReadonly();
  public loading = this.loadingSignal.asReadonly();
  public error = this.errorSignal.asReadonly();

  constructor() {
    // Debug effect to log auth state changes
    effect(() => {
      console.log('Auth state changed:', {
        isLoggedIn: this.isLoggedIn(),
        currentUser: this.currentUserSignal(),
        token: this.getToken(),
      });
    });

    // Initialize auth state from stored token
    this.loadUserFromStorage();
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

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  private setSession(authResult: AuthResponse): void {
    localStorage.setItem(this.tokenKey, authResult.token);
    console.log('Token stored in localStorage');
  }

  private loadUserFromStorage(): void {
    const token = this.getToken();
    console.log('Checking for token:', token ? 'Found' : 'Not found');

    if (token) {
      this.fetchCurrentUser();
    }
  }
}
