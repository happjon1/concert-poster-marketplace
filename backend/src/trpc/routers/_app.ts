import { router } from "../trpc.js";
import { authRouter } from "./auth.router.js";
import { userRouter } from "./user.router.js";
import { posterRouter } from "./poster.router.js";
// Import the RouterTypes to validate against
import type { ClientAppRouter } from "@concert-poster-marketplace/shared/types/router.js";
import { upload } from "../../config/storage.js";
import { uploadRouter } from "./upload.router.js";
import { artistRouter } from "./artist.router.js";
import { eventRouter } from "./event.router.js";

export const appRouter = router({
  auth: authRouter,
  users: userRouter,
  posters: posterRouter,
  upload: uploadRouter,
  artists: artistRouter, // Register with 'artists' namespace
  events: eventRouter, // Register with 'events' namespace
});

// Export type definition of API
export type AppRouter = typeof appRouter;

// Optional runtime type validation
// Verify that the backend router matches the shared types
// This will cause a type error if they don't match
type ValidateRouter = ClientAppRouter extends AppRouter ? true : never;
