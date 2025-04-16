import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  input,
  output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
} from '@angular/forms';
import { PaymentMethod } from '../../../services/stripe.service';
import { StripeService } from '../../../services/stripe.service';

@Component({
  selector: 'app-profile-payment',
  templateUrl: 'profile-payment.component.html',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  styles: [
    `
      .payment-methods-container {
        margin-bottom: 1rem;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfilePaymentComponent implements OnInit {
  paymentMethods = input<PaymentMethod[]>([]);
  saving = input<boolean>(false);
  savePaymentMethods = output<{
    paymentMethods: PaymentMethod[];
  }>();
  cancelEdit = output<void>();
  deletePaymentMethod = output<string>();

  paymentForm!: FormGroup;
  showAddCardForm = false;

  constructor(
    private fb: FormBuilder,
    private stripeService: StripeService
  ) {}

  ngOnInit() {
    this.initializeForm();
  }

  initializeForm() {
    // Create payment methods array
    const methodsControls = this.paymentMethods().map(method => {
      return this.fb.group({
        id: [method.id],
        isDefault: [method.isDefault],
      });
    });

    // Create the main form with the payment methods array
    this.paymentForm = this.fb.group({
      paymentMethods: this.fb.array(methodsControls),
    });
  }

  get paymentMethodsArray() {
    return this.paymentForm.get('paymentMethods') as FormArray;
  }

  // Helper method to set a payment method as default
  setAsDefault(index: number): void {
    const paymentMethods = this.paymentMethodsArray.controls;

    // Update form controls to ensure only one is default
    paymentMethods.forEach((control, i) => {
      control.get('isDefault')?.setValue(i === index);
    });
  }

  // Helper methods for displaying card info
  getCardLabel(method: PaymentMethod): string {
    return method.brand
      ? `${method.brand} ending in ${method.last4}`
      : 'Credit Card';
  }

  getCardExpiry(method: PaymentMethod): string {
    const month = method.expiryMonth || 'MM';
    const year = method.expiryYear || 'YY';
    return `${month}/${year}`;
  }

  toggleAddCardForm() {
    this.showAddCardForm = !this.showAddCardForm;
  }

  removePaymentMethod(index: number) {
    const method = this.paymentMethods()[index];
    if (method.id) {
      this.deletePaymentMethod.emit(method.id);
    }
    this.paymentMethodsArray.removeAt(index);
  }

  onSubmit() {
    if (this.paymentForm.valid) {
      // Update the payment methods with form values
      const formValues = this.paymentForm.value.paymentMethods || [];
      const updatedMethods = this.paymentMethods().map((method, index) => {
        return {
          ...method,
          isDefault:
            index < formValues.length ? formValues[index].isDefault : false,
        };
      });

      this.savePaymentMethods.emit({ paymentMethods: updatedMethods });
    }
  }

  onCancel() {
    this.cancelEdit.emit();
  }
}
