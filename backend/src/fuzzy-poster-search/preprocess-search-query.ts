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
