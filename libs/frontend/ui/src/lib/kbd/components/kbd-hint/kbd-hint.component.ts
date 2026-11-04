import {
  type InputSignal,
  type Signal,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { cn } from '@internal/ui/lib/class-names/class-names.utils';
import { KbdDirective, KbdGroupDirective } from '@internal/ui/lib/kbd/kbd.directive';

/**
 * Component KbdHintComponent
 * @class KbdHintComponent
 *
 * @description
 * Keyboard hint of a footer bar or a toolbar: a key combination drawn as keycaps followed by what it
 * does ("↵ Valider"). Assistive technology reads one sentence instead ("Entrée : Valider"), built
 * from `spokenKeys` because symbols such as `↵` or `↑` have no reliable spoken name.
 */
@Component({
  selector: 'ui-kbd-hint',
  imports: [KbdDirective, KbdGroupDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': 'classes()', 'data-slot': 'kbd-hint' },
  template: `
    <span class="sr-only">{{ text() }}</span>
    <kbd uiKbdGroup aria-hidden="true">
      @for (key of keys(); track $index) {
        <kbd uiKbd>{{ key }}</kbd>
      }
    </kbd>
    <span aria-hidden="true">{{ label() }}</span>
  `,
})
export class KbdHintComponent {
  // #region Properties
  /**
   * Property keys
   * @readonly
   *
   * @description
   * Keys pressed together or in turn, one keycap each (`['↑', '↓']`, `['Ctrl', 'K']`).
   *
   * @type {InputSignal<readonly string[]>}
   */
  public readonly keys: InputSignal<readonly string[]> = input.required<readonly string[]>();

  /**
   * Property label
   * @readonly
   *
   * @description
   * Visible effect of the keys ("Valider", "Fermer").
   *
   * @type {InputSignal<string>}
   */
  public readonly label: InputSignal<string> = input.required<string>();

  /**
   * Property spokenKeys
   * @readonly
   *
   * @description
   * Spoken name of the keys ("Entrée", "Flèches haut et bas"); empty, the keys are read as written,
   * which suits words such as `Échap` or `Ctrl K` but not symbols.
   *
   * @type {InputSignal<string>}
   */
  public readonly spokenKeys: InputSignal<string> = input<string>('');

  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional host classes merged with the hint layout.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property text
   * @readonly
   *
   * @description
   * Sentence read by assistive technology in place of the keycaps and the visible label.
   *
   * @type {Signal<string>}
   */
  protected readonly text: Signal<string> = computed<string>((): string => {
    const keys: string = this.spokenKeys() || this.keys().join(' ');
    const label: string = this.label();
    return $localize`:@@ui.kbd-hint.text:${keys}:KEYS: : ${label}:LABEL:`;
  });

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Compact faint hint layout combined with caller classes.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>((): string =>
    cn(
      'inline-flex items-center gap-1.5 text-[12px]/4 whitespace-nowrap text-fg-faint',
      this.class(),
    ),
  );
  // #endregion
}
