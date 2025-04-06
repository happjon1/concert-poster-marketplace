import { Component, OnInit } from '@angular/core';
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

@Component({
  selector: 'app-create-poster',
  templateUrl: './create-poster.component.html',
  styleUrls: ['./create-poster.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
})
export class CreatePosterComponent implements OnInit {
  posterForm!: FormGroup;
  isSubmitting = false;
  errorMessage = '';

  // For image uploads
  uploadedImages: { url: string; file: File }[] = [];
  isUploading = false;
  maxImages = 3;
  activeImageIndex = 0;

  // For dropdowns - use imported types
  artists: RouterTypes.Artists.Artist[] = [];
  events: RouterTypes.Events.Event[] = [];
  filteredArtists: RouterTypes.Artists.Artist[] = [];
  filteredEvents: RouterTypes.Events.Event[] = [];

  // For search fields
  artistSearch = '';
  eventSearch = '';

  constructor(
    private fb: FormBuilder,
    private trpcService: TrpcService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadArtists();
    this.loadEvents();
  }

  private initForm(): void {
    this.posterForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', [Validators.required, Validators.minLength(10)]],
      condition: ['', [Validators.required]],
      dimensions: ['', [Validators.required]],
      artistIds: this.fb.array([], Validators.required),
      eventIds: this.fb.array([], Validators.required),
      listingType: ['buyNow', Validators.required],
      buyNowPrice: [null],
      auctionMinPrice: [null],
      auctionEndDate: [null],
      images: this.fb.array([], [Validators.required, Validators.minLength(1)]),
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

  get listingType(): string {
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
  filterArtists(): void {
    this.filteredArtists = this.artists.filter(artist =>
      artist.name.toLowerCase().includes(this.artistSearch.toLowerCase())
    );
  }

  filterEvents(): void {
    this.filteredEvents = this.events.filter(event =>
      event.name.toLowerCase().includes(this.eventSearch.toLowerCase())
    );
  }

  // Add/remove artists and events
  addArtist(artist: RouterTypes.Artists.Artist): void {
    // Check if artist already added
    if (this.artistIdsArray.value.includes(artist.id)) {
      return;
    }
    this.artistIdsArray.push(this.fb.control(artist.id));
  }

  removeArtist(index: number): void {
    this.artistIdsArray.removeAt(index);
  }

  addEvent(event: RouterTypes.Events.Event): void {
    // Check if event already added
    if (this.eventIdsArray.value.includes(event.id)) {
      return;
    }
    this.eventIdsArray.push(this.fb.control(event.id));
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
  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = input.files;

    if (!files || files.length === 0) return;

    if (this.uploadedImages.length + files.length > this.maxImages) {
      alert(`You can only upload up to ${this.maxImages} images`);
      return;
    }

    this.isUploading = true;

    for (const file of files) {
      try {
        // Get signed URL from your backend
        const { uploadUrl, publicUrl } = await this.trpcService.getSignedUrl({
          fileName: file.name,
          fileType: file.type,
        });

        // Upload directly to Digital Ocean with the correct headers
        const uploadResponse = await fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': file.type,
            'x-amz-acl': 'public-read',
          },
          body: file,
          mode: 'cors', // Explicitly specify CORS mode
        });

        if (!uploadResponse.ok) {
          throw new Error(`Upload failed: ${uploadResponse.statusText}`);
        }

        // Add to our local array and form array
        this.uploadedImages.push({ url: publicUrl, file });
        this.imagesArray.push(this.fb.control(publicUrl));
      } catch (error: unknown) {
        console.error('Upload failed', error);
        this.errorMessage =
          error instanceof Error ? error.message : 'Failed to upload image';
      }
    }

    this.isUploading = false;
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
}
