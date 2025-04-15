import Stripe from "stripe";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

if (!process.env["STRIPE_SECRET_KEY"]) {
  console.warn("Missing STRIPE_SECRET_KEY in environment variables");
}

// Initialize Stripe with the API key
const stripe = new Stripe(process.env["STRIPE_SECRET_KEY"] || "", {
  apiVersion: "2025-03-31.basil", // Use the latest Stripe API version
});

export default stripe;
