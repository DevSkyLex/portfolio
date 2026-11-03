import { RenderIdService } from '@internal/ui/lib/render-id/render-id.service';
import {
  ChangeDetectionStrategy,
  Component,
  Directive,
  computed,
  inject,
  input,
  model,
  type InputSignal,
  type InputSignalWithTransform,
  type ModelSignal,
  type Signal,
} from '@angular/core';
import { cn } from '@internal/ui/lib/class-names/class-names.utils';
import { booleanAttribute } from '@internal/ui/lib/boolean-attribute/boolean-attribute.utils';

/**
 * Directive CollapsibleDirective
 * @class CollapsibleDirective
 *
 * @description
 * Stores the disclosure state shared by a trigger and its content, and supplies the content's
 * stable identifier and reflected state.
 */
@Directive({
  selector: '[uiCollapsible]',
  exportAs: 'uiCollapsible',
  host: {
    'data-slot': 'collapsible',
    '[attr.data-state]': 'state()',
    '[attr.data-disabled]': 'disabled() || null',
  },
})
export class CollapsibleDirective {
  // #region Properties
  /**
   * Property open
   *
   * @description
   * Whether the disclosure content is expanded; changes propagate through the model binding.
   *
   * @type {ModelSignal<boolean>}
   */
  public readonly open: ModelSignal<boolean> = model<boolean>(false);

  /**
   * Property disabled
   * @readonly
   *
   * @description
   * Prevents the trigger from changing the disclosure state.
   *
   * @type {InputSignalWithTransform<boolean, boolean | ''>}
   */
  public readonly disabled: InputSignalWithTransform<boolean, boolean | ''> = input<
    boolean,
    boolean | ''
  >(false, { transform: booleanAttribute });

  /**
   * Property contentId
   * @readonly
   *
   * @description
   * Generated identifier connecting the trigger's `aria-controls` to its content element.
   *
   * @type {string}
   */
  public readonly contentId: string =
    inject<RenderIdService>(RenderIdService).next('ui-collapsible-');

  /**
   * Property state
   * @readonly
   *
   * @description
   * Open or closed state reflected on the trigger and content hosts.
   *
   * @type {Signal<'open' | 'closed'>}
   */
  public readonly state: Signal<'open' | 'closed'> = computed<'open' | 'closed'>(() =>
    this.open() ? 'open' : 'closed',
  );
  // #endregion

  // #region Methods
  /**
   * Method toggle
   * @method toggle
   *
   * @description
   * Reverses the disclosure state unless the collapsible control is disabled.
   *
   * @returns {void}
   */
  public toggle(): void {
    if (!this.disabled()) this.open.update((open) => !open);
  }
  // #endregion
}

/**
 * Directive CollapsibleTriggerDirective
 * @class CollapsibleTriggerDirective
 *
 * @description
 * Binds a native button's expanded, controls, and disabled semantics to its parent disclosure.
 * Visual styling remains owned by the consuming button or row.
 */
@Directive({
  selector: 'button[uiCollapsibleTrigger]',
  host: {
    type: 'button',
    'data-slot': 'collapsible-trigger',
    '[attr.aria-expanded]': 'collapsible.open()',
    '[attr.aria-controls]': 'collapsible.contentId',
    '[attr.data-state]': 'collapsible.state()',
    '[disabled]': 'collapsible.disabled()',
    '(click)': 'collapsible.toggle()',
  },
})
export class CollapsibleTriggerDirective {
  // #region Properties
  /**
   * Property collapsible
   * @readonly
   *
   * @description
   * Parent disclosure that supplies the content identifier and state and handles activation.
   *
   * @type {CollapsibleDirective}
   */
  protected readonly collapsible: CollapsibleDirective =
    inject<CollapsibleDirective>(CollapsibleDirective);
  // #endregion
}

/**
 * Component CollapsibleContentComponent
 * @class CollapsibleContentComponent
 *
 * @description
 * Renders disclosure content linked to its trigger and animates the grid row between collapsed
 * and content height.
 */
@Component({
  selector: 'ui-collapsible-content',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class:
      'grid transition-[grid-template-rows,visibility] duration-(--dur-roll) ease-orbit motion-reduce:transition-none data-[state=closed]:invisible data-[state=closed]:grid-rows-[0fr] data-[state=open]:grid-rows-[1fr]',
    'data-slot': 'collapsible-content',
    '[id]': 'collapsible.contentId',
    '[attr.data-state]': 'collapsible.state()',
  },
  template: `<div class="min-h-0 overflow-hidden">
    <div [class]="classes()"><ng-content /></div>
  </div>`,
})
export class CollapsibleContentComponent {
  // #region Properties
  /**
   * Property collapsible
   * @readonly
   *
   * @description
   * Parent disclosure supplying the generated content id and open or closed state.
   *
   * @type {CollapsibleDirective}
   */
  protected readonly collapsible: CollapsibleDirective =
    inject<CollapsibleDirective>(CollapsibleDirective);

  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional classes applied to projected content inside the animated grid wrapper.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Caller-provided classes applied to the projected content wrapper.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() => cn(this.class()));
  // #endregion
}
