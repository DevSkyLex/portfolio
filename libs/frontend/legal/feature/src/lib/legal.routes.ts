import type { Routes } from '@angular/router';

/**
 * Constant LEGAL_ROUTES
 *
 * @description
 * Lazy route definitions for the privacy policy and legal notice; the shared paths are rendered
 * under both localized site prefixes during prerendering.
 *
 * @type {Routes}
 */
export const LEGAL_ROUTES: Routes = [
  {
    path: 'legal-notice',
    loadComponent: () =>
      import('@internal/legal-web-feature/lib/ui/pages/legal-notice-page/legal-notice-page.component').then(
        (m) => m.LegalNoticePageComponent,
      ),
    title: $localize`:@@route.legalNotice:Mentions légales — Valentin Fortin`,
  },
  {
    path: 'privacy',
    loadComponent: () =>
      import('@internal/legal-web-feature/lib/ui/pages/privacy-page/privacy-page.component').then(
        (m) => m.PrivacyPageComponent,
      ),
    title: $localize`:@@route.privacy:Politique de confidentialité — Valentin Fortin`,
  },
];
