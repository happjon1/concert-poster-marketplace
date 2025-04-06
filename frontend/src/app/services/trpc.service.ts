import { Injectable } from '@angular/core';
import { createTRPCProxyClient } from '@trpc/client';
import { httpBatchLink } from '@trpc/client/links/httpBatchLink';
import { Observable, from } from 'rxjs';
import superjson from 'superjson';
import type {
  ClientAppRouter,
  RouterTypes,
} from '@concert-poster-marketplace/shared';

@Injectable({
  providedIn: 'root',
})
export class TrpcService {
  private client = createTRPCProxyClient({
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
  }) as unknown as ClientAppRouter;

  private toObservable<T>(promise: Promise<T>): Observable<T> {
    return from(promise);
  }

  // Auth methods
  register(
    email: string,
    passwordHash: string,
    name?: string
  ): Observable<RouterTypes.Auth.RegisterOutput> {
    return this.toObservable(
      this.client.auth.register.mutate({ email, passwordHash, name })
    );
  }

  login(
    email: string,
    passwordHash: string
  ): Observable<RouterTypes.Auth.LoginOutput> {
    return this.toObservable(
      this.client.auth.login.mutate({ email, passwordHash })
    );
  }

  logout(token: string): Observable<RouterTypes.Auth.LogoutOutput> {
    return this.toObservable(this.client.auth.logout.mutate({ token }));
  }

  getCurrentUser(): Observable<RouterTypes.Auth.MeOutput> {
    return this.toObservable(this.client.auth.me.query());
  }

  // Poster methods
  getAllPosters(
    params?: RouterTypes.Posters.GetAllInput
  ): Observable<RouterTypes.Posters.GetAllOutput> {
    return this.toObservable(this.client.posters.getAll.query(params || {}));
  }

  getPosterById(id: number): Observable<RouterTypes.Posters.GetByIdOutput> {
    return this.toObservable(this.client.posters.getById.query({ id }));
  }

  createPoster(
    poster: RouterTypes.Posters.CreateInput
  ): Observable<RouterTypes.Posters.CreateOutput> {
    return this.toObservable(this.client.posters.create.mutate(poster));
  }

  updatePoster(
    id: number,
    posterData: Partial<Omit<RouterTypes.Posters.UpdateInput, 'id'>>
  ): Observable<RouterTypes.Posters.UpdateOutput> {
    return this.toObservable(
      this.client.posters.update.mutate({ id, ...posterData })
    );
  }

  deletePoster(id: number): Observable<RouterTypes.Posters.DeleteOutput> {
    return this.toObservable(this.client.posters.delete.mutate({ id }));
  }
}
