import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { NgbToastModule } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgbToastModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
})
export class ProfileComponent implements OnInit {
  public authService = inject(AuthService);
  private fb = inject(FormBuilder);

  editMode = false;
  saving = false;
  showToast = false;
  toastMessage = '';

  profileForm: FormGroup = this.fb.group({
    firstName: ['', []],
    lastName: ['', []],
    username: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    bio: ['', [Validators.maxLength(300)]],
  });

  ngOnInit() {
    const user = this.authService.currentUser();
    if (user) {
      this.profileForm.patchValue({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        username: user.username,
        email: user.email,
      });
    }
  }

  enableEditMode() {
    this.editMode = true;
  }

  cancelEdit() {
    this.editMode = false;
    // Reset form to original values
    const user = this.authService.currentUser();
    if (user) {
      this.profileForm.patchValue({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        username: user.username,
        email: user.email,
      });
    }
  }

  saveProfile() {
    if (this.profileForm.invalid) {
      return;
    }

    this.saving = true;

    // Simulate API call for updating profile
    setTimeout(() => {
      this.saving = false;
      this.editMode = false;

      // Show Bootstrap toast instead of MatSnackBar
      this.toastMessage = 'Profile updated successfully';
      this.showToast = true;

      // Auto-hide toast after 3 seconds
      setTimeout(() => {
        this.showToast = false;
      }, 3000);
    }, 1500);

    // In a real implementation, you would:
    // 1. Call your backend API to update the user profile
    // 2. Update the user information in the authService
    // 3. Handle any errors and show appropriate messages
  }

  getInitials(
    user: { firstName?: string; lastName?: string; username?: string } | null
  ): string {
    if (!user) return '';

    if (user.firstName && user.lastName) {
      return (user.firstName[0] + user.lastName[0]).toUpperCase();
    } else if (user.username) {
      return user.username[0].toUpperCase();
    }
    return '?';
  }

  formatDate(dateString: string | undefined): string {
    if (!dateString) return 'Unknown';

    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
}
