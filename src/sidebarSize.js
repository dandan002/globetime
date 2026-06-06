export const DEFAULT_SIDEBAR_WIDTH = 372;
export const MIN_SIDEBAR_WIDTH = 320;
export const MAX_SIDEBAR_WIDTH = 620;

export function clampSidebarWidth(width, viewportWidth) {
  const viewportMax = Math.max(MIN_SIDEBAR_WIDTH, Math.min(MAX_SIDEBAR_WIDTH, viewportWidth - 360));
  return Math.round(Math.max(MIN_SIDEBAR_WIDTH, Math.min(viewportMax, width)));
}

export function parseStoredSidebarWidth(value, viewportWidth) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_SIDEBAR_WIDTH;
  return clampSidebarWidth(parsed, viewportWidth);
}
