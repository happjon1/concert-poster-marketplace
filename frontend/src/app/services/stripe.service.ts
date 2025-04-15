import { Injectable } from '@angular/core';
import {
  loadStripe,
  StripeElements,
  StripeElementsOptions,
  StripeCardElement,
  StripeCardElementOptions,
} from '@stripe/stripe-js';
import { environment } from '../../environments/environment';
import { TrpcService } from './trpc.service';
import { BehaviorSubject, Observable, from } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';

// Define interfaces for Stripe responses
export interface PaymentMethod {
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
  userId?: string;
}

export interface ConnectedAccountResponse {
  success: boolean;
  accountId: string;
  accountLink: string;
}

export interface AccountStatusResponse {
  hasAccount: boolean;
  accountStatus: string | null;
  canReceivePayments?: boolean;
  accountDetails: {
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
    requirements: unknown; // Using unknown instead of any for better type safety
  } | null;
}

export interface AccountLinkResponse {
  success: boolean;
  accountLink: string;
}

export interface LoginLinkResponse {
  success: boolean;
  loginLink: string;
}

@Injectable({
  providedIn: 'root',
})
export class StripeService {
  private stripePromise = loadStripe(environment.stripePublishableKey);
  private elementsInstance: StripeElements | null = null;
  private paymentMethodsSubject = new BehaviorSubject<PaymentMethod[]>([]);

  public paymentMethods$ = this.paymentMethodsSubject.asObservable();

  constructor(private trpc: TrpcService) {}

  /**
   * Initialize Stripe Elements
   */
  async getStripeElements(
    options?: StripeElementsOptions
  ): Promise<StripeElements> {
    if (this.elementsInstance) {
      return this.elementsInstance;
    }

    const stripe = await this.stripePromise;
    if (!stripe) {
      throw new Error('Stripe failed to load');
    }

    // Using type assertion to handle Stripe's complex typing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.elementsInstance = stripe.elements(options as any);
    return this.elementsInstance;
  }

  /**
   * Get saved payment methods from the backend
   */
  loadPaymentMethods(): Observable<PaymentMethod[]> {
    return from(this.trpc.getPaymentMethods()).pipe(
      tap(methods => this.paymentMethodsSubject.next(methods))
    );
  }

  /**
   * Save a new payment method
   */
  savePaymentMethod(
    paymentMethodId: string,
    makeDefault = false
  ): Observable<{ success: boolean; paymentMethod: PaymentMethod }> {
    return from(
      this.trpc.createPaymentMethod({ paymentMethodId, makeDefault })
    ).pipe(
      switchMap(() =>
        this.loadPaymentMethods().pipe(
          map(methods => ({ success: true, paymentMethod: methods[0] }))
        )
      )
    );
  }

  /**
   * Delete a payment method
   */
  deletePaymentMethod(
    paymentMethodId: string
  ): Observable<{ success: boolean }> {
    return from(this.trpc.deletePaymentMethod({ paymentMethodId })).pipe(
      switchMap(result => this.loadPaymentMethods().pipe(map(() => result)))
    );
  }

  /**
   * Create a Stripe Connect account for sellers
   */
  createConnectedAccount(): Observable<ConnectedAccountResponse> {
    return from(this.trpc.createConnectedAccount());
  }

  /**
   * Get the status of a seller's Stripe Connect account
   */
  getConnectedAccountStatus(): Observable<AccountStatusResponse> {
    return from(this.trpc.getConnectedAccountStatus());
  }

  /**
   * Create a new onboarding link for Stripe Connect
   */
  createAccountLink(): Observable<AccountLinkResponse> {
    return from(this.trpc.createAccountLink());
  }

  /**
   * Create a login link to the Stripe dashboard
   */
  createLoginLink(): Observable<LoginLinkResponse> {
    return from(this.trpc.createLoginLink());
  }

  /**
   * Create a card element that can be mounted to the DOM
   */
  async createCardElement(
    elementOptions: Partial<StripeCardElementOptions> = {}
  ): Promise<StripeCardElement> {
    const elements = await this.getStripeElements();
    return elements.create('card', {
      style: {
        base: {
          color: '#32325d',
          fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
          fontSmoothing: 'antialiased',
          fontSize: '16px',
          '::placeholder': {
            color: '#aab7c4',
          },
        },
        invalid: {
          color: '#fa755a',
          iconColor: '#fa755a',
        },
      },
      ...elementOptions,
    }) as StripeCardElement;
  }

  /**
   * Process the payment with the card element
   */
  async createPaymentMethod(cardElement: StripeCardElement): Promise<string> {
    const stripe = await this.stripePromise;
    if (!stripe) {
      throw new Error('Stripe failed to load');
    }

    const { paymentMethod, error } = await stripe.createPaymentMethod({
      type: 'card',
      card: cardElement,
    });

    if (error) {
      throw new Error(error.message);
    }

    if (!paymentMethod) {
      throw new Error('Failed to create payment method');
    }

    return paymentMethod.id;
  }
}
