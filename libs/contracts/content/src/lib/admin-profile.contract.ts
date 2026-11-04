import { z } from 'zod/mini';

/**
 * Constant PROFILE_LIMITS
 *
 * @description
 * Bounds of the profile (« Informations »), mirrored by the domain's `PROFILE_LIMITS` and by the admin
 * form's browser copy (D10): longest trimmed text per locale, largest fact and link lists, longest
 * link address and label.
 */
export const PROFILE_LIMITS = {
  heroIntro: 240,
  aboutStatement: 280,
  aboutLead: 600,
  facts: 8,
  factLabel: 40,
  factValue: 120,
  links: 8,
  linkUrl: 300,
  linkLabel: 40,
} as const;

/**
 * Constant ProfileLinkKindSchema
 *
 * @description
 * Closed set of public link kinds, each with its icon on the site: the e-mail address (`mailto:`), the
 * code and professional profiles the owner uses (GitHub, LinkedIn, Malt for freelance missions) and
 * `website` for any other `https://` page, named by its label. A closed set keeps every icon an
 * existing ng-icons glyph and the footer's ordering predictable.
 */
export const ProfileLinkKindSchema = z.enum(['email', 'github', 'linkedin', 'malt', 'website']);

/**
 * Type ProfileLinkKindDto
 * @type ProfileLinkKindDto
 *
 * @description
 * Kind of a public link.
 */
export type ProfileLinkKindDto = z.infer<typeof ProfileLinkKindSchema>;

/**
 * Constant MAILTO
 *
 * @description
 * `mailto:` followed by one address without spaces, the only target of an `email` link.
 */
const MAILTO: RegExp = /^mailto:[^@\s/?#]+@[^@\s/?#]+\.[^@\s/?#]+$/;

/**
 * Constant HTTPS
 *
 * @description
 * `https://` address with a host, the only target of the other kinds.
 */
const HTTPS: RegExp = /^https:\/\/[^\s/?#]+\.[^\s/?#]+(?:[/?#]\S*)?$/;

/**
 * Constant ProfileLinkDtoSchema
 *
 * @description
 * Public link: its kind, its trimmed address (`mailto:` for `email`, `https://` otherwise) and an
 * optional label (`null` shows the kind's name, or the address of an e-mail).
 */
export const ProfileLinkDtoSchema = z
  .object({
    kind: ProfileLinkKindSchema,
    url: z.string().check(z.trim(), z.minLength(1), z.maxLength(PROFILE_LIMITS.linkUrl)),
    label: z.nullable(z.string().check(z.trim(), z.maxLength(PROFILE_LIMITS.linkLabel))),
  })
  .check(
    z.refine(
      (link: { kind: string; url: string }): boolean =>
        link.kind === 'email' ? MAILTO.test(link.url) : HTTPS.test(link.url),
      {
        message: 'An e-mail link starts with mailto:, any other link with https://.',
        path: ['url'],
      },
    ),
  );

/**
 * Type ProfileLinkDto
 * @type ProfileLinkDto
 *
 * @description
 * Public link of the profile.
 */
export type ProfileLinkDto = z.infer<typeof ProfileLinkDtoSchema>;

/**
 * Constant HeroIntroText
 *
 * @description
 * Home introduction per locale, French required; an English text left out or blank is refused by the
 * service with `content.profile-incomplete`, since the profile is public at once. The other texts
 * follow the same rule with their own bound.
 */
const HeroIntroText = z.object({
  fr: z.string().check(z.trim(), z.minLength(1), z.maxLength(PROFILE_LIMITS.heroIntro)),
  en: z.optional(z.string().check(z.trim(), z.maxLength(PROFILE_LIMITS.heroIntro))),
});

/**
 * Constant StatementText
 *
 * @description
 * « À propos » statement per locale.
 */
const StatementText = z.object({
  fr: z.string().check(z.trim(), z.minLength(1), z.maxLength(PROFILE_LIMITS.aboutStatement)),
  en: z.optional(z.string().check(z.trim(), z.maxLength(PROFILE_LIMITS.aboutStatement))),
});

/**
 * Constant LeadText
 *
 * @description
 * « À propos » lead per locale.
 */
const LeadText = z.object({
  fr: z.string().check(z.trim(), z.minLength(1), z.maxLength(PROFILE_LIMITS.aboutLead)),
  en: z.optional(z.string().check(z.trim(), z.maxLength(PROFILE_LIMITS.aboutLead))),
});

/**
 * Constant FactLabelText
 *
 * @description
 * Label of a fact per locale.
 */
const FactLabelText = z.object({
  fr: z.string().check(z.trim(), z.minLength(1), z.maxLength(PROFILE_LIMITS.factLabel)),
  en: z.optional(z.string().check(z.trim(), z.maxLength(PROFILE_LIMITS.factLabel))),
});

/**
 * Constant FactValueText
 *
 * @description
 * Value of a fact per locale.
 */
const FactValueText = z.object({
  fr: z.string().check(z.trim(), z.minLength(1), z.maxLength(PROFILE_LIMITS.factValue)),
  en: z.optional(z.string().check(z.trim(), z.maxLength(PROFILE_LIMITS.factValue))),
});

/**
 * Constant ProfileFactDtoSchema
 *
 * @description
 * Fact of the « À propos » section: a short label and its value per locale.
 */
export const ProfileFactDtoSchema = z.object({
  label: FactLabelText,
  value: FactValueText,
});

/**
 * Type ProfileFactDto
 * @type ProfileFactDto
 *
 * @description
 * Bilingual fact.
 */
export type ProfileFactDto = z.infer<typeof ProfileFactDtoSchema>;

/**
 * Constant ProfileFields
 *
 * @description
 * Editable content of the profile, extended by the administration DTO.
 */
const ProfileFields = z.object({
  heroIntro: HeroIntroText,
  aboutStatement: StatementText,
  aboutLead: LeadText,
  facts: z.array(ProfileFactDtoSchema).check(z.maxLength(PROFILE_LIMITS.facts)),
  links: z.array(ProfileLinkDtoSchema).check(z.maxLength(PROFILE_LIMITS.links)),
});

/**
 * Constant ProfileRevisionRequestSchema
 *
 * @description
 * Body of `PUT /api/content/admin/profile`: the home introduction, the « À propos » statement, lead
 * and facts per locale, and the public links (at most one of each kind but `website`, checked by the
 * service under `links.<index>.kind`).
 */
export const ProfileRevisionRequestSchema = z.extend(ProfileFields, {});

/**
 * Type ProfileRevisionRequest
 * @type ProfileRevisionRequest
 *
 * @description
 * Validated profile content.
 */
export type ProfileRevisionRequest = z.infer<typeof ProfileRevisionRequestSchema>;

/**
 * Constant AdminProfileDtoSchema
 *
 * @description
 * Profile as the administration reads it, with its version (also its `ETag`).
 */
export const AdminProfileDtoSchema = z.extend(ProfileFields, {
  version: z.int().check(z.minimum(1)),
});

/**
 * Type AdminProfileDto
 * @type AdminProfileDto
 *
 * @description
 * Administration profile.
 */
export type AdminProfileDto = z.infer<typeof AdminProfileDtoSchema>;

/**
 * Constant PROFILE_ERROR_CODES
 *
 * @description
 * Problem codes of the profile administration besides `request.invalid` (400) and
 * `request.precondition-required` (428): a stale version (412), a missing English text and a kind
 * listed twice (422, with field `errors`).
 */
export const PROFILE_ERROR_CODES = {
  versionMismatch: 'content.version-mismatch',
  incomplete: 'content.profile-incomplete',
  invalidValue: 'content.invalid-value',
} as const;
