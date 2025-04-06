import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-listing-details-form',
  templateUrl: './listing-details-form.component.html',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
})
export class ListingDetailsFormComponent {
  @Input() parentForm!: FormGroup;
  @Input() listingType: 'buyNow' | 'auction' = 'buyNow';
}
