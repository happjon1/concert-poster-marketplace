import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import {
  FormGroup,
  FormControl,
  Validators,
  ReactiveFormsModule,
  FormsModule,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { TrpcService } from '../../services/trpc.service';

// Move validator outside the component as a standalone function
export function passwordMatchValidator(
  control: AbstractControl
): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;

  return password === confirmPassword ? null : { passwordMismatch: true };
}

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

  constructor(private router: Router) {}

  ngOnInit(): void {
    // Using FormGroup constructor directly instead of fb.group
    this.registerForm = new FormGroup(
      {
        email: new FormControl('', [Validators.required, Validators.email]),
        name: new FormControl('', [Validators.minLength(2)]),
        password: new FormControl('', [
          Validators.required,
          Validators.minLength(6),
        ]),
        confirmPassword: new FormControl('', [Validators.required]),
      },
      {
        validators: passwordMatchValidator, // Use standalone function
      }
    );
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
