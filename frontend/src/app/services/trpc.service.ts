import { Injectable } from '@angular/core';
import { createTRPCProxyClient } from '@trpc/client';
import { httpBatchLink } from '@trpc/client/links/httpBatchLink';
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

  // Auth methods
  register(
    email: string,
    passwordHash: string,
    name?: string
  ): Promise<RouterTypes.Auth.RegisterOutput> {
    return this.client.auth.register.mutate({ email, passwordHash, name });
  }

  login(
    email: string,
    passwordHash: string
  ): Promise<RouterTypes.Auth.LoginOutput> {
    return this.client.auth.login.mutate({ email, passwordHash });
  }

  logout(token: string): Promise<RouterTypes.Auth.LogoutOutput> {
    return this.client.auth.logout.mutate({ token });
  }

  getCurrentUser(): Promise<RouterTypes.Auth.MeOutput> {
    return this.client.auth.me.query();
  }

  // Poster methods
  getAllPosters(
    params?: RouterTypes.Posters.GetAllInput
  ): Promise<RouterTypes.Posters.GetAllOutput> {
    return this.client.posters.getAll.query(params || {});
  }

  getPosterById(id: number): Promise<RouterTypes.Posters.GetByIdOutput> {
    return this.client.posters.getById.query({ id });
  }

  createPoster(
    poster: RouterTypes.Posters.CreateInput
  ): Promise<RouterTypes.Posters.CreateOutput> {
    return this.client.posters.create.mutate(poster);
  }

  updatePoster(
    id: number,
    posterData: Partial<Omit<RouterTypes.Posters.UpdateInput, 'id'>>
  ): Promise<RouterTypes.Posters.UpdateOutput> {
    return this.client.posters.update.mutate({ id, ...posterData });
  }

  deletePoster(id: number): Promise<RouterTypes.Posters.DeleteOutput> {
    return this.client.posters.delete.mutate({ id });
  }
}
