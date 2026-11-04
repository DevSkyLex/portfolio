import {
  ChangeDetectionStrategy,
  Component,
  LOCALE_ID,
  computed,
  inject,
  input,
  type InputSignal,
  type Signal,
} from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import {
  lucideCircleAlert,
  lucideClock,
  lucidePlugZap,
  lucideTriangleAlert,
} from '@ng-icons/lucide';
import type { SeoSourceError } from '@vfortin/content-web-data-access/admin';
import { ALERT_IMPORTS, EMPTY_IMPORTS } from '@vfortin/ui';
import { SEO_SOURCE_ERROR_LABELS } from '@internal/content-web-feature-admin/lib/constants/seo-dashboard-labels.constants';
import type { SeoFormatter } from '@internal/content-web-feature-admin/lib/models/seo-formatter/seo-formatter.interface';
import type { SeoSectionView } from '@internal/content-web-feature-admin/lib/models/seo-section-view/seo-section-view.interface';
import { seoFormatter } from '@internal/content-web-feature-admin/lib/utils/seo-format/seo-format.utils';

/**
 * Component SeoSourceStateComponent
 * @class SeoSourceStateComponent
 *
 * @description
 * What a Google section of the « Tableau de bord » shows instead of, or above, its report (D47): a
 * dashed empty state naming the content-service variables still to set (`not-configured`, in mono,
 * with the operations guide's section), a dashed empty state before the first collection (`pending`),
 * or an alert for a failed collection, with the French reason, the API's code and message, the time
 * of the attempt and, when the last good report stays on screen, its time (a warning; a danger
 * without any report). Renders nothing for `ok`.
 */
@Component({
  selector: 'content-seo-source-state',
  imports: [ALERT_IMPORTS, EMPTY_IMPORTS, NgIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    @switch (view().status) {
      @case ('not-configured') {
        <div uiEmpty appearance="dashed">
          <div uiEmptyHeader>
            <div uiEmptyMedia variant="icon">
              <ng-icon [svg]="icons.setup" size="16" />
            </div>
            <p uiEmptyTitle i18n="@@admin.dashboard.state.notConfigured.title">
              {{ source() }} n’est pas configuré
            </p>
            <p uiEmptyDescription i18n="@@admin.dashboard.state.notConfigured.description">
              Définissez ces variables du content-service, puis actualisez. La procédure est dans
              docs/operations/deployment.md, section « SEO dashboard and audience measurement ».
            </p>
          </div>
          <div uiEmptyContent>
            <ul
              class="flex flex-wrap justify-center gap-1.5"
              i18n-aria-label="@@admin.dashboard.state.notConfigured.variables"
              aria-label="Variables à définir"
            >
              @for (name of view().missing; track name) {
                <li>
                  <code
                    class="rounded-xs border border-border bg-surface px-1.5 py-0.5 font-mono text-[12px]/4 text-fg"
                    >{{ name }}</code
                  >
                </li>
              }
            </ul>
          </div>
        </div>
      }
      @case ('pending') {
        <div uiEmpty appearance="dashed">
          <div uiEmptyHeader>
            <div uiEmptyMedia variant="icon">
              <ng-icon [svg]="icons.pending" size="16" />
            </div>
            <p uiEmptyTitle i18n="@@admin.dashboard.state.pending.title">
              Aucune collecte pour l’instant
            </p>
            <p uiEmptyDescription i18n="@@admin.dashboard.state.pending.description">
              {{ source() }} est collecté chaque jour à 5 h 30, heure du serveur, ou avec «
              Actualiser ».
            </p>
          </div>
        </div>
      }
      @case ('error') {
        @if (view().error; as error) {
          <div uiAlert [variant]="view().data ? 'warning' : 'danger'">
            <ng-icon [svg]="view().data ? icons.stale : icons.error" size="16" aria-hidden="true" />
            <p uiAlertTitle class="text-[13px]/5" i18n="@@admin.dashboard.state.error.title">
              Échec de la dernière collecte de {{ source() }}
            </p>
            <div uiAlertDescription class="gap-1 text-[13px]/5">
              <p>{{ reason() }}</p>
              <p class="font-mono text-[12px]/4 text-fg-muted">
                {{ error.code }} · {{ error.message }}
              </p>
              <p class="text-fg-muted" i18n="@@admin.dashboard.state.error.attempted">
                Tentative du {{ attempted() }}.
              </p>
              @if (fetched(); as shown) {
                <p class="text-fg-muted" i18n="@@admin.dashboard.state.error.stale">
                  Données affichées du {{ shown }}.
                </p>
              }
            </div>
          </div>
        }
      }
    }
  `,
})
export class SeoSourceStateComponent {
  // #region Properties
  /**
   * Property view
   * @readonly
   *
   * @description
   * Flattened section.
   *
   * @type {InputSignal<SeoSectionView<unknown>>}
   */
  public readonly view: InputSignal<SeoSectionView<unknown>> =
    input.required<SeoSectionView<unknown>>();

  /**
   * Property source
   * @readonly
   *
   * @description
   * Name of the source (« Search Console »), a product name left untranslated.
   *
   * @type {InputSignal<string>}
   */
  public readonly source: InputSignal<string> = input.required<string>();

  /**
   * Property icons
   * @readonly
   *
   * @description
   * Lucide icons of the states.
   */
  protected readonly icons: {
    readonly setup: string;
    readonly pending: string;
    readonly stale: string;
    readonly error: string;
  } = {
    setup: lucidePlugZap,
    pending: lucideClock,
    stale: lucideTriangleAlert,
    error: lucideCircleAlert,
  } as const;

  /**
   * Property format
   * @readonly
   *
   * @description
   * Formatters of the build locale.
   *
   * @type {SeoFormatter}
   */
  private readonly format: SeoFormatter = seoFormatter(inject<string>(LOCALE_ID));

  /**
   * Property reason
   * @readonly
   *
   * @description
   * French reason of the failure.
   *
   * @type {Signal<string>}
   */
  protected readonly reason: Signal<string> = computed<string>((): string => {
    const code: SeoSourceError['code'] | undefined = this.view().error?.code;
    return code ? SEO_SOURCE_ERROR_LABELS[code] : '';
  });

  /**
   * Property attempted
   * @readonly
   *
   * @description
   * Time of the failed attempt.
   *
   * @type {Signal<string>}
   */
  protected readonly attempted: Signal<string> = computed<string>((): string => {
    const at: string | null = this.view().attemptedAt;
    return at ? this.format.dateTime(at) : '';
  });

  /**
   * Property fetched
   * @readonly
   *
   * @description
   * Time of the report kept on screen, `null` without one.
   *
   * @type {Signal<string | null>}
   */
  protected readonly fetched: Signal<string | null> = computed<string | null>((): string | null => {
    const view: SeoSectionView<unknown> = this.view();
    return view.data !== null && view.fetchedAt ? this.format.dateTime(view.fetchedAt) : null;
  });
  // #endregion
}
