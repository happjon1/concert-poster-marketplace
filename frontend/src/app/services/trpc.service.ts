import { Injectable } from '@angular/core';
import { createTRPCClient } from '@trpc/client';
import { httpBatchLink } from '@trpc/client/links/httpBatchLink';
import superjson from 'superjson';
import type { AppRouter } from '../../../../../concert-poster-marketplace/backend/src/trpc/routers/_app';
import { inferRouterInputs, inferRouterOutputs } from '@trpc/server';

// @ts-expect-error AppRouter types are imported from the backend and may not be fully resolved in the frontend
export type RouterInput = inferRouterInputs<AppRouter>;

// @ts-expect-error AppRouter types are imported from the backend and may not be fully resolved in the frontend
export type RouterOutput = inferRouterOutputs<AppRouter>;

type ArrayElement<ArrayType extends readonly unknown[]> =
  ArrayType extends readonly (infer ElementType)[] ? ElementType : never;

export type RegisterInput = RouterInput['auth']['register'];
export type RegisterOutput = RouterOutput['auth']['register'];
export type LoginInput = RouterInput['auth']['login'];
export type LoginOutput = RouterOutput['auth']['login'];
export type LogoutInput = RouterInput['auth']['logout'];
export type LogoutOutput = RouterOutput['auth']['logout'];
export type User = RouterOutput['auth']['me'];

export type GetAllPostersInput = RouterInput['posters']['getAll'];
export type GetAllPostersOutput = RouterOutput['posters']['getAll'];
export type PosterSlim = ArrayElement<GetAllArtistsOutput['items']>;

export type GetPosterByIdInput = RouterInput['posters']['getById'];
export type GetPosterByIdOutput = RouterOutput['posters']['getById'];
export type CreatePosterInput = RouterInput['posters']['create'];
export type CreatePosterOutput = RouterOutput['posters']['create'];
export type UpdatePosterInput = RouterInput['posters']['update'];
export type UpdatePosterOutput = RouterOutput['posters']['update'];
export type DeletePosterInput = RouterInput['posters']['delete'];
export type DeletePosterOutput = RouterOutput['posters']['delete'];

export type GetSignedUrlInput = RouterInput['upload']['getSignedUrl'];
export type ImageUrl = RouterOutput['upload']['getSignedUrl'];

export type GetAllArtistsInput = RouterInput['artists']['getAll'];
export type GetAllArtistsOutput = RouterOutput['artists']['getAll'];
export type GetArtistByIdInput = RouterInput['artists']['getById'];
export type Artist = RouterOutput['artists']['getById'];

export type GetAllEventsInput = RouterInput['events']['getAll'];
export type GetAllEventsOutput = RouterOutput['events']['getAll'];
export type GetEventByIdInput = RouterInput['events']['getById'];
export type ConcertEvent = RouterOutput['events']['getById'];

export type Venue = ConcertEvent['venue'];

@Injectable({
  providedIn: 'root',
})
export class TrpcService {
  //ignore typescript error
  // @ts-expect-error: AppRouter types are imported from the backend and may not be fully resolved in the frontend
  private client = createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        url: 'http://localhost:3000/trpc',
        headers: () => {
          const token = localStorage.getItem('token');
          return token ? { Authorization: `Bearer ${token}` } : {};
        },
        transformer: superjson,
      }),
    ],
  });

  // Auth methods
  register(params: RegisterInput): Promise<RegisterOutput> {
    return this.client.auth.register.mutate(params);
  }

  login(params: LoginInput): Promise<LoginOutput> {
    return this.client.auth.login.mutate(params);
  }

  logout(params: LogoutInput): Promise<LogoutOutput> {
    return this.client.auth.logout.mutate(params);
  }

  getCurrentUser(): Promise<User> {
    return this.client.auth.me.query();
  }

  // Poster methods
  getAllPosters(params?: GetAllPostersInput): Promise<GetAllPostersOutput> {
    return this.client.posters.getAll.query(params || {});
  }

  getPosterById(params: GetPosterByIdInput): Promise<GetPosterByIdOutput> {
    return this.client.posters.getById.query(params);
  }

  createPoster(poster: CreatePosterInput): Promise<CreatePosterOutput> {
    return this.client.posters.create.mutate(poster);
  }

  updatePoster(params: UpdatePosterInput): Promise<UpdatePosterOutput> {
    return this.client.posters.update.mutate(params);
  }

  deletePoster(params: DeletePosterInput): Promise<DeletePosterOutput> {
    return this.client.posters.delete.mutate(params);
  }

  // Upload methods
  getSignedUrl(params: GetSignedUrlInput): Promise<ImageUrl> {
    return this.client.upload.getSignedUrl.mutate(params);
  }

  // Artist methods
  getAllArtists(params?: GetAllArtistsInput): Promise<GetAllArtistsOutput> {
    return this.client.artists.getAll.query(params || {});
  }

  getArtistById(params: GetArtistByIdInput): Promise<Artist> {
    return this.client.artists.getById.query(params);
  }

  // Event methods
  getAllEvents(params?: GetAllEventsInput): Promise<GetAllEventsOutput> {
    return this.client.events.getAll.query(params || {});
  }

  getEventById(params: GetEventByIdInput): Promise<ConcertEvent> {
    return this.client.events.getById.query(params);
  }
}
