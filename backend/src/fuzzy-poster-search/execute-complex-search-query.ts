import { PrismaClient, Prisma } from "@prisma/client";

/**
 * Executes the complex SQL query for multi-term searches
 * @param prisma - PrismaClient instance
 * @param termToUse - The main search term
 * @param termForMatching - The search term to use for matching (may have date removed)
 * @param dateInfo - Date information extracted from the search
 * @param potentialArtistTerms - Array of potential artist terms to search for
 * @param potentialVenueTerms - Array of potential venue terms to search for
 * @param searchTerms - The search split into terms
 * @param isPotentialArtistVenueSearch - Whether this might be an artist+venue search
 * @param isLikelyArtistNameOnly - Whether this might be just an artist name
 * @param similarityThreshold - Overall similarity threshold
 * @param artistSimilarityThreshold - Artist similarity threshold
 * @param venueSimilarityThreshold - Venue similarity threshold
 * @returns Query results with IDs and similarity scores
 */
export async function executeComplexSearchQuery(
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
  // Handle empty arrays for potential terms
  const venueTermsToUse =
    potentialVenueTerms.length > 0 ? potentialVenueTerms : [termForMatching];

  // Determine if this is primarily a venue search
  const isVenueOnlySearch =
    potentialVenueTerms.length > 0 && potentialArtistTerms.length === 0;

  // Determine if this is a date-specific search with full precision (year, month, day)
  const hasSpecificFullDate =
    dateInfo.hasDate && dateInfo.year && dateInfo.month && dateInfo.day;

  // Determine if this is a month-day search (like "12/31" of any year)
  const isMonthDaySearch =
    dateInfo.hasDate && Boolean(dateInfo.month) && Boolean(dateInfo.day);

  // Determine if this is an artist + month-day search (like "Phish 12/31")
  const isArtistMonthDaySearch =
    isMonthDaySearch && potentialArtistTerms.length > 0;

  // Determine if this is specifically an artist + year search
  const isArtistYearSearch =
    dateInfo.hasDate &&
    dateInfo.year &&
    potentialArtistTerms.length > 0 &&
    !dateInfo.month &&
    !dateInfo.day;

  // Handle empty artist terms
  const artistTermsToUse =
    potentialArtistTerms.length > 0 ? potentialArtistTerms : [termForMatching];

  // Create ordering SQL based on dateInfo - properly escaped for SQL syntax
  const orderByClause = dateInfo.hasDate
    ? `has_exact_date_match DESC, has_artist_year_match DESC, has_month_day_match DESC, has_artist_month_day_match DESC, matches_all_terms DESC, overall_similarity DESC`
    : `matches_all_terms DESC, overall_similarity DESC`;

  // Lower the venue similarity threshold for venue-only searches to improve recall
  const effectiveVenueSimilarityThreshold = isVenueOnlySearch
    ? 0.2
    : venueSimilarityThreshold;

  return await prisma.$queryRaw<
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
          WHERE p.status = 'ACTIVE'
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
            `ARRAY[${artistTermsToUse
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
            ) AS venue_similarity,
            -- Add checks for exact venue matches
            CASE WHEN 
              v.name ILIKE ${termForMatching} OR 
              v.city ILIKE ${termForMatching} OR
              ${isVenueOnlySearch ? true : false} AND (
                -- For venue-only searches, check for partial matches
                v.name ILIKE CONCAT('%', ${termForMatching}, '%') OR
                v.city ILIKE CONCAT('%', ${termForMatching}, '%')
              )
              THEN 1.0 ELSE 0.0 
            END as exact_venue_match
          FROM "PosterEvent" pe
          JOIN "Event" e ON pe."eventId" = e.id
          JOIN "Venue" v ON e."venueId" = v.id,
          UNNEST(${Prisma.raw(
            `ARRAY[${venueTermsToUse
              .map((term) => `'${term.replace(/'/g, "''")}'`)
              .join(", ")}]::text[]`
          )}) AS term
          GROUP BY pe."posterId", v.name, v.city, v.state, v.country
        ),
        event_search AS (
          SELECT 
            pe.id as poster_event_id,
            pe."posterId",
            e.name as event_name,
            e."startDate" as event_date,
            EXTRACT(MONTH FROM e."startDate") as event_month,
            EXTRACT(DAY FROM e."startDate") as event_day,
            EXTRACT(YEAR FROM e."startDate") as event_year,
            GREATEST(
              similarity(LOWER(e.name), LOWER(${termToUse})),
              -- Check if year matches (exact match gets higher score)
              CASE 
                WHEN ${dateInfo.year ? dateInfo.year : 0} > 0 
                AND EXTRACT(YEAR FROM e."startDate") = ${
                  dateInfo.year ? dateInfo.year : 0
                } THEN 1.0
                ELSE 0.0
              END,
              -- Add month and day matching with high similarity if they match
              CASE 
                WHEN ${dateInfo.month ? dateInfo.month : 0} > 0 
                AND EXTRACT(MONTH FROM e."startDate") = ${
                  dateInfo.month ? dateInfo.month : 0
                } THEN 0.9
                ELSE 0.0
              END,
              CASE 
                WHEN ${dateInfo.day ? dateInfo.day : 0} > 0 
                AND EXTRACT(DAY FROM e."startDate") = ${
                  dateInfo.day ? dateInfo.day : 0
                } THEN 0.9
                ELSE 0.0
              END
            ) AS event_similarity,
            -- Add specific flags for exact date matching
            CASE WHEN EXTRACT(YEAR FROM e."startDate") = ${
              dateInfo.year ? dateInfo.year : 0
            } 
                      AND ${dateInfo.year ? dateInfo.year : 0} > 0 
                 THEN true ELSE false 
            END AS year_match,
            CASE WHEN EXTRACT(MONTH FROM e."startDate") = ${
              dateInfo.month ? dateInfo.month : 0
            } 
                      AND ${dateInfo.month ? dateInfo.month : 0} > 0 
                 THEN true ELSE false 
            END AS month_match,
            CASE WHEN EXTRACT(DAY FROM e."startDate") = ${
              dateInfo.day ? dateInfo.day : 0
            } 
                      AND ${dateInfo.day ? dateInfo.day : 0} > 0 
                 THEN true ELSE false 
            END AS day_match,
            -- Add a flag for month-day matches (regardless of year)
            CASE WHEN 
              ${dateInfo.month ? dateInfo.month : 0} > 0 AND
              ${dateInfo.day ? dateInfo.day : 0} > 0 AND
              EXTRACT(MONTH FROM e."startDate") = ${
                dateInfo.month ? dateInfo.month : 0
              } AND
              EXTRACT(DAY FROM e."startDate") = ${
                dateInfo.day ? dateInfo.day : 0
              }
              THEN true ELSE false 
            END AS month_day_match,
            -- Add an exact_date_match flag for precise date matching (all three components)
            CASE WHEN 
              ${dateInfo.year ? dateInfo.year : 0} > 0 AND
              ${dateInfo.month ? dateInfo.month : 0} > 0 AND
              ${dateInfo.day ? dateInfo.day : 0} > 0 AND
              EXTRACT(YEAR FROM e."startDate") = ${
                dateInfo.year ? dateInfo.year : 0
              } AND
              EXTRACT(MONTH FROM e."startDate") = ${
                dateInfo.month ? dateInfo.month : 0
              } AND
              EXTRACT(DAY FROM e."startDate") = ${
                dateInfo.day ? dateInfo.day : 0
              }
              THEN true ELSE false 
            END AS exact_date_match
          FROM "PosterEvent" pe
          JOIN "Event" e ON pe."eventId" = e.id
          -- For date searches, only add filter when we have a specific year
          ${
            dateInfo.hasDate && dateInfo.year
              ? Prisma.sql`WHERE (
            EXTRACT(YEAR FROM e."startDate") = ${dateInfo.year}
            ${
              dateInfo.month
                ? Prisma.sql`AND EXTRACT(MONTH FROM e."startDate") = ${dateInfo.month}`
                : Prisma.empty
            }
            ${
              dateInfo.day
                ? Prisma.sql`AND EXTRACT(DAY FROM e."startDate") = ${dateInfo.day}`
                : Prisma.empty
            }
          )`
              : Prisma.empty
          }
        ),
        -- Specific check for artist + month-day combinations (e.g., Phish 12/31)
        artist_month_day_matches AS (
          SELECT 
            a."posterId",
            a.artist_name,
            e.event_month,
            e.event_day,
            e.event_date,
            a.artist_similarity,
            e.month_match,
            e.day_match
          FROM artist_search a
          JOIN event_search e ON a."posterId" = e."posterId"
          WHERE ${isMonthDaySearch ? true : false}
            AND a.artist_similarity >= ${artistSimilarityThreshold}
            AND e.month_match = true
            AND e.day_match = true
        ),
        -- Specific check for artist+year combinations
        artist_year_matches AS (
          SELECT 
            a."posterId",
            a.artist_name,
            e.event_date,
            a.artist_similarity,
            e.event_similarity,
            e.year_match
          FROM artist_search a
          JOIN event_search e ON a."posterId" = e."posterId"
          WHERE ${dateInfo.hasDate && dateInfo.year ? true : false}
            AND a.artist_similarity >= ${artistSimilarityThreshold}
            AND e.year_match = true
            ${
              dateInfo.month
                ? Prisma.sql`AND e.month_match = true`
                : Prisma.empty
            }
            ${dateInfo.day ? Prisma.sql`AND e.day_match = true` : Prisma.empty}
        ),
        -- Combined scoring with AND logic for multi-part searches
        combined_scores AS (
          SELECT 
            ps.id as "posterId",
            COALESCE(a.artist_similarity, 0) as artist_similarity,
            COALESCE(v.venue_similarity, 0) as venue_similarity,
            COALESCE(v.exact_venue_match, 0) as exact_venue_match,
            COALESCE(e.event_similarity, 0) as event_similarity,
            COALESCE(e.year_match, false) as year_match,
            COALESCE(e.month_match, false) as month_match,
            COALESCE(e.day_match, false) as day_match,
            COALESCE(e.month_day_match, false) as month_day_match,
            COALESCE(e.exact_date_match, false) as exact_date_match,
            -- Check for month-day match with specific artist (e.g., Phish 12/31)
            (CASE WHEN EXISTS (
              SELECT 1 FROM artist_month_day_matches amdm 
              WHERE amdm."posterId" = ps.id
            ) THEN 1 ELSE 0 END) as has_artist_month_day_match,
            -- Check for month-day match (without artist or year)
            (CASE WHEN EXISTS (
              SELECT 1 FROM event_search es 
              WHERE es."posterId" = ps.id AND es.month_day_match = true
            ) THEN 1 ELSE 0 END) as has_month_day_match,
            -- Check for exact artist+year match
            (CASE WHEN EXISTS (
              SELECT 1 FROM artist_year_matches aym 
              WHERE aym."posterId" = ps.id
            ) THEN 1 ELSE 0 END) as has_artist_year_match,
            -- Check for exact date match
            (CASE WHEN EXISTS (
              SELECT 1 FROM event_search es 
              WHERE es."posterId" = ps.id AND es.exact_date_match = true
            ) THEN 1 ELSE 0 END) as has_exact_date_match,
            CASE
              -- Special case for artist + month-day search (like "Phish 12/31")
              WHEN ${isArtistMonthDaySearch ? true : false}
                   AND (
                    COALESCE(a.artist_similarity, 0) >= ${artistSimilarityThreshold}
                    AND COALESCE(e.month_match, false) = true
                    AND COALESCE(e.day_match, false) = true
                   )
              THEN 3.0
              
              -- Special case for exact date match (year + month + day)
              WHEN ${hasSpecificFullDate ? true : false}
                   AND COALESCE(e.exact_date_match, false) = true
              THEN 3.0
              
              -- Special case for artist+year searches
              WHEN ${isArtistYearSearch ? true : false}
                   AND COALESCE(a.artist_similarity, 0) >= ${artistSimilarityThreshold}
                   AND COALESCE(e.year_match, false) = true
              THEN COALESCE(a.artist_similarity, 0) * 2.5
                            
              -- Special case for venue-only searches (like "Madison Square Garden")
              WHEN ${isVenueOnlySearch ? true : false}
                   AND GREATEST(COALESCE(v.venue_similarity, 0), COALESCE(v.exact_venue_match, 0)) >= ${effectiveVenueSimilarityThreshold}
              THEN GREATEST(v.venue_similarity, v.exact_venue_match) * 2.0
              
              -- Special case for likely multi-word artist name (like "Flying Lotus")
              WHEN ${isLikelyArtistNameOnly ? true : false} 
                   AND COALESCE(a.artist_similarity, 0) >= 0.9
              THEN COALESCE(a.artist_similarity, 0) * 2.0
              
              -- If we have venue terms and artist terms, require BOTH to match (AND logic)
              WHEN ${
                potentialVenueTerms.length > 0 && isPotentialArtistVenueSearch
                  ? true
                  : false
              } 
                   AND COALESCE(a.artist_similarity, 0) >= ${artistSimilarityThreshold}
                   AND COALESCE(v.venue_similarity, 0) >= ${effectiveVenueSimilarityThreshold}
              THEN (COALESCE(a.artist_similarity, 0) + COALESCE(v.venue_similarity, 0)) * 1.5
              
              -- Individual high scores when we don't have multi-term components
              ELSE GREATEST(
                COALESCE(a.artist_similarity, 0) * 1.2,
                COALESCE(v.venue_similarity, 0) * ${
                  isVenueOnlySearch ? 1.5 : 1.0
                },
                COALESCE(v.exact_venue_match, 0) * 1.5,
                COALESCE(e.event_similarity, 0) * ${
                  dateInfo.hasDate ? 1.5 : 1.0
                },
                ps.max_poster_similarity * 0.8
              )
            END AS combined_similarity
          FROM poster_search ps
          LEFT JOIN artist_search a ON ps.id = a."posterId"
          LEFT JOIN venue_search v ON ps.id = v."posterId"
          LEFT JOIN event_search e ON ps.id = e."posterId"
        ),
        -- For multi-word searches, require all parts to match
        multi_term_matches AS (
          SELECT 
            ps.id as "posterId",
            CASE 
              -- Special case for artist + month-day search (like "Phish 12/31")
              WHEN ${isArtistMonthDaySearch ? true : false}
                   AND (
                    COALESCE(a.artist_similarity, 0) >= ${artistSimilarityThreshold}
                    AND COALESCE(e.month_match, false) = true
                    AND COALESCE(e.day_match, false) = true
                   )
              THEN true
              
              -- Special case for exact date match 
              WHEN ${hasSpecificFullDate ? true : false}
                   AND COALESCE(e.exact_date_match, false) = true
              THEN true
              
              -- Special case for artist+year searches
              WHEN ${isArtistYearSearch ? true : false}
                   AND COALESCE(a.artist_similarity, 0) >= ${artistSimilarityThreshold}
                   AND COALESCE(e.year_match, false) = true
              THEN true
              
              -- Special case for venue-only searches
              WHEN ${isVenueOnlySearch ? true : false}
                   AND GREATEST(COALESCE(v.venue_similarity, 0), COALESCE(v.exact_venue_match, 0)) >= ${effectiveVenueSimilarityThreshold}
              THEN true
            
              -- Special case for multi-word artist names like "Flying Lotus"
              WHEN ${isLikelyArtistNameOnly ? true : false} 
                   AND COALESCE(a.artist_similarity, 0) >= 0.9
              THEN true
              
              -- For multi-term venue+artist searches, prioritize posters that match ALL parts
              WHEN ${
                searchTerms.length > 1 && isPotentialArtistVenueSearch
                  ? true
                  : false
              } 
                   AND COALESCE(a.artist_similarity, 0) >= ${artistSimilarityThreshold}
                   AND COALESCE(v.venue_similarity, 0) >= ${effectiveVenueSimilarityThreshold}
              THEN true
              
              -- For date-specific searches, make sure the date matches exactly
              WHEN ${dateInfo.hasDate ? true : false}
                   AND e.event_date IS NOT NULL
                   AND e.year_match = true
                   ${
                     dateInfo.month
                       ? Prisma.sql`AND e.month_match = true`
                       : Prisma.empty
                   }
                   ${
                     dateInfo.day
                       ? Prisma.sql`AND e.day_match = true`
                       : Prisma.empty
                   }
              THEN true
              
              ELSE false
            END as matches_all_terms
          FROM poster_search ps
          LEFT JOIN artist_search a ON ps.id = a."posterId"
          LEFT JOIN venue_search v ON ps.id = v."posterId"
          LEFT JOIN event_search e ON ps.id = e."posterId"
        )
      
      SELECT DISTINCT 
        ps.id,
        GREATEST(
          ps.max_poster_similarity, 
          COALESCE(cs.combined_similarity, 0)
        ) AS overall_similarity,
        COALESCE(mtm.matches_all_terms, false) AS matches_all_terms,
        COALESCE(cs.has_artist_month_day_match, 0) as has_artist_month_day_match,
        COALESCE(cs.has_month_day_match, 0) as has_month_day_match,
        COALESCE(cs.has_artist_year_match, 0) as has_artist_year_match,
        COALESCE(cs.has_exact_date_match, 0) as has_exact_date_match
      FROM poster_search ps
      LEFT JOIN combined_scores cs ON ps.id = cs."posterId"
      LEFT JOIN multi_term_matches mtm ON ps.id = mtm."posterId"
      WHERE 
        -- Special case for artist + month/day searches (e.g., "Phish 12/31")
        (${isArtistMonthDaySearch ? true : false}
         AND (
           cs.has_artist_month_day_match = 1
           OR (
             cs.artist_similarity >= ${artistSimilarityThreshold} 
             AND cs.month_match = true 
             AND cs.day_match = true
           )
         )
         -- Ensure both the artist and date components match for artist+date searches
         AND EXISTS (
           SELECT 1 FROM artist_search a_check
           WHERE a_check."posterId" = ps.id AND a_check.artist_similarity >= ${artistSimilarityThreshold}
         ))
        OR
        -- Special case for month/day only searches (e.g., "12/31")
        (${isMonthDaySearch && !isArtistMonthDaySearch ? true : false}
         AND cs.has_month_day_match = 1)
        OR
        -- Special case for exact date match
        (${hasSpecificFullDate ? true : false}
         AND cs.has_exact_date_match = 1)
        OR
        -- Special case for artist+year searches - stricter matching for Grateful Dead 2023 etc.
        (${isArtistYearSearch ? true : false}
         AND cs.has_artist_year_match = 1)
        OR
        -- Special case for venue-only searches
        (${isVenueOnlySearch ? true : false}
         AND (cs.venue_similarity >= ${effectiveVenueSimilarityThreshold} 
              OR cs.exact_venue_match = 1))
        OR
        -- Special case for multi-word artist names (like "Flying Lotus")
        (${
          isLikelyArtistNameOnly ? true : false
        } AND cs.artist_similarity >= 0.8)
        OR
        -- For artist+venue searches (like "Grateful Dead Seattle"), require both to match
        (${
          searchTerms.length > 1 && isPotentialArtistVenueSearch ? true : false
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
      ORDER BY ${Prisma.raw(orderByClause)}
      LIMIT 50
    `
  );
}
