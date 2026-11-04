import {
  ChangeDetectionStrategy,
  Component,
  booleanAttribute,
  computed,
  input,
  model,
  type InputSignal,
  type InputSignalWithTransform,
  type ModelSignal,
  type Signal,
} from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { flagFr, flagGb } from '@ng-icons/flag-icons';
import { ToggleGroupDirective, ToggleGroupItemDirective, TooltipDirective } from '@vfortin/ui';
import { CONTENT_LOCALE_LABELS } from '@internal/content-web-feature-admin/lib/constants/content-locale-labels.constants';
import type { ContentLocale } from '@internal/content-web-feature-admin/lib/models/content-locale/content-locale.type';
import type { LocaleFieldState } from '@internal/content-web-feature-admin/lib/models/locale-field-state/locale-field-state.type';

/**
 * Component LocaleSwitchComponent
 * @class LocaleSwitchComponent
 *
 * @description
 * Language toggle of a bilingual field (the owner's choice over page-level language tabs): one
 * segmented control in the field's frame, joined to the end of the control before it like a split
 * button (`attached`, the default) or standing alone, whose thumb slides under the flag of the shown
 * language (`--dur-roll`, still with reduced motion). It keeps the `uiToggleGroup` behaviour
 * (pressed buttons, arrow keys). The language name is each flag's tooltip and accessible name;
 * `compact` fits a strip under a textarea or an editor toolbar; a dot on a flag marks a language
 * still empty (amber) or holding a shown error (red), also spelled out for screen readers. The flags
 * are the ones of the public language menu (`flag-icons`).
 */
@Component({
  selector: 'content-locale-switch',
  imports: [NgIcon, ToggleGroupDirective, ToggleGroupItemDirective, TooltipDirective],
  templateUrl: './locale-switch.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex shrink-0' },
})
export class LocaleSwitchComponent {
  // #region Properties
  /**
   * Property value
   * @readonly
   *
   * @description
   * Language the field shows.
   *
   * @type {ModelSignal<ContentLocale>}
   */
  public readonly value: ModelSignal<ContentLocale> = model<ContentLocale>('fr');

  /**
   * Property label
   * @readonly
   *
   * @description
   * Label of the field, which names the toggle (« Langue du champ Intitulé »).
   *
   * @type {InputSignal<string>}
   */
  public readonly label: InputSignal<string> = input.required<string>();

  /**
   * Property states
   * @readonly
   *
   * @description
   * State of each language of the field.
   *
   * @type {InputSignal<Readonly<Record<ContentLocale, LocaleFieldState>>>}
   */
  public readonly states: InputSignal<Readonly<Record<ContentLocale, LocaleFieldState>>> = input<
    Readonly<Record<ContentLocale, LocaleFieldState>>
  >({ fr: 'filled', en: 'filled' });

  /**
   * Property attached
   * @readonly
   *
   * @description
   * Whether the toggle joins the control before it (square start corners, borders overlapping by a
   * pixel); `false` for a toggle standing alone, such as in a section header.
   *
   * @type {InputSignalWithTransform<boolean, unknown>}
   */
  public readonly attached: InputSignalWithTransform<boolean, unknown> = input<boolean, unknown>(
    true,
    { transform: booleanAttribute },
  );

  /**
   * Property compact
   * @readonly
   *
   * @description
   * Smaller flag buttons (h-7) for a strip under a textarea or an editor toolbar, instead of the
   * field height (h-9).
   *
   * @type {InputSignalWithTransform<boolean, unknown>}
   */
  public readonly compact: InputSignalWithTransform<boolean, unknown> = input<boolean, unknown>(
    false,
    { transform: booleanAttribute },
  );

  /**
   * Property locales
   * @readonly
   *
   * @description
   * Languages, in toggle order.
   *
   * @type {readonly ContentLocale[]}
   */
  protected readonly locales: readonly ContentLocale[] = ['fr', 'en'];

  /**
   * Property names
   * @readonly
   *
   * @description
   * Name of each language, written in that language.
   *
   * @type {Readonly<Record<ContentLocale, string>>}
   */
  protected readonly names: Readonly<Record<ContentLocale, string>> = CONTENT_LOCALE_LABELS;

  /**
   * Property flags
   * @readonly
   *
   * @description
   * Flag of each language.
   *
   * @type {Readonly<Record<ContentLocale, string>>}
   */
  protected readonly flags: Readonly<Record<ContentLocale, string>> = { fr: flagFr, en: flagGb };

  /**
   * Property frameClasses
   * @readonly
   *
   * @description
   * One field-like frame around both flags, at the field height (or the compact one), joined to the
   * control before it when attached.
   *
   * @type {Signal<string>}
   */
  protected readonly frameClasses: Signal<string> = computed<string>(() =>
    [
      'relative isolate gap-0 border border-border-field bg-surface-field p-0.5',
      this.compact() ? 'h-7 rounded-sm' : 'h-9 rounded-md',
      this.attached() ? '-ms-px rounded-s-none' : '',
    ]
      .filter(Boolean)
      .join(' '),
  );

  /**
   * Property thumbClasses
   * @readonly
   *
   * @description
   * Selected-state thumb under the shown flag, one button wide, sliding between the two.
   *
   * @type {Signal<string>}
   */
  protected readonly thumbClasses: Signal<string> = computed<string>(() =>
    [
      'pointer-events-none absolute inset-y-0.5 start-0.5 -z-10 bg-surface-selected',
      'transition-transform duration-(--dur-roll) ease-orbit motion-reduce:transition-none',
      this.compact() ? 'w-7 rounded-xs' : 'w-9 rounded-sm',
    ].join(' '),
  );

  /**
   * Property itemClasses
   * @readonly
   *
   * @description
   * Flag buttons without a fill of their own (the thumb shows the pressed one), dimmed until shown.
   *
   * @type {Signal<string>}
   */
  protected readonly itemClasses: Signal<string> = computed<string>(() =>
    [
      'relative h-full min-w-0 px-0 opacity-60 hover:bg-transparent hover:opacity-100 aria-pressed:bg-transparent aria-pressed:opacity-100',
      'transition-opacity duration-(--dur-pop) motion-reduce:transition-none',
      this.compact() ? 'w-7 rounded-xs' : 'w-9 rounded-sm',
    ].join(' '),
  );

  /**
   * Property offset
   * @readonly
   *
   * @description
   * Thumb shift to the shown language, in button widths (left to right: both admin languages are).
   *
   * @type {Signal<string>}
   */
  protected readonly offset: Signal<string> = computed<string>(
    () => `translateX(${this.locales.indexOf(this.value()) * 100}%)`,
  );

  /**
   * Property groupLabel
   * @readonly
   *
   * @description
   * Accessible name of the toggle, from the field label (« Langue du champ Intitulé »).
   *
   * @type {Signal<string>}
   */
  protected readonly groupLabel: Signal<string> = computed<string>(
    (): string =>
      $localize`:@@admin.content.localeSwitch.label:Langue du champ ${this.label()}:field:`,
  );
  // #endregion

  // #region Methods
  /**
   * Method stateText
   * @method stateText
   *
   * @description
   * Wording of a language state, empty when filled.
   *
   * @param {LocaleFieldState} state - State.
   *
   * @returns {string} Text.
   */
  protected stateText(state: LocaleFieldState): string {
    return state === 'error'
      ? $localize`:@@admin.content.localeSwitch.error:à corriger`
      : state === 'empty'
        ? $localize`:@@admin.content.localeSwitch.empty:à compléter`
        : '';
  }

  /**
   * Method tooltip
   * @method tooltip
   *
   * @description
   * Tooltip of a flag: the language name, followed by its state when it has one.
   *
   * @param {ContentLocale} locale - Language of the flag.
   * @param {string} note - Wording of its state, empty when filled.
   *
   * @returns {string} Text.
   */
  protected tooltip(locale: ContentLocale, note: string): string {
    const language: string = this.names[locale];
    return note
      ? $localize`:@@admin.content.localeSwitch.tooltip:${language}:language: : ${note}:state:`
      : language;
  }

  /**
   * Method select
   * @method select
   *
   * @description
   * Shows the chosen language.
   *
   * @param {unknown} value - Value of the toggle group.
   *
   * @returns {void}
   */
  protected select(value: unknown): void {
    if (value === 'fr' || value === 'en') this.value.set(value);
  }
  // #endregion
}
