import {
  type InputSignal,
  type Signal,
  Directive,
  ElementRef,
  computed,
  inject,
  input,
} from '@angular/core';
import { cn } from '@internal/ui/lib/class-names/class-names.utils';
import { HOST } from '@internal/ui/lib/typography/constants/typography.constants';

/**
 * Class TypographyStyle
 * @class TypographyStyle
 *
 * @description
 * Applies a component's typography classes to its semantic host and merges caller classes.
 */
@Directive()
export abstract class TypographyStyle {
  // #region Properties
  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional utility classes merged with the directive's typography scale.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property base
   * @readonly
   *
   * @description
   * Typography scale classes supplied by each concrete directive.
   *
   * @type {string}
   */
  protected abstract readonly base: string;

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Host class string combining the selected scale with caller-provided utilities.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>((): string =>
    cn(this.base, this.class()),
  );
  // #endregion
}

/**
 * Directive DisplayDirective
 * @class DisplayDirective
 *
 * @description
 * Applies the display-scale hero typography to the host element.
 */
@Directive({ selector: '[uiDisplay]', host: { ...HOST, 'data-slot': 'display' } })
export class DisplayDirective extends TypographyStyle {
  // #region Properties
  /**
   * Property base
   * @readonly
   *
   * @description
   * Hero scale classes use the smaller size below the medium breakpoint.
   *
   * @type {string}
   */
  protected readonly base: string = 'font-display text-hero-sm text-balance text-star md:text-hero';
  // #endregion
}

/**
 * Directive H1Directive
 * @class H1Directive
 *
 * @description
 * Applies the first display-heading scale and scroll offset to its semantic host.
 */
@Directive({ selector: '[uiH1]', host: { ...HOST, 'data-slot': 'h1' } })
export class H1Directive extends TypographyStyle {
  // #region Properties
  /**
   * Property base
   * @readonly
   *
   * @description
   * First display-heading scale classes with responsive sizing and balanced wrapping.
   *
   * @type {string}
   */
  protected readonly base: string =
    'scroll-m-24 font-display text-d1-sm text-balance text-star md:text-d1';
  // #endregion
}

/**
 * Directive H2Directive
 * @class H2Directive
 *
 * @description
 * Applies the second display-heading scale and scroll offset to its semantic host.
 */
@Directive({ selector: '[uiH2]', host: { ...HOST, 'data-slot': 'h2' } })
export class H2Directive extends TypographyStyle {
  // #region Properties
  /**
   * Property base
   * @readonly
   *
   * @description
   * Second display-heading scale classes with responsive sizing and balanced wrapping.
   *
   * @type {string}
   */
  protected readonly base: string =
    'scroll-m-24 font-display text-d2-sm text-balance text-star md:text-d2';
  // #endregion
}

/**
 * Directive H3Directive
 * @class H3Directive
 *
 * @description
 * Applies the third display-heading scale and scroll offset to its semantic host.
 */
@Directive({ selector: '[uiH3]', host: { ...HOST, 'data-slot': 'h3' } })
export class H3Directive extends TypographyStyle {
  // #region Properties
  /**
   * Property base
   * @readonly
   *
   * @description
   * Third display-heading scale classes with balanced wrapping.
   *
   * @type {string}
   */
  protected readonly base: string = 'scroll-m-24 font-display text-d3 text-balance text-star';
  // #endregion
}

/**
 * Directive H4Directive
 * @class H4Directive
 *
 * @description
 * Applies the sans-serif subheading scale used by the portfolio design.
 */
@Directive({ selector: '[uiH4]', host: { ...HOST, 'data-slot': 'h4' } })
export class H4Directive extends TypographyStyle {
  // #region Properties
  /**
   * Property base
   * @readonly
   *
   * @description
   * Semibold sans-serif subheading classes with the 18/26 type scale.
   *
   * @type {string}
   */
  protected readonly base: string = 'scroll-m-24 text-lg/[26px] font-semibold text-star';
  // #endregion
}

/**
 * Directive ParagraphDirective
 * @class ParagraphDirective
 *
 * @description
 * Applies body paragraph typography and spacing after preceding content.
 */
@Directive({ selector: '[uiP]', host: { ...HOST, 'data-slot': 'p' } })
export class ParagraphDirective extends TypographyStyle {
  // #region Properties
  /**
   * Property base
   * @readonly
   *
   * @description
   * Body copy classes with readable wrapping and top spacing after another sibling.
   *
   * @type {string}
   */
  protected readonly base: string = 'text-body text-pretty not-first:mt-6';
  // #endregion
}

/**
 * Directive LeadDirective
 * @class LeadDirective
 *
 * @description
 * Applies the introductory paragraph scale with responsive sizing.
 */
@Directive({ selector: '[uiLead]', host: { ...HOST, 'data-slot': 'lead' } })
export class LeadDirective extends TypographyStyle {
  // #region Properties
  /**
   * Property base
   * @readonly
   *
   * @description
   * Responsive lead-copy classes with balanced paragraph wrapping.
   *
   * @type {string}
   */
  protected readonly base: string = 'text-lead-sm text-pretty text-star-muted md:text-lead';
  // #endregion
}

/**
 * Directive LargeDirective
 * @class LargeDirective
 *
 * @description
 * Applies prominent semibold supporting-text typography to the host.
 */
@Directive({ selector: '[uiLarge]', host: { ...HOST, 'data-slot': 'large' } })
export class LargeDirective extends TypographyStyle {
  // #region Properties
  /**
   * Property base
   * @readonly
   *
   * @description
   * Large semibold text classes for prominent supporting copy.
   *
   * @type {string}
   */
  protected readonly base: string = 'text-lg/[26px] font-semibold text-star';
  // #endregion
}

/**
 * Directive SmallDirective
 * @class SmallDirective
 *
 * @description
 * Applies the compact typography scale for secondary text.
 */
@Directive({ selector: '[uiSmall]', host: { ...HOST, 'data-slot': 'small' } })
export class SmallDirective extends TypographyStyle {
  // #region Properties
  /**
   * Property base
   * @readonly
   *
   * @description
   * Compact text classes with medium font weight.
   *
   * @type {string}
   */
  protected readonly base: string = 'text-small font-medium';
  // #endregion
}

/**
 * Directive MutedDirective
 * @class MutedDirective
 *
 * @description
 * Applies muted compact typography to secondary content.
 */
@Directive({ selector: '[uiMuted]', host: { ...HOST, 'data-slot': 'muted' } })
export class MutedDirective extends TypographyStyle {
  // #region Properties
  /**
   * Property base
   * @readonly
   *
   * @description
   * Compact text classes using the muted text token.
   *
   * @type {string}
   */
  protected readonly base: string = 'text-small text-star-muted';
  // #endregion
}

/**
 * Directive OverlineDirective
 * @class OverlineDirective
 *
 * @description
 * Applies the uppercase monospace label scale used above a title or value.
 */
@Directive({ selector: '[uiOverline]', host: { ...HOST, 'data-slot': 'overline' } })
export class OverlineDirective extends TypographyStyle {
  // #region Properties
  /**
   * Property base
   * @readonly
   *
   * @description
   * Monospace label classes with faint text colour and uppercase transformation.
   *
   * @type {string}
   */
  protected readonly base: string = 'font-mono text-label text-star-faint uppercase';
  // #endregion
}

/**
 * Directive DataDirective
 * @class DataDirective
 *
 * @description
 * Applies monospace and tabular-number typography for figures and metadata.
 */
@Directive({ selector: '[uiData]', host: { ...HOST, 'data-slot': 'data' } })
export class DataDirective extends TypographyStyle {
  // #region Properties
  /**
   * Property base
   * @readonly
   *
   * @description
   * Monospace data classes with tabular digits for aligned numeric values.
   *
   * @type {string}
   */
  protected readonly base: string = 'font-mono text-data tabular-nums';
  // #endregion
}

/**
 * Directive BlockquoteDirective
 * @class BlockquoteDirective
 *
 * @description
 * Applies quote styling to a native blockquote element.
 */
@Directive({ selector: 'blockquote[uiBlockquote]', host: { ...HOST, 'data-slot': 'blockquote' } })
export class BlockquoteDirective extends TypographyStyle {
  // #region Properties
  /**
   * Property base
   * @readonly
   *
   * @description
   * Quote text classes with a leading border, indentation and muted lead typography.
   *
   * @type {string}
   */
  protected readonly base: string =
    'border-l-2 border-line-strong pl-6 text-lead-sm text-star-muted not-first:mt-6';
  // #endregion
}

/**
 * Directive InlineCodeDirective
 * @class InlineCodeDirective
 *
 * @description
 * Applies compact monospace styling to code embedded in running text.
 */
@Directive({ selector: 'code[uiInlineCode]', host: { ...HOST, 'data-slot': 'inline-code' } })
export class InlineCodeDirective extends TypographyStyle {
  // #region Properties
  /**
   * Property base
   * @readonly
   *
   * @description
   * Inline code surface and monospace classes scaled relative to surrounding text.
   *
   * @type {string}
   */
  protected readonly base: string =
    'rounded-sm bg-void-raised px-1.5 py-0.5 font-mono text-[0.85em] text-star';
  // #endregion
}

/**
 * Directive ListDirective
 * @class ListDirective
 *
 * @description
 * Applies list spacing and chooses decimal or disc markers from the native host element.
 */
@Directive({ selector: 'ul[uiList], ol[uiList]', host: { ...HOST, 'data-slot': 'list' } })
export class ListDirective extends TypographyStyle {
  // #region Properties
  /**
   * Property base
   * @readonly
   *
   * @description
   * List classes with spacing and marker styling selected from the host's `OL` or `UL` tag.
   *
   * @type {string}
   */
  protected readonly base: string = cn(
    'ml-6 text-body not-first:mt-6 marker:text-star-faint [&>li]:not-first:mt-2',
    inject<ElementRef<HTMLElement>>(ElementRef).nativeElement.tagName === 'OL'
      ? 'list-decimal'
      : 'list-disc',
  );
  // #endregion
}
