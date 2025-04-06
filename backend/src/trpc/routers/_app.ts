import { router } from "../trpc.js";
import { authRouter } from "./auth.router.js";
import { userRouter } from "./user.router.js";
import { posterRouter } from "./poster.router.js";
// Import the RouterTypes to validate against
import type { ClientAppRouter } from "@concert-poster-marketplace/shared/types/router.js";

export const appRouter = router({
  auth: authRouter,
  users: userRouter,
  posters: posterRouter,
});

// Export type definition of API
export type AppRouter = typeof appRouter;

// Optional runtime type validation
// Verify that the backend router matches the shared types
// This will cause a type error if they don't match
type ValidateRouter = ClientAppRouter extends AppRouter ? true : never;
