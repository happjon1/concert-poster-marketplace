import { Injectable } from '@angular/core';
import { createTRPCClient } from '@trpc/client';
import { httpBatchLink } from '@trpc/client/links/httpBatchLink';
import superjson from 'superjson';
import type { AppRouter } from '../../../../backend/src/trpc/routers/_app';
import { inferRouterInputs, inferRouterOutputs } from '@trpc/server';
import { environment } from '../../environments/environment';
import {
  AccountLinkResponse,
  AccountStatusResponse,
  ConnectedAccountResponse,
  LoginLinkResponse,
  PaymentMethod,
} from './stripe.service';

// @ts-expect-error AppRouter types are imported from the backend and may not be fully resolved in the frontend
export type RouterInput = inferRouterInputs<AppRouter>;

// @ts-expect-error AppRouter types are imported from the backend and may not be fully resolved in the frontend
export type RouterOutput = inferRouterOutputs<AppRouter>;

type ArrayElement<ArrayType extends readonly unknown[]> =
  ArrayType extends readonly (infer ElementType)[] ? ElementType : never;

// Auth types
export type RegisterInput = RouterInput['auth']['register'];
export type RegisterOutput = RouterOutput['auth']['register'];
export type LoginInput = RouterInput['auth']['login'];
export type LoginOutput = RouterOutput['auth']['login'];
export type LogoutInput = RouterInput['auth']['logout'];
export type LogoutOutput = RouterOutput['auth']['logout'];
export type User = RouterOutput['auth']['me'];
export type Address = ArrayElement<User['addresses']>;

// Poster types
export type GetAllPostersInput = RouterInput['posters']['getAll'];
export type GetAllPostersOutput = RouterOutput['posters']['getAll'];
export type Poster = ArrayElement<GetAllPostersOutput['items']>;
export type GetPosterByIdInput = RouterInput['posters']['getById'];
export type GetPosterByIdOutput = RouterOutput['posters']['getById'];
export type CreatePosterInput = RouterInput['posters']['create'];
export type CreatePosterOutput = RouterOutput['posters']['create'];
export type UpdatePosterInput = RouterInput['posters']['update'];
export type UpdatePosterOutput = RouterOutput['posters']['update'];
export type DeletePosterInput = RouterInput['posters']['delete'];
export type DeletePosterOutput = RouterOutput['posters']['delete'];

// Upload types
export type GetSignedUrlInput = RouterInput['upload']['getSignedUrl'];
export type ImageUrl = RouterOutput['upload']['getSignedUrl'];

// Artist types
export type GetAllArtistsInput = RouterInput['artists']['getAll'];
export type GetAllArtistsOutput = RouterOutput['artists']['getAll'];
export type GetArtistByIdInput = RouterInput['artists']['getById'];
export type Artist = RouterOutput['artists']['getById'];

// Event types
export type GetAllEventsInput = RouterInput['events']['getAll'];
export type GetAllEventsOutput = RouterOutput['events']['getAll'];
export type GetEventByIdInput = RouterInput['events']['getById'];
export type ConcertEvent = RouterOutput['events']['getById'];
export type Venue = ConcertEvent['venue'];

// User types
export type UpdateUserInput = RouterInput['users']['update'];
export type UpdateUserOutput = RouterOutput['users']['update'];

// Address types
export type GetAddressesInput = RouterInput['users']['getAddresses'];
export type GetAddressesOutput = RouterOutput['users']['getAddresses'];
export type CreateAddressInput = RouterInput['users']['createAddress'];
export type CreateAddressOutput = RouterOutput['users']['createAddress'];
export type UpdateAddressInput = RouterInput['users']['updateAddress'];
export type UpdateAddressOutput = RouterOutput['users']['updateAddress'];
export type DeleteAddressInput = RouterInput['users']['deleteAddress'];
export type DeleteAddressOutput = RouterOutput['users']['deleteAddress'];
export type SetDefaultAddressInput = RouterInput['users']['setDefaultAddress'];
export type SetDefaultAddressOutput =
  RouterOutput['users']['setDefaultAddress'];

// Payment method types
export type GetPaymentMethodsOutput =
  RouterOutput['stripe']['getPaymentMethods'];
export type CreatePaymentMethodInput =
  RouterInput['stripe']['createPaymentMethod'];
export type CreatePaymentMethodOutput =
  RouterOutput['stripe']['createPaymentMethod'];
export type DeletePaymentMethodInput =
  RouterInput['stripe']['deletePaymentMethod'];
export type DeletePaymentMethodOutput =
  RouterOutput['stripe']['deletePaymentMethod'];

@Injectable({
  providedIn: 'root',
})
export class TrpcService {
  // @ts-expect-error: AppRouter types are imported from the backend and may not be fully resolved in the frontend
  private client = createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        url: `${environment.apiUrl}/trpc`,
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

  // User methods
  updateUser(params: UpdateUserInput): Promise<UpdateUserOutput> {
    return this.client.users.update.mutate(params);
  }

  // Address methods
  getUserAddresses(userId: string): Promise<GetAddressesOutput> {
    return this.client.users.getAddresses.query({ userId });
  }

  createAddress(addressData: CreateAddressInput): Promise<CreateAddressOutput> {
    return this.client.users.createAddress.mutate(addressData);
  }

  updateAddress(addressData: UpdateAddressInput): Promise<UpdateAddressOutput> {
    return this.client.users.updateAddress.mutate(addressData);
  }

  deleteAddress(addressId: string): Promise<DeleteAddressOutput> {
    return this.client.users.deleteAddress.mutate({ id: addressId });
  }

  setDefaultAddress(addressId: string): Promise<SetDefaultAddressOutput> {
    return this.client.users.setDefaultAddress.mutate({ addressId });
  }

  // Stripe methods
  getPaymentMethods(): Promise<GetPaymentMethodsOutput> {
    return this.client.stripe.getPaymentMethods.query();
  }

  createPaymentMethod(
    params: CreatePaymentMethodInput
  ): Promise<CreatePaymentMethodOutput> {
    return this.client.stripe.createPaymentMethod.mutate(params);
  }

  // This method uses createPaymentMethod to update a payment method since we don't have
  // a dedicated updatePaymentMethod endpoint
  updatePaymentMethod(
    paymentMethod: PaymentMethod
  ): Promise<CreatePaymentMethodOutput> {
    // In Stripe, we use the existing createPaymentMethod endpoint
    return this.client.stripe.createPaymentMethod.mutate({
      paymentMethodId: paymentMethod.id,
      makeDefault: paymentMethod.isDefault,
    });
  }

  // Set default payment method - using createPaymentMethod with makeDefault flag
  setDefaultPaymentMethod(
    paymentMethodId: string
  ): Promise<CreatePaymentMethodOutput> {
    return this.client.stripe.createPaymentMethod.mutate({
      paymentMethodId,
      makeDefault: true,
    });
  }

  deletePaymentMethod(
    params: DeletePaymentMethodInput
  ): Promise<DeletePaymentMethodOutput> {
    return this.client.stripe.deletePaymentMethod.mutate(params);
  }

  createConnectedAccount(): Promise<ConnectedAccountResponse> {
    return this.client.stripe.createConnectedAccount.mutate();
  }

  getConnectedAccountStatus(): Promise<AccountStatusResponse> {
    return this.client.stripe.getConnectedAccountStatus.query();
  }

  createAccountLink(): Promise<AccountLinkResponse> {
    return this.client.stripe.createAccountLink.mutate();
  }

  createLoginLink(): Promise<LoginLinkResponse> {
    return this.client.stripe.createLoginLink.mutate();
  }
}
