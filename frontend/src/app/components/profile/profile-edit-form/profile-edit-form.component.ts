import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { User } from '../../../services/trpc.service';

// Define an interface for the form data
interface ProfileFormData {
  name: string;
  email: string;
  bio?: string;
}

@Component({
  selector: 'app-profile-edit-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile-edit-form.component.html',
  styleUrls: ['./profile-edit-form.component.scss'],
})
export class ProfileEditFormComponent implements OnInit {
  @Input() user!: User;
  @Input() saving = false;
  @Output() saveProfile = new EventEmitter<ProfileFormData>();
  @Output() cancelEdit = new EventEmitter<void>();

  profileForm!: FormGroup;

  constructor(private fb: FormBuilder) {}

  ngOnInit() {
    this.profileForm = this.fb.group({
      name: [
        this.user?.name || '',
        [Validators.required, Validators.minLength(2)],
      ],
      email: [this.user?.email || '', [Validators.required, Validators.email]],
      bio: ['', [Validators.maxLength(300)]], // Initialize with empty string since bio is not in User model
    });
  }

  onSaveProfile() {
    if (this.profileForm.invalid) {
      return;
    }
    this.saveProfile.emit(this.profileForm.value);
  }

  onCancelEdit() {
    this.cancelEdit.emit();
  }
}
