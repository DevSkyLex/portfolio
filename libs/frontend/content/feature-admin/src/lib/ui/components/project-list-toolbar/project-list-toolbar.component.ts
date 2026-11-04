import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SidebarTriggerComponent } from '@vfortin/ui';

/**
 * Component ProjectListToolbarComponent
 * @class ProjectListToolbarComponent
 *
 * @description
 * 48 px navigation bar of the project list (D36): the layout's sidebar toggle, then the section name.
 * The title, the count and any page action live in the page header below it; the search and the
 * filters in the table toolbar.
 */
@Component({
  selector: 'content-project-list-toolbar',
  imports: [SidebarTriggerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // The host stays out of the layout so that the bar itself sticks to the top of the page.
  host: { class: 'contents' },
  template: `
    <header
      class="sticky top-0 z-10 flex h-12 shrink-0 items-center gap-3 border-b border-border bg-surface px-6 text-[13px] @max-[640px]:px-4"
    >
      <ui-sidebar-trigger class="-ml-2" />
      <span class="font-medium text-fg" aria-current="page" i18n="@@admin.projects.title"
        >Projets</span
      >
    </header>
  `,
})
export class ProjectListToolbarComponent {}
