export const ROUNDS_SCRIPT = 'script:not([src])';
export const ROUNDS_PUSH_PREFIX = 'self.__next_f.push(';
export const ROUNDS_RECORD_START = /\{"id":"rec[A-Za-z0-9]+","name":"SCF #/g;
export const ROUNDS_MAX_RECORD_CHARS = 65536;

export const ROUND_CARD_BUTTON = 'button';
export const ROUND_CARD_BUTTON_TEXT = 'view';
export const ROUND_CARD_NAME = 'p,span,h1,h2,h3,h4,h5,h6,div';
export const ROUND_CARD_NAME_PATTERN = /^SCF\s*#(\d+)$/i;
export const ROUND_CARD_MAX_DEPTH = 8;
