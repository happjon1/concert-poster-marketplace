// filepath: /Users/jonathanhapp/Documents/GitHub/concert-poster-marketplace/backend/tests/validate-and-clean-search-term.test.ts
import { describe, expect, test } from "vitest";
import { validateAndCleanSearchTerm } from "../src/fuzzy-poster-search/validate-and-clean-search-term";

describe("validateAndCleanSearchTerm", () => {
  // Test valid search terms
  test("should return trimmed valid search term", () => {
    expect(validateAndCleanSearchTerm("Phish")).toBe("Phish");
    expect(validateAndCleanSearchTerm(" Pearl Jam ")).toBe("Pearl Jam");
    expect(validateAndCleanSearchTerm("  Red Hot Chili Peppers  ")).toBe(
      "Red Hot Chili Peppers"
    );
  });

  // Test trimming behavior
  test("should trim whitespace from search term", () => {
    expect(validateAndCleanSearchTerm("  Testing  ")).toBe("Testing");
    expect(validateAndCleanSearchTerm("\tGrateful Dead\n")).toBe(
      "Grateful Dead"
    );
    expect(validateAndCleanSearchTerm(" AC/DC ")).toBe("AC/DC");
  });

  // Test invalid search terms
  test("should return null for null or undefined input", () => {
    expect(validateAndCleanSearchTerm(null as unknown as string)).toBeNull();
    expect(
      validateAndCleanSearchTerm(undefined as unknown as string)
    ).toBeNull();
  });

  // Test empty search terms
  test("should return null for empty or whitespace-only string", () => {
    expect(validateAndCleanSearchTerm("")).toBeNull();
    expect(validateAndCleanSearchTerm(" ")).toBeNull();
    expect(validateAndCleanSearchTerm("   ")).toBeNull();
    expect(validateAndCleanSearchTerm("\t\n")).toBeNull();
  });

  // Test minimum length requirement
  test("should return null for search terms with less than 2 characters", () => {
    expect(validateAndCleanSearchTerm("a")).toBeNull();
    expect(validateAndCleanSearchTerm(" b ")).toBeNull();
  });

  // Test edge cases
  test("should handle edge cases correctly", () => {
    expect(validateAndCleanSearchTerm("ab")).toBe("ab"); // Exactly 2 characters (minimum valid length)
    expect(validateAndCleanSearchTerm("  cd  ")).toBe("cd"); // 2 characters with whitespace
    expect(validateAndCleanSearchTerm("123")).toBe("123"); // Numeric input
    expect(validateAndCleanSearchTerm("!@#")).toBe("!@#"); // Special characters
  });

  // Test real-world search scenarios
  test("should handle realistic search terms", () => {
    expect(validateAndCleanSearchTerm("Phish 2023")).toBe("Phish 2023");
    expect(validateAndCleanSearchTerm("Madison Square Garden")).toBe(
      "Madison Square Garden"
    );
    expect(validateAndCleanSearchTerm("Red Rocks 05/15/2024")).toBe(
      "Red Rocks 05/15/2024"
    );
    expect(validateAndCleanSearchTerm("Mint condition 18x24")).toBe(
      "Mint condition 18x24"
    );
  });
});
