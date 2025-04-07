import { z } from "zod";
import { router, publicProcedure } from "../trpc.js";
import { TRPCError } from "@trpc/server";
import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

export const eventRouter = router({
  getAll: publicProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(100).optional().default(50),
          cursor: z.string().optional(),
          search: z.string().optional(),
          artistId: z.string().optional(),
          fromDate: z.string().optional(),
          toDate: z.string().optional(),
          venueId: z.string().optional(),
          sortBy: z.enum(["date", "name", "venue"]).optional().default("date"),
          sortOrder: z.enum(["asc", "desc"]).optional().default("asc"),
        })
        .optional()
    )
    .query(async ({ input }) => {
      try {
        const {
          limit = 50,
          cursor,
          search,
          artistId,
          fromDate,
          toDate,
          venueId,
          sortBy = "date",
          sortOrder = "asc",
        } = input || {};

        // Build where conditions properly typed
        const whereConditions: Prisma.EventWhereInput = {};
        const conditions: Prisma.EventWhereInput[] = [];

        if (search) {
          conditions.push({
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { venue: { name: { contains: search, mode: "insensitive" } } },
              {
                artists: {
                  some: {
                    artist: {
                      name: { contains: search, mode: "insensitive" },
                    },
                  },
                },
              },
            ],
          });
        }

        if (artistId) {
          conditions.push({
            artists: {
              some: {
                artistId,
              },
            },
          });
        }

        if (venueId) {
          conditions.push({ venueId });
        }

        if (fromDate) {
          conditions.push({
            date: { gte: new Date(fromDate) },
          });
        }

        if (toDate) {
          conditions.push({
            date: { lte: new Date(toDate) },
          });
        }

        // Only add AND if we have conditions
        if (conditions.length > 0) {
          whereConditions.AND = conditions;
        }

        // Dynamic sort order
        const orderBy: Prisma.EventOrderByWithRelationInput = {};
        if (sortBy === "venue") {
          orderBy.venue = { name: sortOrder };
        } else {
          orderBy[sortBy as "date" | "name"] = sortOrder;
        }

        // Execute query with proper typing
        const events = await prisma.event.findMany({
          take: limit,
          skip: cursor ? 1 : 0,
          cursor: cursor ? { id: cursor } : undefined,
          orderBy,
          where: whereConditions,
          include: {
            venue: true,
            artists: {
              include: {
                artist: true,
              },
            },
          },
        });

        // Get the next cursor
        const nextCursor =
          events.length === limit ? events[events.length - 1].id : null;

        // Format the response
        return {
          items: events.map((event) => ({
            ...event,
            artists: event.artists.map((ea) => ea.artist),
          })),
          nextCursor,
          total: await prisma.event.count({ where: whereConditions }),
        };
      } catch (error) {
        console.error("Error fetching events:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch events",
          cause: error,
        });
      }
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      try {
        const event = await prisma.event.findUnique({
          where: { id: input.id },
          include: {
            venue: true,
            artists: {
              include: {
                artist: true,
              },
            },
          },
        });

        if (!event) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Event not found",
          });
        }

        // Return the transformed event directly without pagination wrapper
        return {
          ...event,
          artists: event.artists.map((ea) => ea.artist),
        };
      } catch (error) {
        console.error("Error fetching event:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch event",
          cause: error,
        });
      }
    }),
});
