import { z } from "zod";
import { router, publicProcedure } from "../trpc.js";
import { TRPCError } from "@trpc/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const eventRouter = router({
  getAll: publicProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(100).optional(),
          cursor: z.string().optional(),
          search: z.string().optional(),
          artistId: z.string().optional(),
          fromDate: z.string().optional(),
          toDate: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const limit = input?.limit ?? 50;
      const cursor = input?.cursor;
      const search = input?.search;
      const artistId = input?.artistId;
      const fromDate = input?.fromDate;
      const toDate = input?.toDate;

      const query: any = {
        take: limit,
        orderBy: { date: "asc" },
        include: {
          venue: true,
          artists: true,
        },
      };

      if (cursor) {
        query.cursor = { id: cursor };
        query.skip = 1;
      }

      const whereConditions: any[] = [];

      if (search) {
        whereConditions.push({
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { venue: { name: { contains: search, mode: "insensitive" } } },
          ],
        });
      }

      if (artistId) {
        whereConditions.push({
          artists: {
            some: {
              id: artistId,
            },
          },
        });
      }

      if (fromDate) {
        whereConditions.push({
          date: { gte: fromDate },
        });
      }

      if (toDate) {
        whereConditions.push({
          date: { lte: toDate },
        });
      }

      if (whereConditions.length > 0) {
        query.where = { AND: whereConditions };
      }

      const events = await prisma.event.findMany(query);
      const nextCursor =
        events.length > 0 ? events[events.length - 1].id : null;

      return {
        items: events,
        nextCursor,
      };
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const event = await prisma.event.findUnique({
        where: { id: input.id },
        include: {
          venue: true,
          artists: true,
        },
      });

      if (!event) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Event not found",
        });
      }

      return event;
    }),
});
