import {
  Component,
  OnInit,
  AfterViewInit,
  AfterViewChecked,
  HostListener,
  ViewChild,
  ElementRef,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  FormArray,
  Validators,
  FormControl,
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import {
  Artist,
  CreatePosterInput,
  ConcertEvent,
  TrpcService,
} from '../../services/trpc.service';
import Stepper from 'bs-stepper';

// Component imports
import { BasicInfoFormComponent } from './basic-info-form/basic-info-form.component';
import { ArtistSelectorComponent } from './artist-selector/artist-selector.component';
import { EventSelectorComponent } from './event-selector/event-selector.component';
import { ImageUploaderComponent } from './image-uploader/image-uploader.component';
import { ListingDetailsFormComponent } from './listing-details-form/listing-details-form.component';

// Add these interfaces at the top of your file or in a separate models file
interface PosterForm {
  title: FormControl<string | null>;
  description: FormControl<string | null>;
  condition: FormControl<string | null>;
  dimensions: FormControl<string | null>;
  artistIds: FormArray<FormControl<string | null>>;
  eventIds: FormArray<FormControl<string | null>>;
  images: FormArray<FormControl<string | null>>;
  listingType: FormControl<'buyNow' | 'auction' | null>;
  buyNowPrice: FormControl<number | null>;
  auctionMinPrice: FormControl<number | null>;
  auctionEndDate: FormControl<string | null>;
}

@Component({
  selector: 'app-create-poster',
  templateUrl: './create-poster.component.html',
  styleUrls: ['./create-poster.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    BasicInfoFormComponent,
    ArtistSelectorComponent,
    EventSelectorComponent,
    ImageUploaderComponent,
    ListingDetailsFormComponent,
  ],
})
export class CreatePosterComponent
  implements OnInit, AfterViewInit, AfterViewChecked
{
  @ViewChild('desktopStepper') stepperElement!: ElementRef;

  // ============= FORM PROPERTIES =============
  posterForm!: FormGroup<PosterForm>;
  formInitialized = false;
  isSubmitting = false;
  errorMessage = '';
  enforceLinearStepper = true;

  // ============= DATA COLLECTIONS =============
  // Artists and events
  events: ConcertEvent[] = [];
  filteredEvents: ConcertEvent[] = [];

  // Search fields
  eventSearch = '';

  // ============= IMAGE PROPERTIES =============
  uploadedImages: string[] = [];
  isUploading = false;
  maxImages = 5;
  activeImageIndex = 0;

  // ============= STEPPER PROPERTIES =============
  private stepper!: Stepper;
  private stepperInitialized = false;
  private _currentStepIndex = 0;
  private previousIsMobile = false;

  constructor(
    private fb: FormBuilder,
    private trpcService: TrpcService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  // ============= LIFECYCLE HOOKS =============
  ngOnInit(): void {
    this.initForm();
    this.formInitialized = true;
    this.loadEvents();
  }

  ngAfterViewInit(): void {
    this.previousIsMobile = window.innerWidth < 768;
  }

  ngAfterViewChecked(): void {
    if (!this.stepperInitialized && window.innerWidth >= 768) {
      this.initDesktopStepper();
      this.stepperInitialized = true;
    }
  }

  @HostListener('window:resize')
  onResize(): void {
    this.checkViewportChange();
  }

  // ============= FORM INITIALIZATION =============
  private initForm(): void {
    this.posterForm = this.fb.group<PosterForm>({
      title: this.fb.control('', {
        validators: [Validators.required, Validators.minLength(3)],
        nonNullable: false,
      }),
      description: this.fb.control('', {
        validators: [Validators.required],
        nonNullable: false,
      }),
      condition: this.fb.control('', {
        validators: [Validators.required],
        nonNullable: false,
      }),
      dimensions: this.fb.control('', {
        validators: [Validators.required],
        nonNullable: false,
      }),
      artistIds: this.fb.array<FormControl<string | null>>(
        [],
        [Validators.required, Validators.minLength(1)]
      ),
      eventIds: this.fb.array<FormControl<string | null>>(
        [],
        [Validators.required, Validators.minLength(1)]
      ),
      images: this.fb.array<FormControl<string | null>>(
        [],
        [Validators.required, Validators.minLength(1)]
      ),
      listingType: this.fb.control('buyNow' as const, {
        validators: [Validators.required],
        nonNullable: false,
      }),
      buyNowPrice: this.fb.control<number | null>(null),
      auctionMinPrice: this.fb.control<number | null>(null),
      auctionEndDate: this.fb.control<string | null>(null),
    });

    this.setupConditionalValidation();
  }

  private setupConditionalValidation(): void {
    this.posterForm.controls.listingType.valueChanges.subscribe(value => {
      if (value === 'buyNow') {
        this.posterForm.controls.buyNowPrice.setValidators([
          Validators.required,
          Validators.min(1),
        ]);
        this.posterForm.controls.auctionMinPrice.clearValidators();
        this.posterForm.controls.auctionEndDate.clearValidators();
      } else {
        this.posterForm.controls.buyNowPrice.clearValidators();
        this.posterForm.controls.auctionMinPrice.setValidators([
          Validators.required,
          Validators.min(1),
        ]);
        this.posterForm.controls.auctionEndDate.setValidators([
          Validators.required,
        ]);
      }

      this.posterForm.controls.buyNowPrice.updateValueAndValidity();
      this.posterForm.controls.auctionMinPrice.updateValueAndValidity();
      this.posterForm.controls.auctionEndDate.updateValueAndValidity();
    });
  }

  // ============= STEPPER INITIALIZATION =============
  private checkViewportChange(): void {
    const currentIsMobile = window.innerWidth < 768;

    if (this.previousIsMobile !== currentIsMobile) {
      this.previousIsMobile = currentIsMobile;

      if (!currentIsMobile) {
        this.stepperInitialized = false;
      }
    }
  }

  private initDesktopStepper(): void {
    if (!this.stepperElement?.nativeElement) return;

    const observer = new MutationObserver((mutations, obs) => {
      const header =
        this.stepperElement.nativeElement.querySelector('.bs-stepper-header');
      const steps = this.stepperElement.nativeElement.querySelectorAll('.step');

      if (header && steps.length > 0) {
        try {
          this.stepper = new Stepper(this.stepperElement.nativeElement, {
            linear: false,
            animation: true,
          });

          if (this._currentStepIndex > 0) {
            this.stepper.to(this._currentStepIndex);
          }

          obs.disconnect();
        } catch (error) {
          console.error('Error initializing stepper:', error);
        }
      }
    });

    observer.observe(this.stepperElement.nativeElement, {
      childList: true,
      subtree: true,
    });
  }

  // ============= DATA LOADING =============

  private async loadEvents(): Promise<void> {
    try {
      this.events = (await this.trpcService.getAllEvents()).items;
      this.filteredEvents = [...this.events];
    } catch (error: unknown) {
      console.error('Error loading events:', error);
    }
  }

  // ============= FILTERING METHODS =============
  filterEvents(searchTerm: string = this.eventSearch): void {
    this.eventSearch = searchTerm;
    this.filteredEvents = this.events.filter(event =>
      event.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  // ============= ARTIST & EVENT MANAGEMENT =============
  addArtist(artist: Artist): void {
    const exists = this.artistIdsArray.controls.some(
      control => control.value === artist.id
    );

    if (!exists) {
      this.artistIdsArray.push(this.fb.control(artist.id));
    }
  }

  removeArtist(index: number): void {
    this.artistIdsArray.removeAt(index);
  }

  addEvent(event: ConcertEvent): void {
    const exists = this.eventIdsArray.controls.some(
      control => control.value === event.id
    );

    if (!exists) {
      this.eventIdsArray.push(this.fb.control(event.id));
    }
  }

  removeEvent(index: number): void {
    this.eventIdsArray.removeAt(index);
  }

  // ============= IMAGE HANDLING =============
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const files = Array.from(input.files);
    this.processSelectedFiles(files);
  }

  private processSelectedFiles(files: File[]): void {
    this.isUploading = true;

    // Create temporary URLs for preview
    const newImages = files.map(file => URL.createObjectURL(file));
    this.uploadedImages = [...this.uploadedImages, ...newImages];

    // Update form array
    const imagesArray = this.posterForm.get('images') as FormArray;
    files.forEach(() => {
      imagesArray.push(this.fb.control(''));
    });

    // Simulate upload delay
    setTimeout(() => {
      this.isUploading = false;
    }, 1500);
  }

  removeImage(index: number): void {
    this.uploadedImages.splice(index, 1);
    this.imagesArray.removeAt(index);

    // Reset active index if needed
    if (this.uploadedImages.length <= this.activeImageIndex) {
      this.activeImageIndex = Math.max(0, this.uploadedImages.length - 1);
    }
  }

  setActiveImage(index: number): void {
    this.activeImageIndex = index;
  }

  // ============= NAVIGATION =============
  next(): void {
    const currentIndex = this.getCurrentStepIndex();
    this.goToStep(currentIndex + 1);
  }

  previous(): void {
    const currentIndex = this.getCurrentStepIndex();
    this.goToStep(currentIndex - 1);
  }

  goToStep(stepIndex: number): void {
    if (stepIndex < 0 || stepIndex > 4) return;

    if (this.enforceLinearStepper && stepIndex > this._currentStepIndex) {
      if (!this.validatePreviousSteps(stepIndex)) return;
    }

    this._currentStepIndex = stepIndex;

    try {
      if (this.stepper) {
        this.stepper.to(stepIndex);
      }
    } catch (error) {
      console.error('Error updating BS-Stepper:', error);
    }
  }

  private validatePreviousSteps(targetStepIndex: number): boolean {
    for (let i = 0; i < targetStepIndex; i++) {
      if (!this.validateStep(i)) {
        this.errorMessage =
          'Please complete all required fields in previous steps first.';
        setTimeout(() => (this.errorMessage = ''), 3000);
        return false;
      }
    }
    return true;
  }

  // ============= FORM SUBMISSION =============
  async onSubmit(): Promise<void> {
    if (this.posterForm.invalid) {
      this.markAllFieldsAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    try {
      const posterData = this.preparePosterData();
      const result = await this.trpcService.createPoster(posterData);
      this.router.navigate(['/posters', result.id]);
    } catch (error: unknown) {
      this.handleSubmissionError(error);
    } finally {
      this.isSubmitting = false;
    }
  }

  private markAllFieldsAsTouched(): void {
    Object.keys(this.posterForm.controls).forEach(key => {
      this.posterForm.get(key)?.markAsTouched();
    });
  }

  private preparePosterData(): CreatePosterInput {
    // With typed forms, we get proper type inference here
    const formValue = this.posterForm.getRawValue();

    return {
      title: formValue.title || '',
      description: formValue.description || '',
      condition: formValue.condition || '',
      dimensions: formValue.dimensions || '',
      artistIds:
        (formValue.artistIds?.filter(id => id !== null) as string[]) || [],
      eventIds:
        (formValue.eventIds?.filter(id => id !== null) as string[]) || [],
      listingType: formValue.listingType || 'buyNow',
      price:
        formValue.listingType === 'buyNow'
          ? formValue.buyNowPrice || 0
          : formValue.auctionMinPrice || 0,
      auctionEndDate:
        formValue.listingType === 'auction' && formValue.auctionEndDate
          ? new Date(formValue.auctionEndDate)
          : null,
      imageUrls:
        (formValue.images?.filter(url => url !== null) as string[]) || [],
    };
  }

  private handleSubmissionError(error: unknown): void {
    let message = 'Failed to create poster listing';
    if (error instanceof Error) {
      message = error.message;
    }
    this.errorMessage = message;
  }

  // ============= FORM GETTERS & HELPERS =============
  get artistIdsArray(): FormArray<FormControl<string | null>> {
    return this.posterForm.controls.artistIds;
  }

  get eventIdsArray(): FormArray<FormControl<string | null>> {
    return this.posterForm.controls.eventIds;
  }

  get imagesArray(): FormArray<FormControl<string | null>> {
    return this.posterForm.controls.images;
  }

  get listingType(): 'buyNow' | 'auction' {
    return this.posterForm.controls.listingType.value as 'buyNow' | 'auction';
  }

  getEvent(id: string): ConcertEvent | undefined {
    return this.events.find(event => event.id === id);
  }

  public getCurrentStepIndex(): number {
    if (
      this._currentStepIndex === undefined ||
      this._currentStepIndex === null
    ) {
      this._currentStepIndex = 0;
    }
    return this._currentStepIndex;
  }

  // ============= VALIDATION & DISPLAY HELPERS =============
  validateStep(stepIndex: number): boolean {
    switch (stepIndex) {
      case 0: // Basic info
        return (
          this.posterForm.controls.title.valid &&
          this.posterForm.controls.description.valid &&
          this.posterForm.controls.condition.valid &&
          this.posterForm.controls.dimensions.valid
        );
      case 1: // Artists
        return this.posterForm.controls.artistIds.controls.length > 0;
      case 2: // Events
        return this.posterForm.controls.eventIds.controls.length > 0;
      case 3: // Images
        return this.posterForm.controls.images.controls.length > 0;
      case 4: // Listing details
        if (this.posterForm.controls.listingType.value === 'buyNow') {
          return this.posterForm.controls.buyNowPrice.valid;
        } else {
          return (
            this.posterForm.controls.auctionMinPrice.valid &&
            this.posterForm.controls.auctionEndDate.valid
          );
        }
      default:
        return true;
    }
  }

  getStepTargetId(stepIndex: number): string {
    const targets = [
      'basic-info',
      'artists',
      'events',
      'images',
      'listing-details',
    ];
    return targets[stepIndex] || '';
  }

  getCurrentStepTitle(): string {
    const titles = [
      'Basic Info',
      'Artists',
      'Events',
      'Images',
      'Listing Details',
    ];
    const index = this.getCurrentStepIndex();
    return index >= 0 && index < titles.length ? titles[index] : '';
  }

  onStepperChange(event: Event): void {
    const stepperEvent = event as unknown as {
      detail: { indexStep: number };
    };
    this._currentStepIndex = stepperEvent.detail.indexStep;
  }
}
