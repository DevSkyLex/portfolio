import { ApplicationRef, ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import {
  DialogContentDirective,
  DialogTriggerDirective,
} from '@internal/ui/lib/dialog/directives/dialog-trigger/dialog-trigger.directive';
import {
  DialogCloseDirective,
  DialogDescriptionDirective,
  DialogFooterDirective,
  DialogHeaderDirective,
  DialogTitleDirective,
} from '@internal/ui/lib/dialog/directives/dialog-parts/dialog-parts.directive';
import { DIALOG_DATA, DialogRef, DialogService } from '@internal/ui/lib/dialog/dialog.service';

/**
 * Class HostComponent
 * @class HostComponent
 *
 * @description
 * Test fixture opens an embedded dialog template and records the result emitted by its trigger.
 */
@Component({
  imports: [
    DialogTriggerDirective,
    DialogContentDirective,
    DialogHeaderDirective,
    DialogTitleDirective,
    DialogDescriptionDirective,
    DialogFooterDirective,
    DialogCloseDirective,
  ],
  template: `
    <button type="button" [uiDialogTrigger]="dialog" [data]="'Ada'" (closed)="result = $event">
      Open
    </button>
    <ng-template uiDialogContent #dialog="uiDialogContent" let-name>
      <header uiDialogHeader>
        <h2 uiDialogTitle>Edit {{ name }}</h2>
        <p uiDialogDescription>Change the profile.</p>
      </header>
      <input aria-label="Name" />
      <footer uiDialogFooter>
        <button [uiDialogClose]="'saved'">Save</button>
      </footer>
    </ng-template>
  `,
})
class HostComponent {
  // #region Properties
  /**
   * Property result
   *
   * @description
   * Dialog close result written by the host event binding.
   *
   * @type {unknown}
   */
  public result: unknown = 'none';
  // #endregion
}

/**
 * Class ProgrammaticComponent
 * @class ProgrammaticComponent
 *
 * @description
 * Test content component reads data and a typed result reference from its dialog injection context.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<p>{{ data }}</p>
    <button type="button" (click)="ref.close(42)">Done</button>`,
})
class ProgrammaticComponent {
  // #region Properties
  /**
   * Property data
   * @readonly
   *
   * @description
   * Greeting data passed to the dialog service and rendered in the component.
   *
   * @type {string}
   */
  protected readonly data: string = inject<string>(DIALOG_DATA);

  /**
   * Property ref
   * @readonly
   *
   * @description
   * Dialog reference used by the button to close with a numeric result.
   *
   * @type {DialogRef<number>}
   */
  protected readonly ref: DialogRef<number, unknown> = inject<DialogRef<number>>(DialogRef);
  // #endregion
}

/**
 * Function panel
 *
 * @description
 * Returns the currently rendered dialog-content container from the overlay.
 *
 * @returns {HTMLElement | null} Dialog panel, or null when no dialog is open.
 */
function panel(): HTMLElement | null {
  return document.querySelector('[data-slot="dialog-content"]');
}

/**
 * Function pressEscape
 *
 * @description
 * Dispatches an unmodified Escape key event to the current focus target to exercise dismissal.
 *
 * @returns {void} Completes after dispatching the keyboard event.
 */
function pressEscape(): void {
  (document.activeElement ?? document.body).dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }),
  );
}

describe('Dialog', () => {
  afterEach(() => TestBed.inject<DialogService>(DialogService).closeAll());

  it('opens a labelled modal panel with focus inside, and reflects the state on the trigger', async () => {
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const trigger: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    expect(trigger.getAttribute('aria-haspopup')).toBe('dialog');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');

    trigger.click();
    await fixture.whenStable();

    const dialog: HTMLElement | null = panel();
    expect(dialog?.getAttribute('role')).toBe('dialog');
    expect(dialog?.getAttribute('aria-modal')).toBe('true');
    const title: Element | null | undefined = dialog?.querySelector('[data-slot="dialog-title"]');
    expect(title?.textContent?.trim()).toBe('Edit Ada');
    expect(dialog?.getAttribute('aria-labelledby')).toBe(title?.id);
    expect(dialog?.getAttribute('aria-describedby')).toBe(
      dialog?.querySelector('[data-slot="dialog-description"]')?.id,
    );
    expect(dialog?.contains(document.activeElement)).toBe(true);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(trigger.getAttribute('aria-controls')).toBe(dialog?.id);
    expect(document.querySelector('.cdk-overlay-backdrop')?.className).toContain('bg-scrim');
  });

  it('closes with a result and restores focus to the trigger', async () => {
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const trigger: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    trigger.focus();
    trigger.click();
    await fixture.whenStable();

    panel()?.querySelector<HTMLButtonElement>('[data-slot="dialog-footer"] button')?.click();
    await fixture.whenStable();

    expect(panel()).toBeNull();
    expect(fixture.componentInstance.result).toBe('saved');
    expect(document.activeElement).toBe(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('closes on Escape and with the built-in close button', async () => {
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const trigger: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    trigger.click();
    await fixture.whenStable();
    pressEscape();
    await fixture.whenStable();
    expect(panel()).toBeNull();
    expect(fixture.componentInstance.result).toBeUndefined();

    trigger.click();
    await fixture.whenStable();
    const close: HTMLButtonElement | null | undefined = panel()?.querySelector<HTMLButtonElement>(
      ':scope > [data-slot="dialog-close"]',
    );
    expect(close?.getAttribute('aria-label')).toBe('Fermer');
    close?.click();
    await fixture.whenStable();
    expect(panel()).toBeNull();
  });

  it('opens a component with data through the service and emits its result', async () => {
    const service: DialogService = TestBed.inject<DialogService>(DialogService);
    const ref: DialogRef<number, unknown> = service.open<number, string>(ProgrammaticComponent, {
      data: 'Hello',
      ariaLabel: 'Greeting',
    });
    let result: number | undefined;
    ref.closed.subscribe((value) => (result = value));
    await TestBed.inject<ApplicationRef>(ApplicationRef).whenStable();

    expect(panel()?.getAttribute('aria-label')).toBe('Greeting');
    expect(panel()?.textContent).toContain('Hello');
    // The medium catalogue width by default.
    expect(panel()?.classList).toContain('max-w-lg');
    panel()?.querySelector<HTMLButtonElement>('p + button')?.click();
    expect(result).toBe(42);
  });

  it('opens at the small width on request', async () => {
    TestBed.inject<DialogService>(DialogService).open(ProgrammaticComponent, {
      data: 'Hello',
      ariaLabel: 'Greeting',
      size: 'sm',
    });
    await TestBed.inject<ApplicationRef>(ApplicationRef).whenStable();
    expect(panel()?.classList).toContain('max-w-[420px]');
    expect(panel()?.classList).not.toContain('max-w-lg');
  });
});
