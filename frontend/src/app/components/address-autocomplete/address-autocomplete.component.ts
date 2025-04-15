import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  NgZone,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { CommonModule, NgIf } from '@angular/common';
import { environment } from '../../../environments/environment';

// Define the address structure that matches our backend model
export interface AutocompleteAddress {
  address1: string;
  address2?: string | null;
  city: string;
  state?: string | null;
  province?: string | null;
  zip?: string | null;
  country: string;
  label?: string | null;
  isValidated: boolean;
}

// Add TypeScript interface for Google Maps API
declare global {
  interface Window {
    google: {
      maps: {
        places: {
          Autocomplete: new (
            input: HTMLInputElement,
            options?: GoogleMapsAutocompleteOptions
          ) => GoogleMapsAutocomplete;
          AutocompleteSessionToken: new () => GoogleMapsSessionToken;
        };
      };
    };
  }
}

// Define interfaces for Google Maps types
interface GoogleMapsPlace {
  address_components?: GoogleMapsAddressComponent[];
  formatted_address?: string;
}

interface GoogleMapsAddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

interface GoogleMapsAutocomplete {
  addListener(event: string, callback: () => void): void;
  getPlace(): GoogleMapsPlace;
}

interface GoogleMapsAutocompleteOptions {
  types?: string[];
  componentRestrictions?: { country: string | string[] };
  fields?: string[];
  sessionToken?: GoogleMapsSessionToken;
}

// Using a type alias instead of an interface since we don't need to add properties
type GoogleMapsSessionToken = Record<string, unknown>;

@Component({
  selector: 'app-address-autocomplete',
  templateUrl: './address-autocomplete.component.html',
  styleUrls: ['./address-autocomplete.component.scss'],
  standalone: true,
  imports: [ReactiveFormsModule, NgIf, CommonModule],
})
export class AddressAutocompleteComponent implements OnInit {
  @ViewChild('addressInput') addressInput!: ElementRef<HTMLInputElement>;
  @Input() placeholder = 'Enter your address';
  @Input() initialAddress: Partial<AutocompleteAddress> = {};
  @Output() addressSelected = new EventEmitter<AutocompleteAddress | null>();

  addressControl = new FormControl('');
  autocomplete: GoogleMapsAutocomplete | null = null;
  sessionToken: GoogleMapsSessionToken | null = null;

  // Track if a selection is in progress
  private selectionInProgress = false;

  constructor(private ngZone: NgZone) {}

  ngOnInit(): void {
    // Load the Google Maps script if it hasn't been loaded yet
    this.loadGoogleMapsScript();

    // Initialize with any provided address
    if (this.initialAddress && Object.keys(this.initialAddress).length > 0) {
      this.formatAddressForDisplay();
    }
  }

  private loadGoogleMapsScript(): void {
    // Check if the script is already loaded
    if (window.google && window.google.maps) {
      this.initAutocomplete();
      return;
    }

    // If not loaded, create and load the script
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${environment.googleMapsApiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      this.ngZone.run(() => {
        this.initAutocomplete();
      });
    };
    document.head.appendChild(script);
  }

  private createSessionToken(): void {
    // Create a new session token for autocomplete
    if (window.google?.maps?.places) {
      this.sessionToken =
        new window.google.maps.places.AutocompleteSessionToken();
    }
  }

  private initAutocomplete(): void {
    // Initialize Google Places Autocomplete on the input field
    this.ngZone.run(() => {
      setTimeout(() => {
        if (
          this.addressInput &&
          this.addressInput.nativeElement &&
          window.google?.maps?.places
        ) {
          // Create a new session token
          this.createSessionToken();

          // Define autocomplete options
          const options: GoogleMapsAutocompleteOptions = {
            types: ['address'],
          };

          // Only add sessionToken if it exists
          if (this.sessionToken) {
            options.sessionToken = this.sessionToken;
          }

          this.autocomplete = new window.google.maps.places.Autocomplete(
            this.addressInput.nativeElement,
            options
          );

          // Add listener for place selection
          this.autocomplete.addListener('place_changed', () => {
            this.ngZone.run(() => {
              this.selectionInProgress = true;
              this.handlePlaceSelection();
              this.selectionInProgress = false;
            });
          });

          // Add focus listener to set selection in progress flag
          this.addressInput.nativeElement.addEventListener('focus', () => {
            this.selectionInProgress = true;
          });

          // Add blur listener to reset selection flag after a short delay
          this.addressInput.nativeElement.addEventListener('blur', () => {
            setTimeout(() => {
              this.selectionInProgress = false;
            }, 300);
          });
        }
      }, 300); // Small delay to ensure the input is in the DOM
    });
  }

  private handlePlaceSelection(): void {
    if (!this.autocomplete) return;

    const place = this.autocomplete.getPlace();
    if (!place.address_components) return;

    // Parse the address components from Google Places
    const parsedAddress = this.parseAddressComponents(place.address_components);

    // Emit the new address
    this.addressSelected.emit(parsedAddress as AutocompleteAddress);

    // Since we've completed this session by selecting a place,
    // create a new session token for the next autocomplete sequence
    this.createSessionToken();
  }

  clearAddress(): void {
    this.addressControl.setValue('');
    this.addressSelected.emit(null);

    // Create a new session token
    this.createSessionToken();
  }

  private parseAddressComponents(
    components: GoogleMapsAddressComponent[]
  ): Partial<AutocompleteAddress> {
    const address: Partial<AutocompleteAddress> = {
      address1: '',
      city: '',
      country: '',
      isValidated: true,
    };

    // Street number and route (street name) combine for address1
    const streetNumber = this.getComponentValue(components, 'street_number');
    const route = this.getComponentValue(components, 'route');
    address.address1 = streetNumber ? `${streetNumber} ${route}` : route;

    // Other components
    address.city =
      this.getComponentValue(components, 'locality') ||
      this.getComponentValue(components, 'sublocality_level_1') ||
      '';
    address.state = this.getComponentValue(
      components,
      'administrative_area_level_1'
    );
    address.province = address.state; // Use state as province if applicable
    address.zip = this.getComponentValue(components, 'postal_code');
    address.country = this.getComponentValue(components, 'country');

    return address;
  }

  private getComponentValue(
    components: GoogleMapsAddressComponent[],
    type: string
  ): string {
    const component = components.find(comp => comp.types.includes(type));
    return component ? component.long_name : '';
  }

  formatAddressForDisplay(): void {
    if (!this.initialAddress) return;

    const parts = [];
    if (this.initialAddress.address1) parts.push(this.initialAddress.address1);
    if (this.initialAddress.city) parts.push(this.initialAddress.city);
    if (this.initialAddress.state) parts.push(this.initialAddress.state);
    if (this.initialAddress.zip) parts.push(this.initialAddress.zip);
    if (this.initialAddress.country) parts.push(this.initialAddress.country);

    this.addressControl.setValue(parts.join(', '));
  }

  handleEnterKey(event: Event): void {
    // Cast the event to KeyboardEvent
    const keyboardEvent = event as KeyboardEvent;

    // Prevent form submission
    keyboardEvent.preventDefault();

    // If the autocomplete dropdown is showing, don't do anything as Google Maps will handle selection
    if (this.selectionInProgress) return;
  }
}
