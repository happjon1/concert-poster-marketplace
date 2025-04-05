import { Component, inject } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  FormsModule,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';
import { RegisterRequest } from '../../models/register-request.model';
import { HttpErrorResponse } from '@angular/common/http';

// Password matching validator
const passwordMatchValidator = (
  control: AbstractControl
): ValidationErrors | null => {
  const password = control.get('password');
  const confirmPassword = control.get('confirmPassword');

  if (password && confirmPassword && password.value !== confirmPassword.value) {
    return { passwordMismatch: true };
  }
  return null;
};

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, RouterLink, CommonModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  public authService = inject(AuthService);

  hidePassword = true;
  hideConfirmPassword = true;
  acceptTerms = false;
  submitting = false;
  errorMessage = '';

  passwordStrength = 0;

  registerForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    passwordGroup: this.fb.group(
      {
        password: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', [Validators.required]],
      },
      { validators: passwordMatchValidator }
    ),
    name: ['', [Validators.minLength(2)]],
  });

  get passwordControl() {
    return this.registerForm.get('passwordGroup')?.get('password');
  }

  get confirmPasswordControl() {
    return this.registerForm.get('passwordGroup')?.get('confirmPassword');
  }

  get passwordGroup() {
    return this.registerForm.get('passwordGroup');
  }

  onPasswordInput() {
    const password = this.passwordControl?.value || '';

    // Calculate password strength
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (/[A-Z]/.test(password)) strength += 25;
    if (/[0-9]/.test(password)) strength += 25;
    if (/[^A-Za-z0-9]/.test(password)) strength += 25;

    this.passwordStrength = strength;
  }

  getPasswordStrengthText() {
    if (this.passwordStrength < 25) return 'Very Weak';
    if (this.passwordStrength < 50) return 'Weak';
    if (this.passwordStrength < 75) return 'Good';
    if (this.passwordStrength < 100) return 'Strong';
    return 'Very Strong';
  }

  async onSubmit(): Promise<void> {
    if (this.registerForm.invalid || !this.acceptTerms) {
      // Mark all fields as touched to show validation errors
      this.registerForm.markAllAsTouched();
      return;
    }

    this.submitting = true;
    this.errorMessage = '';

    // Create request object that matches backend expectations
    const formData: RegisterRequest = {
      email: this.registerForm.get('email')?.value,
      passwordHash: this.passwordControl?.value, // Changed from password to passwordHash
      name: this.registerForm.get('name')?.value || undefined,
    };

    try {
      // Use await with the Promise-returning method
      await this.authService.register(formData);
      // Registration successful - handled by auth service
      this.submitting = false;
    } catch (error: unknown) {
      this.submitting = false;

      // Properly handle HttpErrorResponse type
      const httpError = error as HttpErrorResponse;

      if (httpError?.error?.message) {
        this.errorMessage = httpError.error.message;
      } else {
        this.errorMessage = 'Registration failed. Please try again.';
      }
    }
  }
}
