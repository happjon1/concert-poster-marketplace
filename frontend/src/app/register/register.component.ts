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

// Angular Material Imports
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatStepperModule } from '@angular/material/stepper';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../services/auth.service';

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
  imports: [
    ReactiveFormsModule,
    FormsModule,
    RouterLink,
    MatCardModule,
    MatInputModule,
    MatFormFieldModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatDividerModule,
    MatStepperModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  public authService = inject(AuthService);

  hidePassword = true;
  hideConfirmPassword = true;
  acceptTerms = false;

  passwordStrength = 0;

  registerForm: FormGroup = this.fb.group({
    username: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    passwordGroup: this.fb.group(
      {
        password: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', [Validators.required]],
      },
      { validators: passwordMatchValidator }
    ),
    firstName: [''],
    lastName: [''],
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

  getPasswordStrengthColor() {
    if (this.passwordStrength < 50) return 'warn';
    if (this.passwordStrength < 75) return 'accent';
    return 'primary';
  }

  getPasswordStrengthText() {
    if (this.passwordStrength < 25) return 'Very Weak';
    if (this.passwordStrength < 50) return 'Weak';
    if (this.passwordStrength < 75) return 'Good';
    if (this.passwordStrength < 100) return 'Strong';
    return 'Very Strong';
  }

  onSubmit(): void {
    if (this.registerForm.invalid || !this.acceptTerms) {
      return;
    }

    const formData = {
      username: this.registerForm.get('username')?.value,
      email: this.registerForm.get('email')?.value,
      password: this.passwordControl?.value,
      firstName: this.registerForm.get('firstName')?.value,
      lastName: this.registerForm.get('lastName')?.value,
    };

    this.authService.register(formData);
  }
}
