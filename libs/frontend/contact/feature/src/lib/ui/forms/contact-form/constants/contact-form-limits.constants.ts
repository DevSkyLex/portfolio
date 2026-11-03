/**
 * Constant CONTACT_FORM_LIMITS
 *
 * @description
 * Browser-side bounds for the contact request, aligned with the shared contract so the public
 * bundle does not load Zod; field-level tests exercise these public bounds.
 *
 * @type {{ readonly name: 100; readonly company: 120; readonly email: 254; readonly messageMin: 20; readonly messageMax: 2000 }}
 */
export const CONTACT_FORM_LIMITS = {
  name: 100,
  company: 120,
  email: 254,
  messageMin: 20,
  messageMax: 2000,
} as const;
