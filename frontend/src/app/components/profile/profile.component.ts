import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import {
  TrpcService,
  CreateAddressInput,
  UpdateAddressInput,
  UpdateUserInput,
  Address,
} from '../../services/trpc.service';
import { PaymentMethod } from '../../services/stripe.service';
import { StripeService } from '../../services/stripe.service';

// Import our subcomponents
import { ProfileHeaderComponent } from './profile-header/profile-header.component';
import { ProfileDetailsComponent } from './profile-details/profile-details.component';
import { ProfileEditFormComponent } from './profile-edit-form/profile-edit-form.component';
import { ProfileAddressListComponent } from './profile-address-list/profile-address-list.component';
import { ProfilePaymentComponent } from './profile-payment/profile-payment.component';
import { ToastNotificationComponent } from './toast-notification/toast-notification.component';

// Define TabType enum
export enum TabType {
  BASIC = 'basic',
  ADDRESSES = 'addresses',
  PAYMENT = 'payment',
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    ProfileHeaderComponent,
    ProfileDetailsComponent,
    ProfileEditFormComponent,
    ProfileAddressListComponent,
    ProfilePaymentComponent,
    ToastNotificationComponent,
  ],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
})
export class ProfileComponent implements OnInit {
  public authService = inject(AuthService);
  private trpcService = inject(TrpcService);
  private stripeService = inject(StripeService);

  // Make TabType available in the template
  TabType = TabType;

  // Convert all properties to signals
  editMode = signal(false);
  editBasicDetails = signal(false);
  editAddresses = signal(false);
  editPayment = signal(false);
  saving = signal(false);
  showToast = signal(false);
  toastMessage = signal('');
  activeTab = signal<TabType>(TabType.BASIC); // Default active tab
  paymentMethods = signal<PaymentMethod[]>([]);

  ngOnInit() {
    // Load payment methods when component initializes
    this.loadPaymentMethods();
  }

  private loadPaymentMethods() {
    this.stripeService.loadPaymentMethods().subscribe({
      next: methods => {
        this.paymentMethods.set(methods);
      },
      error: err => {
        console.error('Error loading payment methods:', err);
        this.toastMessage.set('Failed to load payment methods');
        this.showToast.set(true);
      },
    });
  }

  setActiveTab(tab: TabType) {
    this.activeTab.set(tab);

    // Reload payment methods when switching to payment tab
    if (tab === TabType.PAYMENT) {
      this.loadPaymentMethods();
    }
  }

  // Basic Details tab methods
  enableBasicDetailsEdit() {
    this.editBasicDetails.set(true);
  }

  cancelBasicDetailsEdit() {
    this.editBasicDetails.set(false);
  }

  // Addresses tab methods
  enableAddressesEdit() {
    this.editAddresses.set(true);
  }

  cancelAddressesEdit() {
    this.editAddresses.set(false);
  }

  // Payment tab methods
  enablePaymentEdit() {
    this.editPayment.set(true);
  }

  cancelPaymentEdit() {
    this.editPayment.set(false);
  }

  async deleteAddress(addressId: string) {
    if (!addressId) return;

    try {
      this.saving.set(true);
      await this.trpcService.deleteAddress(addressId);

      // Refresh user data to update the addresses list
      await this.authService.fetchCurrentUser();

      this.toastMessage.set('Address deleted successfully');
      this.showToast.set(true);
    } catch (error) {
      this.toastMessage.set(this.handleError(error, 'deleting your address'));
      this.showToast.set(true);
    } finally {
      this.saving.set(false);
    }
  }

  async deletePaymentMethod(paymentMethodId: string) {
    if (!paymentMethodId) return;

    try {
      this.saving.set(true);
      await this.trpcService.deletePaymentMethod({ paymentMethodId });

      // Refresh user data to update the payment methods list
      await this.authService.fetchCurrentUser();

      this.toastMessage.set('Payment method deleted successfully');
      this.showToast.set(true);
    } catch (error) {
      this.toastMessage.set(
        this.handleError(error, 'deleting your payment method')
      );
      this.showToast.set(true);
    } finally {
      this.saving.set(false);
    }
  }

  async saveProfile(formData: UpdateUserInput) {
    this.saving.set(true);
    const currentUser = this.authService.currentUser();

    if (!currentUser || !currentUser.id) {
      this.toastMessage.set('Error: User not authenticated');
      this.showToast.set(true);
      this.saving.set(false);
      return;
    }

    try {
      await this.trpcService.updateUser(formData);

      // Update the authService user data by fetching the current user
      await this.authService.fetchCurrentUser();

      this.toastMessage.set('Profile updated successfully');
      this.showToast.set(true);
      this.editBasicDetails.set(false);
    } catch (error) {
      this.toastMessage.set(this.handleError(error, 'updating your profile'));
      this.showToast.set(true);
    } finally {
      this.saving.set(false);
    }
  }

  async saveAddresses(formData: {
    addresses: (Address & { isDefault?: boolean })[];
  }) {
    this.saving.set(true);
    const currentUser = this.authService.currentUser();

    if (!currentUser || !currentUser.id) {
      this.toastMessage.set('Error: User not authenticated');
      this.showToast.set(true);
      this.saving.set(false);
      return;
    }

    try {
      // Process addresses
      if (formData.addresses && formData.addresses.length > 0) {
        // Process each address (create new or update existing)
        for (const address of formData.addresses) {
          if (!address.address1 || !address.city || !address.country) {
            // Skip incomplete addresses
            continue;
          }

          // Format the address data - separate structure based on create vs update
          if (address.id) {
            // Update existing address - cast to the correct type
            const updateAddressData: UpdateAddressInput = {
              id: address.id,
              label: address.label ?? undefined,
              address1: address.address1,
              address2: address.address2 ?? undefined,
              city: address.city,
              state: address.state ?? undefined,
              zip: address.zip ?? undefined,
              country: address.country,
              isDefault: address.isDefault,
            };

            await this.trpcService.updateAddress(updateAddressData);

            // If this is set as default, update user's default address
            if (address.isDefault) {
              await this.trpcService.setDefaultAddress(address.id);
            }
          } else {
            // Create new address - cast to the correct type
            const createAddressData: CreateAddressInput = {
              label: address.label ?? undefined,
              address1: address.address1,
              address2: address.address2 ?? undefined,
              city: address.city,
              state: address.state ?? undefined,
              zip: address.zip ?? undefined,
              country: address.country,
              isDefault: address.isDefault,
            };

            const newAddress =
              await this.trpcService.createAddress(createAddressData);

            // If this is set as default and it's a new address, update user's default address
            if (address.isDefault && newAddress.id) {
              await this.trpcService.setDefaultAddress(newAddress.id);
            }
          }
        }
      }

      // Update the authService user data by fetching the current user
      // This will also retrieve the updated addresses
      await this.authService.fetchCurrentUser();

      this.toastMessage.set('Addresses updated successfully');
      this.showToast.set(true);
      this.editAddresses.set(false);
    } catch (error) {
      this.toastMessage.set(this.handleError(error, 'updating your addresses'));
      this.showToast.set(true);
    } finally {
      this.saving.set(false);
    }
  }

  async savePaymentMethods(formData: { paymentMethods: PaymentMethod[] }) {
    this.saving.set(true);
    const currentUser = this.authService.currentUser();

    if (!currentUser || !currentUser.id) {
      this.toastMessage.set('Error: User not authenticated');
      this.showToast.set(true);
      this.saving.set(false);
      return;
    }

    try {
      // Process payment methods - implementation depends on the backend API
      if (formData.paymentMethods && formData.paymentMethods.length > 0) {
        for (const method of formData.paymentMethods) {
          // Handle payment methods update/creation based on backend API
          // This is just a placeholder - actual implementation will depend on your Stripe integration
          if (method.id) {
            // Update existing payment method
            await this.trpcService.updatePaymentMethod(method);

            // Set default if necessary
            if (method.isDefault) {
              await this.trpcService.setDefaultPaymentMethod(method.id);
            }
          } else {
            // New payment methods should be handled via Stripe Elements in the UI
            // Any new payment methods would likely be created through a separate flow
          }
        }
      }

      // Update the authService user data by fetching the current user
      await this.authService.fetchCurrentUser();

      this.toastMessage.set('Payment information updated successfully');
      this.showToast.set(true);
      this.editPayment.set(false);
    } catch (error) {
      this.toastMessage.set(
        this.handleError(error, 'updating your payment information')
      );
      this.showToast.set(true);
    } finally {
      this.saving.set(false);
    }
  }

  hideToast() {
    this.showToast.set(false);
  }

  // Extract error handling to a reusable method
  private handleError(error: unknown, context: string): string {
    console.error(`Error ${context}:`, error);

    let errorMessage = `An unknown error occurred while ${context}`;

    if (error instanceof Error) {
      errorMessage = `Error: ${error.message}`;
    } else if (typeof error === 'object' && error !== null) {
      if ('message' in error) {
        errorMessage = `Error: ${(error as Record<string, string>)['message']}`;
      } else if ('error' in error) {
        errorMessage = `Error: ${(error as Record<string, string>)['error']}`;
      } else {
        errorMessage = `Error ${context}. Please try again.`;
      }
    }

    return errorMessage;
  }
}
