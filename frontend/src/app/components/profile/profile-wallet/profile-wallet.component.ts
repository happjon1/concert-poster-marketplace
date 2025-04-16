import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormGroup,
  FormControl,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { StripeService } from '../../../services/stripe.service';
import { Subject, takeUntil, firstValueFrom } from 'rxjs';
import {
  Stripe,
  StripeCardElement,
  StripeElementChangeEvent,
} from '@stripe/stripe-js';

// Define interfaces for payment method
interface PaymentMethod {
  id: string;
  stripePaymentId: string;
  type: string;
  isDefault: boolean;
  last4?: string | null;
  brand?: string | null;
  expiryMonth?: number | null;
  expiryYear?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

@Component({
  selector: 'app-profile-wallet',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile-wallet.component.html',
  styleUrls: ['./profile-wallet.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileWalletComponent
  implements OnInit, OnDestroy, AfterViewInit
{
  @ViewChild('cardElement') cardElement!: ElementRef<HTMLDivElement>;

  cardForm = new FormGroup({
    nameOnCard: new FormControl('', [Validators.required]),
    makeDefault: new FormControl(false),
  });

  paymentMethods = signal<PaymentMethod[]>([]);
  cardComplete = signal<boolean>(false);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);

  private stripe: Stripe | null = null;
  private card: StripeCardElement | null = null;
  private destroy$ = new Subject<void>();

  constructor(private stripeService: StripeService) {}

  ngOnInit(): void {
    this.loadPaymentMethods();

    // Subscribe to payment methods updates
    this.stripeService.paymentMethods$
      .pipe(takeUntil(this.destroy$))
      .subscribe(methods => {
        this.paymentMethods.set(methods);
      });
  }

  ngAfterViewInit(): void {
    this.initializeStripe();
  }

  ngOnDestroy(): void {
    // Clean up the card element and subscriptions
    if (this.card) {
      this.card.unmount();
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  async initializeStripe(): Promise<void> {
    try {
      // Create the card element
      this.card = await this.stripeService.createCardElement();

      // Mount it to the DOM
      if (this.cardElement && this.cardElement.nativeElement) {
        this.card.mount(this.cardElement.nativeElement);
      }

      // Listen for changes
      this.card.on('change', (event: StripeElementChangeEvent) => {
        this.cardComplete.set(event.complete);

        if (event.error) {
          this.error.set(event.error.message);
        } else {
          this.error.set(null);
        }
      });
    } catch (error) {
      console.error('Error initializing Stripe:', error);
      this.error.set('Failed to load Stripe payment form');
    }
  }

  loadPaymentMethods(): void {
    this.loading.set(true);
    this.stripeService
      .loadPaymentMethods()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.loading.set(false);
        },
        error: (err: Error) => {
          this.loading.set(false);
          this.error.set('Failed to load payment methods');
          console.error('Error loading payment methods:', err);
        },
      });
  }

  async addPaymentMethod(): Promise<void> {
    if (!this.cardComplete() || this.cardForm.invalid || !this.card) {
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    try {
      // Create the payment method with Stripe
      const paymentMethodId = await this.stripeService.createPaymentMethod(
        this.card
      );

      // Save the payment method in our backend
      await firstValueFrom(
        this.stripeService.savePaymentMethod(
          paymentMethodId,
          this.cardForm.value.makeDefault || false
        )
      );

      // Reset the form
      this.cardForm.reset({
        nameOnCard: '',
        makeDefault: false,
      });

      // Reset the card element
      this.card.clear();
    } catch (error) {
      console.error('Error adding payment method:', error);
      this.error.set(
        error instanceof Error ? error.message : 'Failed to add payment method'
      );
    } finally {
      this.loading.set(false);
    }
  }

  deletePaymentMethod(id: string): void {
    if (confirm('Are you sure you want to remove this payment method?')) {
      this.loading.set(true);
      this.stripeService
        .deletePaymentMethod(id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.loading.set(false);
          },
          error: (err: Error) => {
            this.loading.set(false);
            this.error.set('Failed to remove payment method');
            console.error('Error removing payment method:', err);
          },
        });
    }
  }
}
