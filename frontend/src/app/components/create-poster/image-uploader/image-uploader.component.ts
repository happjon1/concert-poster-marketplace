import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewChild,
  input,
  output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, FormArray, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-image-uploader',
  templateUrl: './image-uploader.component.html',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImageUploaderComponent {
  parentForm = input.required<FormGroup>();
  uploadedImages = input<string[]>([]);
  maxImages = input<number>(5);
  isUploading = input<boolean>(false);
  activeImageIndex = input<number>(0);

  fileSelected = output<Event>();
  setActiveImage = output<number>();
  removeImage = output<number>();

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  get imagesArray(): FormArray {
    return this.parentForm().get('images') as FormArray;
  }

  onFileSelected(event: Event): void {
    this.fileSelected.emit(event);
  }

  onSetActiveImage(index: number): void {
    this.setActiveImage.emit(index);
  }

  onRemoveImage(index: number): void {
    this.removeImage.emit(index);
  }

  triggerFileInput(): void {
    this.fileInput.nativeElement.click();
  }
}
