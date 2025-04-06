import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, FormArray, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-image-uploader',
  templateUrl: './image-uploader.component.html',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
})
export class ImageUploaderComponent {
  @Input() parentForm!: FormGroup;
  @Input() uploadedImages: string[] = [];
  @Input() maxImages = 5;
  @Input() isUploading = false;
  @Input() activeImageIndex = 0;

  @Output() fileSelected = new EventEmitter<Event>();
  @Output() setActiveImage = new EventEmitter<number>();
  @Output() removeImage = new EventEmitter<number>();

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  get imagesArray(): FormArray {
    return this.parentForm.get('images') as FormArray;
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
