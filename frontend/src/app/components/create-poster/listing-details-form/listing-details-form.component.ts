import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-listing-details-form',
  templateUrl: './listing-details-form.component.html',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListingDetailsFormComponent {
  parentForm = input.required<FormGroup>();
  listingType = input<'buyNow' | 'auction'>('buyNow');
}
