import { correctedNow } from "./nistTime.js";

export function resolveDisplayInstant({ live, offsetMs, instant }) {
  return live ? correctedNow(offsetMs) : instant;
}
