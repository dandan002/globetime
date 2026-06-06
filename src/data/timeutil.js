const formatterCache = new Map();
const abbrevCache = new Map();

function partsFormatter(timeZone) {
  if (!formatterCache.has(timeZone)) {
    formatterCache.set(
      timeZone,
      new Intl.DateTimeFormat("en-US", {
        timeZone,
        hour12: false,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        weekday: "short",
      }),
    );
  }
  return formatterCache.get(timeZone);
}

function abbrevFormatter(timeZone) {
  if (!abbrevCache.has(timeZone)) {
    abbrevCache.set(
      timeZone,
      new Intl.DateTimeFormat("en-US", {
        timeZone,
        timeZoneName: "short",
        hour: "2-digit",
      }),
    );
  }
  return abbrevCache.get(timeZone);
}

export function localParts(timeZone, instant) {
  const parts = partsFormatter(timeZone).formatToParts(instant);
  const values = {};

  for (const part of parts) {
    if (part.type !== "literal") values[part.type] = part.value;
  }

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour) % 24,
    minute: Number(values.minute),
    second: Number(values.second),
    weekday: values.weekday,
  };
}

export function offsetMinutes(timeZone, instant) {
  const parts = localParts(timeZone, instant);
  const localAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  return Math.round((localAsUtc - instant.getTime()) / 60000);
}

export function wallToInstant(timeZone, year, month, day, hour, minute) {
  const wallAsUtc = Date.UTC(year, month - 1, day, hour, minute, 0);
  const firstOffset = offsetMinutes(timeZone, new Date(wallAsUtc));
  let instant = wallAsUtc - firstOffset * 60000;
  const resolvedOffset = offsetMinutes(timeZone, new Date(instant));

  if (resolvedOffset !== firstOffset) {
    instant = wallAsUtc - resolvedOffset * 60000;
  }

  return new Date(instant);
}

export function abbrev(timeZone, instant) {
  const parts = abbrevFormatter(timeZone).formatToParts(instant);
  const name = parts.find((part) => part.type === "timeZoneName");
  return name ? name.value : "";
}

export function offsetLabel(timeZone, instant) {
  const minutes = offsetMinutes(timeZone, instant);
  const sign = minutes < 0 ? "-" : "+";
  const absolute = Math.abs(minutes);
  const hours = Math.floor(absolute / 60);
  const remainder = absolute % 60;

  return `UTC${sign}${hours}${remainder ? `:${pad2(remainder)}` : ""}`;
}

export function subsolarPoint(instant) {
  const yearStart = Date.UTC(instant.getUTCFullYear(), 0, 0);
  const dayOfYear = Math.floor((instant.getTime() - yearStart) / 86400000);
  const utcHours =
    instant.getUTCHours() +
    instant.getUTCMinutes() / 60 +
    instant.getUTCSeconds() / 3600;
  const declination = -23.44 * Math.cos((2 * Math.PI * (dayOfYear + 10)) / 365);
  const b = (2 * Math.PI * (dayOfYear - 81)) / 364;
  const equationOfTime =
    9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);
  const solarHours = utcHours + equationOfTime / 60;
  const longitude = -15 * (solarHours - 12);

  return {
    lat: declination,
    lon: ((((longitude + 180) % 360) + 360) % 360) - 180,
  };
}

export function pad2(value) {
  return String(value).padStart(2, "0");
}

export function formatTime(timeZone, instant, hour12) {
  const parts = localParts(timeZone, instant);

  if (hour12) {
    const hour = parts.hour % 12 || 12;
    return {
      main: `${hour}:${pad2(parts.minute)}`,
      suffix: parts.hour < 12 ? "AM" : "PM",
    };
  }

  return {
    main: `${pad2(parts.hour)}:${pad2(parts.minute)}`,
    suffix: "",
  };
}

export const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const MO = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function formatDateShort(timeZone, instant) {
  const parts = localParts(timeZone, instant);
  return {
    weekday: parts.weekday,
    month: MO[parts.month - 1],
    day: parts.day,
    year: parts.year,
  };
}

export function dayDelta(timeZone, instant, referenceTimeZone) {
  const city = localParts(timeZone, instant);
  const reference = localParts(referenceTimeZone, instant);
  const cityDate = Date.UTC(city.year, city.month - 1, city.day);
  const referenceDate = Date.UTC(reference.year, reference.month - 1, reference.day);
  return Math.round((cityDate - referenceDate) / 86400000);
}

export function minutesOfDay(timeZone, instant) {
  const parts = localParts(timeZone, instant);
  return parts.hour * 60 + parts.minute;
}

export const TimeUtil = {
  localParts,
  offsetMinutes,
  wallToInstant,
  abbrev,
  offsetLabel,
  subsolarPoint,
  formatTime,
  formatDateShort,
  dayDelta,
  minutesOfDay,
  WD,
  MO,
  pad2,
};
