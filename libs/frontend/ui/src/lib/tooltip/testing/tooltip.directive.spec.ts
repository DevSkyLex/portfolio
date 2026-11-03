import { Component } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { TooltipDirective } from '@internal/ui/lib/tooltip/tooltip.directive';

/**
 * Component HostComponent
 * @class HostComponent
 *
 * @description
 * Renders a tooltip trigger with a pre-existing description id and short show and hide delays.
 */
@Component({
  imports: [TooltipDirective],
  template: `<button
    type="button"
    uiTooltip="Copy the link"
    tooltipPosition="bottom"
    [tooltipShowDelay]="30"
    [tooltipHideDelay]="0"
    aria-describedby="hint"
  >
    Copy
  </button>`,
})
class HostComponent {}

/**
 * Function wait
 *
 * @description
 * Resolves after the requested delay so tooltip timer behavior can elapse in real time.
 *
 * @param {number} ms - Delay in milliseconds.
 * @returns {Promise<void>} Resolves after the delay.
 */
const wait = (ms: number): Promise<unknown> =>
  new Promise((resolve: (value: unknown) => void): NodeJS.Timeout => setTimeout(resolve, ms));

/**
 * Function tooltip
 *
 * @description
 * Finds the tooltip bubble attached to the current document overlay container.
 *
 * @returns {HTMLElement | null} Tooltip panel if open, otherwise `null`.
 */
function tooltip(): HTMLElement | null {
  return document.querySelector('[role="tooltip"]');
}

/**
 * Function setup
 *
 * @description
 * Creates and stabilizes the tooltip fixture and returns its trigger button.
 *
 * @returns Fixture and tooltip trigger button.
 */
async function setup(): Promise<{
  fixture: ComponentFixture<HostComponent>;
  trigger: HTMLButtonElement;
}> {
  const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
  await fixture.whenStable();
  const trigger: HTMLButtonElement = fixture.nativeElement.querySelector('button');
  return { fixture, trigger };
}

describe('TooltipDirective', (): void => {
  it('shows on hover after the delay and describes the trigger', async (): Promise<void> => {
    const { fixture, trigger } = await setup();
    trigger.dispatchEvent(new MouseEvent('pointerenter'));
    await fixture.whenStable();
    expect(tooltip()).toBeNull();

    await wait(50);
    await fixture.whenStable();
    const bubble: HTMLElement | null = tooltip();
    expect(bubble?.textContent).toBe('Copy the link');
    expect(trigger.getAttribute('aria-describedby')).toBe(`hint ${bubble?.id}`);

    trigger.dispatchEvent(new MouseEvent('pointerleave'));
    await wait(10);
    await fixture.whenStable();
    expect(tooltip()).toBeNull();
    expect(trigger.getAttribute('aria-describedby')).toBe('hint');
  });

  it('shows at once on keyboard focus and hides on Escape and on blur', async (): Promise<void> => {
    const { fixture, trigger } = await setup();
    trigger.focus();
    await fixture.whenStable();
    expect(tooltip()).not.toBeNull();

    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await fixture.whenStable();
    expect(tooltip()).toBeNull();

    trigger.blur();
    trigger.focus();
    await fixture.whenStable();
    expect(tooltip()).not.toBeNull();
    trigger.blur();
    await fixture.whenStable();
    expect(tooltip()).toBeNull();
  });

  it('does not open from the focus caused by a click', async (): Promise<void> => {
    const { fixture, trigger } = await setup();
    trigger.dispatchEvent(new MouseEvent('pointerdown'));
    trigger.focus();
    await fixture.whenStable();
    expect(tooltip()).toBeNull();
    trigger.blur();
  });
});
