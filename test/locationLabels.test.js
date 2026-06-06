import { describe, expect, test } from "vitest";
import { countryCodeLabel } from "../src/locationLabels.js";

describe("location labels", () => {
  test("uses ISO country abbreviations when present", () => {
    expect(countryCodeLabel({ country: "United States", cc: "US" })).toBe("US");
  });

  test("falls back to full country when no abbreviation is available", () => {
    expect(countryCodeLabel({ country: "Atlantis" })).toBe("Atlantis");
  });
});
