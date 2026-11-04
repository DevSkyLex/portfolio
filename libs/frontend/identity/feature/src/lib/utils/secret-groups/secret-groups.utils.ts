/**
 * Function toSecretGroups
 *
 * @description
 * Splits a Base32 secret into groups of four characters for manual entry in an authenticator; the
 * copied value stays the ungrouped secret.
 *
 * @param {string} secret - Base32 secret of the pending enrollment.
 *
 * @returns {readonly string[]} Groups of four characters, the last one possibly shorter.
 */
export function toSecretGroups(secret: string): readonly string[] {
  return secret.match(/.{1,4}/g) ?? [];
}
