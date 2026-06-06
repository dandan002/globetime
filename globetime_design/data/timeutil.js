// Time utilities built on the Intl API. No external deps.
(function () {
  const fmtCache = {};
  function partsFmt(tz) {
    if (!fmtCache[tz]) {
      fmtCache[tz] = new Intl.DateTimeFormat("en-US", {
        timeZone: tz, hour12: false,
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", second: "2-digit",
        weekday: "short",
      });
    }
    return fmtCache[tz];
  }
  const abbrevCache = {};
  function abbrevFmt(tz) {
    if (!abbrevCache[tz]) {
      abbrevCache[tz] = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "short", hour: "2-digit" });
    }
    return abbrevCache[tz];
  }

  // Wall-clock parts for an instant in a tz.
  function localParts(tz, instant) {
    const p = partsFmt(tz).formatToParts(instant);
    const o = {};
    for (const part of p) { if (part.type !== "literal") o[part.type] = part.value; }
    return {
      year: +o.year, month: +o.month, day: +o.day,
      hour: +o.hour % 24, minute: +o.minute, second: +o.second,
      weekday: o.weekday,
    };
  }

  // Offset (minutes) such that local = UTC + offset, at a given instant in tz.
  function offsetMinutes(tz, instant) {
    const lp = localParts(tz, instant);
    const asUTC = Date.UTC(lp.year, lp.month - 1, lp.day, lp.hour, lp.minute, lp.second);
    return Math.round((asUTC - instant.getTime()) / 60000);
  }

  // Convert a wall-clock time in tz to an absolute instant (Date). Handles DST.
  function wallToInstant(tz, y, mo, d, h, mi) {
    let guess = Date.UTC(y, mo - 1, d, h, mi, 0);
    let off = offsetMinutes(tz, new Date(guess));
    let instant = guess - off * 60000;
    let off2 = offsetMinutes(tz, new Date(instant));
    if (off2 !== off) instant = guess - off2 * 60000;
    return new Date(instant);
  }

  function abbrev(tz, instant) {
    const parts = abbrevFmt(tz).formatToParts(instant);
    const tzn = parts.find((p) => p.type === "timeZoneName");
    return tzn ? tzn.value : "";
  }

  function offsetLabel(tz, instant) {
    const m = offsetMinutes(tz, instant);
    const sign = m < 0 ? "-" : "+";
    const a = Math.abs(m);
    const hh = Math.floor(a / 60);
    const mm = a % 60;
    return "UTC" + sign + hh + (mm ? ":" + String(mm).padStart(2, "0") : "");
  }

  // Subsolar point (approx) for an instant. Returns {lat, lon} degrees.
  function subsolarPoint(instant) {
    const start = Date.UTC(instant.getUTCFullYear(), 0, 0);
    const dayOfYear = Math.floor((instant.getTime() - start) / 86400000);
    const utcHours = instant.getUTCHours() + instant.getUTCMinutes() / 60 + instant.getUTCSeconds() / 3600;
    // Solar declination (deg)
    const decl = -23.44 * Math.cos((2 * Math.PI / 365) * (dayOfYear + 10));
    // Equation of time (minutes) — small correction
    const B = (2 * Math.PI / 364) * (dayOfYear - 81);
    const eot = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B); // minutes
    const solarHours = utcHours + eot / 60;
    const lon = -(solarHours - 12) * 15;
    let lonN = ((lon + 180) % 360 + 360) % 360 - 180;
    return { lat: decl, lon: lonN };
  }

  // Format helpers
  function pad2(n) { return String(n).padStart(2, "0"); }
  function formatTime(tz, instant, hour12) {
    const lp = localParts(tz, instant);
    if (hour12) {
      let h = lp.hour % 12; if (h === 0) h = 12;
      const ampm = lp.hour < 12 ? "AM" : "PM";
      return { main: h + ":" + pad2(lp.minute), suffix: ampm };
    }
    return { main: pad2(lp.hour) + ":" + pad2(lp.minute), suffix: "" };
  }

  const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const MO = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function formatDateShort(tz, instant) {
    const lp = localParts(tz, instant);
    return { weekday: lp.weekday, month: MO[lp.month - 1], day: lp.day, year: lp.year };
  }

  // Day delta of a city's local date relative to a reference city's local date.
  function dayDelta(tz, instant, refTz) {
    const a = localParts(tz, instant);
    const b = localParts(refTz, instant);
    const da = Date.UTC(a.year, a.month - 1, a.day);
    const db = Date.UTC(b.year, b.month - 1, b.day);
    return Math.round((da - db) / 86400000);
  }

  // Minutes-of-day (local) for an instant in tz.
  function minutesOfDay(tz, instant) {
    const lp = localParts(tz, instant);
    return lp.hour * 60 + lp.minute;
  }

  window.TimeUtil = {
    localParts, offsetMinutes, wallToInstant, abbrev, offsetLabel,
    subsolarPoint, formatTime, formatDateShort, dayDelta, minutesOfDay, WD, MO, pad2,
  };
})();
