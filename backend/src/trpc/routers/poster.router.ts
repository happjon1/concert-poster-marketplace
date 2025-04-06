import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../trpc.js";
import { TRPCError } from "@trpc/server";
import { PrismaClient } from "@prisma/client";

// Initialize Prisma client
const prisma = new PrismaClient();

// ------------------- Helper Functions -------------------

/**
 * Find all posters with optional filters
 */
async function findAllPosters({
  limit = 50,
  cursor,
  filter,
}: {
  limit?: number;
  cursor?: string;
  filter?: string;
} = {}) {
  const query: any = {
    take: limit,
    orderBy: {
      createdAt: "desc" as const,
    },
  };

  // Add cursor-based pagination if cursor is provided
  if (cursor) {
    query.cursor = {
      id: cursor,
    };
    query.skip = 1; // Skip the cursor itself
  }

  // Add search filter if provided
  if (filter) {
    query.where = {
      OR: [
        { title: { contains: filter, mode: "insensitive" as const } },
        { artist: { contains: filter, mode: "insensitive" as const } },
        { venue: { contains: filter, mode: "insensitive" as const } },
      ],
    };
  }

  const posters = await prisma.poster.findMany(query);

  // Get the next cursor
  const nextCursor = posters.length > 0 ? posters[posters.length - 1].id : null;

  return {
    items: posters,
    nextCursor,
  };
}

/**
 * Find a poster by ID
 */
async function findPosterById(id: number) {
  return prisma.poster.findUnique({
    where: { id },
    include: {
      seller: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
}

/**
 * Create a new poster
 */
async function createPoster(data: {
  title: string;
  artist: string;
  venue: string;
  price: number;
  date: string;
  description: string;
  imageUrl: string;
  sellerId: string;
}) {
  return prisma.poster.create({
    data,
    include: {
      seller: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
}

/**
 * Update a poster
 */
async function updatePoster(
  id: number,
  data: {
    title?: string;
    artist?: string;
    venue?: string;
    price?: number;
    date?: string;
    description?: string;
    imageUrl?: string;
  }
) {
  return prisma.poster.update({
    where: { id },
    data,
    include: {
      seller: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
}

/**
 * Delete a poster
 */
async function deletePoster(id: number) {
  return prisma.poster.delete({
    where: { id },
  });
}

// ------------------- tRPC Router -------------------

export const posterRouter = router({
  // Get all posters
  getAll: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).optional(),
        cursor: z.string().optional(),
        filter: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      return await findAllPosters(input);
    }),

  // Get poster by ID
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const poster = await findPosterById(input.id);

      if (!poster) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Poster not found",
        });
      }

      return poster;
    }),

  // Create poster
  create: protectedProcedure
    .input(
      z.object({
        title: z.string(),
        artist: z.string(),
        venue: z.string(),
        price: z.number().positive(),
        date: z.string(),
        description: z.string(),
        imageUrl: z.string().url(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await createPoster({
        ...input,
        sellerId: ctx.userId,
      });
    }),

  // Update poster
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().optional(),
        artist: z.string().optional(),
        venue: z.string().optional(),
        price: z.number().positive().optional(),
        date: z.string().optional(),
        description: z.string().optional(),
        imageUrl: z.string().url().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if the user owns this poster
      const poster = await findPosterById(input.id);

      if (!poster) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Poster not found",
        });
      }

      if (poster.sellerId !== ctx.userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only update your own posters",
        });
      }

      // Remove the id from the update data
      const { id, ...updateData } = input;

      return await updatePoster(id, updateData);
    }),

  // Delete poster
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // Check if the user owns this poster
      const poster = await findPosterById(input.id);

      if (!poster) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Poster not found",
        });
      }

      if (poster.sellerId !== ctx.userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only delete your own posters",
        });
      }

      return await deletePoster(input.id);
    }),
});
