import {
  ChangeDetectionStrategy,
  Component,
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
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, FormsModule, CommonModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  hidePassword = true;
  rememberMe = false;
  errorMessage = signal<string>('');
  submitting = signal<boolean>(false);
  returnUrl = '/'; // Default redirect URL

  constructor(
    private fb: FormBuilder,
    public authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  ngOnInit(): void {
    // Get return URL from route parameters or default to '/'
    this.route.queryParams.subscribe(params => {
      this.returnUrl = params['returnUrl'] || '/';
      console.log(
        `Login component initialized with returnUrl: ${this.returnUrl}`
      );
    });
  }

  async onSubmit(): Promise<void> {
    if (!this.loginForm.valid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set('');

    try {
      // Using the updated login method that now returns an Observable
      await this.authService.login({
        email: this.loginForm.value.email,
        passwordHash: this.loginForm.value.password,
      });

      this.submitting.set(false);

      // Navigate to the return URL after successful login
      console.log(`Login successful, redirecting to: ${this.returnUrl}`);
      this.router.navigateByUrl(this.returnUrl);
    } catch (error: unknown) {
      this.submitting.set(false);

      // Fixed error handling for tRPC errors
      if (typeof error === 'object' && error !== null) {
        // Handle tRPC error format (shape property)
        if (
          'shape' in error &&
          typeof error.shape === 'object' &&
          error.shape &&
          'message' in error.shape
        ) {
          this.errorMessage.set(String(error.shape.message));
        }
        // Handle standard Error objects
        else if (error instanceof Error) {
          this.errorMessage.set(error.message);
        }
        // Handle objects with message property
        else if ('message' in error && typeof error.message === 'string') {
          this.errorMessage.set(error.message);
        }
        // Handle objects with data.message path (common in some APIs)
        else if (
          'data' in error &&
          typeof error.data === 'object' &&
          error.data &&
          'message' in error.data
        ) {
          this.errorMessage.set(String(error.data.message));
        } else {
          this.errorMessage.set('Login failed. Please check your credentials.');
        }
      } else {
        this.errorMessage.set('Login failed. Please check your credentials.');
      }

      console.error('Login error:', error);
    }
  }
}
