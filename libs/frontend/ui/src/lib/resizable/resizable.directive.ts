import { RenderIdService } from '@internal/ui/lib/render-id/render-id.service';
import { Directionality } from '@angular/cdk/bidi';
import {
  type InputSignal,
  type InputSignalWithTransform,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
  ChangeDetectionStrategy,
  Component,
  Directive,
  ElementRef,
  computed,
  contentChildren,
  forwardRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { lucideGripVertical } from '@ng-icons/lucide';
import { cn } from '@internal/ui/lib/class-names/class-names.utils';
import {
  initialPanelSizes,
  resizePanels,
} from '@internal/ui/lib/resizable/utils/resizable/resizable.utils';
import type { ResizableDirection } from '@internal/ui/lib/resizable/models/resizable/resizable-direction.type';

/**
 * Directive ResizablePanelGroupDirective
 * @class ResizablePanelGroupDirective
 *
 * @description
 * Coordinates panel layout and resizing for direct descendant panels and handles. Panel sizes are
 * percentages of the group and respect each panel's configured bounds.
 */
@Directive({
  selector: '[uiResizablePanelGroup]',
  exportAs: 'uiResizablePanelGroup',
  host: {
    '[class]': 'classes()',
    'data-slot': 'resizable-panel-group',
    '[attr.data-panel-group-direction]': 'direction()',
  },
})
export class ResizablePanelGroupDirective {
  // #region Properties
  /**
   * Property direction
   * @readonly
   *
   * @description
   * Axis used to lay out panels and interpret handle movement.
   *
   * @type {InputSignal<ResizableDirection>}
   */
  public readonly direction: InputSignal<ResizableDirection> =
    input<ResizableDirection>('horizontal');

  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional utility classes merged with the group layout.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property layoutChange
   * @readonly
   *
   * @description
   * Emits panel percentages after a keyboard adjustment or completed pointer drag.
   *
   * @type {OutputEmitterRef<readonly number[]>}
   */
  public readonly layoutChange: OutputEmitterRef<readonly number[]> = output<readonly number[]>();

  /**
   * Property element
   * @readonly
   *
   * @description
   * Native group element used to measure pointer movement along the active axis.
   *
   * @type {HTMLElement}
   */
  public readonly element: HTMLElement = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  /**
   * Property allPanels
   * @readonly
   *
   * @description
   * Descendant panels discovered under the group before ownership filtering.
   *
   * @type {Signal<readonly ResizablePanelDirective[]>}
   */
  private readonly allPanels: Signal<readonly ResizablePanelDirective[]> =
    contentChildren<ResizablePanelDirective>(
      forwardRef((): typeof ResizablePanelDirective => ResizablePanelDirective),
      {
        descendants: true,
      },
    );

  /**
   * Property allHandles
   * @readonly
   *
   * @description
   * Descendant handles discovered under the group before ownership filtering.
   *
   * @type {Signal<readonly ResizableHandleComponent[]>}
   */
  private readonly allHandles: Signal<readonly ResizableHandleComponent[]> =
    contentChildren<ResizableHandleComponent>(
      forwardRef((): typeof ResizableHandleComponent => ResizableHandleComponent),
      {
        descendants: true,
      },
    );

  /**
   * Property panels
   * @readonly
   *
   * @description
   * Descendant panels whose nearest owning group is this directive.
   *
   * @type {Signal<readonly ResizablePanelDirective[]>}
   */
  private readonly panels: Signal<ResizablePanelDirective[]> = computed<ResizablePanelDirective[]>(
    (): ResizablePanelDirective[] =>
      this.allPanels().filter((panel: ResizablePanelDirective): boolean => panel.group === this),
  );

  /**
   * Property handles
   * @readonly
   *
   * @description
   * Descendant handles whose owning group is this directive.
   *
   * @type {Signal<readonly ResizableHandleComponent[]>}
   */
  private readonly handles: Signal<ResizableHandleComponent[]> = computed<
    ResizableHandleComponent[]
  >((): ResizableHandleComponent[] =>
    this.allHandles().filter((handle: ResizableHandleComponent): boolean => handle.group === this),
  );

  /**
   * Property layout
   * @readonly
   *
   * @description
   * Last calculated panel layout, or `null` until sizes are first derived from panel defaults.
   *
   * @type {WritableSignal<readonly number[] | null>}
   */
  private readonly layout: WritableSignal<readonly number[] | null> = signal<
    readonly number[] | null
  >(null);

  /**
   * Property sizes
   * @readonly
   *
   * @description
   * Current panel sizes; derives the initial layout until a stored layout matches panel count.
   *
   * @type {Signal<readonly number[]>}
   */
  public readonly sizes: Signal<readonly number[]> = computed<readonly number[]>(
    (): readonly number[] => {
      const panels: ResizablePanelDirective[] = this.panels();
      const layout: readonly number[] | null = this.layout();
      return layout?.length === panels.length
        ? layout
        : initialPanelSizes(
            panels.map((panel: ResizablePanelDirective): number | undefined => panel.defaultSize()),
          );
    },
  );

  /**
   * Property limits
   * @readonly
   *
   * @description
   * Current minimum and maximum percentages for each owned panel.
   *
   * @type {Signal<PanelLimits[]>}
   */
  private readonly limits: Signal<{ min: number; max: number }[]> = computed<
    { min: number; max: number }[]
  >((): { min: number; max: number }[] =>
    this.panels().map((panel: ResizablePanelDirective): { min: number; max: number } => ({
      min: panel.minSize(),
      max: panel.maxSize(),
    })),
  );

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Group flex layout classes with column direction applied to vertical groups.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>((): string =>
    cn('flex h-full w-full', this.direction() === 'vertical' && 'flex-col', this.class()),
  );
  // #endregion

  // #region Methods
  /**
   * Method sizeOf
   * @method sizeOf
   *
   * @description
   * Returns the current percentage for a panel owned by this group.
   *
   * @param {ResizablePanelDirective} panel - Panel whose current percentage is requested.
   * @returns {number} Panel size, or zero when the panel is not in the current layout.
   */
  public sizeOf(panel: ResizablePanelDirective): number {
    return this.sizes()[this.panels().indexOf(panel)] ?? 0;
  }

  /**
   * Method panelBefore
   * @method panelBefore
   *
   * @description
   * Returns the panel immediately before a handle, which is the value represented by that handle.
   *
   * @param {ResizableHandleComponent} handle - Handle whose preceding panel is requested.
   * @returns {ResizablePanelDirective | undefined} Preceding panel when the handle belongs to the group.
   */
  public panelBefore(handle: ResizableHandleComponent): ResizablePanelDirective | undefined {
    return this.panels()[this.handles().indexOf(handle)];
  }

  /**
   * Method resize
   * @method resize
   *
   * @description
   * Applies a percentage-point change to the two panels beside a handle and stores the new layout.
   *
   * @param {ResizableHandleComponent} handle - Boundary being moved.
   * @param {number} delta - Requested change in percentage points.
   * @param {readonly number[]} from - Starting sizes; pointer drags pass their captured initial layout.
   * @returns {readonly number[]} Updated panel percentages.
   */
  public resize(
    handle: ResizableHandleComponent,
    delta: number,
    from: readonly number[] = this.sizes(),
  ): readonly number[] {
    const sizes: number[] = resizePanels(
      from,
      this.handles().indexOf(handle),
      delta,
      this.limits(),
    );
    this.layout.set(sizes);
    return sizes;
  }

  /**
   * Method commit
   * @method commit
   *
   * @description
   * Emits the current layout to consumers after a keyboard change or completed drag.
   *
   * @returns {void} Emits the current panel percentages.
   */
  public commit(): void {
    this.layoutChange.emit(this.sizes());
  }
  // #endregion
}

/**
 * Directive ResizablePanelDirective
 * @class ResizablePanelDirective
 *
 * @description
 * Declares one panel in a resizable group and applies its current percentage as the host flex basis.
 */
@Directive({
  selector: '[uiResizablePanel]',
  host: {
    '[class]': 'classes()',
    'data-slot': 'resizable-panel',
    '[id]': 'id',
    '[style.flex]': 'size() + " 1 0px"',
  },
})
export class ResizablePanelDirective {
  // #region Properties
  /**
   * Property group
   * @readonly
   *
   * @description
   * Group that calculates this panel's size and supplies its layout constraints.
   *
   * @type {ResizablePanelGroupDirective}
   */
  public readonly group: ResizablePanelGroupDirective = inject<ResizablePanelGroupDirective>(
    ResizablePanelGroupDirective,
  );

  /**
   * Property defaultSize
   * @readonly
   *
   * @description
   * Initial group percentage; panels without a default split the remaining space.
   *
   * @type {InputSignal<number | undefined>}
   */
  public readonly defaultSize: InputSignal<number | undefined> = input<number>();

  /**
   * Property minSize
   * @readonly
   *
   * @description
   * Smallest percentage accepted during keyboard and pointer resizing.
   *
   * @type {InputSignal<number>}
   */
  public readonly minSize: InputSignal<number> = input<number>(0);

  /**
   * Property maxSize
   * @readonly
   *
   * @description
   * Largest percentage accepted during keyboard and pointer resizing.
   *
   * @type {InputSignal<number>}
   */
  public readonly maxSize: InputSignal<number> = input<number>(100);

  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional utility classes applied to this panel.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property id
   * @readonly
   *
   * @description
   * Stable host id referenced by a handle's `aria-controls` attribute.
   *
   * @type {string}
   */
  public readonly id: string = inject<RenderIdService>(RenderIdService).next('ui-resizable-panel-');

  /**
   * Property size
   * @readonly
   *
   * @description
   * Current percentage supplied by the owning group for this panel.
   *
   * @type {Signal<number>}
   */
  protected readonly size: Signal<number> = computed<number>((): number => this.group.sizeOf(this));

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Panel overflow and minimum-size classes merged with caller utilities.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>((): string =>
    cn('min-h-0 min-w-0 overflow-hidden', this.class()),
  );
  // #endregion
}

/**
 * Component ResizableHandleComponent
 * @class ResizableHandleComponent
 *
 * @description
 * Provides an accessible window splitter that supports pointer dragging and keyboard resizing
 * with arrow keys, Home and End.
 */
@Component({
  selector: 'ui-resizable-handle',
  imports: [NgIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'separator',
    tabindex: '0',
    '[class]': 'classes()',
    'data-slot': 'resizable-handle',
    '[attr.aria-orientation]': 'group.direction() === "horizontal" ? "vertical" : "horizontal"',
    '[attr.aria-controls]': 'panel()?.id',
    '[attr.aria-valuenow]': 'value()',
    '[attr.aria-valuemin]': 'panel()?.minSize() ?? 0',
    '[attr.aria-valuemax]': 'panel()?.maxSize() ?? 100',
    '[attr.aria-label]': 'label() || null',
    '[attr.data-dragging]': 'dragging() || null',
    '(keydown)': 'onKeydown($event)',
    '(pointerdown)': 'onPointerDown($event)',
    '(pointermove)': 'onPointerMove($event)',
    '(pointerup)': 'onPointerEnd($event)',
    '(pointercancel)': 'onPointerEnd($event)',
  },
  template: `@if (withHandle()) {
    <span
      class="z-10 flex h-6 w-3.5 items-center justify-center rounded-option border border-line bg-void-raised text-star-faint"
      [class.rotate-90]="group.direction() === 'vertical'"
    >
      <ng-icon [svg]="icons.grip" size="12" aria-hidden="true" />
    </span>
  }`,
})
export class ResizableHandleComponent {
  // #region Properties
  /**
   * Property group
   * @readonly
   *
   * @description
   * Group whose neighboring panels are resized by this handle.
   *
   * @type {ResizablePanelGroupDirective}
   */
  public readonly group: ResizablePanelGroupDirective = inject<ResizablePanelGroupDirective>(
    ResizablePanelGroupDirective,
  );

  /**
   * Property icons
   * @readonly
   *
   * @description
   * Grip icon rendered when the optional visual handle is enabled.
   *
   * @type {{ readonly grip: typeof lucideGripVertical }}
   */
  protected readonly icons: { readonly grip: typeof lucideGripVertical } = {
    grip: lucideGripVertical,
  } as const;

  /**
   * Property withHandle
   * @readonly
   *
   * @description
   * Whether the line displays a centered grip icon.
   *
   * @type {InputSignalWithTransform<boolean, boolean | '>}
   */
  public readonly withHandle: InputSignalWithTransform<boolean, boolean | ''> = input<
    boolean,
    boolean | ''
  >(false, {
    transform: (value: boolean | ''): value is true | '' => value === '' || value,
  });

  /**
   * Property step
   * @readonly
   *
   * @description
   * Percentage points transferred by each arrow-key press.
   *
   * @type {InputSignal<number>}
   */
  public readonly step: InputSignal<number> = input<number>(10);

  /**
   * Property label
   * @readonly
   *
   * @description
   * Optional accessible name for the splitter control.
   *
   * @type {InputSignal<string | undefined>}
   */
  public readonly label: InputSignal<string | undefined> = input<string>();

  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional utility classes applied to the splitter host.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property dir
   * @readonly
   *
   * @description
   * Directionality service used to reverse horizontal resizing in RTL layouts.
   *
   * @type {Directionality}
   */
  private readonly dir: Directionality = inject<Directionality>(Directionality);

  /**
   * Property drag
   *
   * @description
   * Active pointer id, starting coordinate and original layout captured at pointer down.
   *
   * @type {{ readonly pointer: number; readonly start: number; readonly sizes: readonly number[] } | null}
   */
  private drag: {
    readonly pointer: number;
    readonly start: number;
    readonly sizes: readonly number[];
  } | null = null;

  /**
   * Property dragging
   * @readonly
   *
   * @description
   * Whether a pointer resize is active, reflected through `data-dragging` on the host.
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly dragging: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property panel
   * @readonly
   *
   * @description
   * Panel before this handle, used for splitter values and ARIA bounds.
   *
   * @type {Signal<ResizablePanelDirective | undefined>}
   */
  protected readonly panel: Signal<ResizablePanelDirective | undefined> = computed<
    ResizablePanelDirective | undefined
  >((): ResizablePanelDirective | undefined => this.group.panelBefore(this));

  /**
   * Property value
   * @readonly
   *
   * @description
   * Rounded percentage of the preceding panel exposed as `aria-valuenow`.
   *
   * @type {Signal<number | null>}
   */
  protected readonly value: Signal<number | null> = computed<number | null>((): number | null => {
    const panel: ResizablePanelDirective | undefined = this.panel();
    return panel ? Math.round(this.group.sizeOf(panel)) : null;
  });

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Splitter hit-area, orientation, drag and focus-visible classes.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>((): string =>
    cn(
      'relative flex shrink-0 touch-none items-center justify-center bg-line select-none',
      'transition-colors duration-(--dur-pop) hover:bg-line-strong data-dragging:bg-signal motion-reduce:transition-none',
      "after:absolute after:content-['']",
      'outline-4 outline-offset-0 outline-transparent focus-visible:bg-star/55 focus-visible:outline-star/12',
      this.group.direction() === 'horizontal'
        ? 'w-px cursor-col-resize after:inset-y-0 after:left-1/2 after:w-2 after:-translate-x-1/2'
        : 'h-px w-full cursor-row-resize after:inset-x-0 after:top-1/2 after:h-2 after:-translate-y-1/2',
      this.class(),
    ),
  );
  // #endregion

  // #region Methods
  /**
   * Method onKeydown
   * @method onKeydown
   *
   * @description
   * Applies keyboard resizing, reversing horizontal arrow movement in RTL layouts.
   *
   * @param {KeyboardEvent} event - Keyboard event from the focused splitter.
   * @returns {void} Resizes and emits only for supported movement keys.
   */
  protected onKeydown(event: KeyboardEvent): void {
    const horizontal: boolean = this.group.direction() === 'horizontal';
    const flip: 1 | -1 = horizontal && this.dir.valueSignal() === 'rtl' ? -1 : 1;
    const deltas: Record<string, number> = horizontal
      ? { ArrowLeft: -this.step() * flip, ArrowRight: this.step() * flip }
      : { ArrowUp: -this.step(), ArrowDown: this.step() };
    const delta: number | undefined =
      event.key === 'Home' ? -100 : event.key === 'End' ? 100 : deltas[event.key];
    if (delta === undefined) return;
    event.preventDefault();
    this.group.resize(this, delta);
    this.group.commit();
  }

  /**
   * Method onPointerDown
   * @method onPointerDown
   *
   * @description
   * Captures the primary pointer and records the starting coordinate and panel layout.
   *
   * @param {PointerEvent} event - Pointer press on the splitter.
   * @returns {void} Starts a drag for the primary pointer only.
   */
  protected onPointerDown(event: PointerEvent): void {
    if (event.button !== 0) return;
    event.preventDefault();
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
    (event.currentTarget as HTMLElement).focus();
    this.drag = {
      pointer: event.pointerId,
      start: this.position(event),
      sizes: this.group.sizes(),
    };
    this.dragging.set(true);
  }

  /**
   * Method onPointerMove
   * @method onPointerMove
   *
   * @description
   * Updates neighboring panel sizes from the captured drag origin and group dimensions.
   *
   * @param {PointerEvent} event - Pointer movement during the active drag.
   * @returns {void} Updates sizes for the active pointer when the group has a measurable extent.
   */
  protected onPointerMove(event: PointerEvent): void {
    if (!this.drag || event.pointerId !== this.drag.pointer) return;
    const horizontal: boolean = this.group.direction() === 'horizontal';
    const box: DOMRect = this.group.element.getBoundingClientRect();
    const length: number = horizontal ? box.width : box.height;
    if (!length) return;
    const flip: 1 | -1 = horizontal && this.dir.valueSignal() === 'rtl' ? -1 : 1;
    const delta: number = ((this.position(event) - this.drag.start) / length) * 100 * flip;
    this.group.resize(this, delta, this.drag.sizes);
  }

  /**
   * Method onPointerEnd
   * @method onPointerEnd
   *
   * @description
   * Ends the active pointer drag and emits the resulting panel layout.
   *
   * @param {PointerEvent} event - Pointer release or cancellation event.
   * @returns {void} Commits only the pointer that started the drag.
   */
  protected onPointerEnd(event: PointerEvent): void {
    if (!this.drag || event.pointerId !== this.drag.pointer) return;
    this.drag = null;
    this.dragging.set(false);
    this.group.commit();
  }

  /**
   * Method position
   * @method position
   *
   * @description
   * Reads the pointer coordinate along the group's active layout axis.
   *
   * @param {PointerEvent} event - Pointer event whose axis coordinate is required.
   * @returns {number} Client coordinate on the horizontal or vertical axis.
   */
  private position(event: PointerEvent): number {
    return this.group.direction() === 'horizontal' ? event.clientX : event.clientY;
  }
  // #endregion
}
