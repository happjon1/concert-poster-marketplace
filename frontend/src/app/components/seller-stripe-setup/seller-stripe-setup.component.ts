import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StripeService } from '../../services/stripe.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-seller-stripe-setup',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './seller-stripe-setup.component.html',
  styleUrls: ['./seller-stripe-setup.component.scss'],
})
export class SellerStripeSetupComponent implements OnInit, OnDestroy {
  loading = false;
  error: string | null = null;

  // Stripe account status
  hasAccount = false;
  accountStatus: string | null = null;
  canReceivePayments = false;
  accountDetails: any = null;

  private destroy$ = new Subject<void>();

  constructor(private stripeService: StripeService) {}

  ngOnInit(): void {
    this.loadAccountStatus();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadAccountStatus(): void {
    this.loading = true;
    this.stripeService
      .getConnectedAccountStatus()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: response => {
          this.loading = false;
          this.hasAccount = response.hasAccount;
          this.accountStatus = response.accountStatus;
          this.canReceivePayments = response.canReceivePayments;
          this.accountDetails = response.accountDetails;
        },
        error: err => {
          this.loading = false;
          this.error = 'Failed to load Stripe account status';
          console.error('Stripe account status error:', err);
        },
      });
  }

  createStripeAccount(): void {
    this.loading = true;
    this.error = null;

    this.stripeService
      .createConnectedAccount()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: response => {
          this.loading = false;
          if (response.accountLink) {
            // Redirect to Stripe onboarding
            window.location.href = response.accountLink;
          } else {
            this.error = 'Failed to create account link';
          }
        },
        error: err => {
          this.loading = false;
          this.error = 'Failed to create Stripe account';
          console.error('Create Stripe account error:', err);
        },
      });
  }

  continueOnboarding(): void {
    this.loading = true;
    this.error = null;

    this.stripeService
      .createAccountLink()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: response => {
          this.loading = false;
          if (response.accountLink) {
            // Redirect to Stripe onboarding
            window.location.href = response.accountLink;
          } else {
            this.error = 'Failed to create account link';
          }
        },
        error: err => {
          this.loading = false;
          this.error = 'Failed to create account link';
          console.error('Create account link error:', err);
        },
      });
  }

  viewStripeDashboard(): void {
    this.loading = true;
    this.error = null;

    this.stripeService
      .createLoginLink()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: response => {
          this.loading = false;
          if (response.loginLink) {
            // Open Stripe dashboard in new tab
            window.open(response.loginLink, '_blank');
          } else {
            this.error = 'Failed to create Stripe dashboard link';
          }
        },
        error: err => {
          this.loading = false;
          this.error = 'Failed to create Stripe dashboard link';
          console.error('Create login link error:', err);
        },
      });
  }
}
