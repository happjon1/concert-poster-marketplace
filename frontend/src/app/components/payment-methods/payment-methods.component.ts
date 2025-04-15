import {
  Component,
  OnInit,
  AfterViewInit,
  OnDestroy,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { StripeService } from '../../services/stripe.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-payment-methods',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './payment-methods.component.html',
  styleUrls: ['./payment-methods.component.scss'],
})
export class PaymentMethodsComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  @ViewChild('cardElement') cardElement!: ElementRef;

  paymentMethods: any[] = [];
  cardForm = new FormGroup({
    nameOnCard: new FormControl('', Validators.required),
    makeDefault: new FormControl(false),
  });

  loading = false;
  error: string | null = null;
  cardComplete = false;
  cardInstance: any;

  private destroy$ = new Subject<void>();

  constructor(private stripeService: StripeService) {}

  ngOnInit(): void {
    this.loadPaymentMethods();

    this.stripeService.paymentMethods$
      .pipe(takeUntil(this.destroy$))
      .subscribe(methods => {
        this.paymentMethods = methods;
      });
  }

  ngAfterViewInit(): void {
    this.initCardElement();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.cardInstance) {
      this.cardInstance.destroy();
    }
  }

  async initCardElement(): Promise<void> {
    try {
      this.cardInstance = await this.stripeService.createCardElement();
      this.cardInstance.mount(this.cardElement.nativeElement);

      this.cardInstance.on('change', (event: any) => {
        this.cardComplete = event.complete;
        if (event.error) {
          this.error = event.error.message;
        } else {
          this.error = null;
        }
      });
    } catch (error) {
      this.error = 'Failed to initialize payment form';
      console.error('Card element error:', error);
    }
  }

  loadPaymentMethods(): void {
    this.loading = true;
    this.stripeService
      .loadPaymentMethods()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: methods => {
          this.loading = false;
        },
        error: err => {
          this.loading = false;
          this.error = 'Failed to load payment methods';
          console.error('Load payment methods error:', err);
        },
      });
  }

  async addPaymentMethod(): Promise<void> {
    if (!this.cardComplete || this.cardForm.invalid) {
      return;
    }

    this.loading = true;
    this.error = null;

    try {
      // Create a payment method with Stripe
      const paymentMethodId = await this.stripeService.createPaymentMethod(
        this.cardInstance
      );

      // Save the payment method in our database
      this.stripeService
        .savePaymentMethod(
          paymentMethodId,
          this.cardForm.value.makeDefault || false
        )
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.loading = false;
            this.cardForm.reset();
            this.cardInstance.clear();
          },
          error: err => {
            this.loading = false;
            this.error = 'Failed to save payment method';
            console.error('Save payment method error:', err);
          },
        });
    } catch (error: any) {
      this.loading = false;
      this.error = error.message || 'Failed to process payment information';
      console.error('Payment method error:', error);
    }
  }

  deletePaymentMethod(id: string): void {
    if (!confirm('Are you sure you want to remove this payment method?')) {
      return;
    }

    this.loading = true;
    this.stripeService
      .deletePaymentMethod(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.loading = false;
        },
        error: err => {
          this.loading = false;
          this.error = 'Failed to delete payment method';
          console.error('Delete payment method error:', err);
        },
      });
  }
}
