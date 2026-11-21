import type { Route, Routes } from '@angular/router';
import { leaveProjectEditor } from '@internal/content-web-feature-admin/lib/http/guards/leave-project-editor/leave-project-editor.guard';
import { faqDocumentTitle } from '@internal/content-web-feature-admin/lib/utils/faq-document-title/faq-document-title.utils';

/**
 * Constant faqEditor
 *
 * @description
 * Lazy editor page shared by the creation and the edition routes.
 *
 * @type {NonNullable<Route['loadComponent']>}
 */
const faqEditor: NonNullable<Route['loadComponent']> = () =>
  import('@internal/content-web-feature-admin/lib/ui/pages/admin-faq-edit-page/admin-faq-edit-page.component').then(
    (m) => m.AdminFaqEditPageComponent,
  );

/**
 * Configuration ADMIN_FAQ_ROUTES
 *
 * @description
 * « FAQ » administration, mounted by the shell under `/admin/faq`: lazy list, creation (`new`) and
 * editor (`:id`) pages, the editors deferring leaving to the page (`canLeave`).
 */
export const ADMIN_FAQ_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('@internal/content-web-feature-admin/lib/ui/pages/admin-faq-page/admin-faq-page.component').then(
        (m) => m.AdminFaqPageComponent,
      ),
    title: faqDocumentTitle(),
  },
  {
    path: 'new',
    loadComponent: faqEditor,
    canDeactivate: [leaveProjectEditor],
    title: faqDocumentTitle($localize`:@@admin.faq.create:Nouvelle question`),
  },
  {
    path: ':id',
    loadComponent: faqEditor,
    canDeactivate: [leaveProjectEditor],
    title: faqDocumentTitle(),
  },
];
