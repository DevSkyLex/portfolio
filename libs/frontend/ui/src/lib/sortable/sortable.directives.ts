import { LiveAnnouncer } from '@angular/cdk/a11y';
import {
  CDK_DRAG_CONFIG,
  CdkDrag,
  CdkDragHandle,
  CdkDropList,
  type CdkDragDrop,
  type DragDropConfig,
} from '@angular/cdk/drag-drop';
import {
  DestroyRef,
  Directive,
  computed,
  inject,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
} from '@angular/core';
import { cn } from '@internal/ui/lib/class-names/class-names.utils';
import type { SortableMove } from '@internal/ui/lib/sortable/models/sortable-move/sortable-move.interface';

/**
 * Constant SORTABLE_DRAG_CONFIG
 *
 * @description
 * Drag behaviour of every item of a sortable list: vertical only, kept inside the list, a preview
 * drawn like a raised card (the CDK clones the item into the body, so its look comes from these
 * classes, not from a stylesheet).
 *
 * @type {DragDropConfig}
 */
const SORTABLE_DRAG_CONFIG: DragDropConfig = {
  lockAxis: 'y',
  previewClass: [
    'rounded-lg',
    'border',
    'border-border-hover',
    'bg-surface-raised',
    'px-3',
    'shadow-float',
    'opacity-95',
  ],
};

/**
 * Directive SortableListDirective
 * @class SortableListDirective
 *
 * @description
 * Vertical list whose `uiSortableItem`s reorder by dragging their `uiSortableHandle`, or with the
 * handle's ArrowUp / ArrowDown keys (the CDK drag-and-drop has no keyboard support), with a polite
 * announcement of the new position. It emits `moved`; the owner applies the move to its array.
 */
@Directive({
  selector: '[uiSortableList]',
  hostDirectives: [{ directive: CdkDropList, inputs: ['cdkDropListDisabled: disabled'] }],
  providers: [{ provide: CDK_DRAG_CONFIG, useValue: SORTABLE_DRAG_CONFIG }],
  host: { 'data-slot': 'sortable-list' },
})
export class SortableListDirective {
  // #region Properties
  /**
   * Property moved
   * @readonly
   *
   * @description
   * Emits each move that changed an item's position.
   *
   * @type {OutputEmitterRef<SortableMove>}
   */
  public readonly moved: OutputEmitterRef<SortableMove> = output<SortableMove>();

  /**
   * Property dropList
   * @readonly
   *
   * @description
   * CDK drop list carrying the pointer sorting.
   *
   * @type {CdkDropList}
   */
  private readonly dropList: CdkDropList = inject<CdkDropList>(CdkDropList);

  /**
   * Property announcer
   * @readonly
   *
   * @description
   * Live region announcing a keyboard move.
   *
   * @type {LiveAnnouncer}
   */
  private readonly announcer: LiveAnnouncer = inject<LiveAnnouncer>(LiveAnnouncer);
  // #endregion

  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Sorts vertically and forwards the pointer drops that moved an item.
   */
  public constructor() {
    this.dropList.orientation = 'vertical';
    this.dropList.lockAxis = 'y';
    const subscription: { unsubscribe(): void } = this.dropList.dropped.subscribe(
      (drop: CdkDragDrop<unknown>): void => {
        if (drop.previousIndex === drop.currentIndex) return;
        this.moved.emit({
          previousIndex: drop.previousIndex,
          currentIndex: drop.currentIndex,
          keyboard: false,
        });
      },
    );
    inject<DestroyRef>(DestroyRef).onDestroy((): void => subscription.unsubscribe());
  }
  // #endregion

  // #region Methods
  /**
   * Method moveBy
   * @method moveBy
   *
   * @description
   * Moves an item one place up or down from its handle's keyboard, within the list, and announces
   * its new position (« Position 2 sur 5 »).
   *
   * @param {number} index - Current position of the item.
   * @param {-1 | 1} offset - Direction.
   *
   * @returns {void}
   */
  public moveBy(index: number, offset: -1 | 1): void {
    if (this.dropList.disabled) return;
    const count: number = this.dropList.getSortedItems().length;
    const target: number = index + offset;
    if (target < 0 || target >= count) return;
    this.moved.emit({ previousIndex: index, currentIndex: target, keyboard: true });
    void this.announcer.announce(
      $localize`:@@ui.sortable.position:Position ${target + 1}:position: sur ${count}:count:`,
    );
  }
  // #endregion
}

/**
 * Directive SortableItemDirective
 * @class SortableItemDirective
 *
 * @description
 * Item of a `uiSortableList`, dragged by its `uiSortableHandle` only. While it is dragged, its place
 * shows a faded copy; its neighbours slide out of the way and it settles into place with the
 * `--dur-roll` motion (none with reduced motion).
 */
@Directive({
  selector: '[uiSortableItem]',
  hostDirectives: [CdkDrag],
  host: { '[class]': 'classes()', 'data-slot': 'sortable-item' },
})
export class SortableItemDirective {
  // #region Properties
  /**
   * Property index
   * @readonly
   *
   * @description
   * Position of the item in the list, used by its handle's keyboard moves.
   *
   * @type {InputSignal<number>}
   */
  public readonly index: InputSignal<number> = input.required<number>({ alias: 'uiSortableItem' });

  /**
   * Property class
   * @readonly
   *
   * @description
   * Caller classes merged with the drag states.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Drag states on the CDK classes: the faded placeholder, the sliding neighbours, the drop.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn(
      '[&.cdk-drag-placeholder]:opacity-30',
      '[.cdk-drop-list-dragging_&]:transition-transform [.cdk-drop-list-dragging_&]:duration-(--dur-roll) [.cdk-drop-list-dragging_&]:ease-orbit',
      '[&.cdk-drag-animating]:transition-transform [&.cdk-drag-animating]:duration-(--dur-roll) [&.cdk-drag-animating]:ease-orbit',
      'motion-reduce:transition-none',
      this.class(),
    ),
  );
  // #endregion
}

/**
 * Directive SortableHandleDirective
 * @class SortableHandleDirective
 *
 * @description
 * Grip button of a `uiSortableItem`: the pointer drags the item from it, ArrowUp / ArrowDown move the
 * item one place (`aria-keyshortcuts`). The caller gives it its accessible name (« Déplacer le lien
 * 2 ») and its look (`uiBtn`, a grip icon).
 */
@Directive({
  selector: 'button[uiSortableHandle]',
  hostDirectives: [CdkDragHandle],
  host: {
    'data-slot': 'sortable-handle',
    class: 'cursor-grab touch-none active:cursor-grabbing',
    'aria-keyshortcuts': 'ArrowUp ArrowDown',
    '(keydown)': 'onKeydown($event)',
  },
})
export class SortableHandleDirective {
  // #region Properties
  /**
   * Property list
   * @readonly
   *
   * @description
   * Enclosing list, which applies keyboard moves.
   *
   * @type {SortableListDirective}
   */
  private readonly list: SortableListDirective =
    inject<SortableListDirective>(SortableListDirective);

  /**
   * Property item
   * @readonly
   *
   * @description
   * Item the handle moves.
   *
   * @type {SortableItemDirective}
   */
  private readonly item: SortableItemDirective =
    inject<SortableItemDirective>(SortableItemDirective);
  // #endregion

  // #region Methods
  /**
   * Method onKeydown
   * @method onKeydown
   *
   * @description
   * Moves the item one place with an unmodified ArrowUp or ArrowDown.
   *
   * @param {KeyboardEvent} event - Key pressed on the handle.
   *
   * @returns {void}
   */
  protected onKeydown(event: KeyboardEvent): void {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const offset: -1 | 1 | null =
      event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : null;
    if (offset === null) return;
    event.preventDefault();
    this.list.moveBy(this.item.index(), offset);
  }
  // #endregion
}
