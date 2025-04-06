import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-basic-info-form',
  templateUrl: './basic-info-form.component.html',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
})
export class BasicInfoFormComponent implements OnInit {
  @Input() parentForm!: FormGroup;

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
      if (!this.parentForm.contains(controlName)) {
        console.error(
          `Control '${controlName}' is missing from the parent form`
        );
      }
    });
  }
}
