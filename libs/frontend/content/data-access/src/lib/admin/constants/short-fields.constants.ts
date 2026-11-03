/**
 * Constant SHORT_FIELDS
 *
 * @description
 * Project fields serialized as single localized values rather than article paragraph arrays.
 *
 * @type {readonly ['title', 'summary', 'lead', 'periodLabel', 'client', 'role', 'place']}
 */
export const SHORT_FIELDS: readonly [
  'title',
  'summary',
  'lead',
  'periodLabel',
  'client',
  'role',
  'place',
] = ['title', 'summary', 'lead', 'periodLabel', 'client', 'role', 'place'] as const;
