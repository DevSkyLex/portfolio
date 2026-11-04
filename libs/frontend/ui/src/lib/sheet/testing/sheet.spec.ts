import {
  type Signal,
  type TemplateRef,
  type WritableSignal,
  ApplicationRef,
  Component,
  signal,
  viewChild,
} from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { DialogService } from '@internal/ui/lib/dialog/dialog.service';
import { SheetService } from '@internal/ui/lib/sheet/sheet.service';
import type { SheetSide } from '@internal/ui/lib/sheet/constants/sheet.variants';
import {
  SheetContentDirective,
  SheetTriggerDirective,
} from '@internal/ui/lib/sheet/directives/sheet-trigger/sheet-trigger.directive';
import {
  SheetCloseDirective,
  SheetDescriptionDirective,
  SheetFooterDirective,
  SheetHeaderDirective,
  SheetTitleDirective,
} from '@internal/ui/lib/sheet/directives/sheet-parts/sheet-parts.directive';

/**
 * Component HostComponent
 * @class HostComponent
 *
 * @description
 * Test host exposing a configurable sheet side and a close-result binding for the sheet directives.
 */
@Component({
  imports: [
    SheetTriggerDirective,
    SheetContentDirective,
    SheetHeaderDirective,
    SheetTitleDirective,
    SheetDescriptionDirective,
    SheetFooterDirective,
    SheetCloseDirective,
  ],
  template: `
    <button type="button" [uiSheetTrigger]="menu" (closed)="result = $event">Menu</button>
    <ng-template uiSheetContent #menu="uiSheetContent" [side]="side()" closeLabel="Close menu">
      <div uiSheetHeader>
        <h2 uiSheetTitle>Navigation</h2>
        <p uiSheetDescription>Sections of the page.</p>
      </div>
      <div uiSheetFooter><button [uiSheetClose]="'done'">Done</button></div>
    </ng-template>
  `,
})
class HostComponent {
  // #region Properties
  /**
   * Property side
   * @readonly
   *
   * @description
   * Sheet edge selected by the test template before opening the panel.
   *
   * @type {WritableSignal<SheetSide>}
   */
  public readonly side: WritableSignal<SheetSide> = signal<SheetSide>('left');

  /**
   * Property result
   *
   * @description
   * Value emitted by the trigger's `closed` output; initialized to distinguish a closed result from no close.
   *
   * @type {unknown}
   */
  public result: unknown = 'none';
  // #endregion
}

/**
 * Component MenuComponent
 * @class MenuComponent
 *
 * @description
 * Minimal component content used to verify the service's full-screen sheet presentation.
 */
@Component({ template: `<nav>Links</nav>` })
class MenuComponent {}

/**
 * Function panel
 * @function panel
 *
 * @description
 * Finds the rendered sheet panel by its stable data slot.
 *
 * @returns {HTMLElement | null} Current panel element, or `null` when no sheet is open.
 */
function panel(): HTMLElement | null {
  return document.querySelector('[data-slot="sheet-content"]');
}

describe('Sheet', (): void => {
  afterEach((): void => TestBed.inject<DialogService>(DialogService).closeAll());

  it('slides a labelled modal panel in from the chosen side', async (): Promise<void> => {
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const trigger: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    trigger.click();
    await fixture.whenStable();

    const sheet: HTMLElement | null = panel();
    expect(sheet?.getAttribute('role')).toBe('dialog');
    expect(sheet?.getAttribute('aria-modal')).toBe('true');
    expect(sheet?.className).toContain('starting:-translate-x-full');
    expect(sheet?.className).toContain('border-r');
    expect(sheet?.getAttribute('aria-labelledby')).toBe(
      sheet?.querySelector('[data-slot="sheet-title"]')?.id,
    );
    const pane: HTMLElement | null | undefined = sheet?.closest<HTMLElement>('.cdk-overlay-pane');
    expect(pane?.style.height).toBe('100%');
    expect(sheet?.querySelector('[data-slot="dialog-close"]')?.getAttribute('aria-label')).toBe(
      'Close menu',
    );
  });

  it('closes with the close part, on Escape and on backdrop click, restoring focus', async (): Promise<void> => {
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const trigger: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    trigger.focus();

    trigger.click();
    await fixture.whenStable();
    panel()?.querySelector<HTMLButtonElement>('[data-slot="sheet-close"]')?.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.result).toBe('done');
    expect(document.activeElement).toBe(trigger);

    trigger.click();
    await fixture.whenStable();
    document.activeElement?.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    await fixture.whenStable();
    expect(panel()).toBeNull();

    trigger.click();
    await fixture.whenStable();
    document.querySelector<HTMLElement>('.cdk-overlay-backdrop')?.click();
    await fixture.whenStable();
    expect(panel()).toBeNull();
  });

  it('opens the full-screen menu variant through the service', async (): Promise<void> => {
    TestBed.inject<SheetService>(SheetService).open(MenuComponent, {
      side: 'full',
      ariaLabel: 'Menu',
    });
    await TestBed.inject<ApplicationRef>(ApplicationRef).whenStable();
    const sheet: HTMLElement | null = panel();
    expect(sheet?.className).toContain('bg-surface');
    expect(sheet?.className).toContain('animate-fade-up');
    const pane: HTMLElement | null | undefined = sheet?.closest<HTMLElement>('.cdk-overlay-pane');
    expect(pane?.style.width).toBe('100%');
    expect(pane?.style.height).toBe('100%');
  });
});

/**
 * Component ConditionalTitleHostComponent
 * @class ConditionalTitleHostComponent
 *
 * @description
 * Holds a sheet template whose title renders only once a record is chosen, as a reading sheet does.
 */
@Component({
  imports: [SheetTitleDirective],
  template: `
    <ng-template #reading>
      @if (shown()) {
        <h2 uiSheetTitle>Message de Ada</h2>
      }
    </ng-template>
  `,
})
class ConditionalTitleHostComponent {
  // #region Properties
  /**
   * Property shown
   * @readonly
   *
   * @description
   * Whether the title renders inside the sheet.
   *
   * @type {WritableSignal<boolean>}
   */
  public readonly shown: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property reading
   * @readonly
   *
   * @description
   * Sheet content opened through the service.
   *
   * @type {Signal<TemplateRef<unknown>>}
   */
  public readonly reading: Signal<TemplateRef<unknown>> =
    viewChild.required<TemplateRef<unknown>>('reading');
  // #endregion
}

describe('SheetService', (): void => {
  afterEach((): void => TestBed.inject<DialogService>(DialogService).closeAll());

  it('names the sheet by a title rendered after it opened', async (): Promise<void> => {
    const fixture: ComponentFixture<ConditionalTitleHostComponent> = TestBed.createComponent(
      ConditionalTitleHostComponent,
    );
    await fixture.whenStable();
    TestBed.inject<SheetService>(SheetService).open(fixture.componentInstance.reading());
    await TestBed.inject<ApplicationRef>(ApplicationRef).whenStable();
    expect(panel()?.hasAttribute('aria-labelledby')).toBe(false);

    fixture.componentInstance.shown.set(true);
    await TestBed.inject<ApplicationRef>(ApplicationRef).whenStable();
    const sheet: HTMLElement | null = panel();
    expect(sheet?.getAttribute('aria-labelledby')).toBe(
      sheet?.querySelector('[data-slot="sheet-title"]')?.id,
    );
  });

  it('takes a fixed accessible name from the ariaLabel option', async (): Promise<void> => {
    const fixture: ComponentFixture<ConditionalTitleHostComponent> = TestBed.createComponent(
      ConditionalTitleHostComponent,
    );
    fixture.componentInstance.shown.set(true);
    await fixture.whenStable();
    TestBed.inject<SheetService>(SheetService).open(fixture.componentInstance.reading(), {
      ariaLabel: 'Lecture du message',
    });
    await TestBed.inject<ApplicationRef>(ApplicationRef).whenStable();
    expect(panel()?.getAttribute('aria-label')).toBe('Lecture du message');
    expect(panel()?.hasAttribute('aria-labelledby')).toBe(false);
  });
});
