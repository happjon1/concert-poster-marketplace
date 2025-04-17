import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../trpc.js";
import { TRPCError } from "@trpc/server";
import { PrismaClient, Prisma } from "@prisma/client";
import * as chrono from "chrono-node";

// Initialize Prisma client
const prisma = new PrismaClient();

// Helper function to process search terms
const processSearchTerms = (query: string) => {
  // Basic cleaning
  const cleanedQuery = query.trim().toLowerCase();

  // 1. For matching full phrases or complete words
  const exactSearchTerms = cleanedQuery
    .split(/\s+/)
    .filter(Boolean)
    .map((term) => term.toLowerCase());

  // 2. For individual word matching (more permissive, still filter very short words)
  const individualSearchTerms = cleanedQuery
    .split(/\s+/)
    .filter((term) => term.length > 1) // Less restrictive - include 2+ character words
    .map((term) => term.toLowerCase());

  return { exactSearchTerms, individualSearchTerms };
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
        const searchTerm = searchQuery || filter;
        console.log("Search term (from searchQuery or filter):", searchTerm);

        // Convert cursor from string to number if provided
        const cursorId = cursor ? parseInt(cursor, 10) : undefined;

        // Build where conditions
        const whereConditions: Prisma.PosterWhereInput = {};
        const conditions: Prisma.PosterWhereInput[] = [];

        // Process search term if provided
        if (searchTerm) {
          // Save the original search term for later use
          const originalSearchTerm = searchTerm.trim();
          let textSearchTerm = originalSearchTerm;
          let hasDatePart = false;
          let dateCondition: Prisma.PosterWhereInput | null = null;

          try {
            // Extract potential dates using chrono-node
            let startDate: Date | null = null;
            let endDate: Date | null = null;

            // Parse dates from the search query
            try {
              const parsedDates = chrono.parse(searchTerm);
              console.log(
                "Parsed dates:",
                JSON.stringify(parsedDates, null, 2)
              );

              if (parsedDates && parsedDates.length > 0) {
                hasDatePart = true;
                // Get the first parsed date result
                const parsedResult = parsedDates[0];
                console.log(
                  "Parsed result:",
                  JSON.stringify(parsedResult, null, 2)
                );

                // Capture the date text to remove it from search later
                const dateText = parsedResult.text || "";

                // If it's a range, we have both start and end dates
                if (parsedResult.start && parsedResult.end) {
                  startDate = parsedResult.start.date();
                  endDate = parsedResult.end.date();
                }
                // If only a single date, handle month/year appropriately
                else if (parsedResult.start) {
                  // Get the date components from the parsed result
                  startDate = parsedResult.start.date();

                  // Check what components were specified in the search
                  const hasYear = parsedResult.start.isCertain("year");
                  const hasMonth = parsedResult.start.isCertain("month");
                  const hasDay = parsedResult.start.isCertain("day");

                  console.log("Date components specified:", {
                    hasYear,
                    hasMonth,
                    hasDay,
                  });

                  // If only a year was specified (e.g., "2024")
                  if (hasYear && !hasMonth && startDate) {
                    const year = startDate.getFullYear();
                    startDate = new Date(year, 0, 1); // Jan 1
                    endDate = new Date(year, 11, 31, 23, 59, 59); // Dec 31, 23:59:59
                  }
                  // If a specific day was provided (e.g., "June 6")
                  else if (hasMonth && hasDay && startDate) {
                    // For a specific day search, set the time range to the full day
                    const year = startDate.getFullYear();
                    const month = startDate.getMonth();
                    const day = startDate.getDate();

                    startDate = new Date(year, month, day, 0, 0, 0, 0);
                    endDate = new Date(year, month, day, 23, 59, 59, 999);
                  }
                  // If only a month was specified (e.g., "July"), without a specific year
                  else if (hasMonth && !hasYear && !hasDay && startDate) {
                    const year = startDate.getFullYear();
                    const month = startDate.getMonth();
                    startDate = new Date(year, month, 1); // First day of month
                    endDate = new Date(year, month + 1, 0, 23, 59, 59); // Last day of month
                  }
                  // If only a month and year was specified (e.g., "July 2024")
                  else if (hasYear && hasMonth && !hasDay && startDate) {
                    const year = startDate.getFullYear();
                    const month = startDate.getMonth();
                    startDate = new Date(year, month, 1); // First day of month
                    endDate = new Date(year, month + 1, 0, 23, 59, 59); // Last day of month
                  }
                  // Special handling for MM/DD format (like 10/20)
                  else if (hasMonth && hasDay && !hasYear && startDate) {
                    // For MM/DD format without year, use current year
                    const currentYear = new Date().getFullYear();
                    const month = startDate.getMonth();
                    const day = startDate.getDate();

                    startDate = new Date(currentYear, month, day, 0, 0, 0, 0);
                    endDate = new Date(
                      currentYear,
                      month,
                      day,
                      23,
                      59,
                      59,
                      999
                    );

                    console.log(
                      `MM/DD format detected: ${
                        month + 1
                      }/${day}, using current year ${currentYear}`
                    );
                  }
                  // Fallback for any other date format
                  else if (startDate) {
                    endDate = new Date(startDate.getTime());
                    endDate.setHours(23, 59, 59);
                  }
                }

                // Create the date condition if we have valid dates
                if (startDate && endDate) {
                  dateCondition = {
                    events: {
                      some: {
                        event: {
                          date: {
                            gte: startDate,
                            lte: endDate,
                          },
                        },
                      },
                    },
                  };

                  // Remove the date part from the text search
                  const dateText = parsedResult.text || "";
                  textSearchTerm = originalSearchTerm.replace(dateText, "").trim();
                  if (!textSearchTerm) {
                    textSearchTerm = originalSearchTerm;
                  }

                  console.log(
                    "Using text search term (without date part):",
                    textSearchTerm
                  );

                  // Add date condition to our conditions
                  conditions.push(dateCondition);
                }
              }
            } catch (parseError) {
              console.error("Error parsing date:", parseError);
              // Fall back to regular text search
              textSearchTerm = originalSearchTerm;
            }

            // Special handling for format like "band mm/dd" or "mm/dd band"
            // Check for patterns like "10/20" or "10-20"
            const datePattern = /(\d{1,2})[\/\-](\d{1,2})/;
            const dateMatch = originalSearchTerm.match(datePattern);

            if (dateMatch && !hasDatePart) {
              console.log("Found date pattern in format MM/DD:", dateMatch[0]);
              // Extract the potential month and day
              const month = parseInt(dateMatch[1], 10) - 1; // 0-based month
              const day = parseInt(dateMatch[2], 10);

              // Validate month and day
              if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
                const currentYear = new Date().getFullYear();
                startDate = new Date(currentYear, month, day, 0, 0, 0, 0);
                endDate = new Date(currentYear, month, day, 23, 59, 59, 999);

                console.log(
                  `MM/DD pattern detected: ${
                    month + 1
                  }/${day}, using ${startDate.toISOString()} to ${endDate.toISOString()}`
                );

                // Create date condition
                dateCondition = {
                  events: {
                    some: {
                      event: {
                        date: {
                          gte: startDate,
                          lte: endDate,
                        },
                      },
                    },
                  },
                };

                conditions.push(dateCondition);

                // Remove the date part from the search term for better text matching
                textSearchTerm = originalSearchTerm.replace(dateMatch[0], "").trim();
                hasDatePart = true;
                console.log("Using text search term (without date part):", textSearchTerm);
              }
            }

            // Always perform text search
            // Split the search term to handle individual words properly
            const searchTermWords = textSearchTerm.split(/\s+/).filter(Boolean);
            console.log("Search term words:", searchTermWords);

            // Create OR conditions for artist search
            const artistSearchConditions: Prisma.PosterWhereInput[] = [];

            for (const word of searchTermWords) {
              if (word.length > 1) {
                // Only use words with more than 1 character
                artistSearchConditions.push({
                  artists: {
                    some: {
                      artist: {
                        name: {
                          contains: word,
                          mode: "insensitive" as Prisma.QueryMode,
                        },
                      },
                    },
                  },
                });
              }
            }

            // Add full text search for entire terms
            const textSearchConditions: Prisma.PosterWhereInput[] = [
              {
                title: {
                  contains: textSearchTerm,
                  mode: "insensitive" as Prisma.QueryMode,
                },
              },
              {
                description: {
                  contains: textSearchTerm,
                  mode: "insensitive" as Prisma.QueryMode,
                },
              },
            ];

            // If we have individual words, add them to artist search conditions
            if (artistSearchConditions.length > 0) {
              textSearchConditions.push({
                OR: artistSearchConditions,
              });
            }

            // Add the combined text search conditions
            conditions.push({
              OR: textSearchConditions,
            });
          } catch (searchError) {
            console.error("Error processing search:", searchError);

            // Fall back to basic search
            conditions.push({
              OR: [
                {
                  title: {
                    contains: searchTerm,
                    mode: "insensitive" as Prisma.QueryMode,
                  },
                },
                {
                  description: {
                    contains: searchTerm,
                    mode: "insensitive" as Prisma.QueryMode,
                  },
                },
                {
                  artists: {
                    some: {
                      artist: {
                        name: {
                          contains: searchTerm,
                          mode: "insensitive" as Prisma.QueryMode,
                        },
                      },
                    },
                  },
                },
              ],
            });
          }
        }

        // Filter by artist ID if provided
        if (artistId) {
          conditions.push({
            artists: {
              some: {
                artistId: artistId.toString(),
              },
            },
          });
        }

        // Filter by event ID if provided
        if (eventId) {
          conditions.push({
            events: {
              some: {
                eventId: eventId.toString(),
              },
            },
          });
        }

        // Apply all where conditions if any exist
        if (conditions.length > 0) {
          whereConditions.AND = conditions;
        }

        console.log(
          "Final query conditions:",
          JSON.stringify(whereConditions, null, 2)
        );

        // Execute the query
        const posters = await prisma.poster.findMany({
          take: limit,
          skip: cursorId ? 1 : 0,
          cursor: cursorId ? { id: cursorId } : undefined,
          orderBy: {
            createdAt: "desc",
          },
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

        // Log detailed information about the results
        console.log(
          `Found ${posters.length} posters matching the search conditions`
        );
        if (posters.length > 0) {
          console.log(
            "First few posters:",
            posters.slice(0, 3).map((poster) => ({
              id: poster.id,
              title: poster.title,
              events: poster.events.map((pe) => ({
                date: pe.event.date,
                formattedDate: new Date(pe.event.date).toLocaleDateString(
                  "en-US",
                  {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  }
                ),
                venue: pe.event.venue.name,
              })),
              artists: poster.artists.map((pa) => pa.artist.name),
            }))
          );
        }

        // Get the next cursor
        const nextCursor =
          posters.length === limit
            ? posters[posters.length - 1].id.toString()
            : null;

        // Format the response
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
          total: await prisma.poster.count({ where: whereConditions }),
        };
      } catch (error) {
        console.error("Error in getAll procedure:", error);
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
