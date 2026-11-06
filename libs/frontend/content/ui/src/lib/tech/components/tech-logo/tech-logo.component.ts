import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  type InputSignal,
  type Signal,
} from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { TECH_LOGOS } from '@internal/content-web-ui/lib/tech/constants/tech-logos.constants';
import { techKey } from '@internal/content-web-ui/lib/tech/utils/tech-key/tech-key.utils';

/**
 * Class TechLogoComponent
 * @class TechLogoComponent
 *
 * @description
 * Draws the catalogue logo of one technology. Used only inside the `@defer` block of
 * `TechIconComponent`, so that `TECH_LOGOS` lands in a lazy chunk (D53).
 */
@Component({
  selector: 'content-tech-logo',
  imports: [NgIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    @if (logo(); as svg) {
      <ng-icon [svg]="svg" size="100%" strokeWidth="1.5" />
    }
  `,
})
export class TechLogoComponent {
  // #region Properties
  /**
   * Property tech
   * @readonly
   *
   * @description
   * Catalogue key or alias whose logo is drawn.
   *
   * @type {InputSignal<string>}
   */
  public readonly tech: InputSignal<string> = input.required<string>();

  /**
   * Property logo
   * @readonly
   *
   * @description
   * SVG of the canonical entry, or undefined when no icon pack draws the technology.
   *
   * @type {Signal<string | undefined>}
   */
  protected readonly logo: Signal<string | undefined> = computed<string | undefined>(
    (): string | undefined => TECH_LOGOS[techKey(this.tech())],
  );
  // #endregion
}
