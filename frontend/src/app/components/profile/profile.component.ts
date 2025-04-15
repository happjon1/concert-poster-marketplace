import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { TrpcService } from '../../services/trpc.service';

// Import our subcomponents
import { ProfileHeaderComponent } from './profile-header/profile-header.component';
import { ProfileDetailsComponent } from './profile-details/profile-details.component';
import { ProfileEditFormComponent } from './profile-edit-form/profile-edit-form.component';
import { ToastNotificationComponent } from './toast-notification/toast-notification.component';

// Import the profile form data interface
interface ProfileFormData {
  name: string;
  email: string;
  bio?: string;
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
      // Call the tRPC service to update the user profile
      await this.trpcService.updateUser({
        id: currentUser.id,
        name: formData.name,
        email: formData.email,
      });

      // Update the authService user data by fetching the current user
      await this.authService.fetchCurrentUser();

      this.toastMessage = 'Profile updated successfully';
      this.showToast = true;
      this.editMode = false;
    } catch (error) {
      console.error('Error updating profile:', error);
      this.toastMessage =
        error instanceof Error
          ? `Error: ${error.message}`
          : 'An unknown error occurred while updating your profile';
      this.showToast = true;
    } finally {
      this.saving = false;
    }
  }

  hideToast() {
    this.showToast = false;
  }
}
