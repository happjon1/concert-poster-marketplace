import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Poster } from '../../services/trpc.service';
import { CommaSeparatedListComponent } from '../comma-separated-list/comma-separated-list.component';

@Component({
  selector: 'app-poster-card',
  imports: [CommonModule, RouterModule, CommaSeparatedListComponent],
  templateUrl: './poster-card.component.html',
  styleUrl: './poster-card.component.scss',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PosterCardComponent {
  poster = input<Poster>();

  // Get array of artist names for use in the CommaSeparatedList component
  artistNames = computed(
    () => this.poster()?.artists.map(artist => artist.name) || []
  );

  // Get array of event details for use in the CommaSeparatedList component
  eventDetailsArray = computed(
    () =>
      this.poster()?.events.map(
        event => `${event.venue.name} - ${event.date}`
      ) || []
  );

  // Legacy computed properties for backward compatibility
  artistName = computed(() =>
    this.poster()
      ?.artists.map(artist => artist.name)
      .join(', ')
  );

  eventDetails = computed(() =>
    this.poster()
      ?.events.map(event => `${event.venue.name} - ${event.date}`)
      .join(', ')
  );

  priceDisplay = computed(() => {
    const poster = this.poster();
    if (!poster) return 'Price not available';

    if (poster.isAuction && poster.startPrice) {
      return `$${poster.startPrice.toFixed(2)}`;
    } else if (!poster.isAuction && poster.buyNowPrice) {
      return `$${poster.buyNowPrice.toFixed(2)}`;
    }

    return 'Price not available';
  });
}
