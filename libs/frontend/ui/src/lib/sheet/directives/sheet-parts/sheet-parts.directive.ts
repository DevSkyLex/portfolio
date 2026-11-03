import { DialogRef } from '@angular/cdk/dialog';
import {
  type InputSignal,
  type InputSignalWithTransform,
  type Signal,
  Directive,
  computed,
  inject,
  input,
} from '@angular/core';
import { cn } from '@internal/ui/lib/class-names/class-names.utils';
import {
  linkDialogDescription,
  linkDialogTitle,
} from '@internal/ui/lib/dialog/directives/dialog-parts/dialog-parts.directive';
import {
  dialogDescriptionClasses,
  dialogFooterClasses,
  dialogHeaderClasses,
  dialogTitleClasses,
} from '@internal/ui/lib/dialog/constants/dialog-parts.constants';

/**
 * Directive SheetHeaderDirective
 * @class SheetHeaderDirective
 *
 * @description
 * Applies the shared dialog header layout to the sheet's header slot.
 */
@Directive({
  selector: '[uiSheetHeader]',
  host: { '[class]': 'classes()', 'data-slot': 'sheet-header' },
})
export class SheetHeaderDirective {
  // #region Properties
  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional caller classes merged with the shared dialog header styles.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Header layout classes combined with caller-provided classes.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>((): string =>
    cn(dialogHeaderClasses, this.class()),
  );
  // #endregion
}

/**
 * Directive SheetTitleDirective
 * @class SheetTitleDirective
 *
 * @description
 * Applies shared title styling and registers its generated id as the dialog's accessible name.
 */
@Directive({
  selector: '[uiSheetTitle]',
  host: { '[id]': 'id', '[class]': 'classes()', 'data-slot': 'sheet-title' },
})
export class SheetTitleDirective {
  // #region Properties
  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional caller classes merged with the shared dialog title styles.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property id
   * @readonly
   *
   * @description
   * Generated title id registered with the surrounding dialog's `aria-labelledby` reference.
   *
   * @type {string}
   */
  protected readonly id: string = linkDialogTitle('ui-sheet-title');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Title typography classes combined with caller-provided classes.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>((): string =>
    cn(dialogTitleClasses, this.class()),
  );
  // #endregion
}

/**
 * Directive SheetDescriptionDirective
 * @class SheetDescriptionDirective
 *
 * @description
 * Applies shared description styling and registers its generated id as the dialog's accessible description.
 */
@Directive({
  selector: '[uiSheetDescription]',
  host: { '[id]': 'id', '[class]': 'classes()', 'data-slot': 'sheet-description' },
})
export class SheetDescriptionDirective {
  // #region Properties
  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional caller classes merged with the shared dialog description styles.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property id
   * @readonly
   *
   * @description
   * Generated description id registered with the surrounding dialog's `aria-describedby` reference.
   *
   * @type {string}
   */
  protected readonly id: string = linkDialogDescription('ui-sheet-description');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Description typography classes combined with caller-provided classes.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>((): string =>
    cn(dialogDescriptionClasses, this.class()),
  );
  // #endregion
}

/**
 * Directive SheetFooterDirective
 * @class SheetFooterDirective
 *
 * @description
 * Applies shared footer styling and uses an auto margin to push the footer toward the panel end when space allows.
 */
@Directive({
  selector: '[uiSheetFooter]',
  host: { '[class]': 'classes()', 'data-slot': 'sheet-footer' },
})
export class SheetFooterDirective {
  // #region Properties
  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional caller classes merged with the shared dialog footer styles.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Footer layout classes combined with the auto margin and caller classes.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>((): string =>
    cn(dialogFooterClasses, 'mt-auto', this.class()),
  );
  // #endregion
}

/**
 * Directive SheetCloseDirective
 * @class SheetCloseDirective
 *
 * @description
 * Closes the nearest optional dialog reference on click and passes through the configured result.
 */
@Directive({
  selector: 'button[uiSheetClose]',
  host: { type: 'button', 'data-slot': 'sheet-close', '(click)': 'close()' },
})
export class SheetCloseDirective {
  // #region Properties
  /**
   * Property result
   * @readonly
   *
   * @description
   * Value sent to the dialog's close result; the bare attribute is transformed to `undefined`.
   *
   * @type {import('@angular/core').InputSignalWithTransform<unknown, unknown>}
   */
  public readonly result: InputSignalWithTransform<unknown, unknown> = input<unknown, unknown>(
    undefined,
    {
      alias: 'uiSheetClose',
      transform: (value: unknown): unknown => (value === '' ? undefined : value),
    },
  );

  /**
   * Property dialogRef
   * @readonly
   *
   * @description
   * Optional nearest dialog reference; absence makes the close control a no-op.
   *
   * @type {DialogRef<unknown, unknown> | null}
   */
  private readonly dialogRef: DialogRef<unknown, unknown> | null = inject<
    DialogRef<unknown, unknown>
  >(DialogRef, { optional: true });
  // #endregion

  // #region Methods
  /**
   * Method close
   * @method close
   *
   * @description
   * Closes the optional nearest dialog with the current input result.
   *
   * @returns {void}
   */
  protected close(): void {
    this.dialogRef?.close(this.result());
  }
  // #endregion
}
