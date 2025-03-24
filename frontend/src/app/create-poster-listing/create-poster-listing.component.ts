import { Component, inject, signal } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-create-poster-listing',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  templateUrl: './create-poster-listing.component.html',
  styleUrls: ['./create-poster-listing.component.scss'],
})
export class CreatePosterListingComponent {
  private fb = inject(FormBuilder);
  // private posterService = inject(PosterService);
  // private router = inject(Router);
  // private snackBar = inject(MatSnackBar);

  posterForm: FormGroup;
  loading = signal(false);
  error = signal<string | null>(null);
  fileErrors = signal<string | null>(null);
  imagePreviewUrls: string[] = [];
  selectedFiles: File[] = [];

  constructor() {
    this.posterForm = this.fb.group({
      title: ['', [Validators.required]],
      artist: ['', [Validators.required]],
      venue: ['', [Validators.required]],
      eventDate: ['', [Validators.required]],
      dimensions: ['', [Validators.required]],
      condition: ['', [Validators.required]],
      price: ['', [Validators.required, Validators.min(0.01)]],
      description: ['', [Validators.required]],
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    this.fileErrors.set(null);
    const newFiles = Array.from(input.files);

    // Check if adding these files would exceed the limit
    if (this.selectedFiles.length + newFiles.length > 5) {
      this.fileErrors.set(
        `You can only upload up to 5 images (${this.selectedFiles.length} already selected)`
      );
      return;
    }

    // Validate file types and sizes
    const validFiles: File[] = [];
    const maxSizeInBytes = 5 * 1024 * 1024; // 5MB

    for (const file of newFiles) {
      if (!file.type.startsWith('image/')) {
        this.fileErrors.set('Only image files are allowed');
        return;
      }

      if (file.size > maxSizeInBytes) {
        this.fileErrors.set('Images must be smaller than 5MB');
        return;
      }

      validFiles.push(file);
    }

    // Generate previews for valid files and add to existing collections
    validFiles.forEach(file => {
      this.selectedFiles.push(file);
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        if (e.target?.result) {
          this.imagePreviewUrls.push(e.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    });

    // Clear the input value so the same file can be selected again if removed
    input.value = '';
  }

  removeImage(index: number): void {
    this.imagePreviewUrls.splice(index, 1);
    this.selectedFiles.splice(index, 1);
  }

  onSubmit(): void {
    if (this.posterForm.invalid) {
      // Mark all fields as touched to trigger validation messages
      Object.keys(this.posterForm.controls).forEach(key => {
        this.posterForm.get(key)?.markAsTouched();
      });
      return;
    }

    if (this.selectedFiles.length === 0) {
      this.fileErrors.set('At least one image is required');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    // const formData: CreatePosterRequest = {
    //   ...this.posterForm.value,
    //   // Format date as ISO string for API
    //   eventDate: this.posterForm
    //     .get('eventDate')
    //     ?.value?.toISOString()
    //     .split('T')[0],
    //   images: this.selectedFiles,
    // };

    // this.posterService.createPoster(formData).subscribe({
    //   next: response => {
    //     this.loading.set(false);
    //     // Show success message
    //     this.snackBar.open('Poster listing created successfully!', 'Close', {
    //       duration: 5000,
    //       horizontalPosition: 'end',
    //       verticalPosition: 'top',
    //     });
    //     // Navigate to the poster detail page
    //     this.router.navigate(['/posters', response.id]);
    //   },
    //   error: err => {
    //     this.loading.set(false);
    //     this.error.set(
    //       err.error?.message || 'Failed to create poster. Please try again.'
    //     );
    //     console.error('Error creating poster:', err);
    //   },
    // });
  }
}
