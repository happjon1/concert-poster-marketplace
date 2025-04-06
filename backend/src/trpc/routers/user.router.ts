import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../trpc.js";
import { TRPCError } from "@trpc/server";
import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";

// Initialize Prisma client
const prisma = new PrismaClient();

// ------------------- Helper Functions -------------------

/**
 * Find all users with safe data (no passwords)
 */
async function findAllUsers() {
  return prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      isAdmin: true,
      stripeAccountId: true,
      defaultAddressId: true,
      lastLogin: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

/**
 * Find a user by ID with safe data
 */
async function findUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      isAdmin: true,
      stripeAccountId: true,
      defaultAddressId: true,
      lastLogin: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

/**
 * Create a new user
 */
async function createUser(data: {
  email: string;
  passwordHash: string;
  name?: string;
  isAdmin?: boolean;
}) {
  const hashedPassword = await bcrypt.hash(data.passwordHash, 10);

  return prisma.user.create({
    data: {
      email: data.email,
      passwordHash: hashedPassword,
      name: data.name,
      isAdmin: data.isAdmin || false,
    },
    select: {
      id: true,
      email: true,
      name: true,
      isAdmin: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

/**
 * Update a user
 */
async function updateUser(
  id: string,
  data: {
    email?: string;
    name?: string;
    phone?: string;
    isAdmin?: boolean;
  }
) {
  return prisma.user.update({
    where: { id },
    data,
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      isAdmin: true,
      stripeAccountId: true,
      defaultAddressId: true,
      lastLogin: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

/**
 * Delete a user
 */
async function deleteUser(id: string) {
  return prisma.user.delete({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
    },
  });
}

// ------------------- tRPC Router -------------------

export const userRouter = router({
  // Get all users (admin only in a real app)
  getAll: protectedProcedure.query(async ({ ctx }) => {
    // In a real app, check if the user is an admin
    return await findAllUsers();
  }),

  // Get user by ID
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const user = await findUserById(input.id);

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      return user;
    }),

  // Create new user (register)
  register: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        passwordHash: z.string().min(6),
        name: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Check if email already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: input.email },
      });

      if (existingUser) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Email already in use",
        });
      }

      return await createUser(input);
    }),

  // Update user
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        email: z.string().email().optional(),
        name: z.string().optional(),
        phone: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Ensure users can only update their own profile (unless admin)
      if (input.id !== ctx.userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only update your own profile",
        });
      }

      try {
        return await updateUser(input.id, {
          email: input.email,
          name: input.name,
          phone: input.phone,
        });
      } catch (error) {
        if ((error as any).code === "P2002") {
          // Unique constraint error
          throw new TRPCError({
            code: "CONFLICT",
            message: "Email already in use",
          });
        }
        throw error;
      }
    }),

  // Delete user
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Ensure users can only delete their own profile (unless admin)
      if (input.id !== ctx.userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only delete your own profile",
        });
      }

      try {
        return await deleteUser(input.id);
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete user",
        });
      }
    }),
});
