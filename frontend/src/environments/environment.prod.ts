// frontend/src/environments/environment.prod.ts
export const environment = {
  production: true,
  apiUrl: 'https://tubebazaar.com',
  appName: 'Tube Bazaar',
  defaultPageSize: 12,
  imageStorageUrl: 'https://tubebazaar.com/api/uploads',

  // Stripe configuration
  stripePublishableKey: 'pk_live_your_stripe_publishable_key', // Replace with your live Stripe key

  enableDebugLogging: false,
};
