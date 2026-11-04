import { Component } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import {
  ResizableHandleComponent,
  ResizablePanelDirective,
  ResizablePanelGroupDirective,
} from '@internal/ui/lib/resizable/resizable.directive';
import {
  boundaryRange,
  fitPanelSizes,
  initialPanelSizes,
  panelRange,
  percentOf,
  pixelsOf,
  resizePanels,
} from '@internal/ui/lib/resizable/utils/resizable/resizable.utils';

describe('resizable utils', (): void => {
  it('shares the space left by the panels without a default size', (): void => {
    expect(initialPanelSizes([25, undefined, undefined])).toEqual([25, 37.5, 37.5]);
    expect(initialPanelSizes([undefined, undefined])).toEqual([50, 50]);
    expect(initialPanelSizes([60, 60])).toEqual([50, 50]);
  });

  it('trades space between the two neighbours within their limits', (): void => {
    const limits: { min: number; max: number }[] = [
      { min: 20, max: 70 },
      { min: 10, max: 100 },
      { min: 0, max: 100 },
    ];
    expect(resizePanels([30, 40, 30], 0, 10, limits)).toEqual([40, 30, 30]);
    expect(resizePanels([30, 40, 30], 0, -50, limits)).toEqual([20, 50, 30]);
    expect(resizePanels([30, 40, 30], 0, 50, limits)).toEqual([60, 10, 30]);
    expect(resizePanels([30, 40, 30], 2, 10, limits)).toEqual([30, 40, 30]);
  });
});

/**
 * Component HostComponent
 * @class HostComponent
 *
 * @description
 * Renders two constrained panels and records layout emissions from their splitter.
 */
@Component({
  imports: [ResizablePanelGroupDirective, ResizablePanelDirective, ResizableHandleComponent],
  template: `<div uiResizablePanelGroup (layoutChange)="layout = $event">
    <div uiResizablePanel [defaultSize]="30" [minSize]="20" [maxSize]="60">Nav</div>
    <ui-resizable-handle withHandle label="Resize" />
    <div uiResizablePanel>Main</div>
  </div>`,
})
class HostComponent {
  // #region Properties
  /**
   * Property layout
   *
   * @description
   * Most recently emitted panel percentages from the fixture's group.
   *
   * @type {readonly number[]}
   */
  public layout: readonly number[] = [];
  // #endregion
}

/**
 * Function key
 *
 * @description
 * Creates a cancelable keyboard event for exercising splitter key handling.
 *
 * @param {string} name - Key name passed to the event.
 * @returns {KeyboardEvent} Keyboard event dispatched to the splitter.
 */
const key = (name: string): KeyboardEvent =>
  new KeyboardEvent('keydown', { key: name, cancelable: true });

describe('Resizable', (): void => {
  it('exposes the handle as a focusable window splitter', async (): Promise<void> => {
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    const [nav, main] = Array.from(element.querySelectorAll<HTMLElement>('[uiResizablePanel]'));
    const handle: HTMLElement = element.querySelector('ui-resizable-handle') as HTMLElement;
    expect(handle.getAttribute('role')).toBe('separator');
    expect(handle.tabIndex).toBe(0);
    expect(handle.getAttribute('aria-orientation')).toBe('vertical');
    expect(handle.getAttribute('aria-controls')).toBe(nav?.id);
    expect(handle.getAttribute('aria-valuenow')).toBe('30');
    expect(handle.getAttribute('aria-valuemin')).toBe('20');
    expect(handle.getAttribute('aria-valuemax')).toBe('60');
    expect(nav?.style.flex).toBe('30 1 0px');
    expect(main?.style.flex).toBe('70 1 0px');
    expect(handle.querySelector('ng-icon')).not.toBeNull();
  });

  it('resizes with the arrow keys, Home and End', async (): Promise<void> => {
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const handle: HTMLElement = fixture.nativeElement.querySelector(
      'ui-resizable-handle',
    ) as HTMLElement;
    handle.dispatchEvent(key('ArrowRight'));
    await fixture.whenStable();
    expect(handle.getAttribute('aria-valuenow')).toBe('40');
    expect(fixture.componentInstance.layout).toEqual([40, 60]);
    handle.dispatchEvent(key('End'));
    await fixture.whenStable();
    expect(handle.getAttribute('aria-valuenow')).toBe('60');
    handle.dispatchEvent(key('Home'));
    await fixture.whenStable();
    expect(handle.getAttribute('aria-valuenow')).toBe('20');
  });

  it('resizes while dragging the handle', async (): Promise<void> => {
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    const group: HTMLElement = element.querySelector('[uiResizablePanelGroup]') as HTMLElement;
    group.getBoundingClientRect = (): DOMRect => new DOMRect(0, 0, 1000, 400);
    const handle: HTMLElement = element.querySelector('ui-resizable-handle') as HTMLElement;
    const pointer = (type: string, clientX: number): boolean =>
      handle.dispatchEvent(
        new MouseEvent(type, { clientX, button: 0, bubbles: true, cancelable: true }),
      );
    pointer('pointerdown', 300);
    pointer('pointermove', 400);
    await fixture.whenStable();
    expect(handle.hasAttribute('data-dragging')).toBe(true);
    expect(handle.getAttribute('aria-valuenow')).toBe('40');
    pointer('pointerup', 400);
    await fixture.whenStable();
    expect(handle.hasAttribute('data-dragging')).toBe(false);
    expect(fixture.componentInstance.layout).toEqual([40, 60]);
  });
});

describe('resizable pixel utils', (): void => {
  it('converts pixel sizes once the group is measured', (): void => {
    expect(pixelsOf('232px')).toBe(232);
    expect(pixelsOf(20)).toBeUndefined();
    expect(percentOf('250px', 1000)).toBe(25);
    expect(percentOf('250px', 0)).toBeUndefined();
    expect(percentOf(40, 0)).toBe(40);
    expect(panelRange('200px', '360px', 1000)).toEqual({ min: 20, max: 36 });
    expect(panelRange('200px', '360px', 0)).toEqual({ min: 0, max: 100 });
    expect(panelRange('600px', '360px', 1000)).toEqual({ min: 60, max: 60 });
  });

  it('pins the targeted panels within their bounds and shares the rest', (): void => {
    const ranges: { min: number; max: number }[] = [
      { min: 20, max: 36 },
      { min: 0, max: 100 },
    ];
    expect(fitPanelSizes([50, 50], [23.2, undefined], ranges)).toEqual([23.2, 76.8]);
    expect(fitPanelSizes([50, 50], [10, undefined], ranges)).toEqual([20, 80]);
    expect(fitPanelSizes([50, 50], [undefined, undefined], ranges)).toEqual([50, 50]);
    expect(
      boundaryRange([30, 70], 0, [
        { min: 20, max: 36 },
        { min: 70, max: 100 },
      ]),
    ).toEqual({
      min: 20,
      max: 30,
    });
  });
});

/**
 * Component PixelHostComponent
 * @class PixelHostComponent
 *
 * @description
 * Sidebar sized in pixels whose splitter lies inside it, beside a flexible page.
 */
@Component({
  imports: [ResizablePanelGroupDirective, ResizablePanelDirective, ResizableHandleComponent],
  template: `<div uiResizablePanelGroup>
    <aside uiResizablePanel defaultSize="232px" minSize="200px" maxSize="360px">
      Nav
      <ui-resizable-handle label="Resize" step="16px" />
    </aside>
    <main uiResizablePanel>Main</main>
  </div>`,
})
class PixelHostComponent {}

describe('Resizable pixel sizes', (): void => {
  let width: number = 1160;
  let observed: (() => void) | null = null;

  beforeEach((): void => {
    width = 1160;
    observed = null;
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: HTMLElement,
    ): DOMRect {
      return this.getAttribute('data-slot') === 'resizable-panel-group'
        ? new DOMRect(0, 0, width, 600)
        : new DOMRect(0, 0, 0, 0);
    });
    vi.stubGlobal(
      'ResizeObserver',
      class {
        public constructor(callback: () => void) {
          observed = callback;
        }

        public observe(): void {
          // The test calls the callback itself.
        }

        public disconnect(): void {
          observed = null;
        }
      },
    );
  });

  afterEach((): void => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('keeps the pixel width when the group changes size and steps by pixels', async (): Promise<void> => {
    const fixture: ComponentFixture<PixelHostComponent> =
      TestBed.createComponent(PixelHostComponent);
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    const aside: HTMLElement = element.querySelector('aside') as HTMLElement;
    const handle: HTMLElement = element.querySelector('ui-resizable-handle') as HTMLElement;
    expect(aside.style.flex).toBe('20 1 0px');
    expect(handle.getAttribute('aria-valuemin')).toBe('17');
    expect(handle.getAttribute('aria-valuemax')).toBe('31');
    expect(aside.classList).toContain('relative');
    expect(handle.classList).toContain('absolute');
    expect(handle.classList).toContain('end-0');
    expect(handle.classList).not.toContain('relative');

    handle.dispatchEvent(key('ArrowRight'));
    await fixture.whenStable();
    expect(Number.parseFloat(aside.style.flex)).toBeCloseTo((248 / 1160) * 100, 5);

    width = 2000;
    observed?.();
    await fixture.whenStable();
    expect(Number.parseFloat(aside.style.flex)).toBeCloseTo(12.4, 5);
    expect(handle.getAttribute('aria-valuemin')).toBe('10');
    expect(handle.getAttribute('aria-valuemax')).toBe('18');

    handle.dispatchEvent(key('Home'));
    await fixture.whenStable();
    expect(Number.parseFloat(aside.style.flex)).toBeCloseTo(10, 5);
  });

  it('lays a pixel default out as a fixed basis before the group is measured', async (): Promise<void> => {
    width = 0;
    const fixture: ComponentFixture<PixelHostComponent> =
      TestBed.createComponent(PixelHostComponent);
    await fixture.whenStable();
    const aside: HTMLElement = fixture.nativeElement.querySelector('aside') as HTMLElement;
    expect(aside.style.flex).toBe('0 0 232px');
  });
});
