/**
 * Constant PROJECT_TECH_LIMITS
 *
 * @description
 * Browser copy of the `techs` rule of `ProjectRevisionRequestSchema` (`admin-project.contract.ts`):
 * at most twelve technology keys, each lowercase kebab-case. The browser imports no value from the
 * contracts (D10), so this copy changes with the contract.
 */
export const PROJECT_TECH_LIMITS: { readonly count: number; readonly key: RegExp } = {
  count: 12,
  key: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
} as const;
