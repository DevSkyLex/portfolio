import { ChangeDetectionStrategy, Component, input, type InputSignal } from '@angular/core';
import { TechLogoComponent } from '@internal/content-web-ui/lib/tech/components/tech-logo/tech-logo.component';

/**
 * Class TechIconComponent
 * @class TechIconComponent
 *
 * @description
 * Renders a monochrome decorative technology logo; the adjacent tag supplies its accessible name.
 * The logos sit in a deferred chunk (D53): server-rendered pages keep the drawing from the HTML and
 * never load it (`hydrate never`, the logo is static and decorative); views rendered in the browser
 * load it at once (`on immediate`: `on idle` never fires on pages whose canvas animates continuously).
 */
@Component({
  selector: 'content-tech-icon',
  imports: [TechLogoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex shrink-0', 'aria-hidden': 'true' },
  template: `
    @defer (on immediate; hydrate never) {
      <content-tech-logo [tech]="tech()" />
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
   * Catalogue key or alias used to resolve the logo displayed by this component.
   *
   * @type {InputSignal<string>}
   */
  public readonly tech: InputSignal<string> = input.required<string>();
  // #endregion
}
