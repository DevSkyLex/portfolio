/**
 * Constant DIGIT_GLYPHS
 *
 * @description
 * Five-column, seven-row bitmap patterns used to render the numeric portion of each error code.
 * The template provides the accessible code through its visually hidden heading label.
 *
 * @type {Readonly<Record<string, readonly string[]>>}
 */
export const DIGIT_GLYPHS: Readonly<Record<string, readonly string[]>> = {
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  '3': ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
};
