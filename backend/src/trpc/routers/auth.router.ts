import { z } from "zod";
import { router, publicProcedure } from "../trpc.js";
import { TRPCError } from "@trpc/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

// Initialize Prisma client
const prisma = new PrismaClient();

// Config constants
const JWT_SECRET = process.env["JWT_SECRET"] || "default_secret";
const REFRESH_SECRET = process.env["REFRESH_SECRET"] || "refresh_secret";
const tokenBlacklist = new Set<string>();

// ------------------- Helper Functions -------------------

/**
 * Find a user by ID with safe data (no password)
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
      addresses: true, // Include user addresses
      defaultAddress: true, // Include default address relationship
    },
  });
}

/**
 * Verify user credentials and return user if valid
 */
async function verifyUserCredentials(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) return null;

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) return null;

  return user;
}

/**
 * Generate authentication tokens
 */
function generateTokens(userId: string) {
  // Access token
  const token = jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: "1h" });

  // Refresh token
  const refreshToken = jwt.sign(
    { id: userId, version: new Date().toISOString() },
    REFRESH_SECRET,
    { expiresIn: "7d" }
  );

  return { token, refreshToken };
}

/**
 * Add token to blacklist for logout
 */
function invalidateToken(token: string): boolean {
  try {
    tokenBlacklist.add(token);

    // Optional: Remove token from blacklist after it expires
    const decoded = jwt.decode(token) as { exp?: number };
    if (decoded?.exp) {
      const expiresIn = decoded.exp * 1000 - Date.now();
      setTimeout(
        () => {
          tokenBlacklist.delete(token);
        },
        expiresIn > 0 ? expiresIn : 0
      );
    }

    return true;
  } catch (error) {
    console.error("Error invalidating token:", error);
    return false;
  }
}

// ------------------- tRPC Router -------------------

export const authRouter = router({
  // Get current user
  me: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.userId) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Not authenticated",
      });
    }

    const user = await findUserById(ctx.userId);

    if (!user) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }

    return user;
  }),

  // Login
  login: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        passwordHash: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const user = await verifyUserCredentials(input.email, input.passwordHash);

      if (!user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid credentials",
        });
      }

      // Update last login time
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() },
      });

      // Generate tokens
      const { token, refreshToken } = generateTokens(user.id);

      // Return user data and tokens
      return {
        token,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          isAdmin: user.isAdmin || false,
        },
      };
    }),

  // Register
  register: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        passwordHash: z.string().min(8), // Ensure a minimum password length
        name: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Check if the user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: input.email },
      });

      if (existingUser) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "User with this email already exists",
        });
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(input.passwordHash, 10);

      // Create the new user
      const newUser = await prisma.user.create({
        data: {
          email: input.email,
          passwordHash: hashedPassword,
          name: input.name || null,
        },
      });

      // Generate tokens
      const { token, refreshToken } = generateTokens(newUser.id);

      // Return the user data and tokens
      return {
        token,
        refreshToken,
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          isAdmin: newUser.isAdmin || false,
        },
      };
    }),

  // Refresh token
  refresh: publicProcedure
    .input(
      z.object({
        refreshToken: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const decoded = jwt.verify(input.refreshToken, REFRESH_SECRET) as {
          id: string;
          version: string;
        };

        // Check if the user exists
        const user = await findUserById(decoded.id);
        if (!user) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid refresh token",
          });
        }

        // Generate new tokens
        const { token, refreshToken } = generateTokens(user.id);

        return {
          token,
          refreshToken,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            isAdmin: user.isAdmin || false,
          },
        };
      } catch (error) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid or expired refresh token",
        });
      }
    }),

  // Logout
  logout: publicProcedure
    .input(
      z.object({
        token: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const isBlacklisted = invalidateToken(input.token);

      if (!isBlacklisted) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to invalidate token",
        });
      }

      return { success: true, message: "Logout successful" };
    }),
});
