# Expanded Static City Catalog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the bundled searchable city list while keeping the app static and API-free.

**Architecture:** Keep `src/data/cities.js` as the single source of truth for selectable locations. Add catalog tests that validate IDs, required fields, coordinates, and IANA timezone compatibility through `Intl.DateTimeFormat`.

**Tech Stack:** Vite, React, Vitest, JavaScript `Intl.DateTimeFormat`.

---

## File Structure

- Modify `src/data/cities.js`: add curated city entries using the existing `mk(name, country, cc, tz, lat, lon)` helper.
- Create `test/cities.test.js`: validate catalog integrity so added cities cannot silently break search, persistence, timezone formatting, or globe placement.

## Task 1: Catalog Validation Tests

**Files:**
- Create: `test/cities.test.js`

- [ ] **Step 1: Write the failing test**

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- cities`

Expected: FAIL because the current catalog has fewer than 150 cities.

- [ ] **Step 3: Commit tests**

```bash
git add test/cities.test.js
git commit -m "test: validate city catalog"
```

## Task 2: Expanded City Catalog

**Files:**
- Modify: `src/data/cities.js`
- Test: `test/cities.test.js`

- [ ] **Step 1: Add curated city entries**

Add enough `mk(...)` calls to bring `CITIES.length` to at least 150. Use valid IANA timezone names, finite coordinates, and ISO2 country codes.

- [ ] **Step 2: Run city catalog tests**

Run: `npm test -- cities`

Expected: PASS with 4 tests passing.

- [ ] **Step 3: Run time utility tests**

Run: `npm test -- timeutil`

Expected: PASS with existing timezone behavior unchanged.

- [ ] **Step 4: Commit catalog expansion**

```bash
git add src/data/cities.js
git commit -m "feat: expand static city catalog"
```

## Task 3: App Verification

**Files:**
- Read/verify: `src/App.jsx`
- Read/verify: `src/styles.css`

- [ ] **Step 1: Run full test suite**

Run: `npm test`

Expected: PASS.

- [ ] **Step 2: Build production bundle**

Run: `npm run build`

Expected: PASS.

- [ ] **Step 3: Manual UI spot-check**

Run: `npm run dev`

Expected: local Vite URL starts. In the browser, verify the add-city search can find at least one newly added city and adding it displays time, timezone abbreviation, UTC offset, and globe marker without layout overlap.
