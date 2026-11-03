import { CdkContextMenuTrigger } from '@angular/cdk/menu';
import { DestroyRef, Directive, ElementRef, afterNextRender, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { panelPositions } from '@internal/ui/lib/menu-panel/utils/menu-panel/menu-panel.utils';

/**
 * Class ContextMenuTriggerDirective
 * @class ContextMenuTriggerDirective
 *
 * @description
 * Adapts the CDK context-menu trigger to pointer and keyboard invocation, positioning the menu at
 * the pointer or beneath the focused host and composing its panel from dropdown-menu parts.
 */
@Directive({
  selector: '[uiContextMenuTrigger]',
  hostDirectives: [
    {
      directive: CdkContextMenuTrigger,
      inputs: [
        'cdkContextMenuTriggerFor: uiContextMenuTrigger',
        'cdkContextMenuTriggerData: uiContextMenuTriggerData',
        'cdkContextMenuDisabled: disabled',
      ],
      outputs: ['cdkContextMenuOpened: opened', 'cdkContextMenuClosed: closed'],
    },
  ],
  host: {
    'data-slot': 'context-menu-trigger',
    '(keydown)': 'onKeydown($event)',
    '(pointerdown)': 'fromKeyboard = false',
  },
})
export class ContextMenuTriggerDirective {
  // #region Properties
  /**
   * Property element
   * @readonly
   *
   * @description
   * Trigger host used to calculate the keyboard invocation point and scope native context events.
   *
   * @type {HTMLElement}
   */
  private readonly element: HTMLElement = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  /**
   * Property document
   * @readonly
   *
   * @description
   * Owning document used to register the capture listener and construct a compatible mouse event.
   *
   * @type {Document}
   */
  private readonly document: Document = inject<Document>(DOCUMENT);

  /**
   * Property trigger
   * @readonly
   *
   * @description
   * Host CDK trigger that owns overlay creation, disabled state and menu focus behavior.
   *
   * @type {CdkContextMenuTrigger}
   */
  private readonly trigger: CdkContextMenuTrigger = inject<CdkContextMenuTrigger>(
    CdkContextMenuTrigger,
    { self: true },
  );

  /**
   * Property fromKeyboard
   *
   * @description
   * Marks the interval in which a browser may emit a duplicate native context-menu event after the
   * keyboard shortcut has been replayed.
   *
   * @type {boolean}
   */
  protected fromKeyboard: boolean = false;

  /**
   * Property replaying
   *
   * @description
   * Prevents the capture listener from suppressing the synthetic event used to invoke the CDK menu.
   *
   * @type {boolean}
   */
  private replaying: boolean = false;
  // #endregion

  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Applies shared panel positions and registers a capture-phase listener after rendering so native
   * context-menu handling can be coordinated with the CDK trigger.
   */
  public constructor() {
    this.trigger.menuPosition = panelPositions();

    // Capture phase on the document: runs before the CDK listeners (outside clicks, trigger).
    const destroyRef: DestroyRef = inject<DestroyRef>(DestroyRef);
    afterNextRender(() => {
      const listener = (event: MouseEvent): void => this.onNativeContextMenu(event);
      this.document.addEventListener('contextmenu', listener, { capture: true });
      destroyRef.onDestroy(() =>
        this.document.removeEventListener('contextmenu', listener, { capture: true }),
      );
    });
  }
  // #endregion

  // #region Methods
  /**
   * Method onKeydown
   * @method onKeydown
   *
   * @description
   * Replays Shift+F10 or the ContextMenu key at the focused host's lower edge so the CDK opens and
   * focuses the first menu row.
   *
   * @param {KeyboardEvent} event - Keyboard event from the trigger host.
   * @returns {void} Completes after replaying the keyboard invocation or leaving the event unchanged.
   */
  protected onKeydown(event: KeyboardEvent): void {
    const shortcut: boolean =
      event.key === 'ContextMenu' || (event.key === 'F10' && event.shiftKey);
    if (!shortcut || this.trigger.disabled) return;
    event.preventDefault();
    this.fromKeyboard = true;
    const rect: DOMRect = this.element.getBoundingClientRect();
    const view: (Window & typeof globalThis) | null = this.document.defaultView;
    if (!view) return;

    // Replays a keyboard-like context menu (button 0) under the target: the CDK then focuses the first row.
    this.replaying = true;
    this.element.dispatchEvent(
      new view.MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        button: 0,
        clientX: rect.left,
        clientY: rect.bottom,
      }),
    );
    this.replaying = false;
  }

  /**
   * Method onNativeContextMenu
   * @method onNativeContextMenu
   *
   * @description
   * Suppresses a duplicate browser-generated context menu after keyboard invocation when it targets
   * this host, while allowing pointer-triggered context menus through.
   *
   * @param {MouseEvent} event - Native or synthetic context-menu event observed at document capture.
   * @returns {void} Completes after suppressing a duplicate keyboard echo when applicable.
   */
  private onNativeContextMenu(event: MouseEvent): void {
    if (this.replaying || !this.fromKeyboard) return;
    if (!(event.target instanceof Node) || !this.element.contains(event.target)) return;
    this.fromKeyboard = false;
    event.preventDefault();
    event.stopImmediatePropagation();
  }
  // #endregion
}
