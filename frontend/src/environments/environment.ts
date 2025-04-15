export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000',

  // Optional additional configuration
  appName: 'Concert Poster Marketplace',
  defaultPageSize: 12,
  imageStorageUrl: 'http://localhost:3000/uploads',

  // Google Maps configuration for address autocomplete
  googleMapsApiKey: 'AIzaSyBfhoCfd87Wii5c-0PX-qTjj9pFmHNRa1A', // Replace with your actual API key

  // Stripe configuration
  stripePublishableKey: 'pk_test_your_stripe_publishable_key', // Replace with your Stripe publishable key

  // Debug settings
  enableDebugLogging: true,
};
