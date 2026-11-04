import { type InputSignal, ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RevealDirective } from '@internal/ui/lib/reveal/reveal.directive';

/**
 * Component SectionHeadingComponent
 * @class SectionHeadingComponent
 *
 * @description
 * Renders a projected section title as an `h2` and applies the reveal animation to its line while preserving the
 * document heading hierarchy.
 */
@Component({
  selector: 'ui-section-heading',
  imports: [RevealDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2
      class="group mb-12 overflow-hidden pb-[0.08em] font-display text-[64px] leading-[68px] font-semibold tracking-[-0.035em] text-fg @max-[768px]:text-4xl @max-[768px]:leading-[42px]"
      uiReveal
      [id]="headingId()"
    >
      <span
        class="inline-block transition-transform duration-(--dur-reveal) ease-orbit in-data-js:group-not-data-in:translate-y-[105%] motion-reduce:transition-none"
        ><ng-content
      /></span>
    </h2>
  `,
})
export class SectionHeadingComponent {
  // #region Properties
  /**
   * Property headingId
   * @readonly
   *
   * @description
   * Required id assigned to the rendered heading so page navigation can target this section.
   *
   * @type {InputSignal<string>}
   */
  public readonly headingId: InputSignal<string> = input.required<string>();
  // #endregion
}
