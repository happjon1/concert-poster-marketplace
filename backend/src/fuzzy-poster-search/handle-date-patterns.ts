import { PrismaClient } from "@prisma/client";
import { extractDateInfo } from "./extract-date-info.js";
import { searchForArtistWithYear } from "./search-for-artist-with-year.js";

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

  // If we have a date range, handle it specifically
  if (dateInfo.isDateRange && dateInfo.startDate && dateInfo.endDate) {
    try {
      // Use the actual date objects for more accurate range searches
      const rangeResults = await prisma.$queryRaw<{ id: number }[]>`
        WITH matching_posters AS (
          SELECT DISTINCT p.id
          FROM "Poster" p
          INNER JOIN "PosterArtist" pa ON p.id = pa."posterId"
          INNER JOIN "Artist" a ON pa."artistId" = a.id
          INNER JOIN "PosterEvent" pe ON p.id = pe."posterId"
          INNER JOIN "Event" e ON pe."eventId" = e.id
          WHERE 
            -- Date range matching using the parsed date objects
            (
              e.date >= ${dateInfo.startDate} AND
              e.date <= ${dateInfo.endDate}
            )
            
            -- Artist name matching with similarity
            AND (
              LOWER(a.name) ILIKE LOWER(${`%${artistName}%`})
              OR similarity(a.name, ${artistName}) > 0.3
            )
        )
        SELECT id FROM matching_posters
        LIMIT 100;
      `;

      if (rangeResults.length > 0) {
        console.log(
          `Found ${rangeResults.length} results with date range search for "${artistName}" between ${dateInfo.startDate.toISOString().split('T')[0]} and ${dateInfo.endDate.toISOString().split('T')[0]}`
        );
        return rangeResults.map((row) => row.id);
      }
    } catch (error) {
      console.error("Error in date range search:", error);
    }
  }
  
  // If we have a complete date (month, day, and year)
  else if (dateInfo.month !== null && dateInfo.day !== null && dateInfo.year !== null) {
    try {
      // Use strict result for complete date with INNER JOINs to ensure exact matches
      const strictResults = await prisma.$queryRaw<{ id: number }[]>`
        WITH matching_posters AS (
          SELECT DISTINCT p.id
          FROM "Poster" p
          INNER JOIN "PosterArtist" pa ON p.id = pa."posterId"
          INNER JOIN "Artist" a ON pa."artistId" = a.id
          INNER JOIN "PosterEvent" pe ON p.id = pe."posterId"
          INNER JOIN "Event" e ON pe."eventId" = e.id
          WHERE 
            -- Strict full date matching using EXACT date equality
            (
              e.date = make_date(${dateInfo.year}, ${dateInfo.month + 1}, ${dateInfo.day})
            )
            
            -- Artist name matching with similarity
            AND (
              LOWER(a.name) ILIKE LOWER(${`%${artistName}%`})
              OR similarity(a.name, ${artistName}) > 0.3
            )
        )
        SELECT id FROM matching_posters
        LIMIT 100;
      `;

      if (strictResults.length > 0) {
        console.log(
          `Found ${strictResults.length} results with strict artist+full date search for "${artistName} ${dateInfo.month + 1}/${dateInfo.day}/${dateInfo.year}"`
        );
        return strictResults.map((row) => row.id);
      }
      
      // If we have a startDate object but no exact matches, use it as a fallback
      else if (dateInfo.startDate) {
        const dateBasedResults = await prisma.$queryRaw<{ id: number }[]>`
          WITH matching_posters AS (
            SELECT DISTINCT p.id
            FROM "Poster" p
            INNER JOIN "PosterArtist" pa ON p.id = pa."posterId"
            INNER JOIN "Artist" a ON pa."artistId" = a.id
            INNER JOIN "PosterEvent" pe ON p.id = pe."posterId"
            INNER JOIN "Event" e ON pe."eventId" = e.id
            WHERE 
              -- Use the parsed Date object for matching
              e.date = ${dateInfo.startDate}
              
              -- Artist name matching with similarity
              AND (
                LOWER(a.name) ILIKE LOWER(${`%${artistName}%`})
                OR similarity(a.name, ${artistName}) > 0.3
              )
          )
          SELECT id FROM matching_posters
          LIMIT 100;
        `;
        
        if (dateBasedResults.length > 0) {
          return dateBasedResults.map((row) => row.id);
        }
      }
    } catch (error) {
      console.error("Error in exact date search:", error);
    }
  }

  // If we have a month and day but no year (like "Phish 12/31"), we need special handling
  else if (dateInfo.month !== null && dateInfo.day !== null) {
    // Get all posters for this artist where event month/day matches
    const results = await prisma.$queryRaw<{ id: number }[]>`
      WITH matching_posters AS (
        SELECT DISTINCT p.id
        FROM "Poster" p
        INNER JOIN "PosterArtist" pa ON p.id = pa."posterId"
        INNER JOIN "Artist" a ON pa."artistId" = a.id
        INNER JOIN "PosterEvent" pe ON p.id = pe."posterId"
        INNER JOIN "Event" e ON pe."eventId" = e.id
        WHERE 
          -- Month-day matching - CRITICAL: This must use EXTRACT to match correctly
          (
            EXTRACT(MONTH FROM e.date) = ${dateInfo.month + 1} AND
            EXTRACT(DAY FROM e.date) = ${dateInfo.day}
          )
          
          -- Artist name matching with similarity
          AND (
            LOWER(a.name) ILIKE LOWER(${`%${artistName}%`})
            OR similarity(a.name, ${artistName}) > 0.3
          )
      )
      SELECT id FROM matching_posters
      LIMIT 100;
    `;

    return results.map((row) => row.id);
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
