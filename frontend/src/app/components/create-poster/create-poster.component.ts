import {
  Component,
  OnInit,
  AfterViewInit,
  HostListener,
  ViewChild,
  ElementRef,
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
import { BasicInfoFormComponent } from './basic-info-form/basic-info-form.component';
import { ArtistSelectorComponent } from './artist-selector/artist-selector.component';
import { EventSelectorComponent } from './event-selector/event-selector.component';
import { ImageUploaderComponent } from './image-uploader/image-uploader.component';
import { ListingDetailsFormComponent } from './listing-details-form/listing-details-form.component';
import Stepper from 'bs-stepper';

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
export class CreatePosterComponent implements OnInit, AfterViewInit {
  @ViewChild('desktopStepper') stepperElement!: ElementRef;

  posterForm!: FormGroup;
  isSubmitting = false;
  errorMessage = '';

  // For image uploads
  uploadedImages: string[] = [];
  isUploading = false;
  maxImages = 5;
  activeImageIndex = 0;

  // For dropdowns - use imported types
  artists: RouterTypes.Artists.Artist[] = [];
  events: RouterTypes.Events.Event[] = [];
  filteredArtists: RouterTypes.Artists.Artist[] = [];
  filteredEvents: RouterTypes.Events.Event[] = [];

  // For search fields
  artistSearch = '';
  eventSearch = '';

  formInitialized = false;

  private stepper!: Stepper;

  // Add this property to control whether to enforce linear progression
  enforceLinearStepper = true; // Set to false if you want to allow jumping to any step

  // Make sure you have a class property
  private _currentStepIndex = 0;

  private previousIsMobile = false;

  constructor(
    private fb: FormBuilder,
    private trpcService: TrpcService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.formInitialized = true;
    this.loadArtists();
    this.loadEvents();
  }

  @HostListener('window:resize', ['$event'])
  onResize() {
    // Check if we've crossed the breakpoint
    this.checkViewportChange();
  }

  private checkViewportChange(): void {
    const currentIsMobile = window.innerWidth < 768; // Bootstrap md breakpoint

    // Only take action if we've crossed the breakpoint
    if (this.previousIsMobile !== currentIsMobile) {
      console.log(
        `View changed from ${
          this.previousIsMobile ? 'mobile' : 'desktop'
        } to ${currentIsMobile ? 'mobile' : 'desktop'}`
      );

      this.previousIsMobile = currentIsMobile;

      // Give the DOM time to update
      setTimeout(() => {
        if (!currentIsMobile) {
          // We switched to desktop - reinitialize stepper
          this.initDesktopStepper();
        }
      }, 150);
    }
  }

  ngAfterViewInit() {
    this.previousIsMobile = window.innerWidth < 768;

    // ViewChild is available in ngAfterViewInit
    if (this.stepperElement && window.innerWidth >= 768) {
      this.initDesktopStepper();
    }
  }

  private initDesktopStepper(): void {
    try {
      if (this.stepperElement?.nativeElement) {
        this.stepper = new Stepper(this.stepperElement.nativeElement, {
          linear: false,
          animation: true,
        });

        // Go to current step
        if (this._currentStepIndex > 0) {
          this.stepper.to(this._currentStepIndex);
        }
      }
    } catch (error) {
      console.error('Error initializing stepper:', error);
    }
  }

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

    // Set conditional validators based on listing type
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

  // Form getters for easier access in template
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

  // Load artists and events from backend
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

  // Filter artists and events based on search term
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

  // Add/remove artists and events
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

  // Get artist/event name by ID (for display)
  getArtistName(id: string): string {
    return (
      this.artists.find(artist => artist.id === id)?.name || 'Unknown artist'
    );
  }

  getEvent(id: string): RouterTypes.Events.Event | undefined {
    return this.events.find(event => event.id === id);
  }

  // Image handling
  onFileSelected(event: Event): void {
    console.log('File selection received in parent component:', event);

    const input = event.target as HTMLInputElement;
    if (!input.files?.length) {
      console.log('No files selected');
      return;
    }

    console.log('Files selected:', input.files.length);

    // Process files
    const files = Array.from(input.files);
    this.processSelectedFiles(files);
  }

  private processSelectedFiles(files: File[]): void {
    // Implement file processing logic
    this.isUploading = true;

    // Create temporary URLs for preview
    const newImages = files.map(file => URL.createObjectURL(file));
    this.uploadedImages = [...this.uploadedImages, ...newImages];

    // Update form array
    const imagesArray = this.posterForm.get('images') as FormArray;
    files.forEach(() => {
      // Add placeholder values to form array
      imagesArray.push(this.fb.control(''));
    });

    // Simulate upload delay
    setTimeout(() => {
      this.isUploading = false;
      // In a real app, you'd upload files to server here
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

  // Form submission
  async onSubmit(): Promise<void> {
    if (this.posterForm.invalid) {
      // Mark all fields as touched to show validation errors
      Object.keys(this.posterForm.controls).forEach(key => {
        const control = this.posterForm.get(key);
        control?.markAsTouched();
      });
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    try {
      const formValue = this.posterForm.value;

      // Format the data as needed for your API
      const posterData: RouterTypes.Posters.CreateInput = {
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
        // Convert string date to Date object if it exists
        auctionEndDate:
          formValue.listingType === 'auction' && formValue.auctionEndDate
            ? new Date(formValue.auctionEndDate)
            : null,
        // Use the correct field name for images (should match your API)
        imageUrls: formValue.images || [], // Change this to match the expected field name
      };

      console.log('Submitting poster data:', posterData);

      // Send to your API
      const result = await this.trpcService.createPoster(posterData);

      // Navigate to the new poster page or listings page
      this.router.navigate(['/posters', result.id]);
    } catch (error: unknown) {
      console.error('Error creating poster:', error);

      // Improved error handling
      let message = 'Failed to create poster listing';
      if (error instanceof Error) {
        message = error.message;
      }
      this.errorMessage = message;
    } finally {
      this.isSubmitting = false;
    }
  }

  // Add helper methods
  next() {
    const currentIndex = this.getCurrentStepIndex();
    this.goToStep(currentIndex + 1);
  }

  previous() {
    const currentIndex = this.getCurrentStepIndex();
    this.goToStep(currentIndex - 1);
  }

  goToStep(stepIndex: number): void {
    // Ensure stepIndex is within bounds
    if (stepIndex < 0 || stepIndex > 4) {
      return;
    }

    // Validate current step if enforcing linear progression
    if (this.enforceLinearStepper) {
      // Get the current step index
      const currentIndex = this._currentStepIndex;

      // Only allow moving forward if previous steps are valid
      if (stepIndex > currentIndex) {
        let canAdvance = true;

        // Check all previous steps
        for (let i = 0; i < stepIndex; i++) {
          if (!this.validateStep(i)) {
            canAdvance = false;
            this.errorMessage =
              'Please complete all required fields in previous steps first.';

            // Clear error after 3 seconds
            setTimeout(() => (this.errorMessage = ''), 3000);
            break;
          }
        }

        if (!canAdvance) {
          return;
        }
      }
    }

    // Update current step index
    this._currentStepIndex = stepIndex;
    console.log('Set current step index to:', this._currentStepIndex);

    // Try to update the BS-Stepper if it exists
    try {
      if (this.stepper) {
        this.stepper.to(stepIndex);
      }
    } catch (error) {
      console.error('Error updating BS-Stepper:', error);
    }
  }

  // Add this helper method to get the current step index
  public getCurrentStepIndex(): number {
    // Ensure we always have a valid index
    if (
      this._currentStepIndex === undefined ||
      this._currentStepIndex === null
    ) {
      this._currentStepIndex = 0;
    }

    return this._currentStepIndex;
  }

  // Add this method if you don't already have it
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

  // Helper method to get step target ID
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

  // Add this method to your component
  onStepperChange(event: Event) {
    const stepperEvent = event as unknown as {
      detail: { indexStep: number };
    };
    console.log('BS-Stepper changed to step:', stepperEvent.detail.indexStep);
    this._currentStepIndex = stepperEvent.detail.indexStep;
  }
}
