import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  ElementRef,
  effect,
  inject,
  input,
  output,
  untracked,
  type InputSignal,
  type OutputEmitterRef,
} from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { lucideX } from '@ng-icons/lucide';
import { ButtonDirective } from '@internal/ui/lib/button/button.directive';
import { SeparatorDirective } from '@internal/ui/lib/separator/separator.directive';
import { TooltipDirective } from '@internal/ui/lib/tooltip/tooltip.directive';

/**
 * Component SelectionBarComponent
 * @class SelectionBarComponent
 *
 * @description
 * Floating bar of a multiple selection (D36, in the manner of Linear's): while `count` is above zero it
 * rises at the bottom centre of its column, sticky over the content, with the count, the projected bulk
 * actions (`uiBtn` h-8 buttons) and a clear button; Escape clears too. It is a named region whose count
 * is announced politely. Put it after the list, in the page flow: its host has no height, and its
 * `mt-auto` takes it to the bottom of a full-height flex column when the list is short; its `mb-4`
 * equals its sticky offset, so that sticking never moves it past the end of the page (no scrollbar for a
 * page that fits). When the selection empties while the focus is inside the bar (clear button, a bulk
 * action that clears), the focus goes back where it came from (a row checkbox), else to
 * `returnFocus`. The texts are the caller's: the bar holds no copy of its own.
 */
@Component({
  selector: 'ui-selection-bar',
  imports: [ButtonDirective, NgIcon, SeparatorDirective, TooltipDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'sticky bottom-4 z-10 mt-auto mb-4 flex h-0 items-end justify-center',
    'data-slot': 'selection-bar',
    '(document:keydown.escape)': 'onEscape($event)',
    '(focusin)': 'onFocusIn($event)',
    '(focusout)': 'onFocusOut($event)',
  },
  template: `
    @if (count() > 0) {
      <div
        role="region"
        class="flex items-center gap-1 rounded-lg border border-border bg-surface-float p-[3px] ps-3 text-[13px] text-fg-muted shadow-float transition-[opacity,translate] duration-(--dur-pop) ease-orbit motion-reduce:transition-none starting:translate-y-1.5 starting:opacity-0"
        data-slot="selection-bar-panel"
        [attr.aria-label]="label()"
      >
        <span class="me-1 whitespace-nowrap text-fg tabular-nums" data-slot="selection-bar-count">{{
          countLabel()(count())
        }}</span>
        <div uiSeparator orientation="vertical" class="mx-1 h-4 min-h-0 self-center"></div>
        <ng-content />
        <button
          uiBtn
          type="button"
          variant="ghost"
          size="icon-sm"
          data-slot="selection-bar-clear"
          [attr.aria-label]="clearLabel()"
          [attr.aria-keyshortcuts]="'Escape'"
          [uiTooltip]="clearLabel()"
          [tooltipShortcut]="clearHint()"
          (click)="clear()"
        >
          <ng-icon [svg]="icons.clear" size="16" aria-hidden="true" />
        </button>
      </div>
    }
    <p class="sr-only" aria-live="polite" aria-atomic="true">
      {{ count() > 0 ? countLabel()(count()) : '' }}
    </p>
  `,
})
export class SelectionBarComponent {
  // #region Properties
  /**
   * Property count
   * @readonly
   *
   * @description
   * Number of selected items; the bar shows from one.
   *
   * @type {InputSignal<number>}
   */
  public readonly count: InputSignal<number> = input.required<number>();

  /**
   * Property label
   * @readonly
   *
   * @description
   * Accessible name of the bar's region ("Actions sur la sélection").
   *
   * @type {InputSignal<string>}
   */
  public readonly label: InputSignal<string> = input.required<string>();

  /**
   * Property countLabel
   * @readonly
   *
   * @description
   * Visible and announced count, with its plural ("1 sélectionné", "3 sélectionnés").
   *
   * @type {InputSignal<(count: number) => string>}
   */
  public readonly countLabel: InputSignal<(count: number) => string> =
    input.required<(count: number) => string>();

  /**
   * Property clearLabel
   * @readonly
   *
   * @description
   * Accessible name and tooltip of the clear button.
   *
   * @type {InputSignal<string>}
   */
  public readonly clearLabel: InputSignal<string> = input.required<string>();

  /**
   * Property clearHint
   * @readonly
   *
   * @description
   * Key caps shown in the clear button's tooltip (`['Échap']`); the button announces `Escape`.
   *
   * @type {InputSignal<readonly string[]>}
   */
  public readonly clearHint: InputSignal<readonly string[]> = input<readonly string[]>([]);

  /**
   * Property returnFocus
   * @readonly
   *
   * @description
   * Element focused when the selection empties with the focus in the bar and the element the focus
   * came from is gone.
   *
   * @type {InputSignal<HTMLElement | null>}
   */
  public readonly returnFocus: InputSignal<HTMLElement | null> = input<HTMLElement | null>(null);

  /**
   * Property cleared
   * @readonly
   *
   * @description
   * Emits when the clear button or Escape asks to empty the selection; the owner of the selection
   * empties it.
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly cleared: OutputEmitterRef<void> = output<void>();

  /**
   * Property icons
   * @readonly
   *
   * @description
   * Lucide glyph of the clear button.
   */
  protected readonly icons: { readonly clear: typeof lucideX } = { clear: lucideX } as const;

  /**
   * Property host
   * @readonly
   *
   * @description
   * Host element, tested for the focus.
   *
   * @type {HTMLElement}
   */
  private readonly host: HTMLElement = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  /**
   * Property document
   * @readonly
   *
   * @description
   * Document whose active element is read when the bar closes.
   *
   * @type {Document}
   */
  private readonly document: Document = inject<Document>(DOCUMENT);

  /**
   * Property origin
   *
   * @description
   * Element outside the bar and outside any overlay (a dialog opened from the bar returns there)
   * that held the focus before it entered the bar.
   *
   * @type {HTMLElement | null}
   */
  private origin: HTMLElement | null = null;

  /**
   * Property holdsFocus
   *
   * @description
   * Whether the focus was last inside the bar: a bulk action disabling the focused button sends the
   * focus to the document body (no `relatedTarget`), which still counts as the bar's.
   *
   * @type {boolean}
   */
  private holdsFocus: boolean = false;
  // #endregion

  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Moves the focus out of the bar when the selection empties. A view effect runs before the
   * template removes the panel, so the focused button is still in place to be tested.
   */
  public constructor() {
    effect((): void => {
      if (this.count() > 0) return;
      untracked((): void => this.restoreFocus());
    });
  }
  // #endregion

  // #region Methods
  /**
   * Method clear
   * @method clear
   *
   * @description
   * Asks the owner to empty the selection.
   */
  protected clear(): void {
    this.cleared.emit();
  }

  /**
   * Method onEscape
   * @method onEscape
   *
   * @description
   * Clears the selection on Escape, unless another control already handled the key (a dialog, a
   * menu, an open list) or the key belongs to a text field.
   *
   * @param {Event} event - Escape keydown reaching the document.
   */
  protected onEscape(event: Event): void {
    if (this.count() === 0 || event.defaultPrevented) return;
    const target: EventTarget | null = event.target;
    if (target instanceof Element) {
      if (target.closest('.cdk-overlay-container, [aria-expanded="true"]')) return;
      if (target.matches('textarea, select, [contenteditable="true"]')) return;
      if (target instanceof HTMLInputElement && target.type !== 'checkbox') return;
    }
    event.preventDefault();
    this.clear();
  }

  /**
   * Method onFocusIn
   * @method onFocusIn
   *
   * @description
   * Remembers where the focus came from when it enters the bar from the page.
   *
   * @param {FocusEvent} event - Focus entering an element of the bar.
   */
  protected onFocusIn(event: FocusEvent): void {
    const from: EventTarget | null = event.relatedTarget;
    this.holdsFocus = true;
    if (!(from instanceof HTMLElement) || this.host.contains(from)) return;
    if (from.closest('.cdk-overlay-container')) return;
    this.origin = from;
  }

  /**
   * Method onFocusOut
   * @method onFocusOut
   *
   * @description
   * Forgets the focus once it moves to another element outside the bar.
   *
   * @param {FocusEvent} event - Focus leaving an element of the bar.
   */
  protected onFocusOut(event: FocusEvent): void {
    const to: EventTarget | null = event.relatedTarget;
    if (to instanceof Node && !this.host.contains(to)) this.holdsFocus = false;
  }

  /**
   * Method restoreFocus
   *
   * @description
   * Focuses the remembered origin, else `returnFocus`, when the focus is inside the bar or was
   * dropped on the body from it.
   */
  private restoreFocus(): void {
    const active: Element | null = this.document.activeElement;
    const origin: HTMLElement | null = this.origin;
    const held: boolean = this.holdsFocus;
    this.origin = null;
    this.holdsFocus = false;
    const inside: boolean = !!active && this.host.contains(active);
    const dropped: boolean = held && (!active || active === this.document.body);
    if (!inside && !dropped) return;
    const target: HTMLElement | null = origin?.isConnected ? origin : this.returnFocus();
    target?.focus();
  }
  // #endregion
}
