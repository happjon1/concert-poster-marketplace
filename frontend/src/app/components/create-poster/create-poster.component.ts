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
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { TrpcService } from '../../services/trpc.service';
import { RouterTypes } from '@concert-poster-marketplace/shared';
import Stepper from 'bs-stepper';

// Component imports
import { BasicInfoFormComponent } from './basic-info-form/basic-info-form.component';
import { ArtistSelectorComponent } from './artist-selector/artist-selector.component';
import { EventSelectorComponent } from './event-selector/event-selector.component';
import { ImageUploaderComponent } from './image-uploader/image-uploader.component';
import { ListingDetailsFormComponent } from './listing-details-form/listing-details-form.component';

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
  posterForm!: FormGroup;
  formInitialized = false;
  isSubmitting = false;
  errorMessage = '';
  enforceLinearStepper = true;

  // ============= DATA COLLECTIONS =============
  // Artists and events
  artists: RouterTypes.Artists.Artist[] = [];
  events: RouterTypes.Events.Event[] = [];
  filteredArtists: RouterTypes.Artists.Artist[] = [];
  filteredEvents: RouterTypes.Events.Event[] = [];

  // Search fields
  artistSearch = '';
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
    this.loadArtists();
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
    this.posterForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', Validators.required],
      condition: ['', Validators.required],
      dimensions: ['', Validators.required],
      artistIds: this.fb.array(
        [],
        [Validators.required, Validators.minLength(1)]
      ),
      eventIds: this.fb.array(
        [],
        [Validators.required, Validators.minLength(1)]
      ),
      images: this.fb.array([], [Validators.required, Validators.minLength(1)]),
      listingType: ['buyNow', Validators.required],
      buyNowPrice: [null],
      auctionMinPrice: [null],
      auctionEndDate: [null],
    });

    this.setupConditionalValidation();
  }

  private setupConditionalValidation(): void {
    this.posterForm.get('listingType')?.valueChanges.subscribe(value => {
      if (value === 'buyNow') {
        this.posterForm
          .get('buyNowPrice')
          ?.setValidators([Validators.required, Validators.min(1)]);
        this.posterForm.get('auctionMinPrice')?.clearValidators();
        this.posterForm.get('auctionEndDate')?.clearValidators();
      } else {
        this.posterForm.get('buyNowPrice')?.clearValidators();
        this.posterForm
          .get('auctionMinPrice')
          ?.setValidators([Validators.required, Validators.min(1)]);
        this.posterForm
          .get('auctionEndDate')
          ?.setValidators([Validators.required]);
      }

      this.posterForm.get('buyNowPrice')?.updateValueAndValidity();
      this.posterForm.get('auctionMinPrice')?.updateValueAndValidity();
      this.posterForm.get('auctionEndDate')?.updateValueAndValidity();
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
  private async loadArtists(): Promise<void> {
    try {
      this.artists = (await this.trpcService.getAllArtists()).items;
      this.filteredArtists = [...this.artists];
    } catch (error: unknown) {
      console.error('Error loading artists:', error);
    }
  }

  private async loadEvents(): Promise<void> {
    try {
      this.events = (await this.trpcService.getAllEvents()).items;
      this.filteredEvents = [...this.events];
    } catch (error: unknown) {
      console.error('Error loading events:', error);
    }
  }

  // ============= FILTERING METHODS =============
  filterArtists(searchTerm: string = this.artistSearch): void {
    this.artistSearch = searchTerm;
    this.filteredArtists = this.artists.filter(artist =>
      artist.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  filterEvents(searchTerm: string = this.eventSearch): void {
    this.eventSearch = searchTerm;
    this.filteredEvents = this.events.filter(event =>
      event.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  // ============= ARTIST & EVENT MANAGEMENT =============
  addArtist(artist: RouterTypes.Artists.Artist): void {
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

  addEvent(event: RouterTypes.Events.Event): void {
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

  private preparePosterData(): RouterTypes.Posters.CreateInput {
    const formValue = this.posterForm.value;
    return {
      title: formValue.title,
      description: formValue.description,
      condition: formValue.condition,
      dimensions: formValue.dimensions,
      artistIds: formValue.artistIds || [],
      eventIds: formValue.eventIds || [],
      listingType: formValue.listingType,
      price:
        formValue.listingType === 'buyNow'
          ? formValue.buyNowPrice
          : formValue.auctionMinPrice,
      auctionEndDate:
        formValue.listingType === 'auction' && formValue.auctionEndDate
          ? new Date(formValue.auctionEndDate)
          : null,
      imageUrls: formValue.images || [],
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
  get artistIdsArray(): FormArray {
    return this.posterForm.get('artistIds') as FormArray;
  }

  get eventIdsArray(): FormArray {
    return this.posterForm.get('eventIds') as FormArray;
  }

  get imagesArray(): FormArray {
    return this.posterForm.get('images') as FormArray;
  }

  get listingType(): 'buyNow' | 'auction' {
    return this.posterForm.get('listingType')?.value;
  }

  getArtistName(id: string): string {
    return (
      this.artists.find(artist => artist.id === id)?.name || 'Unknown artist'
    );
  }

  getEvent(id: string): RouterTypes.Events.Event | undefined {
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
          (this.posterForm.get('title')?.valid ?? false) &&
          (this.posterForm.get('description')?.valid ?? false) &&
          (this.posterForm.get('condition')?.valid ?? false) &&
          (this.posterForm.get('dimensions')?.valid ?? false)
        );
      case 1: // Artists
        return (this.posterForm.get('artistIds') as FormArray).length > 0;
      case 2: // Events
        return (this.posterForm.get('eventIds') as FormArray).length > 0;
      case 3: // Images
        return (this.posterForm.get('images') as FormArray).length > 0;
      case 4: // Listing details
        return (
          (this.posterForm.get('price')?.valid ?? false) ||
          ((this.posterForm.get('startingBid')?.valid ?? false) &&
            (this.posterForm.get('endDate')?.valid ?? false))
        );
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
