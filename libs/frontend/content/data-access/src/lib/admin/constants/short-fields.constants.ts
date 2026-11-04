/**
 * Constant SHORT_FIELDS
 *
 * @description
 * Project fields serialized as single localized values, as opposed to the article documents.
 *
 * @type {readonly ['title', 'summary', 'lead', 'client', 'role', 'place']}
 */
export const SHORT_FIELDS: readonly ['title', 'summary', 'lead', 'client', 'role', 'place'] = [
  'title',
  'summary',
  'lead',
  'client',
  'role',
  'place',
] as const;
