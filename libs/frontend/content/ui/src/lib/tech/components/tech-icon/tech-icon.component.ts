import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  type InputSignal,
  type Signal,
} from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { techDefinition } from '@internal/content-web-ui/lib/tech/utils/tech-definition/tech-definition.utils';

/**
 * Class TechIconComponent
 * @class TechIconComponent
 *
 * @description
 * Renders a monochrome decorative technology logo; the adjacent tag supplies its accessible name.
 */
@Component({
  selector: 'content-tech-icon',
  imports: [NgIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex shrink-0', 'aria-hidden': 'true' },
  template: `
    @if (icon(); as svg) {
      <ng-icon [svg]="svg" size="100%" strokeWidth="1.5" />
    }
  `,
})
export class TechIconComponent {
  // #region Properties
  /**
   * Property tech
   * @readonly
   *
   * @description
   * Catalogue key used to resolve the logo displayed by this component.
   *
   * @type {InputSignal<string>}
   */
  public readonly tech: InputSignal<string> = input.required<string>();

  /**
   * Property icon
   * @readonly
   *
   * @description
   * SVG for the selected catalogue entry, or undefined when the key has no registered icon.
   *
   * @type {Signal<string | undefined>}
   */
  protected readonly icon: Signal<string | undefined> = computed<string | undefined>(
    (): string | undefined => techDefinition(this.tech()).icon,
  );
  // #endregion
}
