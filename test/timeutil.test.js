import { describe, expect, test } from "vitest";
import {
  dayDelta,
  formatTime,
  offsetLabel,
  wallToInstant,
} from "../src/data/timeutil.js";

describe("time utilities", () => {
  test("converts a timezone wall-clock time to one shared instant", () => {
    const instant = wallToInstant("America/New_York", 2026, 6, 5, 9, 30);

    expect(formatTime("America/New_York", instant, false)).toEqual({
      main: "09:30",
      suffix: "",
    });
    expect(formatTime("Europe/London", instant, false)).toEqual({
      main: "14:30",
      suffix: "",
    });
  });

  test("reports day deltas relative to the active city", () => {
    const instant = wallToInstant("America/New_York", 2026, 6, 5, 19, 0);

    expect(dayDelta("Asia/Tokyo", instant, "America/New_York")).toBe(1);
    expect(dayDelta("America/Los_Angeles", instant, "America/New_York")).toBe(0);
  });

  test("formats daylight-saving-aware offset labels", () => {
    const summer = new Date("2026-06-05T12:00:00.000Z");
    const winter = new Date("2026-12-05T12:00:00.000Z");

    expect(offsetLabel("America/New_York", summer)).toBe("UTC-4");
    expect(offsetLabel("America/New_York", winter)).toBe("UTC-5");
  });
});
