import { initTRPC, TRPCError } from "@trpc/server";
import { Context } from "./context.js";
import superjson from "superjson";
import prisma from "../config/prisma.js"; // Import shared Prisma instance

// Initialize tRPC
const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

// Export reusable router and procedure helpers
export const router = t.router;
export const publicProcedure = t.procedure;

// Protected procedure - requires authentication
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Not authenticated",
    });
  }
  return next({
    ctx: {
      ...ctx,
      userId: ctx.userId,
    },
  });
});

// Admin procedure - requires authentication and admin role
export const adminProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Not authenticated",
    });
  }

  // Query the database to check if the user is an admin
  const user = await prisma.user.findUnique({
    where: { id: ctx.userId },
    select: { isAdmin: true },
  });

  if (!user || !user.isAdmin) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Requires admin privileges",
    });
  }

  return next({
    ctx: {
      ...ctx,
      userId: ctx.userId,
    },
  });
});
