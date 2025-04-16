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
  FormArray,
  Validators,
} from '@angular/forms';
import { User, Address } from '../../../services/trpc.service';
import { AutocompleteAddress } from '../../address-autocomplete/address-autocomplete.component';

// Define interface for the form data with multiple sections
// This needs to match the parent component's ProfileFormData
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

type FormSection = 'basic' | 'addresses' | 'wallet';

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
  saveProfile = output<ProfileFormData>();
  cancelEdit = output<void>();
  deleteAddress = output<string>();

  profileForm!: FormGroup;
  activeSection: FormSection = 'basic';
  addressError = '';

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

      // Address Information - will be populated from user.addresses
      addresses: this.fb.array([]),

      // Payment Information
      wallet: this.fb.group({
        paypalEmail: ['', [Validators.email]],
        venmoUsername: [''],
        preferredPaymentMethod: [''],
      }),
    });

    // Populate addresses from user data
    this.populateAddresses();
  }

  private populateAddresses() {
    // Clear the addresses form array
    this.addressesFormArray.clear();

    if (this.user()?.addresses && this.user().addresses.length > 0) {
      // Add form groups for each address
      this.user().addresses.forEach(address => {
        this.addressesFormArray.push(this.createAddressGroup(address));
      });
    } else {
      // Add an empty address form if none exist
      this.addAddressGroup();
      // Return early since addAddressGroup already calls updateDefaultCheckboxesState
      return;
    }

    // Update default checkboxes state
    this.updateDefaultCheckboxesState();
  }

  get addressesFormArray() {
    return this.profileForm.get('addresses') as FormArray;
  }

  createAddressGroup(address?: Address) {
    return this.fb.group({
      id: [address?.id || ''],
      label: [address?.label || ''],
      address1: [address?.address1 || '', Validators.required],
      address2: [address?.address2 || ''],
      city: [address?.city || '', Validators.required],
      state: [address?.state || ''],
      zip: [address?.zip || ''],
      country: [address?.country || '', Validators.required],
      isDefault: [address?.id === this.user().defaultAddressId],
    });
  }

  addAddressGroup() {
    this.addressesFormArray.push(this.createAddressGroup());

    // If this is the only address (after adding), make it default
    if (this.addressesFormArray.length === 1) {
      this.addressesFormArray.at(0).get('isDefault')?.setValue(true);
    }

    // Update default checkboxes state
    this.updateDefaultCheckboxesState();
  }

  removeAddressGroup(index: number) {
    // Check if this is an existing address with an ID
    const addressGroup = this.addressesFormArray.at(index);
    const addressId = addressGroup.get('id')?.value;

    // If it has an ID, emit the delete event
    if (addressId) {
      this.deleteAddress.emit(addressId);
    }

    // Remove from the form array
    this.addressesFormArray.removeAt(index);

    // If no addresses left, add an empty one
    if (this.addressesFormArray.length === 0) {
      this.addAddressGroup();
    } else {
      // Update default checkboxes state
      this.updateDefaultCheckboxesState();
    }
  }

  // Helper method to ensure default checkbox state is consistent
  private updateDefaultCheckboxesState() {
    // If there's only one address, force it to be the default
    if (this.addressesFormArray.length === 1) {
      const control = this.addressesFormArray.at(0).get('isDefault');
      control?.setValue(true);
      // This disables the control programmatically in addition to the template binding
      control?.disable();
    } else {
      // If multiple addresses, ensure the controls are enabled
      this.addressesFormArray.controls.forEach(group => {
        const control = group.get('isDefault');
        if (control?.disabled) {
          control.enable();
        }
      });

      // Ensure at least one address is marked as default
      const hasDefault = this.addressesFormArray.controls.some(
        group => group.get('isDefault')?.value === true
      );

      if (!hasDefault && this.addressesFormArray.length > 0) {
        this.addressesFormArray.at(0).get('isDefault')?.setValue(true);
      }
    }
  }

  switchSection(section: FormSection) {
    this.activeSection = section;
  }

  onSaveProfile() {
    if (this.profileForm.invalid) {
      return;
    }

    // Get the form values
    const formValues = this.profileForm.value;

    // Add the user ID to the form data
    // Format the data to match the expected structure on the backend
    const profileData: ProfileFormData = {
      id: this.user().id,
      name: formValues.name,
      email: formValues.email,
      phone: formValues.phone || undefined,
      // Include addresses from the form
      addresses: formValues.addresses,
    };

    // Emit the complete profile data
    this.saveProfile.emit(profileData);
  }

  onCancelEdit() {
    this.cancelEdit.emit();
  }

  // Handle address selection from autocomplete
  onAddressSelected(index: number, address: AutocompleteAddress | null): void {
    if (!address) return;

    const addressGroup = this.addressesFormArray.at(index);

    // Update form fields with autocomplete data
    addressGroup.patchValue({
      address1: address.address1,
      address2: address.address2 || '',
      city: address.city,
      state: address.state || '',
      zip: address.zip || '',
      country: address.country,
    });
  }
}
