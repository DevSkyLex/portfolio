/**
 * Constant INBOX_READ_DELAY_MS
 *
 * @description
 * Time a received message stays on screen (reading pane or sheet) before the inbox marks it read, in
 * milliseconds. Long enough that moving through the list with J / K or the arrows passes over a
 * message without reading it, short enough that a message actually opened is read at once.
 *
 * @type {number}
 */
export const INBOX_READ_DELAY_MS = 1000 as const;
