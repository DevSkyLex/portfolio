import { numberAttribute } from '@angular/core';

/**
 * Function optionalNumber
 *
 * @description
 * Converts optional Signal Forms bounds to numbers while preserving an absent bound as `undefined`.
 *
 * @param {unknown} value - Raw input value supplied by Angular or Signal Forms.
 * @returns {number | undefined} Converted number, or `undefined` for an absent value.
 */
export function optionalNumber(value: unknown): number | undefined {
  return value === undefined || value === null || value === '' ? undefined : numberAttribute(value);
}

/**
 * Function decimals
 *
 * @description
 * Counts the decimal places in a number's string representation for step-grid rounding.
 *
 * @param {number} value - Number whose fractional precision is measured.
 * @returns {number} Number of characters after the decimal point.
 */
export function decimals(value: number): number {
  const [, fraction = ''] = String(value).split('.');
  return fraction.length;
}
