import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  booleanAttribute,
  inject,
  input,
  output,
  type InputSignal,
  type InputSignalWithTransform,
  type OutputEmitterRef,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import {
  lucideEllipsis,
  lucideGripVertical,
  lucideMessageCircleQuestionMark,
  lucidePencil,
  lucideTrash2,
} from '@ng-icons/lucide';
import type { AdminFaqEntry } from '@vfortin/content-web-data-access/admin';
import {
  ButtonDirective,
  DropdownMenuContentDirective,
  DropdownMenuItemDirective,
  DropdownMenuSeparatorDirective,
  DropdownMenuTriggerDirective,
  EMPTY_IMPORTS,
  SORTABLE_IMPORTS,
  SkeletonDirective,
  TooltipDirective,
  type SortableMove,
} from '@vfortin/ui';

/**
 * Component FaqListDataviewComponent
 * @class FaqListDataviewComponent
 *
 * @description
 * Questions of the FAQ in their public order: each row shows its question (the link to its editor)
 * and the start of its answer, a grip that reorders the rows by dragging or with its arrow keys
 * (`uiSortableList`, kept focused after a keyboard move), and a row menu « Modifier », « Supprimer ».
 * Without questions, an empty state offers the creation. It renders and reports intents only; the
 * page writes.
 */
@Component({
  selector: 'content-faq-list-dataview',
  imports: [
    ButtonDirective,
    DropdownMenuContentDirective,
    DropdownMenuItemDirective,
    DropdownMenuSeparatorDirective,
    DropdownMenuTriggerDirective,
    EMPTY_IMPORTS,
    NgIcon,
    RouterLink,
    SORTABLE_IMPORTS,
    SkeletonDirective,
    TooltipDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-auto flex-col' },
  templateUrl: './faq-list-dataview.component.html',
})
export class FaqListDataviewComponent {
  // #region Properties
  /**
   * Property entries
   * @readonly
   *
   * @description
   * Questions by position.
   *
   * @type {InputSignal<readonly AdminFaqEntry[]>}
   */
  public readonly entries: InputSignal<readonly AdminFaqEntry[]> =
    input.required<readonly AdminFaqEntry[]>();

  /**
   * Property loading
   * @readonly
   *
   * @description
   * Whether the list is loading: placeholder rows replace an empty list.
   *
   * @type {InputSignalWithTransform<boolean, unknown>}
   */
  public readonly loading: InputSignalWithTransform<boolean, unknown> = input<boolean, unknown>(
    false,
    { transform: booleanAttribute },
  );

  /**
   * Property writing
   * @readonly
   *
   * @description
   * Whether a write is running: the grips and « Supprimer » are disabled.
   *
   * @type {InputSignalWithTransform<boolean, unknown>}
   */
  public readonly writing: InputSignalWithTransform<boolean, unknown> = input<boolean, unknown>(
    false,
    { transform: booleanAttribute },
  );

  /**
   * Property moved
   * @readonly
   *
   * @description
   * Emits each move of a row, by pointer or keyboard.
   *
   * @type {OutputEmitterRef<SortableMove>}
   */
  public readonly moved: OutputEmitterRef<SortableMove> = output<SortableMove>();

  /**
   * Property deleteRequested
   * @readonly
   *
   * @description
   * Emits the question whose « Supprimer » was chosen.
   *
   * @type {OutputEmitterRef<AdminFaqEntry>}
   */
  public readonly deleteRequested: OutputEmitterRef<AdminFaqEntry> = output<AdminFaqEntry>();

  /**
   * Property icons
   * @readonly
   *
   * @description
   * Lucide icons of the rows, their menu and the empty state.
   */
  protected readonly icons: {
    readonly empty: typeof lucideMessageCircleQuestionMark;
    readonly edit: typeof lucidePencil;
    readonly grip: typeof lucideGripVertical;
    readonly more: typeof lucideEllipsis;
    readonly remove: typeof lucideTrash2;
  } = {
    empty: lucideMessageCircleQuestionMark,
    edit: lucidePencil,
    grip: lucideGripVertical,
    more: lucideEllipsis,
    remove: lucideTrash2,
  } as const;

  /**
   * Property host
   * @readonly
   *
   * @description
   * Host element, searched for a row's controls.
   *
   * @type {HTMLElement}
   */
  private readonly host: HTMLElement = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  /**
   * Property injector
   * @readonly
   *
   * @description
   * Injector of the focus moves after a keyboard reorder.
   *
   * @type {Injector}
   */
  private readonly injector: Injector = inject<Injector>(Injector);
  // #endregion

  // #region Methods
  /**
   * Method actionsTrigger
   * @method actionsTrigger
   *
   * @description
   * "…" button of a question's row, where a dialog opened from its menu returns the focus.
   *
   * @param {AdminFaqEntry} entry - Question of the row.
   *
   * @returns {HTMLButtonElement | null} The button, `null` when the row is not rendered.
   */
  public actionsTrigger(entry: AdminFaqEntry): HTMLButtonElement | null {
    return (
      [...this.host.querySelectorAll<HTMLButtonElement>('button[data-entry-actions]')].find(
        (button: HTMLButtonElement): boolean => button.dataset['entryActions'] === entry.id,
      ) ?? null
    );
  }

  /**
   * Method move
   * @method move
   *
   * @description
   * Reports a row move; after a keyboard move the grip of the moved row keeps the focus once the list
   * shows the new order.
   *
   * @param {SortableMove} move - Positions before and after the move.
   */
  protected move(move: SortableMove): void {
    const entry: AdminFaqEntry | undefined = this.entries()[move.previousIndex];
    this.moved.emit(move);
    if (!move.keyboard || !entry) return;
    afterNextRender(
      {
        read: (): void =>
          [...this.host.querySelectorAll<HTMLButtonElement>('button[data-entry-handle]')]
            .find(
              (button: HTMLButtonElement): boolean => button.dataset['entryHandle'] === entry.id,
            )
            ?.focus(),
      },
      { injector: this.injector },
    );
  }

  /**
   * Method actionsLabel
   * @method actionsLabel
   *
   * @description
   * Accessible name of a row's "…" button.
   *
   * @param {AdminFaqEntry} entry - Question of the row.
   *
   * @returns {string} Label naming the question in French.
   */
  protected actionsLabel(entry: AdminFaqEntry): string {
    return $localize`:@@admin.faq.row.actions:Actions pour « ${entry.question.fr}:question: »`;
  }

  /**
   * Method moveLabel
   * @method moveLabel
   *
   * @description
   * Accessible name of a row's grip.
   *
   * @param {AdminFaqEntry} entry - Question of the row.
   *
   * @returns {string} Label naming the question in French.
   */
  protected moveLabel(entry: AdminFaqEntry): string {
    return $localize`:@@admin.faq.row.move:Déplacer « ${entry.question.fr}:question: »`;
  }
  // #endregion
}
