import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import {
  TrpcService,
  CreateAddressInput,
  UpdateAddressInput,
  UpdateUserInput,
} from '../../services/trpc.service';

// Import our subcomponents
import { ProfileHeaderComponent } from './profile-header/profile-header.component';
import { ProfileDetailsComponent } from './profile-details/profile-details.component';
import { ProfileEditFormComponent } from './profile-edit-form/profile-edit-form.component';
import { ToastNotificationComponent } from './toast-notification/toast-notification.component';

// Define a custom form data interface that includes addresses
interface ProfileFormData {
  id: string;
  name: string;
  email: string;
  phone?: string;
  bio?: string;
  addresses?: {
    id?: string;
    label?: string | null;
    address1: string;
    address2?: string | null;
    city: string;
    state?: string | null;
    zip?: string | null;
    country: string;
    isDefault?: boolean;
  }[];
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    ProfileHeaderComponent,
    ProfileDetailsComponent,
    ProfileEditFormComponent,
    ToastNotificationComponent,
  ],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
})
export class ProfileComponent {
  public authService = inject(AuthService);
  private trpcService = inject(TrpcService);

  editMode = false;
  saving = false;
  showToast = false;
  toastMessage = '';

  enableEditMode() {
    this.editMode = true;
  }

  cancelEdit() {
    this.editMode = false;
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

  async saveProfile(formData: ProfileFormData) {
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

      // Update user profile - extract only the fields that UpdateUserInput expects
      const userUpdateData: UpdateUserInput = {
        id: currentUser.id,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
      };

      await this.trpcService.updateUser(userUpdateData);

      // Update the authService user data by fetching the current user
      // This will also retrieve the updated addresses
      await this.authService.fetchCurrentUser();

      this.toastMessage = 'Profile updated successfully';
      this.showToast = true;
      this.editMode = false;
    } catch (error) {
      console.error('Error updating profile:', error);

      // Extract a readable error message from the error object
      let errorMessage =
        'An unknown error occurred while updating your profile';

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
          errorMessage = 'Error updating profile. Please try again.';
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
