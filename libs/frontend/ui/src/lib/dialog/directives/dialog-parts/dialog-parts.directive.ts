import { RenderIdService } from '@internal/ui/lib/render-id/render-id.service';
import { DialogRef } from '@angular/cdk/dialog';
import {
  DestroyRef,
  Directive,
  computed,
  inject,
  input,
  type InputSignal,
  type InputSignalWithTransform,
  type Signal,
} from '@angular/core';
import { cn } from '@internal/ui/lib/class-names/class-names.utils';
import { injectDialogContainer } from '@internal/ui/lib/dialog/components/dialog-container/dialog-container.component';
import {
  type DialogFooterVariant,
  dialogFooterVariants,
} from '@internal/ui/lib/dialog/constants/dialog-footer.variants';
import {
  type DialogHeaderVariant,
  dialogHeaderVariants,
} from '@internal/ui/lib/dialog/constants/dialog-header.variants';
import {
  dialogDescriptionClasses,
  dialogTitleClasses,
} from '@internal/ui/lib/dialog/constants/dialog-parts.constants';

/**
 * Function linkDialogTitle
 *
 * @description
 * Gives a title a unique id and registers that id as the containing dialog's accessible name.
 *
 * @param {string} prefix - Prefix identifying the title part.
 * @returns {string} Unique id assigned to the title host.
 */
export function linkDialogTitle(prefix: string): string {
  const id: string = inject<RenderIdService>(RenderIdService).next(`${prefix}-`);
  injectDialogContainer()?.registerTitle(id, inject<DestroyRef>(DestroyRef));
  return id;
}

/**
 * Function linkDialogDescription
 *
 * @description
 * Gives a description a unique id and registers it with the containing dialog while its owner lives.
 *
 * @param {string} prefix - Prefix identifying the description part.
 * @returns {string} Unique id assigned to the description host.
 */
export function linkDialogDescription(prefix: string): string {
  const id: string = inject<RenderIdService>(RenderIdService).next(`${prefix}-`);
  injectDialogContainer()?.registerDescription(id, inject<DestroyRef>(DestroyRef));
  return id;
}

/**
 * Class DialogHeaderDirective
 * @class DialogHeaderDirective
 *
 * @description
 * Applies the shared dialog header spacing and close-button clearance to projected content, or the
 * edge-to-edge header bar with `variant="bar"`.
 */
@Directive({
  selector: '[uiDialogHeader]',
  host: {
    '[class]': 'classes()',
    'data-slot': 'dialog-header',
    '[attr.data-variant]': 'variant()',
  },
})
export class DialogHeaderDirective {
  // #region Properties
  /**
   * Property variant
   * @readonly
   *
   * @description
   * Header layout: `default` stays inside the panel padding, `bar` reaches the panel's top and side
   * edges above a hairline, with the close button centred on its first line.
   *
   * @type {InputSignal<DialogHeaderVariant>}
   */
  public readonly variant: InputSignal<DialogHeaderVariant> = input<DialogHeaderVariant>('default');

  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional classes merged with the header layout.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Selected header layout combined with caller classes.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn(dialogHeaderVariants({ variant: this.variant() }), this.class()),
  );
  // #endregion
}

/**
 * Class DialogTitleDirective
 * @class DialogTitleDirective
 *
 * @description
 * Styles the dialog title and registers its id as the container's labelled-by target.
 */
@Directive({
  selector: '[uiDialogTitle]',
  host: { '[id]': 'id', '[class]': 'classes()', 'data-slot': 'dialog-title' },
})
export class DialogTitleDirective {
  // #region Properties
  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional classes merged with dialog title typography.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property id
   * @readonly
   *
   * @description
   * Unique title id registered with the surrounding dialog container.
   *
   * @type {string}
   */
  protected readonly id: string = linkDialogTitle('ui-dialog-title');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Shared title typography combined with caller classes.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn(dialogTitleClasses, this.class()),
  );
  // #endregion
}

/**
 * Class DialogDescriptionDirective
 * @class DialogDescriptionDirective
 *
 * @description
 * Styles supporting dialog text and registers its id as a description relationship.
 */
@Directive({
  selector: '[uiDialogDescription]',
  host: { '[id]': 'id', '[class]': 'classes()', 'data-slot': 'dialog-description' },
})
export class DialogDescriptionDirective {
  // #region Properties
  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional classes merged with dialog description typography.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property id
   * @readonly
   *
   * @description
   * Unique description id registered with the surrounding dialog container.
   *
   * @type {string}
   */
  protected readonly id: string = linkDialogDescription('ui-dialog-description');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Shared description text treatment combined with caller classes.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn(dialogDescriptionClasses, this.class()),
  );
  // #endregion
}

/**
 * Class DialogFooterDirective
 * @class DialogFooterDirective
 *
 * @description
 * Applies the shared footer layout to projected dialog footer content: the responsive action row by
 * default, or the edge-to-edge footer bar with `variant="bar"`.
 */
@Directive({
  selector: '[uiDialogFooter]',
  host: {
    '[class]': 'classes()',
    'data-slot': 'dialog-footer',
    '[attr.data-variant]': 'variant()',
  },
})
export class DialogFooterDirective {
  // #region Properties
  /**
   * Property variant
   * @readonly
   *
   * @description
   * Footer layout: `actions` keeps the buttons inside the panel padding, `bar` reaches the panel
   * edges with keyboard hints at the start and actions at the end.
   *
   * @type {InputSignal<DialogFooterVariant>}
   */
  public readonly variant: InputSignal<DialogFooterVariant> = input<DialogFooterVariant>('actions');

  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional classes merged with the responsive footer layout.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Selected footer layout combined with caller classes.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn(dialogFooterVariants({ variant: this.variant() }), this.class()),
  );
  // #endregion
}

/**
 * Class DialogCloseDirective
 * @class DialogCloseDirective
 *
 * @description
 * Closes the nearest dialog, sheet or alert dialog and optionally passes a result to its trigger.
 */
@Directive({
  selector: 'button[uiDialogClose]',
  host: { type: 'button', 'data-slot': 'dialog-close', '(click)': 'close()' },
})
export class DialogCloseDirective {
  // #region Properties
  /**
   * Property result
   * @readonly
   *
   * @description
   * Value passed to the trigger's closed output; a bare attribute is transformed to undefined.
   *
   * @type {InputSignalWithTransform<unknown, unknown>}
   */
  public readonly result: InputSignalWithTransform<unknown, unknown> = input<unknown, unknown>(
    undefined,
    {
      alias: 'uiDialogClose',
      transform: (value: unknown) => (value === '' ? undefined : value),
    },
  );

  /**
   * Property dialogRef
   * @readonly
   *
   * @description
   * Optional nearest CDK dialog reference, absent when the directive is outside a dialog.
   *
   * @type {DialogRef<unknown, unknown> | null}
   */
  private readonly dialogRef: DialogRef<unknown, unknown> | null = inject<
    DialogRef<unknown, unknown>
  >(DialogRef, { optional: true });

  /**
   * Method close
   * @method close
   *
   * @description
   * Closes the surrounding dialog with the configured result when a dialog reference exists.
   *
   * @returns {void} Completes after requesting dialog closure when a reference is available.
   */
  protected close(): void {
    this.dialogRef?.close(this.result());
  }
  // #endregion
}
