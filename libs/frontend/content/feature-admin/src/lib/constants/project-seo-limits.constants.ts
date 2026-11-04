/**
 * Constant PROJECT_SEO_LIMITS
 *
 * @description
 * Browser copy of `PROJECT_SEO_LIMITS` (`project-seo.contract.ts`): longest search title and
 * description the API accepts, the lengths beyond which search engines may cut them, where the
 * counters turn to a warning, and the keyword bounds (count per language, length of each keyword after
 * trimming). The browser imports no value from the contracts (D10), so this copy changes with the
 * contract.
 */
export const PROJECT_SEO_LIMITS: {
  readonly title: number;
  readonly titleWarning: number;
  readonly description: number;
  readonly descriptionWarning: number;
  readonly keywords: number;
  readonly keywordMinLength: number;
  readonly keywordMaxLength: number;
} = {
  title: 70,
  titleWarning: 60,
  description: 170,
  descriptionWarning: 155,
  keywords: 10,
  keywordMinLength: 2,
  keywordMaxLength: 40,
} as const;
