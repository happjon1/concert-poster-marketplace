import { describe, expect, test } from "vitest";
import { extractDateInfo } from "../src/fuzzy-poster-search/extract-date-info";

describe("extractDateInfo Integration Tests", () => {
  // Test basic year extraction
  test("should extract year correctly", () => {
    const result = extractDateInfo("Phish 2023 poster");

    expect(result.hasDate).toBe(true);
    expect(result.year).toBe(2023);
    expect(result.month).toBeNull();
    expect(result.day).toBeNull();
    expect(result.searchWithoutDate).toBe("Phish poster");
    expect(result.startDate).toBeInstanceOf(Date);
    expect(result.startDate?.getFullYear()).toBe(2023);
  });

  // Test no date found
  test("should handle strings with no date information", () => {
    const result = extractDateInfo("Grateful Dead poster");

    expect(result.hasDate).toBe(false);
    expect(result.year).toBeNull();
    expect(result.month).toBeNull();
    expect(result.day).toBeNull();
    expect(result.searchWithoutDate).toBe("Grateful Dead poster");
    expect(result.startDate).toBeNull();
  });

  // Test with year in the middle of a string
  test("should extract year when it's in the middle of the string", () => {
    const result = extractDateInfo("Pearl Jam 2024 MSG");

    expect(result.hasDate).toBe(true);
    expect(result.year).toBe(2024);
    expect(result.searchWithoutDate).toBe("Pearl Jam MSG");
    expect(result.startDate).toBeInstanceOf(Date);
    expect(result.startDate?.getFullYear()).toBe(2024);
  });

  // Test years from 1900s
  test("should extract 1900s years correctly", () => {
    const result = extractDateInfo("Grateful Dead 1977 Cornell");

    expect(result.hasDate).toBe(true);
    expect(result.year).toBe(1977);
    expect(result.searchWithoutDate).toBe("Grateful Dead Cornell");
    expect(result.startDate).toBeInstanceOf(Date);
    expect(result.startDate?.getFullYear()).toBe(1977);
  });

  // Test multiple years - should pick the first one and remove all years
  test("should extract the first year when multiple years are present and remove all years", () => {
    const result = extractDateInfo("Phish 1995 1996 1997");

    expect(result.hasDate).toBe(true);
    expect(result.year).toBe(1995);
    expect(result.searchWithoutDate).toBe("Phish");
    expect(result.startDate).toBeInstanceOf(Date);
    expect(result.startDate?.getFullYear()).toBe(1995);
  });

  // Test month extraction
  test("should extract month name correctly", () => {
    const result = extractDateInfo("Pink Floyd August poster");

    expect(result.hasDate).toBe(true);
    expect(result.year).toBeNull();
    expect(result.month).toBe(7); // August is index 7 (0-based index)
    expect(result.searchWithoutDate).toBe("Pink Floyd poster");
    expect(result.startDate).toBeInstanceOf(Date);
    expect(result.startDate?.getMonth()).toBe(7);
  });

  // Test month extraction with different casing
  test("should extract month name regardless of case", () => {
    const result = extractDateInfo("Pink Floyd JANUARY poster");

    expect(result.hasDate).toBe(true);
    expect(result.year).toBeNull();
    expect(result.month).toBe(0); // January is index 0 (0-based index)
    expect(result.searchWithoutDate).toBe("Pink Floyd poster");
    expect(result.startDate).toBeInstanceOf(Date);
    expect(result.startDate?.getMonth()).toBe(0);
  });

  // Test both year and month extraction
  test("should extract both year and month when present", () => {
    const result = extractDateInfo("Red Hot Chili Peppers December 2022");

    expect(result.hasDate).toBe(true);
    expect(result.year).toBe(2022);
    expect(result.month).toBe(11); // December is index 11 (0-based index)
    expect(result.searchWithoutDate).toBe("Red Hot Chili Peppers");
    expect(result.startDate).toBeInstanceOf(Date);
    expect(result.startDate?.getFullYear()).toBe(2022);
    expect(result.startDate?.getMonth()).toBe(11);
  });

  // Test that month at word boundary is detected
  test("should detect month at word boundary", () => {
    const result = extractDateInfo("Phish July New York");

    expect(result.hasDate).toBe(true);
    expect(result.month).toBe(6); // July is index 6 (0-based index)
    expect(result.searchWithoutDate).toBe("Phish New York");
    expect(result.startDate).toBeInstanceOf(Date);
    expect(result.startDate?.getMonth()).toBe(6);
  });

  // Test that substring month is not incorrectly detected
  test("should not detect month as part of another word", () => {
    const result = extractDateInfo("Phish decemberfest");

    expect(result.hasDate).toBe(false);
    expect(result.month).toBeNull();
    expect(result.searchWithoutDate).toBe("Phish decemberfest");
  });

  // Test with invalid year format
  test("should not extract invalid year formats", () => {
    const result = extractDateInfo("Phish 202");

    expect(result.hasDate).toBe(false);
    expect(result.year).toBeNull();
    expect(result.searchWithoutDate).toBe("Phish 202");
  });

  // Test with year outside valid range
  test("should not extract years outside 19xx or 20xx format", () => {
    const result = extractDateInfo("Phish 2134 show");

    expect(result.hasDate).toBe(false);
    expect(result.year).toBeNull();
    expect(result.searchWithoutDate).toBe("Phish 2134 show");
  });

  // Test with year that's part of a longer number
  test("should not extract years that are part of longer numbers", () => {
    const result = extractDateInfo("Phish 20230 poster");

    expect(result.hasDate).toBe(false);
    expect(result.year).toBeNull();
    expect(result.searchWithoutDate).toBe("Phish 20230 poster");
  });

  // Test with complex mixed search term
  test("should extract date from complex search terms", () => {
    const result = extractDateInfo(
      "Red Hot Chili Peppers March 2024 Los Angeles Poster"
    );

    expect(result.hasDate).toBe(true);
    expect(result.year).toBe(2024);
    expect(result.month).toBe(2); // March is index 2 (0-based index)
    expect(result.searchWithoutDate).toBe(
      "Red Hot Chili Peppers Los Angeles Poster"
    );
    expect(result.startDate).toBeInstanceOf(Date);
    expect(result.startDate?.getFullYear()).toBe(2024);
    expect(result.startDate?.getMonth()).toBe(2);
  });

  // === NEW TESTS FOR CHRONO NATURAL LANGUAGE PARSING ===

  // Test natural language relative dates
  test("should parse natural language relative dates", () => {
    const result = extractDateInfo("Phish next month concert");

    expect(result.hasDate).toBe(true);
    expect(result.searchWithoutDate).toBe("Phish concert");
    expect(result.startDate).toBeInstanceOf(Date);
    // We can't test the exact date since it depends on when the test runs
    // but we can verify it extracted something
    expect(result.dateText).toBe("next month");
  });

  // Test natural language date ranges - using a simpler case that chrono handles reliably
  test("should parse date ranges", () => {
    // We'll use a format that is more reliably parsed by chrono
    const result = extractDateInfo("Phish from June 2025 to August 2025");

    expect(result.hasDate).toBe(true);
    expect(result.isDateRange).toBe(true);
    expect(result.startDate).toBeInstanceOf(Date);
    expect(result.endDate).toBeInstanceOf(Date);
    expect(result.searchWithoutDate).toBe("Phish");
    expect(result.month).toBe(5); // June is index 5
  });

  // Test specific date formats
  test("should parse specific date formats", () => {
    const result = extractDateInfo("Phish on 6/15/2024");

    expect(result.hasDate).toBe(true);
    expect(result.year).toBe(2024);
    expect(result.month).toBe(5); // June is index 5
    expect(result.day).toBe(15);
    expect(result.searchWithoutDate).toBe("Phish on");
    expect(result.startDate).toBeInstanceOf(Date);
  });

  // Test spelled out dates
  test("should parse spelled out dates", () => {
    const result = extractDateInfo(
      "Phish on June fifteenth twenty twenty-four"
    );

    expect(result.hasDate).toBe(true);
    expect(result.searchWithoutDate).not.toContain("June");
    expect(result.searchWithoutDate).not.toContain("fifteenth");
    expect(result.startDate).toBeInstanceOf(Date);
  });

  // Test complex date descriptions - using a more specific format for the test
  test("should parse complex date descriptions", () => {
    // Using a more specific April weekend reference that chrono can reliably detect
    const result = extractDateInfo("Phish concert April 2025 weekend");

    expect(result.hasDate).toBe(true);
    expect(result.month).toBe(3); // April is index 3
    expect(result.searchWithoutDate).toBe("Phish concert weekend");
    expect(result.startDate).toBeInstanceOf(Date);
    expect(result.startDate?.getMonth()).toBe(3);
  });
});
