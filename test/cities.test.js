import { describe, expect, test } from "vitest";
import { CITIES } from "../src/data/cities.js";

describe("city catalog", () => {
  test("has enough curated cities for broad static search", () => {
    expect(CITIES.length).toBeGreaterThanOrEqual(150);
  });

  test("contains valid required fields and coordinates", () => {
    for (const city of CITIES) {
      expect(city.id).toEqual(expect.any(String));
      expect(city.id.length).toBeGreaterThan(0);
      expect(city.name).toEqual(expect.any(String));
      expect(city.name.length).toBeGreaterThan(0);
      expect(city.country).toEqual(expect.any(String));
      expect(city.country.length).toBeGreaterThan(0);
      expect(city.cc).toMatch(/^[A-Z]{2}$/);
      expect(city.tz).toEqual(expect.any(String));
      expect(Number.isFinite(city.lat)).toBe(true);
      expect(Number.isFinite(city.lon)).toBe(true);
      expect(city.lat).toBeGreaterThanOrEqual(-90);
      expect(city.lat).toBeLessThanOrEqual(90);
      expect(city.lon).toBeGreaterThanOrEqual(-180);
      expect(city.lon).toBeLessThanOrEqual(180);
    }
  });

  test("uses unique city IDs", () => {
    const ids = CITIES.map((city) => city.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("uses IANA timezones supported by Intl", () => {
    for (const city of CITIES) {
      expect(() => new Intl.DateTimeFormat("en-US", { timeZone: city.tz })).not.toThrow();
    }
  });
});
