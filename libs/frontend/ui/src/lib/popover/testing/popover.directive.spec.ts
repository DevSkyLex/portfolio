import { Component } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { connectedPositions } from '@internal/ui/lib/popover/utils/connected-position/connected-position';
import {
  PopoverContentDirective,
  PopoverTriggerDirective,
} from '@internal/ui/lib/popover/popover.directive';

/**
 * Component HostComponent
 * @class HostComponent
 *
 * @description
 * Provides a labelled popover template, close control and outside-focus target for the fixture.
 */
@Component({
  imports: [PopoverTriggerDirective, PopoverContentDirective],
  template: `
    <button type="button" [uiPopoverTrigger]="info" side="top" align="start">Details</button>
    <button type="button" id="elsewhere">Elsewhere</button>
    <ng-template
      uiPopoverContent
      #info="uiPopoverContent"
      [class]="'w-60 gap-0 p-[3px]'"
      ariaLabel="Details"
      let-close="close"
    >
      <p>Built with Angular.</p>
      <button type="button" id="inner" (click)="close()">Got it</button>
    </ng-template>
  `,
})
class HostComponent {}

/**
 * Function panel
 *
 * @description
 * Finds the currently attached popover panel by its stable data-slot marker.
 *
 * @returns {HTMLElement | null} Active panel element, or `null` while the popover is closed.
 */
function panel(): HTMLElement | null {
  return document.querySelector('[data-slot="popover-content"]');
}

/**
 * Function setup
 *
 * @description
 * Creates the fixture, waits for stability and focuses the popover trigger before interaction.
 *
 * @returns Fixture and focused trigger used by the interaction specs.
 */
async function setup(): Promise<{
  fixture: ComponentFixture<HostComponent>;
  trigger: HTMLButtonElement;
}> {
  const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
  await fixture.whenStable();
  const trigger: HTMLButtonElement = fixture.nativeElement.querySelector('button');
  trigger.focus();
  return { fixture, trigger };
}

describe('PopoverTriggerDirective', (): void => {
  it('merges the classes written on the template into the panel', async (): Promise<void> => {
    const { fixture, trigger } = await setup();
    trigger.click();
    await fixture.whenStable();
    const classes: DOMTokenList | undefined = panel()?.classList;
    expect(classes).toContain('p-[3px]');
    expect(classes).toContain('w-60');
    expect(classes).not.toContain('p-4');
    expect(classes).not.toContain('w-72');
  });

  it('toggles a labelled panel linked to the trigger, with focus inside', async (): Promise<void> => {
    const { fixture, trigger } = await setup();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(trigger.getAttribute('aria-controls')).toBeNull();

    trigger.click();
    await fixture.whenStable();
    const popover: HTMLElement | null = panel();
    expect(popover?.getAttribute('role')).toBe('dialog');
    expect(popover?.getAttribute('aria-label')).toBe('Details');
    expect(popover?.textContent).toContain('Built with Angular.');
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(trigger.getAttribute('aria-controls')).toBe(popover?.id);
    expect(popover?.contains(document.activeElement)).toBe(true);

    trigger.click();
    await fixture.whenStable();
    expect(panel()).toBeNull();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('closes on Escape and returns focus to the trigger', async (): Promise<void> => {
    const { fixture, trigger } = await setup();
    trigger.click();
    await fixture.whenStable();
    document.activeElement?.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    await fixture.whenStable();
    expect(panel()).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('closes on an outside click and through the template context', async (): Promise<void> => {
    const { fixture, trigger } = await setup();
    trigger.click();
    await fixture.whenStable();
    const elsewhere: HTMLElement = fixture.nativeElement.querySelector('#elsewhere');
    elsewhere.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    elsewhere.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await fixture.whenStable();
    expect(panel()).toBeNull();

    trigger.click();
    await fixture.whenStable();
    panel()?.querySelector<HTMLButtonElement>('#inner')?.click();
    await fixture.whenStable();
    expect(panel()).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('closes when focus leaves the panel', async (): Promise<void> => {
    const { fixture, trigger } = await setup();
    trigger.click();
    await fixture.whenStable();
    const elsewhere: HTMLElement = fixture.nativeElement.querySelector('#elsewhere');
    panel()?.dispatchEvent(new FocusEvent('focusout', { relatedTarget: elsewhere }));
    await fixture.whenStable();
    expect(panel()).toBeNull();
  });
});

describe('connectedPositions', (): void => {
  it('places the panel on the requested side and falls back to the opposite one', (): void => {
    const [preferred, fallback] = connectedPositions('top', 'start', 4);
    expect(preferred).toEqual({
      originX: 'start',
      overlayX: 'start',
      originY: 'top',
      overlayY: 'bottom',
      offsetY: -4,
    });
    expect(fallback?.originY).toBe('bottom');
    expect(connectedPositions('right', 'end', 8)[0]).toMatchObject({
      originX: 'end',
      overlayX: 'start',
      originY: 'bottom',
      offsetX: 8,
    });
  });
});
