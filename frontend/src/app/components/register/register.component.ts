import { Component, Inject, inject, OnInit } from '@angular/core';
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
})
export class RegisterComponent implements OnInit {
  trpc = inject(TrpcService);
  registerForm!: FormGroup; // Ensure the form is initialized
  acceptTerms = false; // For the terms and conditions checkbox
  hidePassword = true;
  hideConfirmPassword = true;

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

  onSubmit(): void {
    if (this.registerForm.valid && this.acceptTerms) {
      this.trpc.register(this.registerForm.value);

      this.router.navigate(['/']);
    } else {
      console.error('Form is invalid or terms not accepted');
    }
  }
}
