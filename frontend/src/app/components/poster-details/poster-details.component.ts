import { Component, computed, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { TrpcService, Poster } from '../../services/trpc.service';
import { AuthService } from '../../services/auth.service';
import dayjs from 'dayjs';

@Component({
  selector: 'app-poster-details',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './poster-details.component.html',
  styleUrl: './poster-details.component.scss',
})
export class PosterDetailsComponent implements OnInit {
  poster = signal<Poster | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  activeImageIndex = signal(0);

  artistNames = computed(() =>
    this.poster()
      ?.artists.map(artist => artist.name)
      .join(', ')
  );

  constructor(
    private route: ActivatedRoute,
    private trpcService: TrpcService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Get the poster ID from the route
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.loadPoster(Number(id));
      } else {
        this.error.set('No poster ID provided');
        this.loading.set(false);
      }
    });
  }

  async loadPoster(id: number): Promise<void> {
    try {
      this.loading.set(true);
      const posterData = await this.trpcService.getPosterById({ id });
      this.poster.set(posterData);
      this.loading.set(false);
    } catch (err) {
      console.error('Error loading poster:', err);
      this.error.set('Failed to load poster details');
      this.loading.set(false);
    }
  }

  // Image carousel navigation
  nextImage(): void {
    if (this.poster() && this.poster()!.imageUrls) {
      const currentIndex = this.activeImageIndex();
      const totalImages = this.poster()!.imageUrls.length;

      if (currentIndex < totalImages - 1) {
        this.activeImageIndex.set(currentIndex + 1);
      } else {
        // Wrap around to the first image
        this.activeImageIndex.set(0);
      }
    }
  }

  prevImage(): void {
    if (this.poster() && this.poster()!.imageUrls) {
      const currentIndex = this.activeImageIndex();
      const totalImages = this.poster()!.imageUrls.length;

      if (currentIndex > 0) {
        this.activeImageIndex.set(currentIndex - 1);
      } else {
        // Wrap around to the last image
        this.activeImageIndex.set(totalImages - 1);
      }
    }
  }

  setActiveImage(index: number): void {
    this.activeImageIndex.set(index);
  }

  // Format venue and date from the poster
  getEventDetails(): string {
    if (
      !this.poster() ||
      !this.poster()!.events ||
      !this.poster()!.events.length
    ) {
      return 'Unknown Event';
    }

    const events = this.poster()!.events.map(event => {
      const venue = event.venue?.name || 'Unknown Venue';
      const date = event.date ? dayjs(event.date).format('MMMM D, YYYY') : '';

      return `${venue} - ${date}`;
    });

    return events.join(', ');
  }

  // Get formatted auction end time
  getAuctionEndTime(): string | null {
    if (!this.poster() || !this.poster()!.auctionEndAt) {
      return '';
    }

    const endDate = this.poster()!.auctionEndAt;
    return endDate ? dayjs(endDate).format('MMMM D, YYYY h:mm A') : null;
  }

  // Get time remaining for auction
  getTimeRemaining(): string | null {
    if (!this.poster() || !this.poster()!.auctionEndAt) {
      return '';
    }

    const now = dayjs();
    const endDate = dayjs(this.poster()!.auctionEndAt);
    if (!endDate) return null;

    const diff = endDate.diff(now, 'millisecond');

    if (diff <= 0) {
      return 'Auction ended';
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) {
      return `${days} days, ${hours} hours remaining`;
    } else if (hours > 0) {
      return `${hours} hours, ${minutes} minutes remaining`;
    } else {
      return `${minutes} minutes remaining`;
    }
  }

  // Buy now action
  buyNow(): void {
    // This will be implemented with Stripe integration
    console.log('Buy now clicked, will implement checkout flow');
    // TODO: Implement checkout flow with Stripe
  }

  // Place bid action
  placeBid(): void {
    // This will be implemented with bidding functionality
    console.log('Place bid clicked, will implement bidding flow');
    // TODO: Implement bidding flow
  }

  // Check if user is logged in
  isLoggedIn(): boolean {
    return !!this.authService.currentUser();
  }

  // Get current user's ID
  getCurrentUserId(): string | null {
    const user = this.authService.currentUser();
    return user ? user.id : null;
  }

  // Check if current user is the seller
  isCurrentUserSeller(): boolean {
    if (!this.isLoggedIn() || !this.poster()) {
      return false;
    }

    return this.getCurrentUserId() === this.poster()!.seller?.id;
  }
}
