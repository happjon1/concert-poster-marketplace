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

  @Output() artistSearch = new EventEmitter<string>();
  @Output() addArtist = new EventEmitter<RouterTypes.Artists.Artist>();
  @Output() removeArtist = new EventEmitter<number>();

  artistSearchTerm = '';

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

  getArtistName(id: string): string {
    const artist = this.artists.find(a => a.id === id);
    return artist ? artist.name : '';
  }
}
