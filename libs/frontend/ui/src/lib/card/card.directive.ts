import { Directive, computed, input, type InputSignal, type Signal } from '@angular/core';
import { cn } from '@internal/ui/lib/class-names/class-names.utils';
import { type CardVariant, cardVariants } from '@internal/ui/lib/card/constants/card.variants';

/**
 * Directive CardDirective
 * @class CardDirective
 *
 * @description
 * Applies a card surface treatment to a semantic article, section or generic container without replacing its native element.
 */
@Directive({
  selector: '[uiCard]',
  host: { '[class]': 'classes()', 'data-slot': 'card' },
})
export class CardDirective {
  // #region Properties
  /**
   * Property variant
   * @readonly
   *
   * @description
   * Surface style applied to the host, defaulting to the raised card treatment.
   *
   * @type {InputSignal<CardVariant>}
   */
  public readonly variant: InputSignal<CardVariant> = input<CardVariant>('default');

  /**
   * Property class
   * @readonly
   *
   * @description
   * Caller classes merged with the selected card surface recipe.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Merged variant and caller classes applied to the card host.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn(cardVariants({ variant: this.variant() }), this.class()),
  );
  // #endregion
}

/**
 * Directive CardHeaderDirective
 * @class CardHeaderDirective
 *
 * @description
 * Arranges card title and description, reserving a second grid column when a card action is present.
 */
@Directive({
  selector: '[uiCardHeader]',
  host: { '[class]': 'classes()', 'data-slot': 'card-header' },
})
export class CardHeaderDirective {
  // #region Properties
  /**
   * Property class
   * @readonly
   *
   * @description
   * Caller classes merged with the container-query grid layout.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Merged classes applied to the card header host.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn(
      '@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 has-[[data-slot=card-action]]:grid-cols-[minmax(0,1fr)_auto]',
      this.class(),
    ),
  );
  // #endregion
}

/**
 * Directive CardTitleDirective
 * @class CardTitleDirective
 *
 * @description
 * Styles a card heading while leaving the consumer responsible for choosing the correct heading level.
 */
@Directive({
  selector: '[uiCardTitle]',
  host: { '[class]': 'classes()', 'data-slot': 'card-title' },
})
export class CardTitleDirective {
  // #region Properties
  /**
   * Property class
   * @readonly
   *
   * @description
   * Caller classes merged with the card title typography.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Merged classes applied to the heading host.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn('text-lg/[26px] font-semibold text-balance text-star', this.class()),
  );
  // #endregion
}

/**
 * Directive CardDescriptionDirective
 * @class CardDescriptionDirective
 *
 * @description
 * Applies muted, readable description typography to card supporting copy.
 */
@Directive({
  selector: '[uiCardDescription]',
  host: { '[class]': 'classes()', 'data-slot': 'card-description' },
})
export class CardDescriptionDirective {
  // #region Properties
  /**
   * Property class
   * @readonly
   *
   * @description
   * Caller classes merged with the card description typography.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Merged classes applied to the description host.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn('text-small text-pretty text-star-muted', this.class()),
  );
  // #endregion
}

/**
 * Directive CardActionDirective
 * @class CardActionDirective
 *
 * @description
 * Places an optional action in the second grid column at the top of a card header.
 */
@Directive({
  selector: '[uiCardAction]',
  host: { '[class]': 'classes()', 'data-slot': 'card-action' },
})
export class CardActionDirective {
  // #region Properties
  /**
   * Property class
   * @readonly
   *
   * @description
   * Caller classes merged with the header action positioning rules.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Merged classes applied to the card action host.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn('col-start-2 row-span-2 row-start-1 self-start justify-self-end', this.class()),
  );
  // #endregion
}

/**
 * Directive CardContentDirective
 * @class CardContentDirective
 *
 * @description
 * Applies the standard horizontal inset to the main card content area.
 */
@Directive({
  selector: '[uiCardContent]',
  host: { '[class]': 'classes()', 'data-slot': 'card-content' },
})
export class CardContentDirective {
  // #region Properties
  /**
   * Property class
   * @readonly
   *
   * @description
   * Caller classes merged with the content inset.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Merged classes applied to the content host.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() => cn('px-6', this.class()));
  // #endregion
}

/**
 * Directive CardFooterDirective
 * @class CardFooterDirective
 *
 * @description
 * Aligns footer actions and content with a consistent gap and horizontal inset.
 */
@Directive({
  selector: '[uiCardFooter]',
  host: { '[class]': 'classes()', 'data-slot': 'card-footer' },
})
export class CardFooterDirective {
  // #region Properties
  /**
   * Property class
   * @readonly
   *
   * @description
   * Caller classes merged with footer alignment and inset styles.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Merged classes applied to the card footer host.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn('flex items-center gap-3 px-6', this.class()),
  );
  // #endregion
}
