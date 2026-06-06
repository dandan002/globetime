import { describe, expect, test, vi, afterEach } from "vitest";
import { resolveDisplayInstant } from "../src/liveTime.js";

describe("live time mode", () => {
  afterEach(() => vi.useRealTimers());

  test("uses the current local time while live", () => {
    vi.useFakeTimers({ now: new Date(2_000) });
    const manualInstant = new Date(1_000);

    expect(resolveDisplayInstant({ live: true, instant: manualInstant }).getTime()).toBe(2_000);
  });

  test("keeps the selected planning instant while not live", () => {
    vi.useFakeTimers({ now: new Date(2_000) });
    const manualInstant = new Date(1_000);

    expect(resolveDisplayInstant({ live: false, instant: manualInstant }).getTime()).toBe(1_000);
  });
});
