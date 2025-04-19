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
      ORDER BY 
        -- Prioritize matches that satisfy all search components
        matches_all_terms DESC,
        overall_similarity DESC
      LIMIT 50
    `
  );
}
