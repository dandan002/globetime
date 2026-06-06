import { describe, expect, test, vi } from "vitest";
import { correctedNow, fetchNistTime } from "../src/nistTime.js";

describe("client NIST sync", () => {
  test("derives a client clock offset from the NIST API response", async () => {
    vi.spyOn(Date, "now")
      .mockReturnValueOnce(1_000)
      .mockReturnValueOnce(1_100);

    const result = await fetchNistTime(async () => ({
      ok: true,
      json: async () => ({
        ok: true,
        unixMs: 2_000,
        source: "time.nist.gov",
        protocol: "NTP",
      }),
    }));

    expect(result.clientOffsetMs).toBe(950);
    expect(result.clientRoundTripMs).toBe(100);
  });

  test("returns corrected current time using the synced offset", () => {
    vi.spyOn(Date, "now").mockReturnValue(1_000);

    expect(correctedNow(250).toISOString()).toBe("1970-01-01T00:00:01.250Z");
  });
});
