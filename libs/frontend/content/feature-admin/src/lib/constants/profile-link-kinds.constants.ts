import type { ProfileLinkKindOption } from '@internal/content-web-feature-admin/lib/models/profile-link-kind-option/profile-link-kind-option.interface';

/**
 * Constant PROFILE_LINK_KINDS
 *
 * @description
 * Link kinds of the « Liens » section, in the contract's order; each has its icon on the site. Service
 * names are proper names; the other labels and the example addresses follow the admin's locale.
 */
export const PROFILE_LINK_KINDS: readonly ProfileLinkKindOption[] = [
  {
    value: 'email',
    label: $localize`:@@admin.profile.linkKind.email:E-mail`,
    placeholder: $localize`:@@admin.profile.linkKind.email.placeholder:contact@exemple.fr`,
  },
  {
    value: 'github',
    label: 'GitHub',
    placeholder: $localize`:@@admin.profile.linkKind.github.placeholder:https://github.com/pseudo`,
  },
  {
    value: 'linkedin',
    label: 'LinkedIn',
    placeholder: $localize`:@@admin.profile.linkKind.linkedin.placeholder:https://www.linkedin.com/in/pseudo`,
  },
  {
    value: 'malt',
    label: 'Malt',
    placeholder: $localize`:@@admin.profile.linkKind.malt.placeholder:https://www.malt.fr/profile/pseudo`,
  },
  {
    value: 'website',
    label: $localize`:@@admin.profile.linkKind.website:Site web`,
    placeholder: $localize`:@@admin.profile.linkKind.website.placeholder:https://exemple.fr`,
  },
];
