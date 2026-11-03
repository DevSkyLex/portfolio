import { Component } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { DialogService } from '@internal/ui/lib/dialog/dialog.service';
import {
  AlertDialogContentDirective,
  AlertDialogTriggerDirective,
} from '@internal/ui/lib/alert-dialog/directives/alert-dialog-trigger/alert-dialog-trigger.directive';
import {
  AlertDialogActionDirective,
  AlertDialogCancelDirective,
  AlertDialogDescriptionDirective,
  AlertDialogFooterDirective,
  AlertDialogHeaderDirective,
  AlertDialogTitleDirective,
} from '@internal/ui/lib/alert-dialog/directives/alert-dialog-parts/alert-dialog-parts.directive';

/**
 * Component HostComponent
 * @class HostComponent
 *
 * @description
 * Renders a labelled confirmation dialog with cancel and action controls and captures its close
 * result for assertions about confirmation and cancellation.
 */
@Component({
  imports: [
    AlertDialogTriggerDirective,
    AlertDialogContentDirective,
    AlertDialogHeaderDirective,
    AlertDialogTitleDirective,
    AlertDialogDescriptionDirective,
    AlertDialogFooterDirective,
    AlertDialogActionDirective,
    AlertDialogCancelDirective,
  ],
  template: `
    <button type="button" [uiAlertDialogTrigger]="confirm" (closed)="result = $event">
      Delete
    </button>
    <ng-template uiAlertDialogContent #confirm="uiAlertDialogContent">
      <div uiAlertDialogHeader>
        <h2 uiAlertDialogTitle>Delete the project?</h2>
        <p uiAlertDialogDescription>This cannot be undone.</p>
      </div>
      <div uiAlertDialogFooter>
        <button uiAlertDialogCancel>Cancel</button>
        <button [uiAlertDialogAction]="'deleted'">Delete</button>
      </div>
    </ng-template>
  `,
})
class HostComponent {
  // #region Properties
  /**
   * Property result
   *
   * @description
   * Captured dialog result; starts with a sentinel to distinguish a closed dialog from no event.
   *
   * @type {unknown}
   */
  public result: unknown = 'none';
  // #endregion
}

/**
 * Component ReversedHostComponent
 * @class ReversedHostComponent
 *
 * @description
 * Places the destructive action before Cancel in the footer to verify initial focus follows the
 * cancellation role rather than DOM order.
 */
@Component({
  imports: [
    AlertDialogTriggerDirective,
    AlertDialogContentDirective,
    AlertDialogTitleDirective,
    AlertDialogFooterDirective,
    AlertDialogActionDirective,
    AlertDialogCancelDirective,
  ],
  template: `
    <button type="button" [uiAlertDialogTrigger]="confirm">Delete</button>
    <ng-template uiAlertDialogContent #confirm="uiAlertDialogContent">
      <h2 uiAlertDialogTitle>Delete the project?</h2>
      <div uiAlertDialogFooter>
        <button [uiAlertDialogAction]="'deleted'">Delete</button>
        <button uiAlertDialogCancel>Cancel</button>
      </div>
    </ng-template>
  `,
})
class ReversedHostComponent {}

/**
 * Component ActionOnlyHostComponent
 * @class ActionOnlyHostComponent
 *
 * @description
 * Renders a confirmation dialog with an action but no cancellation part to exercise initial-focus
 * fallback behavior.
 */
@Component({
  imports: [AlertDialogTriggerDirective, AlertDialogContentDirective, AlertDialogActionDirective],
  template: `
    <button type="button" [uiAlertDialogTrigger]="notice">Open</button>
    <ng-template uiAlertDialogContent #notice="uiAlertDialogContent">
      <p>Done.</p>
      <button uiAlertDialogAction>OK</button>
    </ng-template>
  `,
})
class ActionOnlyHostComponent {}

/**
 * Function panel
 *
 * @description
 * Returns the currently rendered alert dialog panel, if one is open.
 *
 * @returns {HTMLElement | null} Active panel element or null when the dialog is closed.
 */
function panel(): HTMLElement | null {
  return document.querySelector('[data-slot="alert-dialog-content"]');
}

/**
 * Function open
 *
 * @description
 * Creates the standard dialog fixture, waits for stabilization, focuses and activates its trigger,
 * then returns the fixture handles used by focus and close assertions.
 *
 * @returns {Promise<{ fixture: ComponentFixture<HostComponent>; trigger: HTMLButtonElement }>}
 * Stable fixture and its trigger button.
 */
async function open(): Promise<{
  fixture: ComponentFixture<HostComponent>;
  trigger: HTMLButtonElement;
}> {
  const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
  await fixture.whenStable();
  const trigger: HTMLButtonElement = fixture.nativeElement.querySelector('button');
  trigger.focus();
  trigger.click();
  await fixture.whenStable();
  return { fixture, trigger };
}

describe('AlertDialog', () => {
  afterEach(() => TestBed.inject<DialogService>(DialogService).closeAll());

  it('opens an alertdialog labelled by its title, with focus on Cancel and no close button', async () => {
    await open();
    const dialog: HTMLElement | null = panel();
    expect(dialog?.getAttribute('role')).toBe('alertdialog');
    expect(dialog?.getAttribute('aria-labelledby')).toBe(
      dialog?.querySelector('[data-slot="alert-dialog-title"]')?.id,
    );
    expect(dialog?.getAttribute('aria-describedby')).toBe(
      dialog?.querySelector('[data-slot="alert-dialog-description"]')?.id,
    );
    expect(document.activeElement?.getAttribute('data-slot')).toBe('alert-dialog-cancel');
    expect(dialog?.querySelector('[data-slot="dialog-close"]')).toBeNull();
  });

  it('focuses Cancel even when the destructive action comes first', async () => {
    const fixture: ComponentFixture<ReversedHostComponent> =
      TestBed.createComponent(ReversedHostComponent);
    await fixture.whenStable();
    fixture.nativeElement.querySelector('button').click();
    await fixture.whenStable();
    expect(document.activeElement?.getAttribute('data-slot')).toBe('alert-dialog-cancel');
  });

  it('focuses the action when there is no Cancel part', async () => {
    const fixture: ComponentFixture<ActionOnlyHostComponent> =
      TestBed.createComponent(ActionOnlyHostComponent);
    await fixture.whenStable();
    fixture.nativeElement.querySelector('button').click();
    await fixture.whenStable();
    expect(document.activeElement?.getAttribute('data-slot')).toBe('alert-dialog-action');
  });

  it('ignores backdrop clicks', async () => {
    const { fixture } = await open();
    document.querySelector<HTMLElement>('.cdk-overlay-backdrop')?.click();
    await fixture.whenStable();
    expect(panel()).not.toBeNull();
  });

  it('confirms with the action result and cancels without one, restoring focus', async () => {
    const { fixture, trigger } = await open();
    panel()?.querySelector<HTMLButtonElement>('[data-slot="alert-dialog-action"]')?.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.result).toBe('deleted');
    expect(document.activeElement).toBe(trigger);

    trigger.click();
    await fixture.whenStable();
    panel()?.querySelector<HTMLButtonElement>('[data-slot="alert-dialog-cancel"]')?.click();
    await fixture.whenStable();
    expect(panel()).toBeNull();
    expect(fixture.componentInstance.result).toBeUndefined();
  });

  it('cancels on Escape', async () => {
    const { fixture } = await open();
    document.activeElement?.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    await fixture.whenStable();
    expect(panel()).toBeNull();
  });
});
