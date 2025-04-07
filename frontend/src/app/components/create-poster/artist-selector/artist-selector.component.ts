import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormGroup,
  FormArray,
} from '@angular/forms';
import { RouterTypes } from '@concert-poster-marketplace/shared';

@Component({
  selector: 'app-artist-selector',
  templateUrl: './artist-selector.component.html',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
})
export class ArtistSelectorComponent {
  @Input() parentForm!: FormGroup;
  @Input() artists: RouterTypes.Artists.Artist[] = [];
  @Input() filteredArtists: RouterTypes.Artists.Artist[] = [];
  @Input() artistSearchTerm = '';
  @Input() isSearchingArtists = false;

  @Output() artistSearch = new EventEmitter<string>();
  @Output() addArtist = new EventEmitter<RouterTypes.Artists.Artist>();
  @Output() removeArtist = new EventEmitter<number>();

  get artistIdsArray(): FormArray {
    return this.parentForm.get('artistIds') as FormArray;
  }

  onSearch(): void {
    this.artistSearch.emit(this.artistSearchTerm);
  }

  onAddArtist(artist: RouterTypes.Artists.Artist): void {
    this.addArtist.emit(artist);
  }

  onRemoveArtist(index: number): void {
    this.removeArtist.emit(index);
  }

  /**
   * Returns the name of the artist with the given ID
   */
  getArtistName(artistId: string): string {
    // Find the artist in the full artists array
    const artist = this.artists.find(a => a.id === artistId);

    // If found, return name, otherwise show a fallback
    if (artist) {
      return artist.name;
    }

    // Optional: Try to find in filtered list if not in main list
    const filteredArtist = this.filteredArtists.find(a => a.id === artistId);
    if (filteredArtist) {
      return filteredArtist.name;
    }

    return 'Unknown artist';
  }
}
