import { describe, expect, test, vi } from "vitest";
import { resolveDisplayInstant } from "../src/liveTime.js";

describe("live time mode", () => {
  test("uses the NIST-corrected current time while live", () => {
    vi.spyOn(Date, "now").mockReturnValue(2_000);
    const manualInstant = new Date(1_000);

    expect(resolveDisplayInstant({ live: true, offsetMs: 250, instant: manualInstant }).getTime()).toBe(2_250);
  });

  test("keeps the selected planning instant while not live", () => {
    vi.spyOn(Date, "now").mockReturnValue(2_000);
    const manualInstant = new Date(1_000);

    expect(resolveDisplayInstant({ live: false, offsetMs: 250, instant: manualInstant }).getTime()).toBe(1_000);
  });
});
