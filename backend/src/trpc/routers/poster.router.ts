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
  artistId,
  eventId,
}: {
  limit?: number;
  cursor?: string;
  filter?: string;
  artistId?: number;
  eventId?: number;
} = {}) {
  const query: any = {
    take: limit,
    orderBy: {
      createdAt: "desc" as const,
    },
    include: {
      artists: true,
      events: true,
    },
  };

  // Add cursor-based pagination if cursor is provided
  if (cursor) {
    query.cursor = {
      id: cursor,
    };
    query.skip = 1; // Skip the cursor itself
  }

  // Build the where clause
  const whereConditions: any[] = [];

  // Add search filter if provided
  if (filter) {
    whereConditions.push({
      OR: [
        { title: { contains: filter, mode: "insensitive" as const } },
        { description: { contains: filter, mode: "insensitive" as const } },
      ],
    });
  }

  // Filter by artist
  if (artistId) {
    whereConditions.push({
      artists: {
        some: {
          id: artistId,
        },
      },
    });
  }

  // Filter by event
  if (eventId) {
    whereConditions.push({
      events: {
        some: {
          id: eventId,
        },
      },
    });
  }

  // Apply all where conditions if any exist
  if (whereConditions.length > 0) {
    query.where = {
      AND: whereConditions,
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
      artists: true,
      events: true,
    },
  });
}

/**
 * Create a new poster
 */
async function createPoster(data: {
  title: string;
  artistIds: string[];
  eventIds: string[];
  price: number;
  description: string;
  condition: string;
  dimensions: string;
  listingType: string;
  auctionEndDate?: Date | null;
  imageUrls: string[];
  sellerId: string;
}) {
  const { artistIds, eventIds, imageUrls, ...posterData } = data;

  return prisma.poster.create({
    data: {
      ...posterData,
      imageUrls: imageUrls, // All images
      artists: {
        create: artistIds.map((artistId) => ({
          artist: { connect: { id: artistId } },
        })),
      },
      events: {
        create: eventIds.map((eventId) => ({
          event: { connect: { id: eventId } },
        })),
      },
    },
    include: {
      seller: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      artists: {
        include: {
          artist: true,
        },
      },
      events: {
        include: {
          event: true,
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
    artistIds?: string[];
    eventIds?: string[];
    price?: number;
    description?: string;
    condition?: string;
    dimensions?: string;
    listingType?: string;
    auctionEndDate?: Date | null;
    images?: string[];
  }
) {
  const { artistIds, eventIds, images, ...posterData } = data;

  // Start with basic poster updates
  const updateData: any = {
    ...posterData,
    ...(images && { images, imageUrl: images[0] }),
  };

  // Handle relationship updates with transactions
  return prisma.$transaction(async (tx) => {
    // Update basic poster data
    const updatedPoster = await tx.poster.update({
      where: { id },
      data: updateData,
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

    // If artistIds provided, delete existing relationships and create new ones
    if (artistIds) {
      // Delete existing artist connections
      await tx.posterArtist.deleteMany({
        where: { posterId: id },
      });

      // Create new artist connections
      for (const artistId of artistIds) {
        await tx.posterArtist.create({
          data: {
            posterId: id,
            artistId,
          },
        });
      }
    }

    // If eventIds provided, delete existing relationships and create new ones
    if (eventIds) {
      // Delete existing event connections
      await tx.posterEvent.deleteMany({
        where: { posterId: id },
      });

      // Create new event connections
      for (const eventId of eventIds) {
        await tx.posterEvent.create({
          data: {
            posterId: id,
            eventId,
          },
        });
      }
    }

    // Return the complete updated poster with relationships
    return tx.poster.findUnique({
      where: { id },
      include: {
        seller: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        artists: {
          include: {
            artist: true,
          },
        },
        events: {
          include: {
            event: true,
          },
        },
      },
    });
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
        artistId: z.number().optional(),
        eventId: z.number().optional(),
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
        title: z.string().min(3),
        artistIds: z.array(z.string()).min(1),
        eventIds: z.array(z.string()).min(1),
        price: z.number().positive(),
        description: z.string().min(10),
        condition: z.string().min(1),
        dimensions: z.string().min(1),
        listingType: z.enum(["buyNow", "auction"]),
        auctionEndDate: z.date().nullable().optional(),
        imageUrls: z.array(z.string().url()).min(1).max(3),
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
        title: z.string().min(3).optional(),
        artistIds: z.array(z.string()).min(1).optional(),
        eventIds: z.array(z.string()).min(1).optional(),
        price: z.number().positive().optional(),
        description: z.string().min(10).optional(),
        condition: z.string().min(1).optional(),
        dimensions: z.string().min(1).optional(),
        listingType: z.enum(["buyNow", "auction"]).optional(),
        auctionEndDate: z.date().nullable().optional(),
        imageUrls: z.array(z.string().url()).min(1).max(3).optional(),
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
