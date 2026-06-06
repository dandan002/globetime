const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;
const EPSILON = 1e-9;

function isValidCoord(coord) {
  return (
    Array.isArray(coord) &&
    coord.length >= 2 &&
    Number.isFinite(coord[0]) &&
    Number.isFinite(coord[1])
  );
}

function angularDistanceDeg(a, b) {
  const lon1 = a[0] * RAD;
  const lat1 = a[1] * RAD;
  const lon2 = b[0] * RAD;
  const lat2 = b[1] * RAD;
  const dLon = lon2 - lon1;
  const dLat = lat2 - lat1;
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const h =
    sinLat * sinLat +
    Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon;

  return 2 * Math.asin(Math.min(1, Math.sqrt(h))) * DEG;
}

function interpolateCoord(a, b, t) {
  let dLon = b[0] - a[0];
  if (dLon > 180) dLon -= 360;
  if (dLon < -180) dLon += 360;

  return [
    normalizeLon(roundCoord(a[0] + dLon * t)),
    roundCoord(a[1] + (b[1] - a[1]) * t),
  ];
}

function roundCoord(value) {
  return Math.round(value * 1e6) / 1e6;
}

function normalizeLon(value) {
  if (value > 180) return roundCoord(value - 360);
  if (value < -180) return roundCoord(value + 360);
  return Object.is(value, -0) ? 0 : value;
}

export function sampleBorderLineSegments(borderLines, maxSegmentDeg = 0.8) {
  const segments = [];

  if (!Array.isArray(borderLines) || maxSegmentDeg <= 0) return segments;

  for (const line of borderLines) {
    if (!Array.isArray(line) || line.length < 2) continue;
    if (!line.every(isValidCoord)) continue;

    for (let i = 1; i < line.length; i++) {
      const start = line[i - 1];
      const end = line[i];
      const segmentLength = angularDistanceDeg(start, end);

      if (segmentLength <= EPSILON) continue;

      let previous = [roundCoord(start[0]), roundCoord(start[1])];
      let traveled = maxSegmentDeg;

      while (traveled < segmentLength - EPSILON) {
        const next = interpolateCoord(start, end, traveled / segmentLength);
        segments.push(previous, next);
        previous = next;
        traveled += maxSegmentDeg;
      }

      segments.push(previous, interpolateCoord(start, end, 1));
    }
  }

  return segments;
}
