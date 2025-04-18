import { z } from "zod";
import { router, publicProcedure } from "../trpc.js";
import { TRPCError } from "@trpc/server";
import prisma from "../../config/prisma.js"; // Import shared Prisma instance

export const artistRouter = router({
  getAll: publicProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(100).optional(),
          cursor: z.string().optional(),
          search: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const limit = input?.limit ?? 50;
      const cursor = input?.cursor;
      const search = input?.search;

      const query: any = {
        take: limit,
        orderBy: { name: "asc" },
      };

      if (cursor) {
        query.cursor = { id: cursor };
        query.skip = 1;
      }

      if (search) {
        query.where = {
          name: { contains: search, mode: "insensitive" },
        };
      }

      const artists = await prisma.artist.findMany(query);
      const nextCursor =
        artists.length > 0 ? artists[artists.length - 1].id : null;

      return {
        items: artists,
        nextCursor,
      };
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const artist = await prisma.artist.findUnique({
        where: { id: input.id },
      });

      if (!artist) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Artist not found",
        });
      }

      // Return just the artist object directly
      return artist;
    }),
});
