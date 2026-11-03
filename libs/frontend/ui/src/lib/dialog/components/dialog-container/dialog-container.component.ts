import { CdkDialogContainer, DialogRef, type DialogContainer } from '@angular/cdk/dialog';
import { CdkPortalOutlet } from '@angular/cdk/portal';
import {
  ChangeDetectionStrategy,
  Component,
  type DestroyRef,
  computed,
  inject,
  signal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { lucideX } from '@ng-icons/lucide';
import { buttonVariants } from '@internal/ui/lib/button/constants/button.variants';
import { cn } from '@internal/ui/lib/class-names/class-names.utils';
import type { DialogPanel } from '@internal/ui/lib/dialog/models/dialog/dialog-panel.interface';
import { DIALOG_PANEL } from '@internal/ui/lib/dialog/tokens/dialog-panel/dialog-panel.token';

/**
 * Class DialogContainerComponent
 * @class DialogContainerComponent
 *
 * @description
 * Styles the CDK modal container, provides its close control and tracks title and description
 * relationships for assistive technology.
 */
@Component({
  selector: 'ui-dialog-container',
  imports: [CdkPortalOutlet, NgIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-template cdkPortalOutlet />
    @if (panel.closeLabel; as label) {
      <button
        type="button"
        data-slot="dialog-close"
        [class]="closeClasses"
        [attr.aria-label]="label"
        (click)="dismiss()"
      >
        <ng-icon [svg]="icons.x" size="16" aria-hidden="true" />
      </button>
    }
  `,
  host: {
    '[class]': 'panel.class',
    '[attr.data-slot]': 'panel.slot',
    '[attr.aria-describedby]': 'describedBy()',
  },
})
export class DialogContainerComponent extends CdkDialogContainer {
  // #region Properties
  /**
   * Property panel
   * @readonly
   *
   * @description
   * Panel styling and accessible close-label settings supplied by the opening service.
   *
   * @type {DialogPanel}
   */
  protected readonly panel: DialogPanel = inject<DialogPanel>(DIALOG_PANEL);

  /**
   * Property icons
   * @readonly
   *
   * @description
   * Close icon definition rendered by the built-in dismiss button.
   *
   * @type {{ readonly x: typeof lucideX }}
   */
  protected readonly icons: { readonly x: typeof lucideX } = { x: lucideX } as const;

  /**
   * Property closeClasses
   * @readonly
   *
   * @description
   * Ghost button variant positioned in the panel's upper-right corner.
   *
   * @type {string}
   */
  protected readonly closeClasses: string = cn(
    buttonVariants({ variant: 'ghost', size: 'sm' }),
    'absolute top-3 right-3 w-9 px-0',
  );

  /**
   * Property dialogRef
   * @readonly
   *
   * @description
   * CDK dialog reference used to dismiss the active panel.
   *
   * @type {DialogRef<unknown, unknown>}
   */
  private readonly dialogRef: DialogRef<unknown, unknown> =
    inject<DialogRef<unknown, unknown>>(DialogRef);

  /**
   * Property descriptions
   * @readonly
   *
   * @description
   * Registered description ids; the first registered id supplies `aria-describedby`.
   *
   * @type {WritableSignal<readonly string[]>}
   */
  private readonly descriptions: WritableSignal<readonly string[]> = signal<readonly string[]>([]);

  /**
   * Property describedBy
   * @readonly
   *
   * @description
   * First registered description id, falling back to the configured CDK description id.
   *
   * @type {Signal<string | null>}
   */
  protected readonly describedBy: Signal<string | null> = computed<string | null>(
    () => this.descriptions()[0] ?? this._config.ariaDescribedBy ?? null,
  );
  // #endregion

  // #region Methods
  /**
   * Method registerTitle
   * @method registerTitle
   *
   * @description
   * Adds a title id to the CDK dialog's labelled-by relationship and removes it with its owner.
   *
   * @param {string} id - Identifier of the title element.
   * @param {DestroyRef} destroyRef - Lifecycle scope that owns the title registration.
   * @returns {void} Completes after registering the title and its cleanup callback.
   */
  public registerTitle(id: string, destroyRef: DestroyRef): void {
    this._addAriaLabelledBy(id);
    destroyRef.onDestroy(() => this._removeAriaLabelledBy(id));
  }

  /**
   * Method registerDescription
   * @method registerDescription
   *
   * @description
   * Adds a description id to the dialog and removes it when its owner is destroyed.
   *
   * @param {string} id - Identifier of the description element.
   * @param {DestroyRef} destroyRef - Lifecycle scope that owns the description registration.
   * @returns {void} Completes after registering the description and its cleanup callback.
   */
  public registerDescription(id: string, destroyRef: DestroyRef): void {
    this.descriptions.update((ids) => [...ids, id]);
    destroyRef.onDestroy(() => this.descriptions.update((ids) => ids.filter((one) => one !== id)));
  }

  /**
   * Method dismiss
   * @method dismiss
   *
   * @description
   * Closes the dialog with mouse-origin focus restoration after the built-in close button is used.
   *
   * @returns {void} Completes after requesting closure of the dialog.
   */
  protected dismiss(): void {
    this.dialogRef.close(undefined, { focusOrigin: 'mouse' });
  }
  // #endregion
}

/**
 * Function injectDialogContainer
 *
 * @description
 * Returns the current dialog container when called inside one, or null outside a dialog context.
 *
 * @returns {DialogContainerComponent | null} Active dialog container, if present.
 */
export function injectDialogContainer(): DialogContainerComponent | null {
  const container: DialogContainer | undefined = inject<DialogRef<unknown, unknown>>(DialogRef, {
    optional: true,
  })?.containerInstance;
  return container instanceof DialogContainerComponent ? container : null;
}
