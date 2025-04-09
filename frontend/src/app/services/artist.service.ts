import { computed, inject, Injectable, signal } from '@angular/core';
import {
  Artist,
  GetAllArtistsInput,
  GetAllArtistsOutput,
  TrpcService,
} from './trpc.service';

@Injectable({
  providedIn: 'root',
})
export class ArtistService {
  trpc = inject(TrpcService);
  artists = signal<Record<string, Artist>>({});
  getArtistById = computed(() => {
    return (id: string) => {
      const artist = this.artists()[id];
      if (artist) {
        return artist;
      }
      return null;
    };
  });

  getArtistNameById = computed(() => {
    return (id: string) => {
      const artist = this.getArtistById()(id);
      if (artist) return artist.name;
      return null;
    };
  });

  async fetchArtists(
    getAllArtistsInput: GetAllArtistsInput
  ): Promise<GetAllArtistsOutput> {
    const artistsResult = await this.trpc.getAllArtists(getAllArtistsInput);

    // patch the artists to the signal
    this.artists.update(prev => {
      const newArtists = artistsResult.items.reduce(
        (acc, artist) => {
          acc[artist.id] = artist;
          return acc;
        },
        {} as Record<string, Artist>
      );
      return { ...prev, ...newArtists };
    });
    return artistsResult;
  }
}
