import { Component, inject, OnInit } from '@angular/core';
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

  editMode = false;
  editBasicDetails = false;
  editAddresses = false;
  editPayment = false;
  saving = false;
  showToast = false;
  toastMessage = '';
  activeTab = 'basic'; // Default active tab
  paymentMethods: PaymentMethod[] = [];

  ngOnInit() {
    // Load payment methods when component initializes
    this.loadPaymentMethods();
  }

  private loadPaymentMethods() {
    this.stripeService.loadPaymentMethods().subscribe({
      next: methods => {
        this.paymentMethods = methods;
      },
      error: err => {
        console.error('Error loading payment methods:', err);
        this.toastMessage = 'Failed to load payment methods';
        this.showToast = true;
      },
    });
  }

  setActiveTab(tab: string) {
    this.activeTab = tab;

    // Reload payment methods when switching to payment tab
    if (tab === 'payment') {
      this.loadPaymentMethods();
    }
  }

  // Basic Details tab methods
  enableBasicDetailsEdit() {
    this.editBasicDetails = true;
  }

  cancelBasicDetailsEdit() {
    this.editBasicDetails = false;
  }

  // Addresses tab methods
  enableAddressesEdit() {
    this.editAddresses = true;
  }

  cancelAddressesEdit() {
    this.editAddresses = false;
  }

  // Payment tab methods
  enablePaymentEdit() {
    this.editPayment = true;
  }

  cancelPaymentEdit() {
    this.editPayment = false;
  }

  // Legacy method (for backward compatibility)
  enableEditMode() {
    if (this.activeTab === 'basic') {
      this.enableBasicDetailsEdit();
    } else if (this.activeTab === 'addresses') {
      this.enableAddressesEdit();
    } else if (this.activeTab === 'payment') {
      this.enablePaymentEdit();
    }
  }

  // Legacy method (for backward compatibility)
  cancelEdit() {
    if (this.activeTab === 'basic') {
      this.cancelBasicDetailsEdit();
    } else if (this.activeTab === 'addresses') {
      this.cancelAddressesEdit();
    } else if (this.activeTab === 'payment') {
      this.cancelPaymentEdit();
    }
  }

  async deleteAddress(addressId: string) {
    if (!addressId) return;

    try {
      this.saving = true;
      await this.trpcService.deleteAddress(addressId);

      // Refresh user data to update the addresses list
      await this.authService.fetchCurrentUser();

      this.toastMessage = 'Address deleted successfully';
      this.showToast = true;
    } catch (error) {
      console.error('Error deleting address:', error);

      // Extract a readable error message from the error object
      let errorMessage =
        'An unknown error occurred while deleting your address';

      if (error instanceof Error) {
        errorMessage = `Error: ${error.message}`;
      } else if (typeof error === 'object' && error !== null) {
        // Handle case where error might be a JSON object
        if ('message' in error) {
          errorMessage = `Error: ${(error as Record<string, string>)['message']}`;
        } else if ('error' in error) {
          errorMessage = `Error: ${(error as Record<string, string>)['error']}`;
        } else {
          // Avoid stringifying the entire object
          errorMessage = 'Error deleting address. Please try again.';
        }
      }

      this.toastMessage = errorMessage;
      this.showToast = true;
    } finally {
      this.saving = false;
    }
  }

  async deletePaymentMethod(paymentMethodId: string) {
    if (!paymentMethodId) return;

    try {
      this.saving = true;
      await this.trpcService.deletePaymentMethod({ paymentMethodId });

      // Refresh user data to update the payment methods list
      await this.authService.fetchCurrentUser();

      this.toastMessage = 'Payment method deleted successfully';
      this.showToast = true;
    } catch (error) {
      console.error('Error deleting payment method:', error);

      let errorMessage =
        'An unknown error occurred while deleting your payment method';

      if (error instanceof Error) {
        errorMessage = `Error: ${error.message}`;
      } else if (typeof error === 'object' && error !== null) {
        if ('message' in error) {
          errorMessage = `Error: ${(error as Record<string, string>)['message']}`;
        } else if ('error' in error) {
          errorMessage = `Error: ${(error as Record<string, string>)['error']}`;
        } else {
          errorMessage = 'Error deleting payment method. Please try again.';
        }
      }

      this.toastMessage = errorMessage;
      this.showToast = true;
    } finally {
      this.saving = false;
    }
  }

  async saveProfile(formData: UpdateUserInput) {
    this.saving = true;
    const currentUser = this.authService.currentUser();

    if (!currentUser || !currentUser.id) {
      this.toastMessage = 'Error: User not authenticated';
      this.showToast = true;
      this.saving = false;
      return;
    }

    try {
      await this.trpcService.updateUser(formData);

      // Update the authService user data by fetching the current user
      await this.authService.fetchCurrentUser();

      this.toastMessage = 'Profile updated successfully';
      this.showToast = true;
      this.editBasicDetails = false;
    } catch (error) {
      console.error('Error updating profile:', error);

      // Extract a readable error message from the error object
      let errorMessage =
        'An unknown error occurred while updating your profile';

      if (error instanceof Error) {
        errorMessage = `Error: ${error.message}`;
      } else if (typeof error === 'object' && error !== null) {
        if ('message' in error) {
          errorMessage = `Error: ${(error as Record<string, string>)['message']}`;
        } else if ('error' in error) {
          errorMessage = `Error: ${(error as Record<string, string>)['error']}`;
        } else {
          errorMessage = 'Error updating profile. Please try again.';
        }
      }

      this.toastMessage = errorMessage;
      this.showToast = true;
    } finally {
      this.saving = false;
    }
  }

  async saveAddresses(formData: {
    addresses: (Address & { isDefault?: boolean })[];
  }) {
    this.saving = true;
    const currentUser = this.authService.currentUser();

    if (!currentUser || !currentUser.id) {
      this.toastMessage = 'Error: User not authenticated';
      this.showToast = true;
      this.saving = false;
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

      this.toastMessage = 'Addresses updated successfully';
      this.showToast = true;
      this.editAddresses = false;
    } catch (error) {
      console.error('Error updating addresses:', error);

      let errorMessage =
        'An unknown error occurred while updating your addresses';

      if (error instanceof Error) {
        errorMessage = `Error: ${error.message}`;
      } else if (typeof error === 'object' && error !== null) {
        if ('message' in error) {
          errorMessage = `Error: ${(error as Record<string, string>)['message']}`;
        } else if ('error' in error) {
          errorMessage = `Error: ${(error as Record<string, string>)['error']}`;
        } else {
          errorMessage = 'Error updating addresses. Please try again.';
        }
      }

      this.toastMessage = errorMessage;
      this.showToast = true;
    } finally {
      this.saving = false;
    }
  }

  async savePaymentMethods(formData: { paymentMethods: PaymentMethod[] }) {
    this.saving = true;
    const currentUser = this.authService.currentUser();

    if (!currentUser || !currentUser.id) {
      this.toastMessage = 'Error: User not authenticated';
      this.showToast = true;
      this.saving = false;
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

      this.toastMessage = 'Payment information updated successfully';
      this.showToast = true;
      this.editPayment = false;
    } catch (error) {
      console.error('Error updating payment information:', error);

      let errorMessage =
        'An unknown error occurred while updating your payment information';

      if (error instanceof Error) {
        errorMessage = `Error: ${error.message}`;
      } else if (typeof error === 'object' && error !== null) {
        if ('message' in error) {
          errorMessage = `Error: ${(error as Record<string, string>)['message']}`;
        } else if ('error' in error) {
          errorMessage = `Error: ${(error as Record<string, string>)['error']}`;
        } else {
          errorMessage =
            'Error updating payment information. Please try again.';
        }
      }

      this.toastMessage = errorMessage;
      this.showToast = true;
    } finally {
      this.saving = false;
    }
  }

  hideToast() {
    this.showToast = false;
  }
}
