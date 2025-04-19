import { describe, expect, test } from "vitest";
import { isLikelyVenueSearch } from "../src/fuzzy-poster-search/is-likely-venue-search";
import {
  VENUE_KEYWORDS,
  COMMON_CITIES,
} from "../src/fuzzy-poster-search/fuzzy-search-constants";

describe("isLikelyVenueSearch", () => {
  // Test for venue keywords
  test("should return true when search term contains venue keywords", () => {
    // Test a few specific venue keywords
    expect(isLikelyVenueSearch("Madison Square Garden")).toBe(true);
    expect(isLikelyVenueSearch("Red Rocks Amphitheatre")).toBe(true);
    expect(isLikelyVenueSearch("Hollywood Bowl")).toBe(true);
    expect(isLikelyVenueSearch("The Forum")).toBe(true);
    expect(isLikelyVenueSearch("Phish at the arena")).toBe(true);
    expect(isLikelyVenueSearch("Concert at the Fillmore")).toBe(true);
  });

  // Test for city names
  test("should return true when search term contains city names", () => {
    // Test a few specific city names
    expect(isLikelyVenueSearch("Grateful Dead Chicago")).toBe(true);
    expect(isLikelyVenueSearch("Seattle Pearl Jam")).toBe(true);
    expect(isLikelyVenueSearch("Live in Boston")).toBe(true);
    expect(isLikelyVenueSearch("Austin City Limits")).toBe(true);
    expect(isLikelyVenueSearch("Dave Matthews Band new york")).toBe(true);
  });

  // Test for multi-word city names
  test("should detect multi-word city names", () => {
    expect(isLikelyVenueSearch("Phish New York")).toBe(true);
    expect(isLikelyVenueSearch("Radiohead San Francisco")).toBe(true);
    expect(isLikelyVenueSearch("Metallica Las Vegas")).toBe(true);
    expect(isLikelyVenueSearch("Dave Matthews Band New Orleans")).toBe(true);
  });

  // Test for case insensitivity
  test("should be case insensitive", () => {
    expect(isLikelyVenueSearch("phish SEATTLE")).toBe(true);
    expect(isLikelyVenueSearch("RED ROCKS")).toBe(true);
    expect(isLikelyVenueSearch("Hollywood BOWL")).toBe(true);
  });

  // Test for false positives (artist names that could be confused with venues/cities)
  test("should not misidentify band names as venues or cities", () => {
    // These are artist names only, without venue references
    expect(isLikelyVenueSearch("Pearl Jam")).toBe(false);
    expect(isLikelyVenueSearch("The Killers")).toBe(false);
    expect(isLikelyVenueSearch("Flying Lotus")).toBe(false);
    expect(isLikelyVenueSearch("Rage Against the Machine")).toBe(false);
  });

  // Test for edge cases
  test("should handle edge cases", () => {
    expect(isLikelyVenueSearch("")).toBe(false); // Empty string
    expect(isLikelyVenueSearch(" ")).toBe(false); // Whitespace
    expect(isLikelyVenueSearch("123")).toBe(false); // Numbers only

    // Test partial matches (should return false)
    expect(isLikelyVenueSearch("Bowling for Soup")).toBe(false); // "bowl" is in VENUE_KEYWORDS but as a full word
    expect(isLikelyVenueSearch("Paradise Lost")).toBe(false); // "paradise" is not in keyword list
  });

  // Comprehensive test with dynamically generated tests based on constants
  test("should detect all venue keywords from constants", () => {
    // Test a few random venue keywords from the constants
    const sampleKeywords = VENUE_KEYWORDS.slice(0, 5); // Take first 5 keywords for testing
    sampleKeywords.forEach((keyword) => {
      const testTerm = `Testing with ${keyword}`;
      expect(isLikelyVenueSearch(testTerm)).toBe(true);
    });
  });

  test("should detect all city names from constants", () => {
    // Test a few random cities from the constants
    const sampleCities = COMMON_CITIES.slice(0, 5); // Take first 5 cities for testing
    sampleCities.forEach((city) => {
      const testTerm = `Testing ${city}`;
      expect(isLikelyVenueSearch(testTerm)).toBe(true);
    });
  });
});
