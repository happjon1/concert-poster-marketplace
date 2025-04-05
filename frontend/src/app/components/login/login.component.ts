import { Component } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  FormsModule,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';
import { LoginRequest } from '../../models/login-request.model';

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
    public authService: AuthService
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

    // Create login request with correct field name for backend
    const loginData: LoginRequest = {
      email: this.loginForm.get('email')?.value,
      passwordHash: this.loginForm.get('password')?.value, // Changed from password to passwordHash
    };

    try {
      await this.authService.login(loginData);
      this.submitting = false;
    } catch (error: any) {
      this.submitting = false;
      if (error?.error?.message) {
        this.errorMessage = error.error.message;
      } else {
        this.errorMessage = 'Login failed. Please check your credentials.';
      }
    }
  }
}
