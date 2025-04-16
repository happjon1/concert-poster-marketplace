import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  input,
  inject,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormGroup,
  FormArray,
} from '@angular/forms';
import { Artist } from '../../../services/trpc.service';
import { ArtistService } from '../../../services/artist.service';
import {
  BehaviorSubject,
  catchError,
  debounceTime,
  distinctUntilChanged,
  from,
  of,
  switchMap,
} from 'rxjs';

@Component({
  selector: 'app-artist-selector',
  templateUrl: './artist-selector.component.html',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArtistSelectorComponent implements OnInit {
  parentForm = input.required<FormGroup>();
  addArtist = output<Artist>();
  removeArtist = output<number>();

  // Signal-based state management
  initialArtists = signal<Artist[]>([]);
  artists = signal<Artist[]>([]);
  artistSearchTerm = '';
  artistSearchTermSubject = new BehaviorSubject<string>('');
  isSearchingArtists = signal<boolean>(false);

  artistService = inject(ArtistService);

  get artistIdsArray(): FormArray {
    return this.parentForm().get('artistIds') as FormArray;
  }

  constructor() {
    // Setup the search observable with debounce
    this.artistSearchTermSubject
      .pipe(
        debounceTime(300), // Wait for 300ms pause in events
        distinctUntilChanged(), // Only emit if value changed
        switchMap(term => {
          if (!term || term.length < 2) {
            // Don't search for very short terms, show initial artists instead
            return of({ items: this.initialArtists() });
          }

          this.isSearchingArtists.set(true);
          return from(this.artistService.fetchArtists({ search: term })).pipe(
            catchError(error => {
              console.error('Error searching artists:', error);
              return of({ items: [] });
            })
          );
        })
      )
      .subscribe(result => {
        this.artists.set(result.items);
        this.isSearchingArtists.set(false);
      });
  }

  async ngOnInit(): Promise<void> {
    this.isSearchingArtists.set(true);
    try {
      const initialArtistsResult = await this.artistService.fetchArtists({
        search: '',
      });
      this.initialArtists.set(initialArtistsResult.items);
      this.artists.set(initialArtistsResult.items);
    } catch (error) {
      console.error('Error fetching initial artists:', error);
    } finally {
      this.isSearchingArtists.set(false);
    }
  }

  onSearch(): void {
    this.artistSearchTermSubject.next(this.artistSearchTerm);
  }

  onAddArtist(artist: Artist): void {
    this.addArtist.emit(artist);
  }

  onRemoveArtist(index: number): void {
    this.removeArtist.emit(index);
  }

  getArtistName(artistId: string | null): string {
    if (!artistId) return 'Unknown Artist';

    return (
      this.artistService.getArtistNameById()(artistId) ?? 'Artist Not Found'
    );
  }
}
