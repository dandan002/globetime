import { describe, expect, test } from "vitest";
import {
  createNtpRequestPacket,
  parseNtpResponse,
  timestampToNtp,
} from "../server/nistTime.js";

describe("NIST time client", () => {
  test("creates a valid client-mode NTP request packet", () => {
    const packet = createNtpRequestPacket();

    expect(packet).toHaveLength(48);
    expect(packet[0]).toBe(0x1b);
  });

  test("parses an NTP response and computes corrected time", () => {
    const requestSentAt = Date.UTC(2026, 5, 5, 12, 0, 0, 0);
    const responseReceivedAt = requestSentAt + 100;
    const serverReceiveAt = requestSentAt + 40;
    const serverTransmitAt = requestSentAt + 60;
    const packet = Buffer.alloc(48);
    const receive = timestampToNtp(serverReceiveAt);
    const transmit = timestampToNtp(serverTransmitAt);

    packet.writeUInt32BE(receive.seconds, 32);
    packet.writeUInt32BE(receive.fraction, 36);
    packet.writeUInt32BE(transmit.seconds, 40);
    packet.writeUInt32BE(transmit.fraction, 44);

    const result = parseNtpResponse(packet, requestSentAt, responseReceivedAt);

    expect(result.transmitUnixMs).toBe(serverTransmitAt);
    expect(result.roundTripMs).toBe(80);
    expect(result.offsetMs).toBe(0);
    expect(result.unixMs).toBe(responseReceivedAt);
  });
});
