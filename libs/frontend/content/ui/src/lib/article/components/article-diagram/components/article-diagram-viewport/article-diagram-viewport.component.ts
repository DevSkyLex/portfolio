import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  Injector,
  input,
  output,
  signal,
  viewChild,
  type ElementRef,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import {
  lucideChevronDown,
  lucideChevronLeft,
  lucideChevronRight,
  lucideChevronUp,
  lucideRefreshCw,
  lucideZoomIn,
  lucideZoomOut,
} from '@ng-icons/lucide';
import { ButtonDirective } from '@vfortin/ui';
import type { RenderedDiagram } from '@internal/content-web-ui/lib/article/components/article-diagram/utils/mermaid-renderer/mermaid-renderer.utils';

type Direction = 'up' | 'left' | 'right' | 'down';

const MIN_ZOOM: number = 0.25;
const MAX_ZOOM: number = 4;
const ZOOM_STEP: number = 1.25;

interface PanControl {
  readonly direction: Direction;
  readonly label: string;
  readonly icon: string;
  readonly position: string;
  readonly x: number;
  readonly y: number;
}

/** Keeps pan and zoom controls fixed over a keyboard-scrollable diagram. */
@Component({
  selector: 'content-article-diagram-viewport',
  imports: [ButtonDirective, NgIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-w-0' },
  template: `
    <figure
      class="relative m-0 w-full overflow-hidden rounded-xl border border-border bg-surface-sunk [--diagram-inset:1rem] sm:[--diagram-inset:1.75rem]"
      [style.--diagram-height]="image().height + 'px'"
    >
      <div class="absolute end-2 top-2 z-10 flex gap-1">
        <ng-content />
      </div>
      <div
        #viewport
        class="min-h-40 overflow-auto focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset motion-safe:scroll-smooth"
        [class]="
          expanded()
            ? 'h-[min(72svh,50rem)]'
            : 'h-[min(calc(var(--diagram-height)+2*var(--diagram-inset)),70svh,36rem)]'
        "
        role="region"
        [attr.aria-label]="description()"
        [attr.tabindex]="canPan() ? 0 : null"
        (scroll)="measure()"
      >
        <div
          #canvas
          class="grid min-h-full w-max min-w-full place-items-center p-(--diagram-inset)"
        >
          <img
            class="block h-auto max-w-none"
            [src]="image().url"
            [width]="image().width"
            [height]="image().height"
            [style.width.px]="image().width * scale()"
            [alt]="description()"
            draggable="false"
            (error)="imageFailed.emit()"
          />
        </div>
      </div>
      <div
        class="absolute end-2 bottom-2 z-10 grid grid-cols-3 grid-rows-3 gap-0.5"
        role="group"
        aria-label="Commandes du schéma"
        i18n-aria-label="@@project.diagram.pan.group"
      >
        <button
          uiBtn
          type="button"
          variant="secondary"
          size="icon-sm"
          class="col-start-3 row-start-1 border-border bg-surface-raised"
          aria-label="Zoom avant"
          i18n-aria-label="@@project.diagram.zoom.in"
          [attr.aria-disabled]="scale() >= maxZoom"
          (click)="zoom(zoomStep)"
        >
          <ng-icon [svg]="zoomInIcon" size="16" aria-hidden="true" />
        </button>
        <button
          uiBtn
          type="button"
          variant="secondary"
          size="icon-sm"
          class="col-start-3 row-start-3 border-border bg-surface-raised"
          aria-label="Zoom arrière"
          i18n-aria-label="@@project.diagram.zoom.out"
          [attr.aria-disabled]="scale() <= minZoom"
          (click)="zoom(1 / zoomStep)"
        >
          <ng-icon [svg]="zoomOutIcon" size="16" aria-hidden="true" />
        </button>
        <button
          uiBtn
          type="button"
          variant="secondary"
          size="icon-sm"
          class="col-start-2 row-start-2 border-border bg-surface-raised"
          aria-label="Réinitialiser la vue"
          i18n-aria-label="@@project.diagram.zoom.reset"
          (click)="reset()"
        >
          <ng-icon [svg]="resetIcon" size="16" aria-hidden="true" />
        </button>
        @for (control of controls; track control.direction) {
          <button
            uiBtn
            type="button"
            variant="secondary"
            size="icon-sm"
            [class]="'border-border bg-surface-raised ' + control.position"
            [attr.aria-label]="control.label"
            [attr.aria-disabled]="!directions()[control.direction]"
            (click)="pan(control)"
          >
            <ng-icon [svg]="control.icon" size="16" aria-hidden="true" />
          </button>
        }
      </div>
    </figure>
  `,
})
export class ArticleDiagramViewportComponent {
  public readonly image: InputSignal<RenderedDiagram> = input.required<RenderedDiagram>();
  public readonly description: InputSignal<string> = input.required<string>();
  public readonly expanded: InputSignal<boolean> = input(false);
  public readonly imageFailed: OutputEmitterRef<void> = output<void>();

  protected readonly minZoom: number = MIN_ZOOM;
  protected readonly maxZoom: number = MAX_ZOOM;
  protected readonly zoomStep: number = ZOOM_STEP;
  protected readonly zoomInIcon: string = lucideZoomIn;
  protected readonly zoomOutIcon: string = lucideZoomOut;
  protected readonly resetIcon: string = lucideRefreshCw;
  protected readonly scale: WritableSignal<number> = signal(1);
  protected readonly directions: WritableSignal<Readonly<Record<Direction, boolean>>> = signal({
    up: false,
    left: false,
    right: false,
    down: false,
  });
  protected readonly canPan: Signal<boolean> = computed(() =>
    Object.values(this.directions()).some(Boolean),
  );
  protected readonly controls: readonly PanControl[] = [
    {
      direction: 'up',
      label: $localize`:@@project.diagram.pan.up:Vers le haut`,
      icon: lucideChevronUp,
      position: 'col-start-2 row-start-1',
      x: 0,
      y: -1,
    },
    {
      direction: 'left',
      label: $localize`:@@project.diagram.pan.left:Vers la gauche`,
      icon: lucideChevronLeft,
      position: 'col-start-1 row-start-2',
      x: -1,
      y: 0,
    },
    {
      direction: 'right',
      label: $localize`:@@project.diagram.pan.right:Vers la droite`,
      icon: lucideChevronRight,
      position: 'col-start-3 row-start-2',
      x: 1,
      y: 0,
    },
    {
      direction: 'down',
      label: $localize`:@@project.diagram.pan.down:Vers le bas`,
      icon: lucideChevronDown,
      position: 'col-start-2 row-start-3',
      x: 0,
      y: 1,
    },
  ];

  private readonly viewport: Signal<ElementRef<HTMLDivElement>> =
    viewChild.required<ElementRef<HTMLDivElement>>('viewport');
  private readonly canvas: Signal<ElementRef<HTMLDivElement>> =
    viewChild.required<ElementRef<HTMLDivElement>>('canvas');
  private readonly destroyRef: DestroyRef = inject<DestroyRef>(DestroyRef);
  private readonly injector: Injector = inject<Injector>(Injector);

  public constructor() {
    afterNextRender((): void => {
      this.measure();
      if (typeof ResizeObserver === 'undefined') return;
      const observer: ResizeObserver = new ResizeObserver((): void => this.measure());
      observer.observe(this.viewport().nativeElement);
      observer.observe(this.canvas().nativeElement);
      this.destroyRef.onDestroy((): void => observer.disconnect());
    });
  }

  /** A one-pixel tolerance absorbs fractional offsets at the edges. */
  protected measure(): void {
    const { scrollLeft, scrollTop, scrollWidth, scrollHeight, clientWidth, clientHeight } =
      this.viewport().nativeElement;
    this.directions.set({
      up: scrollTop > 1,
      left: scrollLeft > 1,
      right: scrollLeft < scrollWidth - clientWidth - 1,
      down: scrollTop < scrollHeight - clientHeight - 1,
    });
  }

  protected pan(control: PanControl): void {
    if (!this.directions()[control.direction]) return;
    const viewport: HTMLDivElement = this.viewport().nativeElement;
    viewport.scrollBy({
      left: Math.round(viewport.clientWidth * 0.55) * control.x,
      top: Math.round(viewport.clientHeight * 0.55) * control.y,
    });
  }

  /** Keeps the same part of the canvas centred when its scrollable dimensions change. */
  protected zoom(factor: number): void {
    const next: number = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, this.scale() * factor));
    if (next === this.scale()) return;
    const viewport: HTMLDivElement = this.viewport().nativeElement;
    const x: number = (viewport.scrollLeft + viewport.clientWidth / 2) / viewport.scrollWidth;
    const y: number = (viewport.scrollTop + viewport.clientHeight / 2) / viewport.scrollHeight;
    this.scale.set(next);
    afterNextRender(
      (): void => {
        viewport.scrollTo({
          left: x * viewport.scrollWidth - viewport.clientWidth / 2,
          top: y * viewport.scrollHeight - viewport.clientHeight / 2,
          behavior: 'instant',
        });
        this.measure();
      },
      { injector: this.injector },
    );
  }

  protected reset(): void {
    this.scale.set(1);
    this.viewport().nativeElement.scrollTo({ left: 0, top: 0, behavior: 'instant' });
  }
}
