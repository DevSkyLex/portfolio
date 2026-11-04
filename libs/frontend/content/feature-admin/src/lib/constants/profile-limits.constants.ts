/**
 * Constant PROFILE_LIMITS
 *
 * @description
 * Browser copy of the profile bounds of the content contracts (`PROFILE_LIMITS`, D10): longest
 * trimmed text per locale, largest lists, longest link address and label, and the address patterns
 * the service checks (an e-mail is typed without `mailto:`, added when saving).
 */
export const PROFILE_LIMITS: {
  readonly heroIntro: 240;
  readonly aboutStatement: 280;
  readonly aboutLead: 600;
  readonly facts: 8;
  readonly factLabel: 40;
  readonly factValue: 120;
  readonly links: 8;
  readonly linkUrl: 300;
  readonly linkLabel: 40;
  readonly email: RegExp;
  readonly https: RegExp;
} = {
  heroIntro: 240,
  aboutStatement: 280,
  aboutLead: 600,
  facts: 8,
  factLabel: 40,
  factValue: 120,
  links: 8,
  linkUrl: 300,
  linkLabel: 40,
  email: /^[^@\s/?#]+@[^@\s/?#]+\.[^@\s/?#]+$/,
  https: /^https:\/\/[^\s/?#]+\.[^\s/?#]+(?:[/?#]\S*)?$/,
};
