export async function fetchNistTime(fetcher = fetch) {
  const requestedAt = Date.now();
  const response = await fetcher("/api/nist-time");
  const receivedAt = Date.now();

  if (!response.ok) {
    throw new Error(`NIST sync failed with HTTP ${response.status}`);
  }

  const payload = await response.json();
  if (!payload.ok || typeof payload.unixMs !== "number") {
    throw new Error(payload.error || "NIST sync failed");
  }

  const transitMs = Math.max(0, receivedAt - requestedAt);
  return {
    ...payload,
    clientOffsetMs: Math.round(payload.unixMs + transitMs / 2 - receivedAt),
    clientRoundTripMs: transitMs,
  };
}

export function correctedNow(offsetMs = 0) {
  return new Date(Date.now() + offsetMs);
}
