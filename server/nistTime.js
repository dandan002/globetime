import dgram from "node:dgram";

const NTP_EPOCH_OFFSET_SECONDS = 2_208_988_800;
const NTP_PACKET_SIZE = 48;
const DEFAULT_TIMEOUT_MS = 2500;

export function createNtpRequestPacket() {
  const packet = Buffer.alloc(NTP_PACKET_SIZE);
  packet[0] = 0x1b;
  return packet;
}

export function timestampToNtp(unixMs) {
  const seconds = Math.floor(unixMs / 1000) + NTP_EPOCH_OFFSET_SECONDS;
  const fraction = Math.round(((unixMs % 1000) / 1000) * 2 ** 32);
  return { seconds, fraction };
}

function ntpToUnixMs(seconds, fraction) {
  return Math.round(
    (seconds - NTP_EPOCH_OFFSET_SECONDS) * 1000 + (fraction / 2 ** 32) * 1000,
  );
}

function readTimestamp(packet, offset) {
  return ntpToUnixMs(packet.readUInt32BE(offset), packet.readUInt32BE(offset + 4));
}

export function parseNtpResponse(packet, requestSentAt, responseReceivedAt) {
  if (!Buffer.isBuffer(packet) || packet.length < NTP_PACKET_SIZE) {
    throw new Error("Invalid NTP response packet");
  }

  const receiveUnixMs = readTimestamp(packet, 32);
  const transmitUnixMs = readTimestamp(packet, 40);
  const roundTripMs =
    responseReceivedAt - requestSentAt - (transmitUnixMs - receiveUnixMs);
  const offsetMs =
    ((receiveUnixMs - requestSentAt) + (transmitUnixMs - responseReceivedAt)) / 2;

  return {
    unixMs: Math.round(responseReceivedAt + offsetMs),
    transmitUnixMs,
    receiveUnixMs,
    offsetMs: Math.round(offsetMs),
    roundTripMs: Math.max(0, Math.round(roundTripMs)),
  };
}

export function getNistTime({
  host = "time.nist.gov",
  port = 123,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  socketFactory = () => dgram.createSocket("udp4"),
} = {}) {
  return new Promise((resolve, reject) => {
    const socket = socketFactory();
    const packet = createNtpRequestPacket();
    const requestSentAt = Date.now();
    let settled = false;

    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.close?.();
      callback(value);
    };

    const timer = setTimeout(() => {
      finish(reject, new Error(`NIST time request timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    socket.once("error", (error) => finish(reject, error));
    socket.once("message", (message) => {
      try {
        const parsed = parseNtpResponse(message, requestSentAt, Date.now());
        finish(resolve, {
          ...parsed,
          source: host,
          port,
          protocol: "NTP",
          syncedAtUnixMs: Date.now(),
        });
      } catch (error) {
        finish(reject, error);
      }
    });

    socket.send(packet, 0, packet.length, port, host, (error) => {
      if (error) finish(reject, error);
    });
  });
}
