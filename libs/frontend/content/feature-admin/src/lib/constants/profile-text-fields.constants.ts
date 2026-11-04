import { PROFILE_LIMITS } from '@internal/content-web-feature-admin/lib/constants/profile-limits.constants';
import type { ProfileTextField } from '@internal/content-web-feature-admin/lib/models/profile-text-field/profile-text-field.interface';

/**
 * Constant PROFILE_TEXT_FIELDS
 *
 * @description
 * Texts of the « Présentation » section, in page order.
 */
export const PROFILE_TEXT_FIELDS: readonly ProfileTextField[] = [
  {
    key: 'heroIntro',
    label: $localize`:@@admin.profile.text.heroIntro:Introduction`,
    hint: $localize`:@@admin.profile.text.heroIntro.hint:Sous le nom, en haut de l’accueil.`,
    max: PROFILE_LIMITS.heroIntro,
    rows: 2,
  },
  {
    key: 'aboutStatement',
    label: $localize`:@@admin.profile.text.aboutStatement:Phrase du À propos`,
    hint: $localize`:@@admin.profile.text.aboutStatement.hint:Révélée mot à mot au défilement.`,
    max: PROFILE_LIMITS.aboutStatement,
    rows: 3,
  },
  {
    key: 'aboutLead',
    label: $localize`:@@admin.profile.text.aboutLead:Texte du À propos`,
    hint: $localize`:@@admin.profile.text.aboutLead.hint:Sous la phrase, avant les repères.`,
    max: PROFILE_LIMITS.aboutLead,
    rows: 5,
  },
];
