import { Component } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  FormsModule,
} from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, FormsModule, CommonModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent {
  loginForm: FormGroup;
  hidePassword = true;
  rememberMe = false;
  errorMessage = '';
  submitting = false;

  constructor(
    private fb: FormBuilder,
    public authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  async onSubmit(): Promise<void> {
    if (!this.loginForm.valid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.submitting = true;
    this.errorMessage = '';

    try {
      // Using the updated login method that now returns an Observable
      await this.authService.login({
        email: this.loginForm.value.email,
        passwordHash: this.loginForm.value.password,
      });

      this.submitting = false;
      // Navigate to home or dashboard after successful login
      this.router.navigate(['/']);
    } catch (error: unknown) {
      this.submitting = false;

      // Fixed error handling for tRPC errors
      if (typeof error === 'object' && error !== null) {
        // Handle tRPC error format (shape property)
        if (
          'shape' in error &&
          typeof error.shape === 'object' &&
          error.shape &&
          'message' in error.shape
        ) {
          this.errorMessage = String(error.shape.message);
        }
        // Handle standard Error objects
        else if (error instanceof Error) {
          this.errorMessage = error.message;
        }
        // Handle objects with message property
        else if ('message' in error && typeof error.message === 'string') {
          this.errorMessage = error.message;
        }
        // Handle objects with data.message path (common in some APIs)
        else if (
          'data' in error &&
          typeof error.data === 'object' &&
          error.data &&
          'message' in error.data
        ) {
          this.errorMessage = String(error.data.message);
        } else {
          this.errorMessage = 'Login failed. Please check your credentials.';
        }
      } else {
        this.errorMessage = 'Login failed. Please check your credentials.';
      }

      console.error('Login error:', error);
    }
  }
}
