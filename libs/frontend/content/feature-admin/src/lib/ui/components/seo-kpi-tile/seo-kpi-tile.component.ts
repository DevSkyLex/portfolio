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
import { lucideArrowDownRight, lucideArrowUpRight, lucideMinus } from '@ng-icons/lucide';
import { CARD_IMPORTS } from '@vfortin/ui';
import type { SeoDelta } from '@internal/content-web-feature-admin/lib/models/seo-delta/seo-delta.interface';

/**
 * Constant TONE_CLASSES
 *
 * @description
 * Ink of a change by its meaning for the site (D37: success and danger inks for text).
 *
 * @type {Readonly<Record<SeoDelta['tone'], string>>}
 */
const TONE_CLASSES: Readonly<Record<SeoDelta['tone'], string>> = {
  good: 'flex items-center gap-0.5 font-medium text-success-ink tabular-nums',
  bad: 'flex items-center gap-0.5 font-medium text-danger-ink tabular-nums',
  flat: 'flex items-center gap-0.5 font-medium text-fg-muted tabular-nums',
};

/**
 * Component SeoKpiTileComponent
 * @class SeoKpiTileComponent
 *
 * @description
 * Stat tile of the « Tableau de bord »: the figure's name, its value of the window (proportional
 * figures, the dashboard's sans) and its change against the period before, signed, with an arrow and
 * the ink of its meaning for the site; screen readers also hear whether the change is favourable, so
 * the colour never carries it alone. Without a period to compare, a muted note replaces the change.
 */
@Component({
  selector: 'content-seo-kpi-tile',
  imports: [CARD_IMPORTS, NgIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-w-0' },
  template: `
    <div uiCard variant="outline" class="h-full gap-1 px-4 py-3.5">
      <p class="truncate text-[13px]/5 text-fg-muted">{{ label() }}</p>
      <p class="text-[22px]/7 font-semibold tracking-tight text-fg">{{ value() }}</p>
      @if (delta(); as change) {
        <p class="flex flex-wrap items-center gap-x-1.5 text-[12px]/4">
          <span [class]="toneClasses()">
            <ng-icon [svg]="icon()" size="12" aria-hidden="true" />
            {{ change.display }}
          </span>
          <span class="text-fg-faint">{{ comparison() }}</span>
          @if (change.tone === 'good') {
            <span class="sr-only" i18n="@@admin.dashboard.kpi.favourable">(favorable)</span>
          } @else if (change.tone === 'bad') {
            <span class="sr-only" i18n="@@admin.dashboard.kpi.unfavourable">(défavorable)</span>
          }
        </p>
      } @else if (compared()) {
        <p class="text-[12px]/4 text-fg-faint" i18n="@@admin.dashboard.kpi.noComparison">
          Pas de période précédente à comparer
        </p>
      }
    </div>
  `,
})
export class SeoKpiTileComponent {
  // #region Properties
  /**
   * Property label
   * @readonly
   *
   * @description
   * Name of the figure (« Clics »).
   *
   * @type {InputSignal<string>}
   */
  public readonly label: InputSignal<string> = input.required<string>();

  /**
   * Property value
   * @readonly
   *
   * @description
   * Formatted value of the window.
   *
   * @type {InputSignal<string>}
   */
  public readonly value: InputSignal<string> = input.required<string>();

  /**
   * Property delta
   * @readonly
   *
   * @description
   * Change against the period before, `null` without one.
   *
   * @type {InputSignal<SeoDelta | null>}
   */
  public readonly delta: InputSignal<SeoDelta | null> = input<SeoDelta | null>(null);

  /**
   * Property comparison
   * @readonly
   *
   * @description
   * Name of the period compared (« vs 28 jours précédents »).
   *
   * @type {InputSignal<string>}
   */
  public readonly comparison: InputSignal<string> = input<string>('');

  /**
   * Property compared
   * @readonly
   *
   * @description
   * Whether the figure has a period to compare: a count of the current state (audit totals) has
   * none, so a missing change prints no note.
   *
   * @type {InputSignalWithTransform<boolean, unknown>}
   */
  public readonly compared: InputSignalWithTransform<boolean, unknown> = input<boolean, unknown>(
    true,
    { transform: booleanAttribute },
  );

  /**
   * Property icon
   * @readonly
   *
   * @description
   * Arrow of the change's direction.
   *
   * @type {Signal<string>}
   */
  protected readonly icon: Signal<string> = computed<string>((): string => {
    const direction: SeoDelta['direction'] = this.delta()?.direction ?? 'flat';
    return direction === 'up'
      ? lucideArrowUpRight
      : direction === 'down'
        ? lucideArrowDownRight
        : lucideMinus;
  });

  /**
   * Property toneClasses
   * @readonly
   *
   * @description
   * Classes of the change, in the ink of its tone.
   *
   * @type {Signal<string>}
   */
  protected readonly toneClasses: Signal<string> = computed<string>(
    (): string => TONE_CLASSES[this.delta()?.tone ?? 'flat'],
  );
  // #endregion
}
