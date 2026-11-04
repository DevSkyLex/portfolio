import type {
  AdminLegalDocumentDto,
  AdminProfileDto,
  ProfileRevisionRequest,
} from '@vfortin/content-contracts';
import type {
  LegalDocument,
  Profile,
  ProfileDraft,
  ProfileFact,
  ProfileLink,
} from '@vfortin/content-domain';

/**
 * Function toProfileDraft
 *
 * @description
 * Maps a validated request to the domain draft; the field names are the same, so the domain reports
 * its errors under the contract paths (`facts.0.label.en`, `links.1.url`).
 *
 * @param {ProfileRevisionRequest} body - Contract-validated profile content.
 * @returns {ProfileDraft} Domain draft.
 */
export function toProfileDraft(body: ProfileRevisionRequest): ProfileDraft {
  return {
    heroIntro: body.heroIntro,
    aboutStatement: body.aboutStatement,
    aboutLead: body.aboutLead,
    facts: body.facts,
    links: body.links,
  };
}

/**
 * Function toAdminProfileDto
 *
 * @description
 * Presents the profile to the administration; a missing English text is left out, as in the request.
 *
 * @param {Profile} profile - Profile to present.
 * @returns {AdminProfileDto} Administration profile.
 */
export function toAdminProfileDto(profile: Profile): AdminProfileDto {
  return {
    heroIntro: profile.heroIntro.toProps(),
    aboutStatement: profile.aboutStatement.toProps(),
    aboutLead: profile.aboutLead.toProps(),
    facts: profile.facts.map((fact: ProfileFact): AdminProfileDto['facts'][number] => ({
      label: fact.label.toProps(),
      value: fact.value.toProps(),
    })),
    links: profile.links.map((link: ProfileLink): AdminProfileDto['links'][number] =>
      link.toProps(),
    ),
    version: profile.version,
  };
}

/**
 * Function toAdminLegalDocumentDto
 *
 * @description
 * Presents a legal document to the administration.
 *
 * @param {LegalDocument} document - Document to present.
 * @param {number} version - Version to publish; defaults to the document's.
 * @returns {AdminLegalDocumentDto} Administration document.
 */
export function toAdminLegalDocumentDto(
  document: LegalDocument,
  version: number = document.version,
): AdminLegalDocumentDto {
  return {
    kind: document.kind,
    body: { fr: document.body.fr.toProps(), en: document.body.en.toProps() },
    updatedAt: document.updatedAt.toISOString(),
    version,
  };
}
