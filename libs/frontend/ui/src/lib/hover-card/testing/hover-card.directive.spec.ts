import { Component } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import {
  HoverCardContentDirective,
  HoverCardTriggerDirective,
} from '@internal/ui/lib/hover-card/hover-card.directive';

/**
 * Class HostComponent
 * @class HostComponent
 *
 * @description
 * Test fixture pairs a link trigger with a delayed hover-card template.
 */
@Component({
  imports: [HoverCardTriggerDirective, HoverCardContentDirective],
  template: `
    <a href="/projects/orbit" [uiHoverCardTrigger]="preview" [openDelay]="30" [closeDelay]="20">
      Orbit
    </a>
    <ng-template uiHoverCardContent #preview="uiHoverCardContent">
      <p>Design system of the portfolio.</p>
    </ng-template>
  `,
})
class HostComponent {}

/**
 * Function wait
 *
 * @description
 * Resolves after the requested timeout so tests can observe configured hover and close delays.
 *
 * @param {number} ms - Delay in milliseconds.
 * @returns {Promise<void>} Completion after the timer expires.
 */
const wait = (ms: number): Promise<unknown> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Function card
 *
 * @description
 * Returns the currently attached hover-card panel from the CDK overlay container.
 *
 * @returns {HTMLElement | null} Rendered panel, or null while the overlay is closed.
 */
function card(): HTMLElement | null {
  return document.querySelector('[data-slot="hover-card-content"]');
}

/**
 * Function setup
 *
 * @description
 * Creates a stable fixture and returns its link trigger for pointer, focus and keyboard events.
 *
 * @returns {Promise<{ fixture: ComponentFixture<HostComponent>; trigger: HTMLAnchorElement }>} Fixture and trigger.
 */
async function setup(): Promise<{
  fixture: ComponentFixture<HostComponent>;
  trigger: HTMLAnchorElement;
}> {
  const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
  await fixture.whenStable();
  const trigger: HTMLAnchorElement = fixture.nativeElement.querySelector('a');
  return { fixture, trigger };
}

describe('HoverCardTriggerDirective', () => {
  it('opens after the delay on hover and stays open while the card is hovered', async () => {
    const { fixture, trigger } = await setup();
    trigger.dispatchEvent(new MouseEvent('pointerenter'));
    await fixture.whenStable();
    expect(card()).toBeNull();

    await wait(50);
    await fixture.whenStable();
    expect(card()?.textContent).toContain('Design system of the portfolio.');
    expect(trigger.getAttribute('data-state')).toBe('open');

    trigger.dispatchEvent(new MouseEvent('pointerleave'));
    card()?.dispatchEvent(new MouseEvent('pointerenter'));
    await wait(40);
    expect(card()).not.toBeNull();

    card()?.dispatchEvent(new MouseEvent('pointerleave'));
    await wait(40);
    await fixture.whenStable();
    expect(card()).toBeNull();
    expect(trigger.getAttribute('data-state')).toBe('closed');
  });

  it('ignores touch pointers', async () => {
    const { fixture, trigger } = await setup();
    const touch: MouseEvent = new MouseEvent('pointerenter');
    Object.defineProperty(touch, 'pointerType', { value: 'touch' });
    trigger.dispatchEvent(touch);
    await wait(50);
    await fixture.whenStable();
    expect(card()).toBeNull();
  });

  it('opens on focus and closes on Escape and on blur', async () => {
    const { fixture, trigger } = await setup();
    trigger.focus();
    await fixture.whenStable();
    expect(card()).not.toBeNull();
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await fixture.whenStable();
    expect(card()).toBeNull();

    trigger.blur();
    trigger.focus();
    expect(card()).not.toBeNull();
    trigger.blur();
    await fixture.whenStable();
    expect(card()).toBeNull();
  });
});
