import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  FormsModule,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { TrpcService } from '../../services/trpc.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, RouterLink, CommonModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterComponent implements OnInit {
  trpc = inject(TrpcService);
  registerForm!: FormGroup; // Ensure the form is initialized
  acceptTerms = false; // For the terms and conditions checkbox
  hidePassword = true;
  hideConfirmPassword = true;
  submitting = signal<boolean>(false);
  errorMessage = signal<string>('');

  authService = inject(AuthService); // Injecting AuthService for authentication

  constructor(
    private fb: FormBuilder,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.registerForm = this.fb.group(
      {
        email: ['', [Validators.required, Validators.email]],
        name: ['', [Validators.minLength(2)]],
        password: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', [Validators.required]],
      },
      {
        validators: this.passwordMatchValidator, // Custom validator for password matching
      }
    );
  }

  // Custom validator to check if password and confirmPassword match
  passwordMatchValidator(group: FormGroup): Record<string, boolean> | null {
    const password = group.get('password')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { passwordMismatch: true };
  }

  async onSubmit(): Promise<void> {
    if (this.registerForm.valid && this.acceptTerms) {
      this.submitting.set(true);
      this.errorMessage.set('');

      try {
        await this.trpc.register({
          email: this.registerForm.value.email,
          name: this.registerForm.value.name,
          passwordHash: this.registerForm.value.password,
        });

        this.router.navigate(['/']);
      } catch (error) {
        console.error('Registration error:', error);
        if (error instanceof Error) {
          this.errorMessage.set(error.message);
        } else {
          this.errorMessage.set('Registration failed. Please try again.');
        }
      } finally {
        this.submitting.set(false);
      }
    } else {
      // Mark form controls as touched to trigger validation messages
      this.registerForm.markAllAsTouched();

      if (!this.acceptTerms) {
        this.errorMessage.set(
          'Please accept the terms and conditions to continue.'
        );
      }
    }
  }
}
