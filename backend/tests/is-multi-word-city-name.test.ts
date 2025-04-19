// filepath: /Users/jonathanhapp/Documents/GitHub/concert-poster-marketplace/backend/tests/is-multi-word-city-name.test.ts
import { describe, expect, test } from "vitest";
import { isMultiWordCityName } from "../src/fuzzy-poster-search/is-multi-word-city-name";
import { MULTI_WORD_CITIES } from "../src/fuzzy-poster-search/fuzzy-search-constants";

describe("isMultiWordCityName", () => {
  // Test exact matches
  test("should return true for exact multi-word city matches", () => {
    expect(isMultiWordCityName("New York")).toBe(true);
    expect(isMultiWordCityName("Los Angeles")).toBe(true);
    expect(isMultiWordCityName("San Francisco")).toBe(true);
    expect(isMultiWordCityName("Las Vegas")).toBe(true);
  });

  // Test case insensitivity
  test("should be case-insensitive", () => {
    expect(isMultiWordCityName("new york")).toBe(true);
    expect(isMultiWordCityName("NEW YORK")).toBe(true);
    expect(isMultiWordCityName("New york")).toBe(true);
    expect(isMultiWordCityName("nEw YoRk")).toBe(true);
  });

  // Test city names with additional words at the beginning
  test("should return true when city name is included with words before it", () => {
    expect(isMultiWordCityName("downtown new york")).toBe(true);
    expect(isMultiWordCityName("visiting los angeles")).toBe(true);
    expect(isMultiWordCityName("beautiful san francisco")).toBe(true);
  });

  // Test city names with additional words at the end
  test("should return true when city name is included with words after it", () => {
    expect(isMultiWordCityName("new york city")).toBe(true);
    expect(isMultiWordCityName("los angeles concert")).toBe(true);
    expect(isMultiWordCityName("san francisco bay area")).toBe(true);
  });

  // Test city names with additional words on both sides
  test("should return true when city name is surrounded by other words", () => {
    expect(isMultiWordCityName("visit new york tonight")).toBe(true);
    expect(isMultiWordCityName("beautiful los angeles weather")).toBe(true);
    expect(isMultiWordCityName("exploring san francisco area")).toBe(true);
  });

  // Test non-multi-word cities
  test("should return false for single word cities", () => {
    expect(isMultiWordCityName("Chicago")).toBe(false);
    expect(isMultiWordCityName("Boston")).toBe(false);
    expect(isMultiWordCityName("Seattle")).toBe(false);
  });

  // Test non-city terms
  test("should return false for non-city terms", () => {
    expect(isMultiWordCityName("concert poster")).toBe(false);
    expect(isMultiWordCityName("pearl jam")).toBe(false);
    expect(isMultiWordCityName("2023 tour")).toBe(false);
  });

  // Test partial matches that shouldn't match
  test("should return false for partial city name matches", () => {
    expect(isMultiWordCityName("new")).toBe(false);
    expect(isMultiWordCityName("san")).toBe(false);
    expect(isMultiWordCityName("york city")).toBe(false);
  });

  // Test random sample from the MULTI_WORD_CITIES list
  test("should detect other cities from the MULTI_WORD_CITIES list", () => {
    // Select a few random cities from the list to test
    const sampleCities = [
      "santa fe",
      "salt lake city",
      "cedar rapids",
      "st. louis",
      "jersey city",
    ];

    for (const city of sampleCities) {
      expect(isMultiWordCityName(city)).toBe(true);
      expect(isMultiWordCityName(city.toUpperCase())).toBe(true);
      expect(isMultiWordCityName(`visit ${city}`)).toBe(true);
      expect(isMultiWordCityName(`${city} area`)).toBe(true);
    }
  });

  // Edge cases
  test("should handle edge cases properly", () => {
    expect(isMultiWordCityName("")).toBe(false);
    expect(isMultiWordCityName(" ")).toBe(false);

    // This tests that our function correctly identifies when a city name
    // is part of a larger word (should return false)
    expect(isMultiWordCityName("newest york reporter")).toBe(false); // "new" is part of "newest", should NOT match
    expect(isMultiWordCityName("losangelestimes")).toBe(false); // No space, not "los angeles"
  });
});
