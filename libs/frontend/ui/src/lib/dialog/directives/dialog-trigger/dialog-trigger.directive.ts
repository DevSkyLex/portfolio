import type { DialogRef } from '@angular/cdk/dialog';
import {
  DestroyRef,
  Directive,
  Injector,
  PLATFORM_ID,
  TemplateRef,
  inject,
  input,
  output,
  signal,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { DialogService } from '@internal/ui/lib/dialog/dialog.service';
import type { DialogOptions } from '@internal/ui/lib/dialog/models/dialog/dialog-options.interface';
import type { DialogContext } from '@internal/ui/lib/dialog/models/dialog/dialog-context.interface';

/**
 * Class DialogTriggerBase
 * @class DialogTriggerBase
 *
 * @description
 * Shared browser-only trigger behavior for dialogs, alert dialogs and sheets, including accessible
 * open state, content result emission and cleanup when the trigger is destroyed.
 *
 * @template R - Result type emitted when the dialog closes.
 */
@Directive({
  host: {
    'aria-haspopup': 'dialog',
    '[attr.aria-expanded]': 'isOpen()',
    '[attr.aria-controls]': 'controls()',
    '[attr.data-state]': "isOpen() ? 'open' : 'closed'",
    '(click)': 'open()',
  },
})
export abstract class DialogTriggerBase<R = unknown> {
  // #region Properties
  /**
   * Property data
   * @readonly
   *
   * @description
   * Value passed to the opened content and exposed through its template context.
   *
   * @type {InputSignal<unknown>}
   */
  public readonly data: InputSignal<unknown> = input<unknown>();

  /**
   * Property closed
   * @readonly
   *
   * @description
   * Emits the result returned by the dialog, or undefined when it closes without one.
   *
   * @type {OutputEmitterRef<R | undefined>}
   */
  public readonly closed: OutputEmitterRef<R | undefined> = output<R | undefined>();

  /**
   * Property injector
   * @readonly
   *
   * @description
   * Trigger's injection context passed to the panel service for child content providers.
   *
   * @type {Injector}
   */
  protected readonly injector: Injector = inject<Injector>(Injector);

  /**
   * Property browser
   * @readonly
   *
   * @description
   * Guards dialog creation from running during server rendering.
   *
   * @type {boolean}
   */
  private readonly browser: boolean = isPlatformBrowser(inject<object>(PLATFORM_ID));

  /**
   * Property openState
   * @readonly
   *
   * @description
   * Internal mutable state reflected by the trigger's expanded and data-state attributes.
   *
   * @type {WritableSignal<boolean>}
   */
  private readonly openState: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property controls
   * @readonly
   *
   * @description
   * Active dialog id exposed through `aria-controls`, or null while no panel is open.
   *
   * @type {WritableSignal<string | null>}
   */
  protected readonly controls: WritableSignal<string | null> = signal<string | null>(null);

  /**
   * Property ref
   *
   * @description
   * Active dialog reference, cleared when the panel closes.
   *
   * @type {DialogRef<R, unknown> | null}
   */
  private ref: DialogRef<R, unknown> | null = null;

  /**
   * Property isOpen
   * @readonly
   *
   * @description
   * Read-only dialog visibility signal used by the host accessibility attributes.
   *
   * @type {Signal<boolean>}
   */
  public readonly isOpen: Signal<boolean> = this.openState.asReadonly();
  // #endregion

  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Closes the active dialog when the trigger is destroyed.
   */
  public constructor() {
    inject<DestroyRef>(DestroyRef).onDestroy(() => this.ref?.close());
  }
  // #endregion

  // #region Methods
  /**
   * Method openPanel
   * @method openPanel
   *
   * @description
   * Creates the concrete dialog variant opened by the derived trigger.
   *
   * @returns {DialogRef<R, unknown>} Reference to the opened panel.
   */
  protected abstract openPanel(): DialogRef<R, unknown>;

  /**
   * Method open
   * @method open
   *
   * @description
   * Opens one panel in the browser, updates accessible trigger state, and emits its eventual result.
   *
   * @returns {void} Completes after opening the panel or leaving server-side/already-open state unchanged.
   */
  public open(): void {
    if (this.ref || !this.browser) {
      return;
    }
    const ref: DialogRef<R, unknown> = this.openPanel();
    this.ref = ref;
    this.openState.set(true);
    this.controls.set(ref.id);
    ref.closed.subscribe((result) => {
      this.ref = null;
      this.openState.set(false);
      this.controls.set(null);
      this.closed.emit(result);
    });
  }

  /**
   * Method close
   * @method close
   *
   * @description
   * Requests closure of the active panel with an optional result.
   *
   * @param {R} result - Optional value passed to the closed output.
   * @returns {void} Completes after requesting closure when a panel is open.
   */
  public close(result?: R): void {
    this.ref?.close(result);
  }
  // #endregion
}

/**
 * Class DialogContentDirective
 * @class DialogContentDirective
 *
 * @description
 * Exposes an embedded dialog template and the accessibility and close behavior configured by its
 * trigger.
 */
@Directive({ selector: 'ng-template[uiDialogContent]', exportAs: 'uiDialogContent' })
export class DialogContentDirective {
  // #region Properties
  /**
   * Property template
   * @readonly
   *
   * @description
   * Embedded content template rendered by the dialog service.
   *
   * @type {TemplateRef<DialogContext>}
   */
  public readonly template: TemplateRef<DialogContext<unknown, unknown>> =
    inject<TemplateRef<DialogContext>>(TemplateRef);

  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional classes applied to the dialog panel.
   * Bind it on the template (`[class]="'p-2'"`): Angular never passes a static `class` attribute of an
   * `<ng-template>` to an input.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property ariaLabel
   * @readonly
   *
   * @description
   * Accessible fallback name when the content has no dialog title part.
   *
   * @type {InputSignal<string | undefined>}
   */
  public readonly ariaLabel: InputSignal<string | undefined> = input<string>();

  /**
   * Property closeLabel
   * @readonly
   *
   * @description
   * Accessible name for the panel's built-in close button.
   *
   * @type {InputSignal<string | undefined>}
   */
  public readonly closeLabel: InputSignal<string | undefined> = input<string>();

  /**
   * Property showClose
   * @readonly
   *
   * @description
   * Whether the dialog panel renders its built-in close button.
   *
   * @type {InputSignal<boolean>}
   */
  public readonly showClose: InputSignal<boolean> = input<boolean>(true);

  /**
   * Property closeOnBackdropClick
   * @readonly
   *
   * @description
   * Whether clicking outside the panel closes the dialog.
   *
   * @type {InputSignal<boolean>}
   */
  public readonly closeOnBackdropClick: InputSignal<boolean> = input<boolean>(true);
  // #endregion

  // #region Methods
  /**
   * Method ngTemplateContextGuard
   * @method ngTemplateContextGuard
   *
   * @description
   * Narrows the embedded template context to dialog data and reference for Angular template checking.
   *
   * @param {DialogContentDirective} directive - Directive attached to the template.
   * @param {unknown} context - Context value being narrowed.
   * @returns {boolean} Whether the directive and context are present.
   */
  public static ngTemplateContextGuard(
    directive: DialogContentDirective,
    context: unknown,
  ): context is DialogContext {
    // Type narrowing only: Angular never calls the guard at runtime.
    return directive !== null && context !== null;
  }
  // #endregion
}

/**
 * Class DialogTriggerDirective
 * @class DialogTriggerDirective
 *
 * @description
 * Opens its configured dialog template and forwards content settings and result typing to the
 * shared dialog service.
 *
 * @template R - Result type emitted when the dialog closes.
 */
@Directive({
  selector: '[uiDialogTrigger]',
  exportAs: 'uiDialogTrigger',
  host: { 'data-slot': 'dialog-trigger' },
})
export class DialogTriggerDirective<R = unknown> extends DialogTriggerBase<R> {
  // #region Properties
  /**
   * Property content
   * @readonly
   *
   * @description
   * Required dialog template supplying panel styling and accessibility options.
   *
   * @type {InputSignal<DialogContentDirective>}
   */
  public readonly content: InputSignal<DialogContentDirective> =
    input.required<DialogContentDirective>({ alias: 'uiDialogTrigger' });

  /**
   * Property dialogs
   * @readonly
   *
   * @description
   * Shared dialog service used to open this template as a modal panel.
   *
   * @type {DialogService}
   */
  private readonly dialogs: DialogService = inject<DialogService>(DialogService);
  // #endregion

  // #region Methods
  /**
   * Method openPanel
   * @method openPanel
   *
   * @description
   * Opens the configured template with its data, accessible labels, dismissal behavior and injector.
   *
   * @returns {DialogRef<R, unknown>} Reference to the opened dialog.
   */
  protected openPanel(): DialogRef<R, unknown> {
    const content: DialogContentDirective = this.content();
    const options: DialogOptions = {
      data: this.data(),
      class: content.class(),
      ariaLabel: content.ariaLabel(),
      closeLabel: content.closeLabel(),
      showClose: content.showClose(),
      closeOnBackdropClick: content.closeOnBackdropClick(),
      injector: this.injector,
    };
    return this.dialogs.open<R>(content.template, options);
  }
  // #endregion
}
