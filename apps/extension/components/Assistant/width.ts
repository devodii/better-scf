export const WIDTH_VAR = "--bscf-assistant-width";
export const MAX_RATIO = 0.7;
export const KEY_STEP = 24;

const NARROW_QUERY = "(max-width: 63.9375rem)";
const WIDE_MIN = 400;
const NARROW_MIN = 360;

export function minWidth(): number {
  return matchMedia(NARROW_QUERY).matches ? NARROW_MIN : WIDE_MIN;
}

export function maxWidth(): number {
  return Math.max(minWidth(), Math.floor(innerWidth * MAX_RATIO));
}

export function clampWidth(width: number): number {
  return Math.round(Math.min(maxWidth(), Math.max(minWidth(), width)));
}
