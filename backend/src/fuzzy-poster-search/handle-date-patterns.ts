import { PrismaClient } from "@prisma/client";
import { extractDateInfo } from "./extract-date-info.js";
import { searchForArtistWithYear } from "./search-for-artist-with-year.js";
import dayjs from "dayjs";

/**
 * Handles date patterns in the search (using extractDateInfo)
 * @param prisma - PrismaClient instance
 * @param searchTerm - The search term to process
 * @returns Array of matching poster IDs, empty if no matches
 */
export async function handleDatePatterns(
  prisma: PrismaClient,
  searchTerm: string
): Promise<number[]> {
  const dateInfo = extractDateInfo(searchTerm);

  // Only proceed if we have date information
  if (!dateInfo.hasDate || dateInfo.searchWithoutDate.trim().length === 0) {
    return [];
  }

  const artistName = dateInfo.searchWithoutDate.trim();
  console.log(
    `handleDatePatterns: Processing search for artist "${artistName}" with date info:`,
    {
      month: dateInfo.month !== null ? dateInfo.month + 1 : null,
      day: dateInfo.day,
      year: dateInfo.year,
    }
  );

  // If we have a month and day (like "Phish 6/30")
  if (dateInfo.month !== null && dateInfo.day !== null) {
    // ===== CRITICAL DEBUGGING =====
    console.log(
      `CRITICAL DEBUG: Searching for posters with artist "${artistName}" on month=${
        dateInfo.month + 1
      }, day=${dateInfo.day}`
    );

    try {
      // First, find Phish artist ID
      const artist = await prisma.artist.findFirst({
        where: {
          name: {
            mode: "insensitive",
            equals: artistName,
          },
        },
      });

      if (!artist) {
        console.log(`Artist "${artistName}" not found in database`);
        return [];
      }

      console.log(`Found artist: ${artist.name} (ID: ${artist.id})`);

      // Find all events for this artist directly using the date components
      // This is more efficient than filtering after the query
      const events = await prisma.event.findMany({
        where: {
          artists: {
            some: {
              artistId: artist.id,
            },
          },
          // Use the date component fields directly for more efficient search
          startMonth: dateInfo.month + 1, // Convert from 0-indexed to 1-indexed
          startDay: dateInfo.day,
          // If we have a year, include it in the search
          ...(dateInfo.year ? { startYear: dateInfo.year } : {}),
        },
        include: {
          venue: true,
        },
      });

      console.log(`Found ${events.length} events for ${artist.name}:`);
      events.forEach((e) =>
        console.log(
          `- ${e.name} on ${dayjs(e.startDate).format("YYYY-MM-DD")}${
            e.endDate ? " to " + dayjs(e.endDate).format("YYYY-MM-DD") : ""
          } at ${e.venue.name}`
        )
      );

      // No need to filter events since our database query already did the filtering
      const matchingEvents = events;

      console.log(
        `${matchingEvents.length} events match the month/day criteria`
      );

      if (matchingEvents.length === 0) return [];

      // Find posters for these events
      const eventIds = matchingEvents.map((e) => e.id);

      // Changed query: Now getting all posters that have ANY matching event and where the artist appears
      // (but not requiring the artist to be the ONLY artist on the poster)
      const posters = await prisma.poster.findMany({
        where: {
          events: {
            some: {
              eventId: {
                in: eventIds,
              },
            },
          },
          // This ensures the artist is one of potentially many artists on the poster
          artists: {
            some: {
              artistId: artist.id,
            },
          },
        },
      });

      console.log(`Found ${posters.length} matching posters`);
      return posters.map((p) => p.id);
    } catch (error) {
      console.error("Error in handleDatePatterns simple approach:", error);
      return [];
    }
  }

  // For other date patterns, use existing logic

  // If we have a complete date (month, day, and year)
  else if (
    dateInfo.month !== null &&
    dateInfo.day !== null &&
    dateInfo.year !== null
  ) {
    try {
      console.log(
        `Searching for artist "${artistName}" with full date ${
          dateInfo.month + 1
        }/${dateInfo.day}/${dateInfo.year}`
      );

      // Use strict result for complete date with LEFT JOINs to find posters with any matching artist and event
      const strictResults = await prisma.$queryRaw<{ id: number }[]>`
        WITH 
        -- Find artists that match our search term
        matching_artists AS (
          SELECT DISTINCT a.id
          FROM "Artist" a
          WHERE 
            LOWER(a.name) = LOWER(${artistName})
            OR LOWER(a.name) ILIKE LOWER(${`%${artistName}%`})
            OR similarity(a.name, ${artistName}) > 0.3
        ),
        -- Find events on the exact date we're looking for
        -- Using the new date component fields for more efficient search
        matching_events AS (
          SELECT DISTINCT e.id
          FROM "Event" e
          WHERE 
            e."startYear" = ${dateInfo.year} AND
            e."startMonth" = ${dateInfo.month + 1} AND 
            e."startDay" = ${dateInfo.day}
        ),
        -- Find posters that have ANY of our matching artists
        artist_posters AS (
          SELECT DISTINCT p.id
          FROM "Poster" p
          JOIN "PosterArtist" pa ON p.id = pa."posterId"
          WHERE pa."artistId" IN (SELECT id FROM matching_artists)
        ),
        -- Find posters that have ANY of our matching events
        event_posters AS (
          SELECT DISTINCT p.id
          FROM "Poster" p
          JOIN "PosterEvent" pe ON p.id = pe."posterId"
          WHERE pe."eventId" IN (SELECT id FROM matching_events)
        )
        -- Find the intersection: posters that have both a matching artist AND a matching event
        SELECT p.id
        FROM artist_posters p
        JOIN event_posters e ON p.id = e.id
        LIMIT 100;
      `;

      if (strictResults.length > 0) {
        console.log(
          `Found ${
            strictResults.length
          } results with strict artist+full date search for "${artistName} ${
            dateInfo.month + 1
          }/${dateInfo.day}/${dateInfo.year}"`
        );
        return strictResults.map((row) => row.id);
      }

      // If no results found with strict date, try broader date matching
      const dateBasedResults = await prisma.$queryRaw<{ id: number }[]>`
        WITH matching_posters AS (
          SELECT DISTINCT p.id
          FROM "Poster" p
          INNER JOIN "PosterArtist" pa ON p.id = pa."posterId"
          INNER JOIN "Artist" a ON pa."artistId" = a.id
          INNER JOIN "PosterEvent" pe ON p.id = pe."posterId"
          INNER JOIN "Event" e ON pe."eventId" = e.id
          WHERE 
            -- Month-day matching, using date component fields
            (
              e."startMonth" = ${dateInfo.month + 1} AND
              e."startDay" = ${dateInfo.day}
            )
            
            -- Artist name matching with similarity
            AND (
              -- First attempt exact match by name (case insensitive)
              LOWER(a.name) = LOWER(${artistName})
              -- Then allow substring match
              OR LOWER(a.name) ILIKE LOWER(${`%${artistName}%`})
              -- Finally allow similarity as fallback
              OR similarity(a.name, ${artistName}) > 0.3
            )
        )
        SELECT id FROM matching_posters
        LIMIT 100;
      `;

      if (dateBasedResults.length > 0) {
        console.log(
          `Found ${
            dateBasedResults.length
          } results with broader date search for "${artistName}" on ${
            dateInfo.month + 1
          }/${dateInfo.day}/${dateInfo.year}`
        );
        return dateBasedResults.map((row) => row.id);
      }
    } catch (error) {
      console.error("Error in exact date search:", error);
    }
  }

  // For year-based searches
  else if (dateInfo.year !== null) {
    // Try a strict AND search for artist+year combo
    const strictResults = await searchForArtistWithYear(
      prisma,
      artistName,
      dateInfo.year,
      0.3
    );

    if (strictResults.length > 0) {
      console.log(
        `Found ${strictResults.length} results with strict artist+year search for "${artistName} ${dateInfo.year}"`
      );
      return strictResults;
    }
  }

  return [];
}
