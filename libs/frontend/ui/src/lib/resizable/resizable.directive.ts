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
  DestroyRef,
  Directive,
  ElementRef,
  afterNextRender,
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
  boundaryRange,
  fitPanelSizes,
  initialPanelSizes,
  panelRange,
  percentOf,
  pixelsOf,
  resizePanels,
} from '@internal/ui/lib/resizable/utils/resizable/resizable.utils';
import type { PanelRange } from '@internal/ui/lib/resizable/models/resizable/panel-range.interface';
import type { PanelSize } from '@internal/ui/lib/resizable/models/resizable/panel-size.type';
import type { ResizableDirection } from '@internal/ui/lib/resizable/models/resizable/resizable-direction.type';

/**
 * Directive ResizablePanelGroupDirective
 * @class ResizablePanelGroupDirective
 *
 * @description
 * Coordinates panel layout and resizing for descendant panels and handles. Panel sizes are
 * percentages of the group; a panel sized or bounded in pixels (`'232px'`) is converted with the
 * group's length, measured in the browser and followed with a `ResizeObserver`, and keeps its pixel
 * length when the group grows or shrinks, the other panels taking the difference. Before the first
 * measure (and while prerendering) a pixel default renders as a fixed CSS basis, so nothing jumps.
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
   * Emits panel percentages after a keyboard adjustment or completed pointer drag; `pixelSizes()`
   * holds the same layout in pixels.
   *
   * @type {OutputEmitterRef<readonly number[]>}
   */
  public readonly layoutChange: OutputEmitterRef<readonly number[]> = output<readonly number[]>();

  /**
   * Property element
   * @readonly
   *
   * @description
   * Native group element measured along the active axis.
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
   * Descendant handles whose owning group is this directive, in document order: the handle at index
   * `i` moves the boundary after panel `i`, wherever it sits (between the panels or inside one).
   *
   * @type {Signal<readonly ResizableHandleComponent[]>}
   */
  private readonly handles: Signal<ResizableHandleComponent[]> = computed<
    ResizableHandleComponent[]
  >((): ResizableHandleComponent[] =>
    this.allHandles().filter((handle: ResizableHandleComponent): boolean => handle.group === this),
  );

  /**
   * Property measured
   * @readonly
   *
   * @description
   * Length of the group available to its panels along the active axis, `0` until measured.
   *
   * @type {WritableSignal<number>}
   */
  private readonly measured: WritableSignal<number> = signal<number>(0);

  /**
   * Property extent
   * @readonly
   *
   * @description
   * Measured length shared by the panels, in pixels; `0` before the first browser measure.
   *
   * @type {Signal<number>}
   */
  public readonly extent: Signal<number> = this.measured.asReadonly();

  /**
   * Property layout
   * @readonly
   *
   * @description
   * Last layout set by a resize, or `null` until the first one; the defaults apply meanwhile.
   *
   * @type {WritableSignal<readonly number[] | null>}
   */
  private readonly layout: WritableSignal<readonly number[] | null> = signal<
    readonly number[] | null
  >(null);

  /**
   * Property pinned
   * @readonly
   *
   * @description
   * Pixel lengths the last resize gave the pixel-sized panels, kept when the group's length changes.
   *
   * @type {WritableSignal<readonly (number | undefined)[] | null>}
   */
  private readonly pinned: WritableSignal<readonly (number | undefined)[] | null> = signal<
    readonly (number | undefined)[] | null
  >(null);

  /**
   * Property ranges
   * @readonly
   *
   * @description
   * Bounds of each owned panel in percent, pixel bounds converted with the measured length.
   *
   * @type {Signal<PanelRange[]>}
   */
  private readonly ranges: Signal<PanelRange[]> = computed<PanelRange[]>((): PanelRange[] =>
    this.panels().map((panel: ResizablePanelDirective): PanelRange =>
      panelRange(panel.minSize(), panel.maxSize(), this.measured()),
    ),
  );

  /**
   * Property sizes
   * @readonly
   *
   * @description
   * Current panel percentages: the last resize, else the defaults; once measured, pixel-sized panels
   * take their pinned or default pixel length within their bounds and the others share the rest.
   *
   * @type {Signal<readonly number[]>}
   */
  public readonly sizes: Signal<readonly number[]> = computed<readonly number[]>(
    (): readonly number[] => {
      const panels: ResizablePanelDirective[] = this.panels();
      const extent: number = this.measured();
      const layout: readonly number[] | null = this.layout();
      const current: readonly number[] | null = layout?.length === panels.length ? layout : null;
      const base: readonly number[] =
        current ??
        initialPanelSizes(
          panels.map((panel: ResizablePanelDirective): number | undefined =>
            percentOf(panel.defaultSize(), extent),
          ),
        );
      if (extent <= 0 || panels.length < 2) return base;
      const pinned: readonly (number | undefined)[] | null = current ? this.pinned() : null;
      const targets: (number | undefined)[] = panels.map(
        (panel: ResizablePanelDirective, index: number): number | undefined => {
          if (!panel.pixelSized()) return undefined;
          const pixels: number | undefined =
            pinned?.[index] ?? (current ? undefined : pixelsOf(panel.defaultSize()));
          return pixels === undefined ? base[index] : (pixels / extent) * 100;
        },
      );
      return fitPanelSizes(base, targets, this.ranges());
    },
  );

  /**
   * Property pixelSizes
   * @readonly
   *
   * @description
   * Current panel lengths in pixels; zeros before the first measure.
   *
   * @type {Signal<readonly number[]>}
   */
  public readonly pixelSizes: Signal<readonly number[]> = computed<readonly number[]>(
    (): readonly number[] =>
      this.sizes().map((size: number): number => (size * this.measured()) / 100),
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

  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Measures the group after its first render in the browser and follows its size; prerendering
   * never runs the callback, so pixel sizes keep their CSS basis there.
   */
  public constructor() {
    const destroyRef: DestroyRef = inject<DestroyRef>(DestroyRef);
    afterNextRender((): void => {
      this.measure();
      if (typeof ResizeObserver === 'undefined') return;
      const observer: ResizeObserver = new ResizeObserver((): void => this.measure());
      observer.observe(this.element);
      destroyRef.onDestroy((): void => observer.disconnect());
    });
  }
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
   * Method flexOf
   * @method flexOf
   *
   * @description
   * CSS `flex` of a panel: its percentage as the grow factor over a zero basis, or, before the group
   * is measured, a fixed basis for a pixel default.
   *
   * @param {ResizablePanelDirective} panel - Panel whose flex value is requested.
   * @returns {string} Value of the panel's `flex` property.
   */
  public flexOf(panel: ResizablePanelDirective): string {
    const pixels: number | undefined = pixelsOf(panel.defaultSize());
    if (this.measured() <= 0 && pixels !== undefined) return `0 0 ${pixels}px`;
    return `${this.sizeOf(panel)} 1 0px`;
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
   * Method rangeOf
   * @method rangeOf
   *
   * @description
   * Percentages the panel before a handle can reach while both neighbours keep their bounds.
   *
   * @param {ResizableHandleComponent} handle - Boundary whose range is requested.
   * @returns {PanelRange | undefined} Reachable range, or `undefined` without two neighbours.
   */
  public rangeOf(handle: ResizableHandleComponent): PanelRange | undefined {
    return boundaryRange(this.sizes(), this.handles().indexOf(handle), this.ranges());
  }

  /**
   * Method resize
   * @method resize
   *
   * @description
   * Applies a percentage-point change to the two panels beside a handle and stores the new layout,
   * pinning the pixel length of the pixel-sized panels.
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
    const panels: ResizablePanelDirective[] = this.panels();
    const sizes: number[] = resizePanels(
      from,
      this.handles().indexOf(handle),
      delta,
      this.ranges(),
    );
    const extent: number = this.measured();
    this.layout.set(sizes);
    this.pinned.set(
      extent > 0
        ? panels.map((panel: ResizablePanelDirective, index: number): number | undefined =>
            panel.pixelSized() ? ((sizes[index] ?? 0) * extent) / 100 : undefined,
          )
        : null,
    );
    return sizes;
  }

  /**
   * Method resizePixels
   * @method resizePixels
   *
   * @description
   * Moves the boundary of a handle by a length in pixels, such as a reset to a pixel default.
   *
   * @param {ResizableHandleComponent} handle - Boundary being moved.
   * @param {number} delta - Change of the panel before the handle, in pixels.
   * @returns {readonly number[]} Updated panel percentages; unchanged before the group is measured.
   */
  public resizePixels(handle: ResizableHandleComponent, delta: number): readonly number[] {
    const extent: number = this.measured();
    return extent > 0 ? this.resize(handle, (delta / extent) * 100) : this.sizes();
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

  /**
   * Method measure
   * @method measure
   *
   * @description
   * Reads the length the panels share: the group's length along its axis minus the handles laid out
   * between the panels (a handle inside a panel takes no room).
   *
   * @returns {void} Updates `extent` when the length changed.
   */
  private measure(): void {
    const horizontal: boolean = this.direction() === 'horizontal';
    const box: DOMRect = this.element.getBoundingClientRect();
    const handles: number = this.handles()
      .filter((handle: ResizableHandleComponent): boolean => !handle.embedded)
      .reduce((sum: number, handle: ResizableHandleComponent): number => {
        const own: DOMRect = handle.element.getBoundingClientRect();
        return sum + (horizontal ? own.width : own.height);
      }, 0);
    const length: number = Math.max(0, (horizontal ? box.width : box.height) - handles);
    if (length !== this.measured()) this.measured.set(length);
  }
  // #endregion
}

/**
 * Directive ResizablePanelDirective
 * @class ResizablePanelDirective
 *
 * @description
 * Declares one panel in a resizable group and applies its current size as the host flex value.
 * Sizes and bounds are percentages of the group or `'<n>px'` lengths.
 */
@Directive({
  selector: '[uiResizablePanel]',
  exportAs: 'uiResizablePanel',
  host: {
    '[class]': 'classes()',
    'data-slot': 'resizable-panel',
    '[id]': 'id',
    '[style.flex]': 'flex()',
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
   * Initial size, a percentage or `'<n>px'`; panels without a default split the remaining space.
   *
   * @type {InputSignal<PanelSize | undefined>}
   */
  public readonly defaultSize: InputSignal<PanelSize | undefined> = input<PanelSize>();

  /**
   * Property minSize
   * @readonly
   *
   * @description
   * Smallest size accepted during keyboard and pointer resizing, a percentage or `'<n>px'`.
   *
   * @type {InputSignal<PanelSize>}
   */
  public readonly minSize: InputSignal<PanelSize> = input<PanelSize>(0);

  /**
   * Property maxSize
   * @readonly
   *
   * @description
   * Largest size accepted during keyboard and pointer resizing, a percentage or `'<n>px'`.
   *
   * @type {InputSignal<PanelSize>}
   */
  public readonly maxSize: InputSignal<PanelSize> = input<PanelSize>(100);

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
   * Property pixelSized
   * @readonly
   *
   * @description
   * Whether a size or bound is given in pixels: the panel then keeps its pixel length when the group
   * changes size.
   *
   * @type {Signal<boolean>}
   */
  public readonly pixelSized: Signal<boolean> = computed<boolean>((): boolean =>
    [this.defaultSize(), this.minSize(), this.maxSize()].some(
      (size: PanelSize | undefined): boolean => typeof size === 'string',
    ),
  );

  /**
   * Property innerHandles
   * @readonly
   *
   * @description
   * Handles placed inside this panel, which position themselves against its edge.
   *
   * @type {Signal<readonly ResizableHandleComponent[]>}
   */
  private readonly innerHandles: Signal<readonly ResizableHandleComponent[]> =
    contentChildren<ResizableHandleComponent>(
      forwardRef((): typeof ResizableHandleComponent => ResizableHandleComponent),
      { descendants: true },
    );

  /**
   * Property flex
   * @readonly
   *
   * @description
   * Current flex value supplied by the owning group for this panel.
   *
   * @type {Signal<string>}
   */
  protected readonly flex: Signal<string> = computed<string>((): string => this.group.flexOf(this));

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Panel overflow and minimum-size classes merged with caller utilities; a panel holding its handle
   * becomes its positioning context (a caller's `sticky` still wins).
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>((): string =>
    cn(
      'min-h-0 min-w-0 overflow-hidden',
      this.innerHandles().some(
        (handle: ResizableHandleComponent): boolean => handle.group === this.group,
      ) && 'relative',
      this.class(),
    ),
  );
  // #endregion
}

/**
 * Component ResizableHandleComponent
 * @class ResizableHandleComponent
 *
 * @description
 * Provides an accessible window splitter that supports pointer dragging and keyboard resizing
 * with arrow keys, Home and End. Placed between two panels it is a 1 px flex item; placed inside a
 * panel it lies along that panel's edge facing the other panel (the end edge of the panel before it,
 * the start edge of the panel after it), so that it stays inside the panel's landmark (`aside`,
 * `nav`, `main`) for the axe `region` rule.
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
    '[attr.aria-valuemin]': 'valueMin()',
    '[attr.aria-valuemax]': 'valueMax()',
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
      class="z-10 flex h-6 w-3.5 items-center justify-center rounded-xs border border-border bg-surface-raised text-fg-faint"
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
   * Property element
   * @readonly
   *
   * @description
   * Host element, measured by the group when it lies between the panels.
   *
   * @type {HTMLElement}
   */
  public readonly element: HTMLElement = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  /**
   * Property container
   * @readonly
   *
   * @description
   * Panel of the same group holding this handle, `null` when the handle lies between the panels.
   *
   * @type {ResizablePanelDirective | null}
   */
  private readonly container: ResizablePanelDirective | null =
    ((): ResizablePanelDirective | null => {
      const panel: ResizablePanelDirective | null = inject<ResizablePanelDirective>(
        ResizablePanelDirective,
        { optional: true },
      );
      return panel?.group === this.group ? panel : null;
    })();

  /**
   * Property embedded
   * @readonly
   *
   * @description
   * Whether the handle sits inside one of the panels it resizes.
   *
   * @type {boolean}
   */
  public readonly embedded: boolean = this.container !== null;

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
   * Change made by each arrow-key press: percentage points, or `'<n>px'` for a step that stays the
   * same on every window size (10 points until the group is measured).
   *
   * @type {InputSignal<PanelSize>}
   */
  public readonly step: InputSignal<PanelSize> = input<PanelSize>(10);

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
   * Property range
   * @readonly
   *
   * @description
   * Percentages the preceding panel can reach, pixel bounds of both neighbours included.
   *
   * @type {Signal<PanelRange | undefined>}
   */
  private readonly range: Signal<PanelRange | undefined> = computed<PanelRange | undefined>(
    (): PanelRange | undefined => this.group.rangeOf(this),
  );

  /**
   * Property valueMin
   * @readonly
   *
   * @description
   * Rounded lower bound exposed as `aria-valuemin`.
   *
   * @type {Signal<number>}
   */
  protected readonly valueMin: Signal<number> = computed<number>((): number =>
    Math.round(this.range()?.min ?? 0),
  );

  /**
   * Property valueMax
   * @readonly
   *
   * @description
   * Rounded upper bound exposed as `aria-valuemax`.
   *
   * @type {Signal<number>}
   */
  protected readonly valueMax: Signal<number> = computed<number>((): number =>
    Math.round(this.range()?.max ?? 100),
  );

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Splitter hit-area, orientation, placement, drag and focus-visible classes. The 8 px hit area is
   * centred on the line; inside a panel, give the panel `overflow-visible` to keep its outer half.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>((): string => {
    const horizontal: boolean = this.group.direction() === 'horizontal';
    const trailing: boolean = this.container !== null && this.panel() === this.container;
    return cn(
      'flex shrink-0 touch-none items-center justify-center bg-border select-none',
      'transition-colors duration-(--dur-pop) hover:bg-border-strong data-dragging:bg-fg motion-reduce:transition-none',
      "after:absolute after:content-['']",
      'outline-2 outline-offset-0 outline-transparent focus-visible:bg-fg focus-visible:outline-accent/40',
      horizontal
        ? 'w-px cursor-col-resize after:inset-y-0 after:left-1/2 after:w-2 after:-translate-x-1/2'
        : 'h-px w-full cursor-row-resize after:inset-x-0 after:top-1/2 after:h-2 after:-translate-y-1/2',
      this.embedded ? 'absolute z-10' : 'relative',
      this.embedded &&
        (horizontal
          ? trailing
            ? 'inset-y-0 end-0'
            : 'inset-y-0 start-0'
          : trailing
            ? 'inset-x-0 bottom-0'
            : 'inset-x-0 top-0'),
      this.class(),
    );
  });
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
    const step: number = percentOf(this.step(), this.group.extent()) ?? 10;
    const deltas: Record<string, number> = horizontal
      ? { ArrowLeft: -step * flip, ArrowRight: step * flip }
      : { ArrowUp: -step, ArrowDown: step };
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
    const length: number = this.group.extent() || (horizontal ? box.width : box.height);
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
