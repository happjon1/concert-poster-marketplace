import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Address, CreateAddressInput } from '../../../services/trpc.service';
import {
  AddressAutocompleteComponent,
  AutocompleteAddress,
} from '../../../components/address-autocomplete/address-autocomplete.component';

@Component({
  selector: 'app-profile-address-list',
  templateUrl: './profile-address-list.component.html',
  standalone: true,
  imports: [CommonModule, FormsModule, AddressAutocompleteComponent],
  styles: [
    `
      .address-list-container {
        margin-bottom: 1rem;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileAddressListComponent {
  addresses = input<(Address & { isDefault?: boolean })[]>([]);
  readOnly = input<boolean>(true);
  saving = input<boolean>(false);

  saveAddresses = output<{
    addresses: (Address & { isDefault?: boolean })[];
  }>();
  cancelEdit = output<void>();
  deleteAddress = output<string>();

  newAddress: CreateAddressInput & {
    isDefault?: boolean;
    isValidated?: boolean;
  } = this.getEmptyAddress();

  showNewAddressForm = false;

  toggleNewAddressForm() {
    this.showNewAddressForm = !this.showNewAddressForm;
    if (!this.showNewAddressForm) {
      // Reset the form if we're closing it
      this.resetNewAddressForm();
    }
  }

  resetNewAddressForm() {
    this.newAddress = this.getEmptyAddress();
  }

  private getEmptyAddress(): CreateAddressInput & {
    isDefault?: boolean;
    isValidated?: boolean;
  } {
    return {
      label: '',
      address1: '',
      address2: '',
      city: '',
      state: '',
      zip: '',
      country: '',
      isDefault: false,
      isValidated: false,
    };
  }

  onSave() {
    // Check if we have a new address to add before saving
    if (this.showNewAddressForm && this.isValidNewAddress()) {
      this.addNewAddress();
    }
    this.saveAddresses.emit({ addresses: this.addresses() });
  }

  onCancel() {
    this.cancelEdit.emit();
  }

  onDelete(addressId: string) {
    this.deleteAddress.emit(addressId);
  }

  setAsDefault(address: Address & { isDefault?: boolean }) {
    // Create a new array with updated isDefault flags
    const updatedAddresses = this.addresses().map(a => ({
      ...a,
      isDefault: a.id === address.id,
    }));

    // Since addresses is an input signal, we can't modify it directly
    // Instead, we'll emit a save event with the updated addresses
    this.saveAddresses.emit({ addresses: updatedAddresses });
  }

  onAddressSelected(address: AutocompleteAddress | null): void {
    if (address) {
      this.newAddress.address1 = address.address1;
      this.newAddress.address2 = address.address2 || '';
      this.newAddress.city = address.city;
      this.newAddress.state = address.state || '';
      this.newAddress.zip = address.zip || '';
      this.newAddress.country = address.country;
      this.newAddress.isValidated = address.isValidated;
    }
  }

  onExistingAddressSelected(
    existingAddress: Address & { isDefault?: boolean },
    newAddressData: AutocompleteAddress | null
  ): void {
    if (newAddressData) {
      existingAddress.address1 = newAddressData.address1;
      existingAddress.address2 = newAddressData.address2 || '';
      existingAddress.city = newAddressData.city;
      existingAddress.state = newAddressData.state || '';
      existingAddress.zip = newAddressData.zip || '';
      existingAddress.country = newAddressData.country;
    }
  }

  private isValidNewAddress(): boolean {
    return !!(
      this.newAddress.address1 &&
      this.newAddress.city &&
      this.newAddress.country &&
      this.newAddress.isValidated
    );
  }

  private addNewAddress() {
    // Create a new array with all existing addresses plus the new one
    const updatedAddresses = [...this.addresses()];

    // If this is the first address, make it default
    if (updatedAddresses.length === 0) {
      this.newAddress.isDefault = true;
    }

    // If this is set as default, update other addresses
    if (this.newAddress.isDefault) {
      updatedAddresses.forEach(address => {
        address.isDefault = false;
      });
    }

    // Add the new address to the list
    updatedAddresses.push({ ...this.newAddress } as Address & {
      isDefault?: boolean;
    });

    // Since addresses is an input signal, we'll handle this with a temporary reference
    // The parent component will update it properly via binding after save

    // Reset the form
    this.resetNewAddressForm();
    this.showNewAddressForm = false;
  }
}
