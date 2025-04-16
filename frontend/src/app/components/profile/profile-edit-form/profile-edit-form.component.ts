import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  input,
  output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { User, UpdateUserInput } from '../../../services/trpc.service';

@Component({
  selector: 'app-profile-edit-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile-edit-form.component.html',
  styleUrls: ['./profile-edit-form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileEditFormComponent implements OnInit {
  user = input.required<User>();
  saving = input<boolean>(false);
  saveProfile = output<UpdateUserInput>();
  cancelEdit = output<void>();

  profileForm!: FormGroup;

  constructor(private fb: FormBuilder) {}

  ngOnInit() {
    this.initForm();
  }

  private initForm() {
    this.profileForm = this.fb.group({
      // Basic Information
      name: [
        this.user()?.name || '',
        [Validators.required, Validators.minLength(2)],
      ],
      email: [
        this.user()?.email || '',
        [Validators.required, Validators.email],
      ],
      bio: ['', [Validators.maxLength(300)]],
    });
  }

  onSaveProfile() {
    if (this.profileForm.invalid) {
      return;
    }

    // Get the form values
    const formValues = this.profileForm.value;

    // Add the user ID to the form data
    // Format the data to match the expected structure on the backend
    const profileData: UpdateUserInput = {
      id: this.user().id,
      name: formValues.name,
      email: formValues.email,
      phone: formValues.phone || undefined,
    };

    // Emit the complete profile data
    this.saveProfile.emit(profileData);
  }

  onCancelEdit() {
    this.cancelEdit.emit();
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
