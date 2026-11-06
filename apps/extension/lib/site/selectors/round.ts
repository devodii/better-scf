export const FLIGHT_SCRIPT = "script:not([src])";
export const FLIGHT_PUSH_PREFIX = "self.__next_f.push(";
export const FLIGHT_RECORD_START = /\{"id":"rec[A-Za-z0-9]+","/g;

export const SECTION_HEADING = "h1,h2,h3,h4,h5,h6";
export const AWARDED_HEADING_TEXT = "awarded submissions";
export const RECEIVED_HEADING_TEXT = "received submissions";
export const SECTION_MAX_DEPTH = 8;

export const TOGGLE_BUTTON = "button";
export const SEE_ALL_TEXT = "see all";
export const HIDE_TEXT = "hide";

export const CARD_VIEW_BUTTON = "button";
export const CARD_VIEW_TEXT = "view";
export const CARD_TEXT = "p";
export const CARD_BYLINE_PREFIX = "By ";
export const CARD_MAX_DEPTH = 6;
export const CARD_CHIP = "div";
export const CARD_BUDGET = /^\$\s*([\d,]+(?:\.\d+)?)\s*([KkMm])?$/;

export const PHASE_TABLE = "table";
export const PHASE_HEADER_CELL = "th";
export const PHASE_HEADER_TEXTS = ["phase", "dates"] as const;
export const PHASE_ROW = "tbody tr";
export const PHASE_CELL = "td";
export const PHASE_RANGE_SEPARATOR = /\s+[-–—]\s+/;
export const PHASE_TBD = /^tbd$/i;
export const PHASE_DATE_FORMATS = [
  "MMMM D, YYYY",
  "MMM D, YYYY",
  "MMMM D YYYY",
  "MMM D YYYY",
];
