import type { Route, Routes } from '@angular/router';
import type { TimelineKind } from '@vfortin/content-web-data-access/admin';
import { TIMELINE_KIND_TEXTS } from '@internal/content-web-feature-admin/lib/constants/timeline-kind-texts.constants';
import { leaveProjectEditor } from '@internal/content-web-feature-admin/lib/http/guards/leave-project-editor/leave-project-editor.guard';
import { timelineDocumentTitle } from '@internal/content-web-feature-admin/lib/utils/timeline-document-title/timeline-document-title.utils';

/**
 * Function timelineRoutes
 *
 * @description
 * Lazy list, creation (`new`) and editor (`:id`) pages of one timeline kind, which their `data` binds
 * to the pages' `kind` input; the editor routes defer leaving to the page (`canLeave`). The titles
 * name the kind's section in the build's language (`timelineDocumentTitle`).
 *
 * @param {TimelineKind} kind - Kind of the route tree.
 *
 * @returns {Routes} Route tree.
 */
function timelineRoutes(kind: TimelineKind): Routes {
  const { section, create } = TIMELINE_KIND_TEXTS[kind];
  const editor: NonNullable<Route['loadComponent']> = () =>
    import('@internal/content-web-feature-admin/lib/ui/pages/admin-timeline-edit-page/admin-timeline-edit-page.component').then(
      (m) => m.AdminTimelineEditPageComponent,
    );
  return [
    {
      path: '',
      loadComponent: () =>
        import('@internal/content-web-feature-admin/lib/ui/pages/admin-timeline-page/admin-timeline-page.component').then(
          (m) => m.AdminTimelinePageComponent,
        ),
      data: { kind },
      title: timelineDocumentTitle(section),
    },
    {
      path: 'new',
      loadComponent: editor,
      data: { kind },
      canDeactivate: [leaveProjectEditor],
      title: timelineDocumentTitle(section, create),
    },
    {
      path: ':id',
      loadComponent: editor,
      data: { kind },
      canDeactivate: [leaveProjectEditor],
      title: timelineDocumentTitle(section),
    },
  ];
}

/**
 * Configuration ADMIN_EXPERIENCE_ROUTES
 *
 * @description
 * « Expériences » administration, mounted by the shell under `/admin/experiences`.
 */
export const ADMIN_EXPERIENCE_ROUTES: Routes = timelineRoutes('experience');

/**
 * Configuration ADMIN_EDUCATION_ROUTES
 *
 * @description
 * « Formations » administration, mounted by the shell under `/admin/education`.
 */
export const ADMIN_EDUCATION_ROUTES: Routes = timelineRoutes('education');
