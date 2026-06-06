export function resolveDisplayInstant({ live, instant }) {
  return live ? new Date() : instant;
}
