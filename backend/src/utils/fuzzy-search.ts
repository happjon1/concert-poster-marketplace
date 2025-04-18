import { PrismaClient, Prisma } from "@prisma/client";

/**
 * Preprocesses a search query to generate variants that help with special characters and abbreviations
 * @param query The original search query
 * @returns Array of search term variants
 */
export function preprocessSearchQuery(query: string): string[] {
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
  if (!searchTerm || searchTerm.trim().length === 0) {
    return [];
  }

  // Preprocess the search term to generate variants
  const searchVariants = preprocessSearchQuery(searchTerm);

  // Clean the search term
  const cleanedSearchTerm = searchTerm.trim();

  // Set a minimum character length to avoid very short search terms
  if (cleanedSearchTerm.length < 2) {
    return [];
  }

  // Special check for search terms with special characters like "AC/DC"
  if (/[\W_]+/.test(cleanedSearchTerm) && !/\s/.test(cleanedSearchTerm)) {
    const specialResults = await searchWithSpecialCharacters(
      prisma,
      cleanedSearchTerm
    );
    if (specialResults.length > 0) {
      return specialResults;
    }
  }

  // Filter out common stop words (like "OR", "AND", "THE", etc.)
  const stopWords = new Set([
    "or",
    "and",
    "the",
    "in",
    "at",
    "on",
    "by",
    "of",
    "with",
    "for",
  ]);

  const filteredSearchTerm = cleanedSearchTerm
    .split(/\s+/)
    .filter((word) => !stopWords.has(word.toLowerCase()) && word.length > 1)
    .join(" ");

  // If all words were filtered out, use the original term
  const termToUse =
    filteredSearchTerm.length > 1 ? filteredSearchTerm : cleanedSearchTerm;

  // NEW FAST PATH: Check for "artist name + city + year" pattern (e.g., "phish new york 2024")
  // This handles the case of searching for a specific artist in a specific city in a specific year
  const queryTerms = termToUse.split(/\s+/).filter(Boolean);
  const yearPattern = /\b(19|20)\d{2}\b/;
  let yearMatch = null;
  let yearValue = null;
  let searchWithoutYear = termToUse;

  // Extract year if present
  for (const term of queryTerms) {
    const match = term.match(yearPattern);
    if (match) {
      yearMatch = match[0];
      yearValue = parseInt(yearMatch, 10);
      searchWithoutYear = termToUse.replace(yearPattern, "").trim();
      break;
    }
  }

  // If we found a year and have at least 2 more terms (potential artist and city)
  if (
    yearValue &&
    searchWithoutYear &&
    searchWithoutYear.split(/\s+/).length >= 2
  ) {
    console.log(
      `Detected potential artist+city+year pattern with year ${yearValue}`
    );

    // Try different ways to split the remaining terms between artist and city
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

    // Check for multi-word cities using the isMultiWordCityName function
    const lowerSearchWithoutYear = searchWithoutYear.toLowerCase();
    // Use the same multi-word cities list that's already defined in the isMultiWordCityName function
    const multiWordCities = [
      "new york",
      "los angeles",
      "san francisco",
      "san diego",
      "las vegas",
      "new orleans",
      "salt lake city",
    ];

    // If the search term has a multi-word city format, let's check it more thoroughly
    if (isMultiWordCityName(searchWithoutYear)) {
      // Get the common multi-word cities
      for (const city of multiWordCities) {
        if (lowerSearchWithoutYear.includes(city)) {
          const artistPart = lowerSearchWithoutYear.replace(city, "").trim();
          if (artistPart.length > 1) {
            possibleCombinations.unshift({
              artist: artistPart,
              city: city,
            });
          }
        }
      }
    }

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
  }

  // FAST PATH: Quick check for "artist name + year" pattern (e.g., "phish 2023")
  // This is a common pattern that needs special handling with strict AND logic
  const artistYearPattern = /^([a-z\s]+)\s+(19|20)\d{2}$/i;
  const artistYearMatch = termToUse.match(artistYearPattern);
  if (artistYearMatch) {
    const artistName = artistYearMatch[1].trim();
    const year = parseInt(artistYearMatch[2], 10);

    // Artist name should be at least 2 characters
    if (artistName.length >= 2) {
      console.log(
        `Detected artist+year pattern: "${artistName}" and year ${year}`
      );

      // Use strict artist+year search with AND logic
      const strictResults = await searchForArtistWithYear(
        prisma,
        artistName,
        year,
        0.3 // Slightly lower threshold for better matches
      );

      if (strictResults.length > 0) {
        console.log(
          `Found ${strictResults.length} results with strict artist+year search`
        );
        return strictResults;
      }
    }
  }

  // FAST PATH 2: Check for "artist name + city" pattern (e.g., "phish los angeles")
  // This handles the case of searching for a specific artist in a specific city
  const artistCityPattern = /^([a-z]+)\s+((?:[a-z]+\s+)*[a-z]+)$/i;
  const artistCityMatch = termToUse.match(artistCityPattern);

  if (artistCityMatch) {
    const searchTerms = termToUse.split(/\s+/);
    // We need at least 2 words, and the last one or two could be a city
    if (searchTerms.length >= 2) {
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
      if (isMultiWordCityName(termToUse)) {
        // For a term like "phish los angeles" or "pearl jam new york"
        const multiWordCities = [
          "new york",
          "los angeles",
          "san francisco",
          "san diego",
          "las vegas",
          "new orleans",
          "salt lake city",
        ];

        for (const city of multiWordCities) {
          if (termToUse.toLowerCase().includes(city)) {
            const artistPart = termToUse.toLowerCase().replace(city, "").trim();
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
          console.log(
            `Trying artist+city combination: "${combo.artist}" in "${combo.city}"`
          );

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
    }
  }

  // Extract potential date patterns from the search term (for more complex date formats)
  const dateInfo = extractDateInfo(termToUse);

  // If we didn't already handle it with the fast path, try the more general approach
  if (
    dateInfo.hasDate &&
    dateInfo.year &&
    dateInfo.searchWithoutDate.trim().length > 0
  ) {
    const artistName = dateInfo.searchWithoutDate.trim();
    const year = dateInfo.year;

    // First try a strict AND search for artist+year combo
    const strictResults = await searchForArtistWithYear(
      prisma,
      artistName,
      year,
      0.3
    );

    // If we found results with the strict search, return those
    if (strictResults.length > 0) {
      console.log(
        `Found ${strictResults.length} results with strict artist+year search for "${artistName} ${year}"`
      );
      return strictResults;
    }
  }

  // Check for multi-word city searches (e.g., "New York", "San Francisco")
  const isMultiWordCitySearch = isMultiWordCityName(termToUse);

  if (isMultiWordCitySearch) {
    return await searchForCity(prisma, termToUse, similarityThreshold);
  }

  // Generic approach to handle multiple artists in a search query (like "Artist1 OR Artist2")
  // This replaces the hardcoded check for specific artists
  if (cleanedSearchTerm.toLowerCase().includes(" or ")) {
    // Split by "OR" to get individual artist names
    const artistNames = cleanedSearchTerm
      .split(/\s+or\s+/i)
      .map((term) => term.trim())
      .filter((term) => term.length > 0);

    if (artistNames.length >= 2) {
      // For multi-artist searches, search for each artist separately and combine the results
      const artistResults = await Promise.all(
        artistNames.map((artist) =>
          searchForSingleArtist(prisma, artist, similarityThreshold)
        )
      );

      // Combine results from all artists
      const combinedResults = [...new Set(artistResults.flat())];

      if (combinedResults.length > 0) {
        return combinedResults;
      }
    }
  }

  // Use the search term without date for artist/venue matching if a date was found
  const termForMatching = dateInfo.hasDate
    ? dateInfo.searchWithoutDate
    : termToUse;

  // Higher threshold for artist names to reduce false positives
  const artistSimilarityThreshold = 0.3;

  // Threshold for venue city matches to catch geographic searches
  const venueSimilarityThreshold = 0.2;

  // Check if we might have multiple terms (like "artist venue")
  const searchTerms = termForMatching.split(/\s+/).filter(Boolean);

  // For searches like "Grateful Dead Seattle", we want special handling
  // Check if the search might be an artist+venue search (3+ words or contains a known venue city)
  const isPotentialArtistVenueSearch =
    searchTerms.length >= 3 || isLikelyVenueSearch(termForMatching);

  // For multi-term searches or searches with dates, use our enhanced approach
  if (
    (searchTerms.length > 1 && isPotentialArtistVenueSearch) ||
    dateInfo.hasDate
  ) {
    // Parse possible artist and venue terms
    const potentialArtistTerms = [];
    const potentialVenueTerms = [];

    // For searches like "Grateful Dead Seattle", we want to try different combinations:
    // 1. "Grateful Dead" as artist and "Seattle" as venue
    // 2. "Grateful" as artist and "Dead Seattle" as venue
    // 3. "Grateful Dead Seattle" as a complete artist name

    // Try full terms as artist name (handles cases like "Grateful Dead" or "Red Hot Chili Peppers")
    potentialArtistTerms.push(termForMatching);

    // Try first two words as artist, rest as venue (handles "Grateful Dead Seattle")
    if (searchTerms.length >= 3) {
      potentialArtistTerms.push(searchTerms.slice(0, 2).join(" "));
      potentialVenueTerms.push(searchTerms.slice(2).join(" "));
    }

    // Try first word as artist, rest as venue (handles "Phish Madison")
    if (searchTerms.length >= 2) {
      potentialArtistTerms.push(searchTerms[0]);
      potentialVenueTerms.push(searchTerms.slice(1).join(" "));
    }

    // Try last word as venue, rest as artist (handles "Grateful Dead Seattle")
    if (searchTerms.length >= 2) {
      potentialArtistTerms.push(searchTerms.slice(0, -1).join(" "));
      potentialVenueTerms.push(searchTerms[searchTerms.length - 1]);
    }

    // For multi-word city searches, try the entire phrase as a venue city
    if (searchTerms.length >= 2) {
      potentialVenueTerms.push(termForMatching);
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

    // Date condition for SQL query
    let dateCondition = "";
    let dateParams: any[] = [];

    if (dateInfo.hasDate) {
      if (dateInfo.year && dateInfo.month && dateInfo.day) {
        // Full date search - use exact match with date range for flexibility
        const exactDate = new Date(
          `${dateInfo.year}-${dateInfo.month}-${dateInfo.day}`
        );
        const startDate = new Date(exactDate);
        startDate.setDate(startDate.getDate() - 1); // day before

        const endDate = new Date(exactDate);
        endDate.setDate(endDate.getDate() + 1); // day after

        dateCondition = `AND (e.date BETWEEN $1 AND $2)`;
        dateParams = [startDate, endDate];
      } else if (dateInfo.year && dateInfo.month) {
        // Year and month search
        const startDate = new Date(`${dateInfo.year}-${dateInfo.month}-01`);

        // Last day of month calculation
        const endDate = new Date(`${dateInfo.year}-${dateInfo.month}-01`);
        endDate.setMonth(endDate.getMonth() + 1);
        endDate.setDate(endDate.getDate() - 1);

        dateCondition = `AND (e.date BETWEEN $1 AND $2)`;
        dateParams = [startDate, endDate];
      } else if (dateInfo.year) {
        // Year only search
        const startDate = new Date(`${dateInfo.year}-01-01`);
        const endDate = new Date(`${dateInfo.year}-12-31`);

        dateCondition = `AND (e.date BETWEEN $1 AND $2)`;
        dateParams = [startDate, endDate];
      }
    }

    // For multi-word artist names - special handling when it looks like just an artist name
    // and not an artist+venue combination
    const isLikelyArtistNameOnly =
      searchTerms.length === 2 && !isPotentialArtistVenueSearch;

    // Execute raw SQL query using Prisma with enhanced matching
    const result = await prisma.$queryRaw<
      Array<{ id: number; overall_similarity: number }>
    >(
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

    // Extract poster IDs from the result
    return result.map((row) => row.id);
  }

  // For single-term searches, use the original implementation with minor modifications
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

  // Extract poster IDs from the result
  return result.map((row) => row.id);
}

/**
 * Function specifically for handling "artist name + year" queries
 * This ensures strict AND logic between the artist name and the year
 */
async function searchForArtistWithYear(
  prisma: PrismaClient,
  artistName: string,
  year: number,
  similarityThreshold: number = 0.3
): Promise<number[]> {
  console.log(
    `Performing strict artist+year search for "${artistName}" in ${year}`
  );

  // First find artists that match the artist name
  const artistMatches = await prisma.$queryRaw<
    { id: number; similarity: number }[]
  >`
    SELECT a.id, similarity(a.name, ${artistName}) as similarity
    FROM "Artist" a
    WHERE similarity(a.name, ${artistName}) > ${similarityThreshold}
    ORDER BY similarity DESC
  `;

  if (artistMatches.length === 0) {
    console.log("No matching artists found");
    return [];
  }

  console.log(`Found ${artistMatches.length} potential artist matches`);

  // Get all artist IDs with their similarity scores
  const artistIds = artistMatches.map((match) => match.id);

  // Find posters with these artists AND from the specific year
  const posterResults = await prisma.$queryRaw<{ id: number }[]>`
    SELECT p.id
    FROM "Poster" p
    JOIN "PosterArtist" pa ON p.id = pa."posterId"
    JOIN "PosterEvent" pe ON p.id = pe."posterId"
    JOIN "Event" e ON pe."eventId" = e.id
    WHERE 
      pa."artistId" IN (${Prisma.join(artistIds)})
      AND EXTRACT(YEAR FROM e.date) = ${year}
  `;

  console.log(
    `Found ${posterResults.length} posters matching both artist and year ${year}`
  );

  return posterResults.map((result) => result.id);
}

/**
 * Function specifically for handling "artist name + city" queries
 * This ensures strict AND logic between the artist name and the city
 */
async function searchForArtistWithCity(
  prisma: PrismaClient,
  artistName: string,
  cityName: string,
  similarityThreshold: number = 0.3
): Promise<number[]> {
  console.log(
    `Performing strict artist+city search for "${artistName}" in "${cityName}"`
  );

  // First find artists that match the artist name
  const artistMatches = await prisma.$queryRaw<
    { id: number; similarity: number }[]
  >`
    SELECT a.id, similarity(LOWER(a.name), LOWER(${artistName})) as similarity
    FROM "Artist" a
    WHERE similarity(LOWER(a.name), LOWER(${artistName})) > ${similarityThreshold}
    ORDER BY similarity DESC
  `;

  if (artistMatches.length === 0) {
    console.log("No matching artists found");
    return [];
  }

  console.log(`Found ${artistMatches.length} potential artist matches`);

  // Get all artist IDs with their similarity scores
  const artistIds = artistMatches.map((match) => match.id);

  // Find posters with these artists AND in the specific city
  const posterResults = await prisma.$queryRaw<{ id: number }[]>`
    SELECT p.id
    FROM "Poster" p
    JOIN "PosterArtist" pa ON p.id = pa."posterId"
    JOIN "PosterEvent" pe ON p.id = pe."posterId"
    JOIN "Event" e ON pe."eventId" = e.id
    JOIN "Venue" v ON e."venueId" = v.id
    WHERE 
      pa."artistId" IN (${Prisma.join(artistIds)})
      AND similarity(LOWER(v.city), LOWER(${cityName})) >= ${similarityThreshold}
  `;

  console.log(
    `Found ${posterResults.length} posters matching both artist "${artistName}" and city "${cityName}"`
  );

  return posterResults.map((result) => result.id);
}

/**
 * Function specifically for handling "artist name + city + year" queries
 * This ensures strict AND logic between all three components
 */
async function searchForArtistWithCityAndYear(
  prisma: PrismaClient,
  artistName: string,
  cityName: string,
  year: number,
  similarityThreshold: number = 0.3
): Promise<number[]> {
  console.log(
    `Performing strict artist+city+year search for "${artistName}" in "${cityName}" in ${year}`
  );

  // First find artists that match the artist name
  const artistMatches = await prisma.$queryRaw<
    { id: number; similarity: number }[]
  >`
    SELECT a.id, similarity(LOWER(a.name), LOWER(${artistName})) as similarity
    FROM "Artist" a
    WHERE similarity(LOWER(a.name), LOWER(${artistName})) > ${similarityThreshold}
    ORDER BY similarity DESC
  `;

  if (artistMatches.length === 0) {
    console.log("No matching artists found");
    return [];
  }

  console.log(`Found ${artistMatches.length} potential artist matches`);

  // Get all artist IDs with their similarity scores
  const artistIds = artistMatches.map((match) => match.id);

  // Find posters with these artists AND in the specific city AND from the specific year
  const posterResults = await prisma.$queryRaw<{ id: number }[]>`
    SELECT p.id
    FROM "Poster" p
    JOIN "PosterArtist" pa ON p.id = pa."posterId"
    JOIN "PosterEvent" pe ON p.id = pe."posterId"
    JOIN "Event" e ON pe."eventId" = e.id
    JOIN "Venue" v ON e."venueId" = v.id
    WHERE 
      pa."artistId" IN (${Prisma.join(artistIds)})
      AND similarity(LOWER(v.city), LOWER(${cityName})) >= ${similarityThreshold}
      AND EXTRACT(YEAR FROM e.date) = ${year}
  `;

  console.log(
    `Found ${posterResults.length} posters matching artist "${artistName}", city "${cityName}", and year ${year}`
  );

  return posterResults.map((result) => result.id);
}

/**
 * Helper function to search for a single artist by name
 */
async function searchForSingleArtist(
  prisma: PrismaClient,
  artistName: string,
  similarityThreshold: number = 0.3
): Promise<number[]> {
  // Execute a specific search just for this artist name
  const result = await prisma.$queryRaw<Array<{ id: number }>>(
    Prisma.sql`
      SELECT DISTINCT p.id
      FROM "Poster" p
      JOIN "PosterArtist" pa ON p.id = pa."posterId"
      JOIN "Artist" a ON pa."artistId" = a.id
      WHERE similarity(LOWER(a.name), LOWER(${artistName})) >= ${similarityThreshold}
      LIMIT 20
    `
  );

  return result.map((row) => row.id);
}

/**
 * Helper function specifically for city searches, optimized for multi-word cities
 * like "New York" or "San Francisco"
 */
async function searchForCity(
  prisma: PrismaClient,
  cityName: string,
  similarityThreshold: number = 0.3
): Promise<number[]> {
  // Execute a specialized search focused on city matching
  // Lower the threshold slightly for multi-word city names to improve matches
  const adjustedThreshold = cityName.includes(" ")
    ? Math.max(0.2, similarityThreshold - 0.1)
    : similarityThreshold;

  // Create a pattern for exact substring matching
  const exactPattern = `%${cityName.toLowerCase().replace(/\s+/g, "%")}%`;

  // For multi-word cities, use a more comprehensive approach combining exact pattern matching
  // and similarity-based searching
  const result = await prisma.$queryRaw<
    Array<{ id: number; similarity: number }>
  >(
    Prisma.sql`
      SELECT DISTINCT p.id, 
        GREATEST(
          similarity(LOWER(v.city), LOWER(${cityName})),
          -- Boost exact matches for multi-word cities
          CASE WHEN LOWER(v.city) LIKE LOWER(${exactPattern}) THEN 0.95 ELSE 0 END,
          -- For multi-word cities, try partial matches
          CASE WHEN ${cityName.includes(" ")} 
               AND (${cityName.toLowerCase().includes("san")} OR ${cityName
      .toLowerCase()
      .includes("new")}) 
               THEN similarity(LOWER(v.city), LOWER(${
                 cityName.split(" ")[1] || cityName
               })) 
               ELSE 0 
          END,
          -- For multi-word cities, also check similarity with state since users sometimes mix them
          similarity(LOWER(CONCAT(v.city, ' ', COALESCE(v.state, ''))), LOWER(${cityName}))
        ) AS similarity
      FROM "Poster" p
      JOIN "PosterEvent" pe ON p.id = pe."posterId"
      JOIN "Event" e ON pe."eventId" = e.id
      JOIN "Venue" v ON e."venueId" = v.id
      WHERE 
        similarity(LOWER(v.city), LOWER(${cityName})) >= ${adjustedThreshold}
        OR LOWER(v.city) LIKE LOWER(${exactPattern})
        OR ${cityName.includes(" ")} AND LOWER(v.city) LIKE LOWER(${
      "%" + cityName.split(" ")[1] + "%"
    })
        OR similarity(LOWER(CONCAT(v.city, ' ', COALESCE(v.state, ''))), LOWER(${cityName})) >= ${adjustedThreshold}
      ORDER BY similarity DESC
      LIMIT 50
    `
  );

  return result.map((row) => row.id);
}

/**
 * Function specifically for handling search terms with special characters
 * like "AC/DC", "P!nk", or "Panic! At The Disco"
 */
async function searchWithSpecialCharacters(
  prisma: PrismaClient,
  searchTerm: string
): Promise<number[]> {
  // Replace special characters with wildcards in pattern matching
  // This helps with artists like "AC/DC" where the "/" is significant
  const searchPattern = `%${searchTerm.replace(/[\W_]+/g, "%")}%`;

  // Also create a version with spaces instead of special chars for similarity matching
  const spacedSearchTerm = searchTerm.replace(/[\W_]+/g, " ").trim();

  // Use a lower threshold for special character searches to catch more matches
  const result = await prisma.$queryRaw<
    Array<{ id: number; match_priority: number }>
  >`
    SELECT DISTINCT 
      p.id,
      CASE 
        WHEN LOWER(a.name) = LOWER(${searchTerm}) THEN 1
        WHEN LOWER(a.name) LIKE LOWER(${`%${searchTerm}%`}) THEN 2
        ELSE 3
      END AS match_priority
    FROM "Poster" p
    JOIN "PosterArtist" pa ON p.id = pa."posterId"
    JOIN "Artist" a ON pa."artistId" = a.id
    WHERE 
      -- Direct substring match (handles exact special character matches)
      LOWER(a.name) LIKE LOWER(${`%${searchTerm}%`})
      -- Pattern match with % replacing special chars (handles case differences)
      OR LOWER(a.name) LIKE LOWER(${searchPattern})
      -- Similarity match with spaced version (handles cases where DB has spaces instead of special chars)
      OR similarity(LOWER(a.name), LOWER(${spacedSearchTerm})) >= 0.3
      -- Also check poster title/description which might mention the artist with special chars
      OR LOWER(p.title) LIKE LOWER(${`%${searchTerm}%`})
      OR LOWER(p.description) LIKE LOWER(${`%${searchTerm}%`})
    ORDER BY match_priority
    LIMIT 50
  `;

  return result.map((row) => row.id);
}

/**
 * Extract date information from search term
 * This helps identify searches with year components
 */
function extractDateInfo(searchTerm: string): {
  hasDate: boolean;
  year: number | null;
  month: number | null;
  day: number | null;
  searchWithoutDate: string;
} {
  let year: number | null = null;
  let month: number | null = null;
  let day: number | null = null;
  let searchWithoutDate = searchTerm;
  let hasDate = false;

  // Look for year pattern like "2023" or "2023" at word boundaries
  const yearPattern = /\b(19|20)\d{2}\b/g;
  const yearMatches = searchTerm.match(yearPattern);

  if (yearMatches && yearMatches.length > 0) {
    year = parseInt(yearMatches[0], 10);
    hasDate = true;

    // Remove the year from the search term
    searchWithoutDate = searchTerm.replace(yearPattern, "").trim();
  }

  // Month names for matching
  const monthNames = [
    "january",
    "february",
    "march",
    "april",
    "may",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december",
  ];

  // Look for month names
  const monthPattern = new RegExp(`\\b(${monthNames.join("|")})\\b`, "i");
  const monthMatch = searchTerm.match(monthPattern);

  if (monthMatch) {
    const monthName = monthMatch[0].toLowerCase();
    month = monthNames.indexOf(monthName);
    if (month !== -1) {
      hasDate = true;
      // Remove the month from the search term
      searchWithoutDate = searchWithoutDate.replace(monthPattern, "").trim();
    }
  }

  return {
    hasDate,
    year,
    month,
    day,
    searchWithoutDate,
  };
}

/**
 * Checks if the search term is likely a multi-word city name
 */
function isMultiWordCityName(searchTerm: string): boolean {
  // Common multi-word cities that might be searched for
  const multiWordCities = [
    "new york",
    "los angeles",
    "san francisco",
    "san diego",
    "san jose",
    "san antonio",
    "las vegas",
    "salt lake city",
    "jersey city",
    "mexico city",
    "new orleans",
    "st. louis",
    "st louis",
    "kansas city",
    "oklahoma city",
    "fort lauderdale",
    "fort worth",
    "fort collins",
    "santa fe",
    "santa cruz",
    "santa monica",
    "santa barbara",
    "santa rosa",
    "baton rouge",
    "coral gables",
    "coral springs",
    "grand rapids",
    "grand junction",
    "north charleston",
    "west palm beach",
    "palm springs",
    "palm desert",
    "long beach",
    "virginia beach",
    "newport beach",
    "south bend",
    "colorado springs",
    "iowa city",
    "atlantic city",
    "cedar rapids",
    "lake tahoe",
    "des moines",
    "el paso",
    "san bernardino",
    "palo alto",
    "rio rancho",
    "green bay",
    "black mountain",
    "red hook",
    "red bank",
    "mount vernon",
    "new haven",
    "new brunswick",
    "new rochelle",
  ];

  const lowerSearchTerm = searchTerm.toLowerCase();

  // Check if the search matches any of our multi-word cities
  return multiWordCities.some(
    (city) =>
      lowerSearchTerm === city ||
      // Also match if it's the exact city phrase plus potentially other words
      (lowerSearchTerm.includes(city) &&
        (lowerSearchTerm.indexOf(city) === 0 ||
          lowerSearchTerm.indexOf(city) > 0))
  );
}

/**
 * Checks if a search term likely contains a venue reference
 * This is used to distinguish between multi-word artist names like "Flying Lotus"
 * and artist+venue searches like "Grateful Dead Seattle"
 */
function isLikelyVenueSearch(searchTerm: string): boolean {
  // List of common venue city names and venue-related words
  const venueKeywords = [
    "arena",
    "theater",
    "theatre",
    "hall",
    "center",
    "centre",
    "stadium",
    "garden",
    "gardens",
    "coliseum",
    "pavilion",
    "amphitheatre",
    "amphitheater",
    "auditorium",
    "convention",
    "fairgrounds",
    "park",
    "square",
    "forum",
    "bowl",
    "palace",
    "ballroom",
    "opera",
    "civic",
    "festival",
    "club",
    "lounge",
    "concert hall",
    "music hall",
    "performing arts",
    "venue",
    "stage",
    "grounds",
    "house of blues",
    "fillmore",
    "bowl",
    "field",
    "farm",
    "center stage",
    "casino",
    "pier",
    "dome",
    "music box",
    "tabernacle",
    "ryman",
    "beacon",
    "paramount",
    "fox theater",
    "civic center",
    "nightclub",
    "bar",
    "pub",
  ];

  // List of well-known music venue cities
  const commonCities = [
    "new york",
    "los angeles", // Already included but emphasizing for clarity
    "chicago",
    "seattle",
    "portland",
    "boston",
    "austin",
    "nashville",
    "miami",
    "denver",
    "boulder",
    "san francisco",
    "oakland",
    "berkeley",
    "las vegas",
    "atlanta",
    "dallas",
    "houston",
    "philadelphia",
    "washington",
    "toronto",
    "montreal",
    "vancouver",
    "london",
    // Additional cities
    "detroit",
    "minneapolis",
    "st paul",
    "san diego",
    "phoenix",
    "tucson",
    "sacramento",
    "memphis",
    "new orleans",
    "charlotte",
    "raleigh",
    "durham",
    "charleston",
    "savannah",
    "orlando",
    "tampa",
    "cleveland",
    "cincinnati",
    "columbus",
    "pittsburgh",
    "buffalo",
    "syracuse",
    "albany",
    "providence",
    "hartford",
    "omaha",
    "kansas city",
    "st louis",
    "milwaukee",
    "indianapolis",
    "louisville",
    "lexington",
    "birmingham",
    "richmond",
    "baltimore",
    "san jose",
    "albuquerque",
    "santa fe",
    "salt lake city",
    "boise",
    "spokane",
    "eugene",
    "tacoma",
    "olympia",
    "san antonio",
    "fort worth",
    "oklahoma city",
    "tulsa",
    "wichita",
    "des moines",
    "grand rapids",
    "madison",
    "ann arbor",
    "burlington",
    "hollywood", // Adding this since Hollywood Bowl is in Los Angeles
  ];

  const lowerSearchTerm = searchTerm.toLowerCase();

  // Check if the search term contains any venue keywords or city names
  return (
    venueKeywords.some((keyword) => lowerSearchTerm.includes(keyword)) ||
    commonCities.some((city) => lowerSearchTerm.includes(city))
  );
}
