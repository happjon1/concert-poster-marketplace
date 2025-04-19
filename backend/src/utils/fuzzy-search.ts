import { PrismaClient, Prisma } from "@prisma/client";
import {
  STOP_WORDS,
  MULTI_WORD_CITIES,
  VENUE_KEYWORDS,
  COMMON_CITIES,
  MONTH_NAMES,
} from "./fuzzy-search-constants";
import { preprocessSearchQuery } from "./preprocess-search-query";
import { searchForArtistWithCity } from "./search-for-artist-with-city";
import { searchForArtistWithYear } from "./search-for-artist-with-year";
import { searchForArtistWithCityAndYear } from "./search-for-artist-with-city-and-year";
import { searchForSingleArtist } from "./search-for-single-artist";
import { searchForCity } from "./search-for-city";
import { searchWithSpecialCharacters } from "./search-with-special-characters";
import { extractDateInfo } from "./extract-date-info";
import { isMultiWordCityName } from "./is-multi-word-city-name";
import { isLikelyVenueSearch } from "./is-likely-venue-search";

/**
 * Validates and normalizes the search term
 * @param searchTerm - The raw search term to validate
 * @returns The cleaned search term, or null if invalid
 */
function validateAndCleanSearchTerm(searchTerm: string): string | null {
  if (!searchTerm || searchTerm.trim().length === 0) {
    return null;
  }

  const cleanedSearchTerm = searchTerm.trim();
  
  // Set a minimum character length to avoid very short search terms
  if (cleanedSearchTerm.length < 2) {
    return null;
  }
  
  return cleanedSearchTerm;
}

/**
 * Filters out common stop words from a search term
 * @param searchTerm - The search term to filter
 * @returns The filtered search term
 */
function filterStopWords(searchTerm: string): string {
  const filteredSearchTerm = searchTerm
    .split(/\s+/)
    .filter((word) => !STOP_WORDS.has(word.toLowerCase()) && word.length > 1)
    .join(" ");

  // If all words were filtered out, use the original term
  return filteredSearchTerm.length > 1 ? filteredSearchTerm : searchTerm;
}

/**
 * Handles search terms with special characters like "AC/DC"
 * @param prisma - PrismaClient instance
 * @param searchTerm - The search term containing special characters
 * @returns Array of matching poster IDs, empty if no matches
 */
async function handleSpecialCharacterSearch(
  prisma: PrismaClient,
  searchTerm: string
): Promise<number[]> {
  if (/[\W_]+/.test(searchTerm) && !/\s/.test(searchTerm)) {
    const specialResults = await searchWithSpecialCharacters(prisma, searchTerm);
    return specialResults;
  }
  return [];
}

/**
 * Extracts year from search query terms
 * @param queryTerms - The search query split into terms
 * @returns An object with the year value and search term without the year
 */
function extractYearFromQuery(
  searchTerm: string,
  queryTerms: string[]
): { yearValue: number | null; searchWithoutYear: string } {
  const yearPattern = /\b(19|20)\d{2}\b/;
  let yearValue = null;
  let searchWithoutYear = searchTerm;

  // Extract year if present
  for (const term of queryTerms) {
    const match = term.match(yearPattern);
    if (match) {
      yearValue = parseInt(match[0], 10);
      searchWithoutYear = searchTerm.replace(yearPattern, "").trim();
      break;
    }
  }

  return { yearValue, searchWithoutYear };
}

/**
 * Generates possible artist-city combinations for a search without year
 * @param searchWithoutYear - The search string with any year value removed
 * @returns Array of possible artist-city combinations
 */
function generateArtistCityCombinations(searchWithoutYear: string): Array<{ artist: string; city: string }> {
  const remainingTerms = searchWithoutYear.split(/\s+/);
  const possibleCombinations = [];

  // Try last word as city, rest as artist
  if (remainingTerms.length >= 2) {
    possibleCombinations.push({
      artist: remainingTerms.slice(0, -1).join(" "),
      city: remainingTerms[remainingTerms.length - 1],
    });
  }

  // Try first word as artist, rest as city
  if (remainingTerms.length >= 2) {
    possibleCombinations.push({
      artist: remainingTerms[0],
      city: remainingTerms.slice(1).join(" "),
    });
  }

  // Check for multi-word cities
  const lowerSearchTerm = searchWithoutYear.toLowerCase();
  
  if (isMultiWordCityName(searchWithoutYear)) {
    for (const city of MULTI_WORD_CITIES) {
      if (lowerSearchTerm.includes(city)) {
        const artistPart = lowerSearchTerm.replace(city, "").trim();
        if (artistPart.length > 1) {
          possibleCombinations.unshift({
            artist: artistPart,
            city: city,
          });
        }
      }
    }
  }

  return possibleCombinations;
}

/**
 * Handles the artist+city+year search pattern
 * @param prisma - PrismaClient instance
 * @param searchTerm - Original search term
 * @param yearValue - Extracted year value
 * @param searchWithoutYear - Search term with year removed
 * @returns Array of matching poster IDs, empty if no matches
 */
async function handleArtistCityYearSearch(
  prisma: PrismaClient,
  yearValue: number | null,
  searchWithoutYear: string
): Promise<number[]> {
  // Only proceed if we have a year and at least 2 more terms
  if (!yearValue || !searchWithoutYear || searchWithoutYear.split(/\s+/).length < 2) {
    return [];
  }
  
  console.log(`Detected potential artist+city+year pattern with year ${yearValue}`);
  
  const possibleCombinations = generateArtistCityCombinations(searchWithoutYear);

  // Try each combination and return the first one that finds results
  for (const combo of possibleCombinations) {
    if (combo.artist.length >= 2 && combo.city.length >= 2) {
      console.log(
        `Trying artist+city+year combination: "${combo.artist}" in "${combo.city}" in ${yearValue}`
      );

      // Call our specialized function for strict artist+city+year search
      const strictResults = await searchForArtistWithCityAndYear(
        prisma,
        combo.artist,
        combo.city,
        yearValue,
        0.3 // Slightly lower threshold for better matches
      );

      if (strictResults.length > 0) {
        console.log(
          `Found ${strictResults.length} results matching artist "${combo.artist}", city "${combo.city}", and year ${yearValue}`
        );
        return strictResults;
      }
    }
  }
  
  return [];
}

/**
 * Handles the artist+year search pattern (e.g., "phish 2023")
 * @param prisma - PrismaClient instance
 * @param searchTerm - The search term to process
 * @returns Array of matching poster IDs, empty if no matches
 */
async function handleArtistYearPattern(
  prisma: PrismaClient,
  searchTerm: string
): Promise<number[]> {
  const artistYearPattern = /^([a-z\s]+)\s+(19|20)\d{2}$/i;
  const artistYearMatch = searchTerm.match(artistYearPattern);
  
  if (!artistYearMatch) {
    return [];
  }
  
  const artistName = artistYearMatch[1].trim();
  const year = parseInt(artistYearMatch[2], 10);

  // Artist name should be at least 2 characters
  if (artistName.length < 2) {
    return [];
  }
  
  console.log(`Detected artist+year pattern: "${artistName}" and year ${year}`);

  // Use strict artist+year search with AND logic
  const strictResults = await searchForArtistWithYear(
    prisma,
    artistName,
    year,
    0.3 // Slightly lower threshold for better matches
  );

  if (strictResults.length > 0) {
    console.log(`Found ${strictResults.length} results with strict artist+year search`);
    return strictResults;
  }
  
  return [];
}

/**
 * Handles the artist+city search pattern (e.g., "phish los angeles")
 * @param prisma - PrismaClient instance
 * @param searchTerm - The search term to process
 * @returns Array of matching poster IDs, empty if no matches
 */
async function handleArtistCityPattern(
  prisma: PrismaClient,
  searchTerm: string
): Promise<number[]> {
  const artistCityPattern = /^([a-z]+)\s+((?:[a-z]+\s+)*[a-z]+)$/i;
  const artistCityMatch = searchTerm.match(artistCityPattern);

  if (!artistCityMatch) {
    return [];
  }
  
  const searchTerms = searchTerm.split(/\s+/);
  // We need at least 2 words
  if (searchTerms.length < 2) {
    return [];
  }
  
  // Different ways to interpret artist+city combinations
  const possibleArtistCityCombinations = [];

  // Single word artist + multi-word city (e.g., "Phish Los Angeles")
  if (searchTerms.length >= 3) {
    possibleArtistCityCombinations.push({
      artist: searchTerms[0],
      city: searchTerms.slice(1).join(" "),
    });
  }

  // Multi-word artist + single word city (e.g., "Grateful Dead Seattle")
  if (searchTerms.length >= 3) {
    possibleArtistCityCombinations.push({
      artist: searchTerms.slice(0, -1).join(" "),
      city: searchTerms[searchTerms.length - 1],
    });
  }

  // For 2-word searches, try both combinations
  if (searchTerms.length === 2) {
    possibleArtistCityCombinations.push({
      artist: searchTerms[0],
      city: searchTerms[1],
    });
  }

  // If any terms match our multi-word city list, prioritize that interpretation
  if (isMultiWordCityName(searchTerm)) {
    for (const city of MULTI_WORD_CITIES) {
      if (searchTerm.toLowerCase().includes(city)) {
        const artistPart = searchTerm.toLowerCase().replace(city, "").trim();
        if (artistPart.length > 1) {
          possibleArtistCityCombinations.unshift({
            artist: artistPart,
            city: city,
          });
          break;
        }
      }
    }
  }

  // Try each combination and return the first one that finds results
  for (const combo of possibleArtistCityCombinations) {
    // Only process if we have valid artist and city strings
    if (combo.artist.length >= 2 && combo.city.length >= 2) {
      console.log(`Trying artist+city combination: "${combo.artist}" in "${combo.city}"`);

      // Call our specialized function for strict artist+city search
      const strictResults = await searchForArtistWithCity(
        prisma,
        combo.artist,
        combo.city,
        0.3 // Slightly lower threshold for better matches
      );

      if (strictResults.length > 0) {
        console.log(
          `Found ${strictResults.length} results with strict artist+city search for "${combo.artist}" in "${combo.city}"`
        );
        return strictResults;
      }
    }
  }
  
  return [];
}

/**
 * Handles date patterns in the search (using extractDateInfo)
 * @param prisma - PrismaClient instance
 * @param searchTerm - The search term to process
 * @returns Array of matching poster IDs, empty if no matches
 */
async function handleDatePatterns(
  prisma: PrismaClient,
  searchTerm: string
): Promise<number[]> {
  const dateInfo = extractDateInfo(searchTerm);

  if (!dateInfo.hasDate || !dateInfo.year || dateInfo.searchWithoutDate.trim().length === 0) {
    return [];
  }
  
  const artistName = dateInfo.searchWithoutDate.trim();
  const year = dateInfo.year;

  // Try a strict AND search for artist+year combo
  const strictResults = await searchForArtistWithYear(
    prisma,
    artistName,
    year,
    0.3
  );

  if (strictResults.length > 0) {
    console.log(
      `Found ${strictResults.length} results with strict artist+year search for "${artistName} ${year}"`
    );
    return strictResults;
  }
  
  return [];
}

/**
 * Handles multi-artist searches with "OR" (e.g., "Artist1 OR Artist2")
 * @param prisma - PrismaClient instance
 * @param searchTerm - The search term to process
 * @param similarityThreshold - Minimum similarity threshold
 * @returns Array of matching poster IDs, empty if no matches
 */
async function handleMultiArtistSearch(
  prisma: PrismaClient,
  searchTerm: string,
  similarityThreshold: number
): Promise<number[]> {
  if (!searchTerm.toLowerCase().includes(" or ")) {
    return [];
  }
  
  // Split by "OR" to get individual artist names
  const artistNames = searchTerm
    .split(/\s+or\s+/i)
    .map((term) => term.trim())
    .filter((term) => term.length > 0);

  if (artistNames.length < 2) {
    return [];
  }
  
  // For multi-artist searches, search for each artist separately and combine the results
  const artistResults = await Promise.all(
    artistNames.map((artist) =>
      searchForSingleArtist(prisma, artist, similarityThreshold)
    )
  );

  // Combine results from all artists
  const combinedResults = [...new Set(artistResults.flat())];
  return combinedResults;
}

/**
 * Generates SQL for complex multi-term searches
 * @param prisma - PrismaClient instance
 * @param termToUse - The main search term
 * @param dateInfo - Date information extracted from the search
 * @param searchTerms - The search split into terms
 * @param termForMatching - The search term to use for matching (may have date removed)
 * @param similarityThreshold - Similarity threshold for matches
 * @returns Array of matching poster IDs
 */
async function executeComplexSearch(
  prisma: PrismaClient,
  termToUse: string,
  dateInfo: any,
  searchTerms: string[],
  termForMatching: string,
  similarityThreshold: number
): Promise<number[]> {
  // Higher threshold for artist names to reduce false positives
  const artistSimilarityThreshold = 0.3;

  // Threshold for venue city matches to catch geographic searches
  const venueSimilarityThreshold = 0.2;

  // For searches like "Grateful Dead Seattle", we want special handling
  const isPotentialArtistVenueSearch =
    searchTerms.length >= 3 || isLikelyVenueSearch(termForMatching);
    
  // Parse possible artist and venue terms
  const potentialArtistTerms = generatePotentialArtistTerms(termForMatching, searchTerms, isPotentialArtistVenueSearch);
  const potentialVenueTerms = generatePotentialVenueTerms(termForMatching, searchTerms);

  // For multi-word artist names - special handling when it looks like just an artist name
  const isLikelyArtistNameOnly = searchTerms.length === 2 && !isPotentialArtistVenueSearch;

  // Execute the complex SQL query
  const result = await executeComplexSearchQuery(
    prisma,
    termToUse,
    termForMatching,
    dateInfo,
    potentialArtistTerms,
    potentialVenueTerms,
    searchTerms,
    isPotentialArtistVenueSearch,
    isLikelyArtistNameOnly,
    similarityThreshold,
    artistSimilarityThreshold,
    venueSimilarityThreshold
  );

  // Extract poster IDs from the result
  return result.map((row: any) => row.id);
}

/**
 * Generates potential artist terms for search
 */
function generatePotentialArtistTerms(
  termForMatching: string,
  searchTerms: string[],
  isPotentialArtistVenueSearch: boolean
): string[] {
  const potentialArtistTerms = [];

  // Try full terms as artist name (handles cases like "Grateful Dead" or "Red Hot Chili Peppers")
  potentialArtistTerms.push(termForMatching);

  // Try first two words as artist, rest as venue (handles "Grateful Dead Seattle")
  if (searchTerms.length >= 3) {
    potentialArtistTerms.push(searchTerms.slice(0, 2).join(" "));
  }

  // Try first word as artist, rest as venue (handles "Phish Madison")
  if (searchTerms.length >= 2) {
    potentialArtistTerms.push(searchTerms[0]);
  }

  // Try last word as venue, rest as artist (handles "Grateful Dead Seattle")
  if (searchTerms.length >= 2) {
    potentialArtistTerms.push(searchTerms.slice(0, -1).join(" "));
  }

  // When searching for multiple artists (like in "Phish Grateful Dead" after removing "OR"),
  // add individual terms as separate artist searches
  if (searchTerms.length > 1 && !isPotentialArtistVenueSearch) {
    searchTerms.forEach((term) => {
      if (term.length > 1) {
        potentialArtistTerms.push(term);
      }
    });
  }

  return potentialArtistTerms;
}

/**
 * Generates potential venue terms for search
 */
function generatePotentialVenueTerms(termForMatching: string, searchTerms: string[]): string[] {
  const potentialVenueTerms = [];

  // Try different venue term combinations
  if (searchTerms.length >= 3) {
    potentialVenueTerms.push(searchTerms.slice(2).join(" "));
  }

  if (searchTerms.length >= 2) {
    potentialVenueTerms.push(searchTerms.slice(1).join(" "));
    potentialVenueTerms.push(searchTerms[searchTerms.length - 1]);
  }

  // For multi-word city searches, try the entire phrase as a venue city
  if (searchTerms.length >= 2) {
    potentialVenueTerms.push(termForMatching);
  }

  return potentialVenueTerms;
}

/**
 * Executes a basic single-term search
 */
async function executeSingleTermSearch(
  prisma: PrismaClient,
  termToUse: string,
  similarityThreshold: number,
  artistSimilarityThreshold: number = 0.3
): Promise<number[]> {
  const result = await prisma.$queryRaw<
    Array<{ id: number; overall_similarity: number }>
  >(Prisma.sql`
    WITH 
      poster_search AS (
        SELECT 
          p.id,
          p.title,
          p.description,
          GREATEST(
            similarity(LOWER(p.title), LOWER(${termToUse})),
            similarity(LOWER(p.description), LOWER(${termToUse}))
          ) AS max_poster_similarity
        FROM "Poster" p
      ),
      artist_search AS (
        SELECT 
          pa.id as poster_artist_id,
          pa."posterId",
          a.name as artist_name,
          similarity(LOWER(a.name), LOWER(${termToUse})) AS artist_similarity
        FROM "PosterArtist" pa
        JOIN "Artist" a ON pa."artistId" = a.id
      ),
      event_search AS (
        SELECT 
          pe.id as poster_event_id,
          pe."posterId",
          e.name as event_name,
          v.name as venue_name,
          v.city as venue_city,
          v.state as venue_state,
          v.country as venue_country,
          GREATEST(
            similarity(LOWER(e.name), LOWER(${termToUse})),
            similarity(LOWER(v.name), LOWER(${termToUse})),
            similarity(LOWER(v.city), LOWER(${termToUse})),
            similarity(LOWER(COALESCE(v.state, '')), LOWER(${termToUse})),
            similarity(LOWER(v.country), LOWER(${termToUse}))
          ) AS event_similarity
        FROM "PosterEvent" pe
        JOIN "Event" e ON pe."eventId" = e.id
        JOIN "Venue" v ON e."venueId" = v.id
      )
    SELECT DISTINCT 
      ps.id,
      GREATEST(
        ps.max_poster_similarity, 
        COALESCE("as".artist_similarity, 0), 
        COALESCE(es.event_similarity, 0)
      ) AS overall_similarity
    FROM poster_search ps
    LEFT JOIN artist_search "as" ON ps.id = "as"."posterId"
    LEFT JOIN event_search es ON ps.id = es."posterId"
    WHERE 
      ps.max_poster_similarity >= ${similarityThreshold}
      OR "as".artist_similarity >= ${artistSimilarityThreshold}
      OR es.event_similarity >= ${similarityThreshold}
    ORDER BY overall_similarity DESC
    LIMIT 20
  `);

  return result.map((row) => row.id);
}

/**
 * Executes the complex SQL query for multi-term searches
 */
async function executeComplexSearchQuery(
  prisma: PrismaClient,
  termToUse: string,
  termForMatching: string,
  dateInfo: any,
  potentialArtistTerms: string[],
  potentialVenueTerms: string[],
  searchTerms: string[],
  isPotentialArtistVenueSearch: boolean,
  isLikelyArtistNameOnly: boolean,
  similarityThreshold: number,
  artistSimilarityThreshold: number,
  venueSimilarityThreshold: number
): Promise<Array<{ id: number; overall_similarity: number }>> {
  return await prisma.$queryRaw<Array<{ id: number; overall_similarity: number }>>(
    Prisma.sql`
      WITH 
        poster_search AS (
          SELECT 
            p.id,
            p.title,
            p.description,
            GREATEST(
              similarity(LOWER(p.title), LOWER(${termToUse})),
              similarity(LOWER(p.description), LOWER(${termToUse}))
            ) AS max_poster_similarity
          FROM "Poster" p
        ),
        artist_search AS (
          SELECT 
            pa.id as poster_artist_id,
            pa."posterId",
            a.name as artist_name,
            -- For artist searches, check both the full search term and individual terms
            GREATEST(
              -- Full name match (e.g., "Flying Lotus")
              similarity(LOWER(a.name), LOWER(${termForMatching})),
              -- Check if this might be a multi-word artist name like "Flying Lotus"
              -- In that case, we want a higher score for artists that match the full name exactly
              CASE WHEN ${isLikelyArtistNameOnly ? true : false} AND 
                        LOWER(a.name) = LOWER(${termForMatching})
                   THEN 1.0
                   ELSE 0.0
              END,
              -- For multi-term searches, try to match individual variations
              MAX(similarity(LOWER(a.name), LOWER(term)))
            ) AS artist_similarity
          FROM "PosterArtist" pa
          JOIN "Artist" a ON pa."artistId" = a.id,
          UNNEST(${Prisma.raw(
            `ARRAY[${potentialArtistTerms
              .map((term) => `'${term.replace(/'/g, "''")}'`)
              .join(", ")}]::text[]`
          )}) AS term
          GROUP BY pa.id, pa."posterId", a.name
        ),
        venue_search AS (
          SELECT 
            pe."posterId",
            v.name as venue_name,
            v.city as venue_city,
            v.state as venue_state,
            v.country as venue_country,
            -- Check venue name against venue terms
            GREATEST(
              MAX(similarity(LOWER(v.name), LOWER(term))),
              MAX(similarity(LOWER(v.city), LOWER(term))),
              MAX(similarity(LOWER(COALESCE(v.state, '')), LOWER(term))),
              MAX(similarity(LOWER(v.country), LOWER(term)))
            ) AS venue_similarity
          FROM "PosterEvent" pe
          JOIN "Event" e ON pe."eventId" = e.id
          JOIN "Venue" v ON e."venueId" = v.id,
          UNNEST(${
            potentialVenueTerms.length > 0
              ? Prisma.raw(
                  `ARRAY[${potentialVenueTerms
                    .map((term) => `'${term.replace(/'/g, "''")}'`)
                    .join(", ")}]::text[]`
                )
              : Prisma.raw(
                  `ARRAY['${termForMatching.replace(/'/g, "''")}']::text[]`
                )
          }) AS term
          GROUP BY pe."posterId", v.name, v.city, v.state, v.country
        ),
        event_search AS (
          SELECT 
            pe.id as poster_event_id,
            pe."posterId",
            e.name as event_name,
            e.date as event_date,
            GREATEST(
              similarity(LOWER(e.name), LOWER(${termToUse})),
              -- Check if year matches (exact match gets higher score)
              CASE 
                WHEN ${
                  dateInfo.year ? dateInfo.year : 0
                } > 0 AND EXTRACT(YEAR FROM e.date) = ${
      dateInfo.year ? dateInfo.year : 0
    } THEN 1.0
                ELSE 0.0
              END
            ) AS event_similarity
          FROM "PosterEvent" pe
          JOIN "Event" e ON pe."eventId" = e.id
          ${
            dateInfo.hasDate
              ? Prisma.sql`WHERE (
            ${
              dateInfo.year
                ? Prisma.sql`EXTRACT(YEAR FROM e.date) = ${dateInfo.year}`
                : Prisma.empty
            }
            ${
              dateInfo.year && dateInfo.month
                ? Prisma.sql`AND EXTRACT(MONTH FROM e.date) = ${dateInfo.month}`
                : Prisma.empty
            }
            ${
              dateInfo.year && dateInfo.month && dateInfo.day
                ? Prisma.sql`AND EXTRACT(DAY FROM e.date) = ${dateInfo.day}`
                : Prisma.empty
            }
          )`
              : Prisma.empty
          }
        ),
        -- Combined scoring with AND logic for multi-part searches
        combined_scores AS (
          SELECT 
            a."posterId",
            a.artist_similarity,
            COALESCE(v.venue_similarity, 0) as venue_similarity,
            COALESCE(e.event_similarity, 0) as event_similarity,
            CASE
              -- Special case for likely multi-word artist name (like "Flying Lotus")
              WHEN ${
                isLikelyArtistNameOnly ? true : false
              } AND a.artist_similarity >= 0.9
              THEN a.artist_similarity * 2.0
              
              -- If we have venue terms and artist terms, require BOTH to match (AND logic)
              WHEN ${
                potentialVenueTerms.length > 0 && isPotentialArtistVenueSearch
                  ? true
                  : false
              } 
                   AND a.artist_similarity >= ${artistSimilarityThreshold}
                   AND COALESCE(v.venue_similarity, 0) >= ${venueSimilarityThreshold}
              THEN (a.artist_similarity + COALESCE(v.venue_similarity, 0)) * 1.5
              
              -- Artist + Date scoring (higher weight when both match)
              WHEN a.artist_similarity >= ${artistSimilarityThreshold} AND e.event_date IS NOT NULL 
              ${
                dateInfo.hasDate
                  ? Prisma.sql`
                AND EXTRACT(YEAR FROM e.event_date) = ${
                  dateInfo.year ? dateInfo.year : 0
                }
                ${
                  dateInfo.month
                    ? Prisma.sql`AND EXTRACT(MONTH FROM e.event_date) = ${dateInfo.month}`
                    : Prisma.empty
                }
                ${
                  dateInfo.day
                    ? Prisma.sql`AND EXTRACT(DAY FROM e.event_date) = ${dateInfo.day}`
                    : Prisma.empty
                }
              `
                  : Prisma.empty
              }
              THEN a.artist_similarity * 2
              
              -- Individual high scores when we don't have multi-term components
              ELSE GREATEST(
                a.artist_similarity * 1.2,
                COALESCE(v.venue_similarity, 0) * 1.0,
                COALESCE(e.event_similarity, 0) * ${
                  dateInfo.hasDate ? 1.5 : 1.0
                }
              )
            END AS combined_similarity
          FROM artist_search a
          LEFT JOIN venue_search v ON a."posterId" = v."posterId"
          LEFT JOIN event_search e ON a."posterId" = e."posterId"
        ),
        -- For multi-word searches like "Grateful Dead Seattle", require all parts to match
        multi_term_matches AS (
          SELECT 
            a."posterId",
            CASE 
              -- Special case for multi-word artist names like "Flying Lotus"
              WHEN ${
                isLikelyArtistNameOnly ? true : false
              } AND a.artist_similarity >= 0.9
              THEN true
              
              -- For multi-term venue+artist searches, we want to prioritize posters that match ALL parts
              WHEN ${
                searchTerms.length > 1 && isPotentialArtistVenueSearch
                  ? true
                  : false
              } 
                   AND a.artist_similarity >= ${artistSimilarityThreshold}
                   AND v.venue_similarity >= ${venueSimilarityThreshold}
              THEN true
              
              ELSE false
            END as matches_all_terms
          FROM artist_search a
          LEFT JOIN venue_search v ON a."posterId" = v."posterId"
        )
      
      SELECT DISTINCT 
        ps.id,
        GREATEST(
          ps.max_poster_similarity, 
          COALESCE(cs.combined_similarity, 0)
        ) AS overall_similarity,
        COALESCE(mtm.matches_all_terms, false) AS matches_all_terms
      FROM poster_search ps
      LEFT JOIN combined_scores cs ON ps.id = cs."posterId"
      LEFT JOIN multi_term_matches mtm ON ps.id = mtm."posterId"
      WHERE 
        -- Special case for multi-word artist names (like "Flying Lotus")
        (${
          isLikelyArtistNameOnly ? true : false
        } AND cs.artist_similarity >= 0.8)
        OR
        -- For artist+venue searches (like "Grateful Dead Seattle"), require both to match
        (${
          searchTerms.length > 1 && isPotentialArtistVenueSearch
            ? true
            : false
        }
         AND mtm.matches_all_terms = true)
        OR
        -- For single-term searches or when no specific venue/artist component identified
        (${
          searchTerms.length <= 1 || !isPotentialArtistVenueSearch
            ? true
            : false
        }
         AND (
           ps.max_poster_similarity >= ${similarityThreshold}
           OR cs.combined_similarity >= ${artistSimilarityThreshold}
         )
        )
      ORDER BY 
        -- Prioritize matches that satisfy all search components
        matches_all_terms DESC,
        overall_similarity DESC
      LIMIT 50
    `
  );
}

/**
 * Performs a fuzzy search on posters using PostgreSQL's trigram similarity.
 * This function searches across poster titles, descriptions, artist names, and event details.
 * Enhanced to better handle searches like "Phish 2003", "Pearl Jam 10/31/2023", "Grateful Dead Madison Square Garden"
 * Now requires that multi-part searches like "Grateful Dead Seattle" match all components (AND condition).
 * Filters out common stop words like "OR", "AND", "THE" from search queries.
 *
 * @param prisma - PrismaClient instance
 * @param searchTerm - The search term to use for fuzzy matching
 * @param similarityThreshold - Minimum similarity threshold (0.0 to 1.0, default 0.35)
 * @returns Array of poster IDs that match the search criteria
 */
export async function fuzzyPosterSearch(
  prisma: PrismaClient,
  searchTerm: string,
  similarityThreshold: number = 0.35
): Promise<number[]> {
  // Validate and clean the search term
  const cleanedSearchTerm = validateAndCleanSearchTerm(searchTerm);
  if (!cleanedSearchTerm) {
    return [];
  }

  // Preprocess the search term to generate variants
  const searchVariants = preprocessSearchQuery(cleanedSearchTerm);

  // Special check for search terms with special characters like "AC/DC"
  const specialResults = await handleSpecialCharacterSearch(prisma, cleanedSearchTerm);
  if (specialResults.length > 0) {
    return specialResults;
  }

  // Filter out common stop words and get the term to use
  const termToUse = filterStopWords(cleanedSearchTerm);

  // Extract query terms and check for year
  const queryTerms = termToUse.split(/\s+/).filter(Boolean);
  const { yearValue, searchWithoutYear } = extractYearFromQuery(termToUse, queryTerms);

  // Handle artist+city+year search pattern (e.g., "phish new york 2024")
  const artistCityYearResults = await handleArtistCityYearSearch(
    prisma,
    yearValue,
    searchWithoutYear
  );
  if (artistCityYearResults.length > 0) {
    return artistCityYearResults;
  }

  // Handle artist+year search pattern (e.g., "phish 2023")
  const artistYearResults = await handleArtistYearPattern(prisma, termToUse);
  if (artistYearResults.length > 0) {
    return artistYearResults;
  }

  // Handle artist+city search pattern (e.g., "phish los angeles")
  const artistCityResults = await handleArtistCityPattern(prisma, termToUse);
  if (artistCityResults.length > 0) {
    return artistCityResults;
  }

  // Handle date patterns (for more complex date formats)
  const datePatternResults = await handleDatePatterns(prisma, termToUse);
  if (datePatternResults.length > 0) {
    return datePatternResults;
  }

  // Check for multi-word city searches (e.g., "New York", "San Francisco")
  if (isMultiWordCityName(termToUse)) {
    return await searchForCity(prisma, termToUse, similarityThreshold);
  }

  // Handle multi-artist searches with "OR" (e.g., "Artist1 OR Artist2")
  const multiArtistResults = await handleMultiArtistSearch(
    prisma,
    cleanedSearchTerm,
    similarityThreshold
  );
  if (multiArtistResults.length > 0) {
    return multiArtistResults;
  }

  // Extract date info for remaining search logic
  const dateInfo = extractDateInfo(termToUse);

  // Use the search term without date for artist/venue matching if a date was found
  const termForMatching = dateInfo.hasDate
    ? dateInfo.searchWithoutDate
    : termToUse;

  // Check if we might have multiple terms for complex searches
  const searchTerms = termForMatching.split(/\s+/).filter(Boolean);
  const isPotentialArtistVenueSearch =
    searchTerms.length >= 3 || isLikelyVenueSearch(termForMatching);

  // For multi-term searches or searches with dates, use our enhanced approach
  if ((searchTerms.length > 1 && isPotentialArtistVenueSearch) || dateInfo.hasDate) {
    return await executeComplexSearch(
      prisma,
      termToUse,
      dateInfo,
      searchTerms,
      termForMatching,
      similarityThreshold
    );
  }

  // For single-term searches, use a simpler approach
  return await executeSingleTermSearch(prisma, termToUse, similarityThreshold);
}
