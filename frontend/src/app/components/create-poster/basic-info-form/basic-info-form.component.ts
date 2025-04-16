import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  input,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-basic-info-form',
  templateUrl: './basic-info-form.component.html',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BasicInfoFormComponent implements OnInit {
  parentForm = input.required<FormGroup>();

  // Required form controls for this component
  private requiredControls = [
    'title',
    'description',
    'condition',
    'dimensions',
  ];

  ngOnInit() {
    // Validate that all needed controls exist
    this.requiredControls.forEach(controlName => {
      if (!this.parentForm().contains(controlName)) {
        console.error(
          `Control '${controlName}' is missing from the parent form`
        );
      }
    });
  }
}
