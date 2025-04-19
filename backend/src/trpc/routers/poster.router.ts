import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, protectedProcedure } from "../trpc.js";
import { fuzzyPosterSearch } from "../../fuzzy-poster-search/fuzzy-search.js";
import prisma from "../../config/prisma.js"; // Import shared Prisma instance
import * as chrono from "chrono-node";
import { Prisma } from "@prisma/client";

// Create a more robust query preprocessor
const preprocessSearchQuery = (query: string): string[] => {
  if (!query) return [];

  // Normalize the input string
  const normalizedQuery = query.trim();

  // Always include the original query
  const queryVariants = [normalizedQuery];

  // Handle special characters in band names (like AC/DC, A$AP Rocky, P!nk)
  // Strategy 1: Replace special characters with spaces
  if (/[\W_]+/.test(normalizedQuery)) {
    const spacedVariant = normalizedQuery.replace(/[\W_]+/g, " ").trim();
    if (spacedVariant !== normalizedQuery) {
      queryVariants.push(spacedVariant);
    }

    // Strategy 2: Remove special characters entirely
    const strippedVariant = normalizedQuery.replace(/[\W_]+/g, "").trim();
    if (
      strippedVariant !== normalizedQuery &&
      strippedVariant !== spacedVariant
    ) {
      queryVariants.push(strippedVariant);
    }
  }

  // Handle common abbreviation patterns without hardcoding specific band names

  // Pattern 1: All caps might be abbreviations (like RHCP, ACDC, RATM)
  if (/^[A-Z]{2,}$/.test(normalizedQuery)) {
    // Add variant with spaces between letters (A C D C)
    const spacedAbbreviation = normalizedQuery.split("").join(" ");
    queryVariants.push(spacedAbbreviation);

    // Add variant with slashes between letters (A/C/D/C) - common for some band abbreviations
    const slashedAbbreviation = normalizedQuery.split("").join("/");
    queryVariants.push(slashedAbbreviation);
  }

  // Pattern 2: Spaced capitals might be abbreviation variants (A C D C)
  if (/^[A-Z](\s+[A-Z])+$/.test(normalizedQuery)) {
    // Add variant with no spaces (ACDC)
    const unspacedAbbreviation = normalizedQuery.replace(/\s+/g, "");
    queryVariants.push(unspacedAbbreviation);

    // Add variant with slashes (A/C/D/C)
    const slashedAbbreviation = normalizedQuery.replace(/\s+/g, "/");
    queryVariants.push(slashedAbbreviation);
  }

  // Handle periods in abbreviations (like N.W.A, J.S. Bach)
  if (normalizedQuery.includes(".")) {
    // Remove periods
    const noPeriods = normalizedQuery.replace(/\./g, "");
    queryVariants.push(noPeriods);

    // Replace periods with spaces
    const periodsAsSpaces = normalizedQuery
      .replace(/\./g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (
      periodsAsSpaces !== normalizedQuery &&
      !queryVariants.includes(periodsAsSpaces)
    ) {
      queryVariants.push(periodsAsSpaces);
    }
  }

  // Return unique variants
  return [...new Set(queryVariants)];
};

export const posterRouter = router({
  // Get all posters
  getAll: publicProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(100).optional().default(50),
          cursor: z.string().optional(),
          filter: z.string().optional(),
          artistId: z.number().optional(),
          eventId: z.number().optional(),
          searchQuery: z.string().optional(), // Natural language search query
        })
        .optional()
    )
    .query(async ({ input }) => {
      try {
        const {
          limit = 50,
          cursor,
          filter,
          artistId,
          eventId,
          searchQuery,
        } = input || {};

        // Use either searchQuery or filter as the search term
        let searchTerm = searchQuery || filter || "";

        // Process the search term to generate variants for better matching
        const searchVariants = preprocessSearchQuery(searchTerm);

        // Convert cursor from string to number if provided
        const cursorId = cursor ? parseInt(cursor, 10) : undefined;

        let posterIds: number[] = [];
        let whereConditions: Prisma.PosterWhereInput = {};
        let enhancedSearchTerm = searchVariants[0]; // Use the original search term for date processing

        // === FIRST, USE CHRONO FOR NATURAL LANGUAGE DATE EXTRACTION ===
        if (enhancedSearchTerm) {
          // Try to extract dates with chrono for natural language dates
          try {
            const parsedDates = chrono.parse(enhancedSearchTerm);

            if (parsedDates && parsedDates.length > 0) {
              const parsedDate = parsedDates[0];
              const dateText = parsedDate.text;

              // Create date range based on the parsed date
              if (parsedDate.start) {
                const startDate = parsedDate.start.date();

                // Check what components are specified
                const hasYear = parsedDate.start.isCertain("year");
                const hasMonth = parsedDate.start.isCertain("month");
                const hasDay = parsedDate.start.isCertain("day");

                // Initialize end date and create date ranges based on specificity
                let endDate: Date;

                if (hasMonth && hasYear && !hasDay) {
                  // Month and year specified (e.g., "October 2024")
                  const year = startDate.getFullYear();
                  const month = startDate.getMonth();

                  // Set start date to first day of month
                  const firstDayOfMonth = new Date(year, month, 1);

                  // Set end date to last day of month
                  const lastDayOfMonth = new Date(
                    year,
                    month + 1,
                    0,
                    23,
                    59,
                    59,
                    999
                  );

                  // Apply date filter for the entire month
                  whereConditions.events = {
                    some: {
                      event: {
                        date: {
                          gte: firstDayOfMonth,
                          lte: lastDayOfMonth,
                        },
                      },
                    },
                  };
                } else if (hasYear && !hasMonth) {
                  // Only year specified (e.g., "2024")
                  const year = startDate.getFullYear();
                  const firstDayOfYear = new Date(year, 0, 1);
                  const lastDayOfYear = new Date(year, 11, 31, 23, 59, 59, 999);

                  // Apply date filter for the entire year
                  whereConditions.events = {
                    some: {
                      event: {
                        date: {
                          gte: firstDayOfYear,
                          lte: lastDayOfYear,
                        },
                      },
                    },
                  };
                } else if (hasYear && hasMonth && hasDay) {
                  // Full date specified (e.g., "October 15, 2024")
                  // Give a small range around the exact date
                  const exactDate = new Date(startDate);

                  // Look for events on that specific date
                  // Use the beginning and end of day to catch all events
                  const beginningOfDay = new Date(exactDate);
                  beginningOfDay.setHours(0, 0, 0, 0);

                  const endOfDay = new Date(exactDate);
                  endOfDay.setHours(23, 59, 59, 999);

                  whereConditions.events = {
                    some: {
                      event: {
                        date: {
                          gte: beginningOfDay,
                          lte: endOfDay,
                        },
                      },
                    },
                  };
                }

                // Remove the date part from search term before passing to fuzzy search
                enhancedSearchTerm = enhancedSearchTerm
                  .replace(dateText, "")
                  .trim();
              }
            }
          } catch (error) {
            // Error parsing date - continue without date filtering
          }
        }

        // === THEN, USE FUZZY SEARCH FOR SOPHISTICATED MATCHING ===
        if (enhancedSearchTerm && enhancedSearchTerm.trim()) {
          // Use the enhanced fuzzy search with the date-cleaned search term
          posterIds = await fuzzyPosterSearch(prisma, enhancedSearchTerm);

          // If we have poster IDs from fuzzy search, use them for filtering
          if (posterIds.length > 0) {
            // If we already have other conditions (like date from above), we need OR logic
            if (
              Object.keys(whereConditions).length > 0 &&
              !whereConditions.OR
            ) {
              whereConditions = {
                OR: [{ id: { in: posterIds } }, whereConditions],
              };
            } else {
              // Otherwise, just use the poster IDs directly
              whereConditions.id = { in: posterIds };
            }
          }
          // If fuzzy search returned no results, fall back to basic filtering
          else if (enhancedSearchTerm.trim().length > 0) {
            const basicFilters = [
              {
                title: {
                  contains: enhancedSearchTerm,
                  mode: "insensitive" as Prisma.QueryMode,
                },
              },
              {
                description: {
                  contains: enhancedSearchTerm,
                  mode: "insensitive" as Prisma.QueryMode,
                },
              },
            ];

            // If we already have OR conditions, add to them
            if (whereConditions.OR && Array.isArray(whereConditions.OR)) {
              whereConditions.OR.push(...basicFilters);
            } else if (Object.keys(whereConditions).length > 0) {
              // If we have other conditions but not OR, create OR with both
              const existingConditions = { ...whereConditions };
              whereConditions = {
                OR: [existingConditions, ...basicFilters],
              };
            } else {
              // If no existing conditions, just use OR
              whereConditions.OR = basicFilters;
            }
          }
        }

        // === FILTER BY IDS (still needed for direct ID filtering) ===
        if (artistId) {
          const artistFilter = {
            artists: {
              some: {
                artistId: artistId.toString(),
              },
            },
          };

          // If we already have OR conditions, add to them as a separate condition that must be met (AND)
          if (whereConditions.OR) {
            whereConditions = {
              AND: [{ OR: whereConditions.OR }, artistFilter],
            };
          } else {
            // Otherwise just add it directly
            whereConditions = {
              ...whereConditions,
              ...artistFilter,
            };
          }
        }

        if (eventId) {
          const eventFilter = {
            events: {
              some: {
                eventId: eventId.toString(),
              },
            },
          };

          // If we already have OR conditions, add to them as a separate condition that must be met (AND)
          if (whereConditions.OR) {
            whereConditions = {
              AND: [{ OR: whereConditions.OR }, eventFilter],
            };
          } else {
            // Otherwise just add it directly
            whereConditions = {
              ...whereConditions,
              ...eventFilter,
            };
          }
        }

        // === EXECUTE QUERY ===
        const posters = await prisma.poster.findMany({
          take: limit,
          skip: cursorId ? 1 : 0,
          cursor: cursorId ? { id: cursorId } : undefined,
          // If we have poster IDs from fuzzy search, maintain their order for relevance
          orderBy:
            posterIds.length > 0
              ? { id: Prisma.SortOrder.asc } // Will be ordered by the IN clause implicitly
              : { createdAt: "desc" },
          where: whereConditions,
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
                event: {
                  include: {
                    venue: true,
                  },
                },
              },
            },
          },
        });

        // Calculate the total number of matching records
        const total = await prisma.poster.count({ where: whereConditions });

        // Determine the next cursor
        const nextCursor =
          posters.length === limit && posters.length > 0
            ? posters[posters.length - 1].id.toString()
            : null;

        // Return formatted results
        return {
          items: posters.map((poster) => ({
            ...poster,
            artists: poster.artists.map((pa) => pa.artist),
            events: poster.events.map((pe) => ({
              ...pe.event,
              venue: pe.event.venue,
            })),
          })),
          nextCursor,
          total,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch posters",
          cause: error,
        });
      }
    }),

  // Get poster by ID
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      try {
        const poster = await prisma.poster.findUnique({
          where: { id: input.id },
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
                event: {
                  include: {
                    venue: true,
                  },
                },
              },
            },
          },
        });

        if (!poster) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Poster not found",
          });
        }

        // Return the transformed poster with the same pattern used in the event router
        return {
          ...poster,
          // Transform the junction table entries to just the related entities
          artists: poster.artists.map((pa) => pa.artist),
          events: poster.events.map((pe) => ({
            ...pe.event,
            // Preserve the venue structure
            venue: pe.event.venue,
          })),
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch poster",
          cause: error,
        });
      }
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
      try {
        const {
          artistIds,
          eventIds,
          price,
          listingType,
          auctionEndDate,
          ...posterData
        } = input;

        // Set pricing fields based on listingType
        const pricingData =
          listingType === "auction"
            ? {
                isAuction: true,
                startPrice: price,
                buyNowPrice: null,
                auctionEndAt: auctionEndDate,
              }
            : {
                isAuction: false,
                buyNowPrice: price,
                startPrice: null,
                auctionEndAt: null,
              };

        // Create the poster with relationships
        const poster = await prisma.poster.create({
          data: {
            ...posterData,
            ...pricingData,
            sellerId: ctx.userId,
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
                event: {
                  include: {
                    venue: true,
                  },
                },
              },
            },
          },
        });

        // Return the transformed poster
        return {
          ...poster,
          artists: poster.artists.map((pa) => pa.artist),
          events: poster.events.map((pe) => ({
            ...pe.event,
            venue: pe.event.venue,
          })),
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create poster",
          cause: error,
        });
      }
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
      try {
        const {
          id,
          artistIds,
          eventIds,
          price,
          listingType,
          auctionEndDate,
          ...posterData
        } = input;

        // Check if the user owns this poster
        const existingPoster = await prisma.poster.findUnique({
          where: { id },
          select: { sellerId: true },
        });

        if (!existingPoster) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Poster not found",
          });
        }

        if (existingPoster.sellerId !== ctx.userId) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You can only update your own posters",
          });
        }

        // Prepare pricing updates if provided
        const pricingData: Prisma.PosterUpdateInput = {};
        if (price || listingType) {
          if (listingType === "auction") {
            pricingData.isAuction = true;
            pricingData.startPrice = price;
            pricingData.buyNowPrice = null;
            pricingData.auctionEndAt = auctionEndDate;
          } else if (listingType === "buyNow") {
            pricingData.isAuction = false;
            pricingData.buyNowPrice = price;
            pricingData.startPrice = null;
            pricingData.auctionEndAt = null;
          } else if (price) {
            // Just update the price for the current listing type
            const currentPoster = await prisma.poster.findUnique({
              where: { id },
              select: { isAuction: true },
            });

            if (currentPoster) {
              if (currentPoster.isAuction) {
                pricingData.startPrice = price;
              } else {
                pricingData.buyNowPrice = price;
              }
            }
          }
        }

        // Handle updates within a transaction
        return prisma.$transaction(async (tx) => {
          // Update basic poster data
          const poster = await tx.poster.update({
            where: { id },
            data: {
              ...posterData,
              ...pricingData,
            },
          });

          // If artistIds provided, update artist relationships
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

          // If eventIds provided, update event relationships
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

          // Fetch the updated poster with all relationships
          const updatedPoster = await tx.poster.findUnique({
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
                  event: {
                    include: {
                      venue: true,
                    },
                  },
                },
              },
            },
          });

          if (!updatedPoster) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Updated poster not found",
            });
          }

          // Return the transformed poster
          return {
            ...updatedPoster,
            artists: updatedPoster.artists.map((pa) => pa.artist),
            events: updatedPoster.events.map((pe) => ({
              ...pe.event,
              venue: pe.event.venue,
            })),
          };
        });
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update poster",
          cause: error,
        });
      }
    }),

  // Delete poster
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Check if the user owns this poster
        const poster = await prisma.poster.findUnique({
          where: { id: input.id },
          select: { sellerId: true },
        });

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

        // Delete the poster
        return await prisma.poster.delete({
          where: { id: input.id },
        });
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete poster",
          cause: error,
        });
      }
    }),
});
