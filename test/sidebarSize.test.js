import { describe, expect, test } from "vitest";
import { clampSidebarWidth, parseStoredSidebarWidth } from "../src/sidebarSize.js";

describe("sidebar sizing", () => {
  test("clamps sidebar width to usable desktop bounds", () => {
    expect(clampSidebarWidth(200, 1200)).toBe(320);
    expect(clampSidebarWidth(480, 1200)).toBe(480);
    expect(clampSidebarWidth(900, 1200)).toBe(620);
  });

  test("uses a fallback when stored width is invalid", () => {
    expect(parseStoredSidebarWidth("420", 1200)).toBe(420);
    expect(parseStoredSidebarWidth("bad", 1200)).toBe(372);
  });
});
