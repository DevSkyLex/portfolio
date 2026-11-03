/**
 * Function booleanAttribute
 *
 * @description
 * Treats an empty attribute as true while preserving explicit boolean values.
 *
 * @param {boolean | ''} value - Bound attribute value.
 *
 * @returns {boolean} Normalized boolean value.
 */
export const booleanAttribute = (value: boolean | ''): boolean => value === '' || value;
