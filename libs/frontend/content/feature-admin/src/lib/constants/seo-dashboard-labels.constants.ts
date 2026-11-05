import type {
  SeoAuditIssue,
  SeoRange,
  SeoSourceError,
} from '@vfortin/content-web-data-access/admin';
import type { ChartTone } from '@vfortin/ui';

/**
 * Constant SEO_SOURCE_ERROR_LABELS
 *
 * @description
 * French explanation of each source failure code of the contract (`SEO_SOURCE_ERROR_CODES`); the
 * API's own message is English and stays beside it, in mono.
 *
 * @type {Readonly<Record<SeoSourceError['code'], string>>}
 */
export const SEO_SOURCE_ERROR_LABELS: Readonly<Record<SeoSourceError['code'], string>> = {
  'credentials-missing': $localize`:@@admin.dashboard.sourceError.credentialsMissing:La clé du compte de service est introuvable.`,
  'credentials-invalid': $localize`:@@admin.dashboard.sourceError.credentialsInvalid:La clé du compte de service est illisible.`,
  'credentials-rejected': $localize`:@@admin.dashboard.sourceError.credentialsRejected:Google a refusé la clé du compte de service.`,
  'permission-denied': $localize`:@@admin.dashboard.sourceError.permissionDenied:Le compte de service n’a pas accès à la propriété.`,
  'not-found': $localize`:@@admin.dashboard.sourceError.notFound:La propriété est introuvable.`,
  'bad-request': $localize`:@@admin.dashboard.sourceError.badRequest:Google a refusé la requête.`,
  'quota-exceeded': $localize`:@@admin.dashboard.sourceError.quotaExceeded:Le quota de l’API Google est atteint.`,
  timeout: $localize`:@@admin.dashboard.sourceError.timeout:Google n’a pas répondu à temps.`,
  network: $localize`:@@admin.dashboard.sourceError.network:Google est injoignable depuis le serveur.`,
  upstream: $localize`:@@admin.dashboard.sourceError.upstream:Google a répondu par une erreur.`,
  'invalid-response': $localize`:@@admin.dashboard.sourceError.invalidResponse:La réponse de Google est inattendue.`,
  unexpected: $localize`:@@admin.dashboard.sourceError.unexpected:Erreur inattendue pendant la collecte.`,
};

/**
 * Constant SEO_RANGE_LABELS
 *
 * @description
 * Names of the report windows on the page header's toggle.
 *
 * @type {Readonly<Record<SeoRange, string>>}
 */
export const SEO_RANGE_LABELS: Readonly<Record<SeoRange, string>> = {
  '7d': $localize`:@@admin.dashboard.range.7d:7 jours`,
  '28d': $localize`:@@admin.dashboard.range.28d:28 jours`,
  '90d': $localize`:@@admin.dashboard.range.90d:90 jours`,
};

/**
 * Constant SEO_DEVICE_LABELS
 *
 * @description
 * Names of the Search Console devices, keyed by their lower-case API value; another value shows as
 * the API writes it.
 *
 * @type {Readonly<Record<string, string>>}
 */
export const SEO_DEVICE_LABELS: Readonly<Record<string, string>> = {
  desktop: $localize`:@@admin.dashboard.device.desktop:Ordinateur`,
  mobile: $localize`:@@admin.dashboard.device.mobile:Mobile`,
  tablet: $localize`:@@admin.dashboard.device.tablet:Tablette`,
};

/**
 * Constant SEO_DEVICE_ORDER
 *
 * @description
 * Search Console devices in their fixed legend order and series tone: a device keeps its colour
 * whichever devices the window has (D51).
 *
 * @type {readonly { key: string; tone: ChartTone }[]}
 */
export const SEO_DEVICE_ORDER: readonly { readonly key: string; readonly tone: ChartTone }[] = [
  { key: 'desktop', tone: 'chart-1' },
  { key: 'mobile', tone: 'chart-2' },
  { key: 'tablet', tone: 'chart-3' },
];

/**
 * Constant SEO_STRATEGY_LABELS
 *
 * @description
 * Names of the PageSpeed Insights strategies.
 *
 * @type {Readonly<Record<'mobile' | 'desktop', string>>}
 */
export const SEO_STRATEGY_LABELS: Readonly<Record<'mobile' | 'desktop', string>> = {
  mobile: $localize`:@@admin.dashboard.strategy.mobile:Mobile`,
  desktop: $localize`:@@admin.dashboard.strategy.desktop:Ordinateur`,
};

/**
 * Constant SEO_VITAL_CATEGORY_LABELS
 *
 * @description
 * Words of the Core Web Vitals categories, shown beside their status dot (never colour alone).
 *
 * @type {Readonly<Record<'good' | 'needs-improvement' | 'poor', string>>}
 */
export const SEO_VITAL_CATEGORY_LABELS: Readonly<
  Record<'good' | 'needs-improvement' | 'poor', string>
> = {
  good: $localize`:@@admin.dashboard.vitals.category.good:Bon`,
  'needs-improvement': $localize`:@@admin.dashboard.vitals.category.needsImprovement:À améliorer`,
  poor: $localize`:@@admin.dashboard.vitals.category.poor:Mauvais`,
};

/**
 * Constant SEO_SEVERITY_LABELS
 *
 * @description
 * Words of the audit severities, shown beside their status dot.
 *
 * @type {Readonly<Record<'error' | 'warning' | 'info', string>>}
 */
export const SEO_SEVERITY_LABELS: Readonly<Record<'error' | 'warning' | 'info', string>> = {
  error: $localize`:@@admin.dashboard.audit.severity.error:Erreur`,
  warning: $localize`:@@admin.dashboard.audit.severity.warning:Avertissement`,
  info: $localize`:@@admin.dashboard.audit.severity.info:Info`,
};

/**
 * Constant SEO_AUDIT_CODE_LABELS
 *
 * @description
 * Short names of the audit findings, one per code, for counting them by kind.
 *
 * @type {Readonly<Record<SeoAuditIssue['code'], string>>}
 */
export const SEO_AUDIT_CODE_LABELS: Readonly<Record<SeoAuditIssue['code'], string>> = {
  'search-title-missing': $localize`:@@admin.dashboard.audit.code.searchTitleMissing:Titre de recherche absent`,
  'search-title-too-short': $localize`:@@admin.dashboard.audit.code.searchTitleTooShort:Titre de recherche trop court`,
  'search-title-too-long': $localize`:@@admin.dashboard.audit.code.searchTitleTooLong:Titre de recherche trop long`,
  'search-description-missing': $localize`:@@admin.dashboard.audit.code.searchDescriptionMissing:Description de recherche absente`,
  'search-description-too-short': $localize`:@@admin.dashboard.audit.code.searchDescriptionTooShort:Description de recherche trop courte`,
  'search-description-too-long': $localize`:@@admin.dashboard.audit.code.searchDescriptionTooLong:Description de recherche trop longue`,
  'keywords-missing': $localize`:@@admin.dashboard.audit.code.keywordsMissing:Mots-clés absents`,
  'cover-missing': $localize`:@@admin.dashboard.audit.code.coverMissing:Couverture absente`,
  'cover-alt-missing': $localize`:@@admin.dashboard.audit.code.coverAltMissing:Couverture sans texte alternatif`,
  'image-alt-missing': $localize`:@@admin.dashboard.audit.code.imageAltMissing:Images sans texte alternatif`,
  'translation-missing': $localize`:@@admin.dashboard.audit.code.translationMissing:Traduction manquante`,
};
