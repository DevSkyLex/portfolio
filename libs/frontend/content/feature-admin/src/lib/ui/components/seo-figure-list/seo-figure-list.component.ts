import {
  ChangeDetectionStrategy,
  Component,
  booleanAttribute,
  computed,
  input,
  type InputSignal,
  type InputSignalWithTransform,
  type Signal,
} from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import {
  SEO_DELTA_ICONS,
  SEO_DELTA_TONE_CLASSES,
} from '@internal/content-web-feature-admin/lib/constants/seo-delta-tones.constants';
import type { SeoDelta } from '@internal/content-web-feature-admin/lib/models/seo-delta/seo-delta.interface';
import type { SeoFigure } from '@internal/content-web-feature-admin/lib/models/seo-figure/seo-figure.interface';

/**
 * Component SeoFigureListComponent
 * @class SeoFigureListComponent
 *
 * @description
 * Key figures of a dashboard tab in the side panel (D51): one row per figure, its name on the start
 * side and its value on the end side with, for a windowed report, its signed change in the ink of
 * its meaning; screen readers also hear whether the change is favourable. The period compared is
 * named once, under the list, instead of on every row as the strip's tiles do.
 */
@Component({
  selector: 'content-seo-figure-list',
  imports: [NgIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-2' },
  template: `
    <dl class="flex flex-col">
      @for (figure of figures(); track figure.id) {
        <div
          class="flex items-start justify-between gap-3 border-b border-border py-2.5 first:pt-0 last:border-b-0 last:pb-0"
        >
          <dt class="min-w-0 text-[13px]/5 text-fg-muted">{{ figure.label }}</dt>
          <dd class="flex shrink-0 flex-col items-end gap-0.5">
            <span class="text-[15px]/5 font-semibold text-fg tabular-nums">{{ figure.value }}</span>
            @if (figure.delta; as change) {
              <span [class]="toneClasses(change)" class="text-[12px]/4">
                <ng-icon [svg]="icon(change)" size="12" aria-hidden="true" />
                {{ change.display }}
                @if (change.tone === 'good') {
                  <span class="sr-only" i18n="@@admin.dashboard.kpi.favourable">(favorable)</span>
                } @else if (change.tone === 'bad') {
                  <span class="sr-only" i18n="@@admin.dashboard.kpi.unfavourable"
                    >(défavorable)</span
                  >
                }
              </span>
            }
          </dd>
        </div>
      }
    </dl>
    @if (compared()) {
      @if (changed()) {
        <p class="text-[12px]/4 text-fg-faint">{{ comparison() }}</p>
      } @else {
        <p class="text-[12px]/4 text-fg-faint" i18n="@@admin.dashboard.kpi.noComparison">
          Pas de période précédente à comparer
        </p>
      }
    }
  `,
})
export class SeoFigureListComponent {
  // #region Properties
  /**
   * Property figures
   * @readonly
   *
   * @description
   * Key figures of the tab, in display order.
   *
   * @type {InputSignal<readonly SeoFigure[]>}
   */
  public readonly figures: InputSignal<readonly SeoFigure[]> =
    input.required<readonly SeoFigure[]>();

  /**
   * Property comparison
   * @readonly
   *
   * @description
   * Name of the period compared (`vs 7 sept. – 4 oct. 2026`).
   *
   * @type {InputSignal<string>}
   */
  public readonly comparison: InputSignal<string> = input<string>('');

  /**
   * Property compared
   * @readonly
   *
   * @description
   * Whether the figures are compared with a period before: counts of the current state (the audit,
   * the Web Vitals) are not, so the list prints no period note.
   *
   * @type {InputSignalWithTransform<boolean, unknown>}
   */
  public readonly compared: InputSignalWithTransform<boolean, unknown> = input<boolean, unknown>(
    true,
    { transform: booleanAttribute },
  );

  /**
   * Property changed
   * @readonly
   *
   * @description
   * Whether a figure carries a change, so the note names the period compared; without any, the
   * report has no period before and the note says so.
   *
   * @type {Signal<boolean>}
   */
  protected readonly changed: Signal<boolean> = computed<boolean>((): boolean =>
    this.figures().some((figure: SeoFigure): boolean => figure.delta !== null),
  );
  // #endregion

  // #region Methods
  /**
   * Method icon
   * @method icon
   *
   * @description
   * Arrow of a change's direction.
   *
   * @param {SeoDelta} change - Change of a figure.
   * @returns {string} Lucide icon.
   */
  protected icon(change: SeoDelta): string {
    return SEO_DELTA_ICONS[change.direction];
  }

  /**
   * Method toneClasses
   * @method toneClasses
   *
   * @description
   * Classes of a change, in the ink of its tone.
   *
   * @param {SeoDelta} change - Change of a figure.
   * @returns {string} Classes.
   */
  protected toneClasses(change: SeoDelta): string {
    return SEO_DELTA_TONE_CLASSES[change.tone];
  }
  // #endregion
}
