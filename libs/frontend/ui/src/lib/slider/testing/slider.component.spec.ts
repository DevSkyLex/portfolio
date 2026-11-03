import { Directionality } from '@angular/cdk/bidi';
import { type WritableSignal, Component, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { SliderComponent } from '@internal/ui/lib/slider/slider.component';

/**
 * Component HostComponent
 * @class HostComponent
 *
 * @description
 * Binds a fixed slider range and a value-text formatter for semantic and interaction checks.
 */
@Component({
  imports: [SliderComponent],
  template: `<ui-slider
    ariaLabel="Volume"
    [min]="0"
    [max]="50"
    [step]="5"
    [valueText]="text"
    [(value)]="value"
  />`,
})
class HostComponent {
  // #region Properties
  /**
   * Property value
   * @readonly
   *
   * @description
   * Slider model whose changes are asserted after keyboard and pointer interaction.
   *
   * @type {WritableSignal<number>}
   */
  public readonly value: WritableSignal<number> = signal<number>(10);

  /**
   * Property text
   * @readonly
   *
   * @description
   * Formats the current value as percentage text for `aria-valuetext`.
   *
   * @type {(value: number) => string}
   */
  public readonly text: (value: number) => string = (value: number): string => `${value} %`;
  // #endregion
}

/**
 * Component ConfigurableHostComponent
 * @class ConfigurableHostComponent
 *
 * @description
 * Exposes mutable slider bounds, step and state inputs for edge-case interaction scenarios.
 */
@Component({
  imports: [SliderComponent],
  template: `<ui-slider
    ariaLabel="Réglage"
    [min]="min()"
    [max]="max()"
    [step]="step()"
    [disabled]="disabled()"
    [invalid]="invalid()"
    [(value)]="value"
  />`,
})
class ConfigurableHostComponent {
  // #region Properties
  /**
   * Property min
   * @readonly
   *
   * @description
   * Optional lower bound changed by tests to cover missing and collapsed ranges.
   *
   * @type {WritableSignal<number | undefined>}
   */
  public readonly min: WritableSignal<number | undefined> = signal<number | undefined>(0);

  /**
   * Property max
   * @readonly
   *
   * @description
   * Optional upper bound changed by tests to cover missing and collapsed ranges.
   *
   * @type {WritableSignal<number | undefined>}
   */
  public readonly max: WritableSignal<number | undefined> = signal<number | undefined>(100);

  /**
   * Property step
   * @readonly
   *
   * @description
   * Requested step used by the configurable slider fixture.
   *
   * @type {WritableSignal<number>}
   */
  public readonly step: WritableSignal<number> = signal<number>(1);

  /**
   * Property disabled
   * @readonly
   *
   * @description
   * Disabled input used to verify that interaction is ignored.
   *
   * @type {WritableSignal<boolean>}
   */
  public readonly disabled: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property invalid
   * @readonly
   *
   * @description
   * Invalid input used to verify thumb validation styling and ARIA state.
   *
   * @type {WritableSignal<boolean>}
   */
  public readonly invalid: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property value
   * @readonly
   *
   * @description
   * Slider model observed by assertions after interaction.
   *
   * @type {WritableSignal<number>}
   */
  public readonly value: WritableSignal<number> = signal<number>(10);
  // #endregion
}

/**
 * Function keydown
 *
 * @description
 * Dispatches a bubbling, cancelable keyboard event and returns it for default-prevention checks.
 *
 * @param {HTMLElement} target - Element receiving the keyboard event.
 * @param {string} key - Keyboard key name.
 * @returns {KeyboardEvent} Dispatched keyboard event.
 */
function keydown(target: HTMLElement, key: string): KeyboardEvent {
  const event: KeyboardEvent = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
  });
  target.dispatchEvent(event);
  return event;
}

/**
 * Function press
 *
 * @description
 * Dispatches a pointer-down and pointer-up pair at one client coordinate.
 *
 * @param {HTMLElement} target - Slider host receiving the pointer events.
 * @param {number} clientX - Horizontal client coordinate for the press.
 * @param {number} button - Mouse button code, defaulting to the primary button.
 * @returns {void}
 */
function press(target: HTMLElement, clientX: number, button: number = 0): void {
  target.dispatchEvent(new MouseEvent('pointerdown', { clientX, button, bubbles: true }));
  target.dispatchEvent(new MouseEvent('pointerup', { bubbles: true }));
}

/**
 * Function configurable
 *
 * @description
 * Creates the configurable slider fixture, applies optional host mutations and fixes track geometry.
 *
 * @param {(host: ConfigurableHostComponent) => void} setup - Optional mutations applied before stabilization.
 * @returns Fixture, slider elements and writable value model for the scenario.
 */
async function configurable(
  setup: (host: ConfigurableHostComponent) => void = (): undefined => undefined,
): Promise<{
  fixture: ComponentFixture<ConfigurableHostComponent>;
  host: HTMLElement;
  thumb: HTMLElement;
  track: HTMLElement;
  value: WritableSignal<number>;
}> {
  const fixture: ComponentFixture<ConfigurableHostComponent> =
    TestBed.createComponent(ConfigurableHostComponent);
  setup(fixture.componentInstance);
  await fixture.whenStable();
  const host: HTMLElement = fixture.nativeElement.querySelector('ui-slider');
  const thumb: HTMLElement = host.querySelector<HTMLElement>('[role="slider"]') as HTMLElement;
  const track: HTMLElement = host.querySelector<HTMLElement>(
    '[data-slot="slider-track"]',
  ) as HTMLElement;
  track.getBoundingClientRect = (): DOMRect => ({ left: 100, width: 200 }) as DOMRect;
  return { fixture, host, thumb, track, value: fixture.componentInstance.value };
}

describe('SliderComponent', (): void => {
  /**
   * Function setup
   *
   * @description
   * Creates the fixed-range slider fixture and returns its thumb after stabilization.
   *
   * @returns Fixture and slider thumb element.
   */
  async function setup(): Promise<{
    fixture: ComponentFixture<HostComponent>;
    thumb: HTMLElement;
  }> {
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const thumb: HTMLElement = fixture.nativeElement.querySelector('[role="slider"]');
    return { fixture, thumb };
  }

  it('exposes the slider semantics', async (): Promise<void> => {
    const { thumb } = await setup();
    expect(thumb.tabIndex).toBe(0);
    expect(thumb.getAttribute('aria-valuemin')).toBe('0');
    expect(thumb.getAttribute('aria-valuemax')).toBe('50');
    expect(thumb.getAttribute('aria-valuenow')).toBe('10');
    expect(thumb.getAttribute('aria-valuetext')).toBe('10 %');
    expect(thumb.getAttribute('aria-label')).toBe('Volume');
    expect(thumb.style.insetInlineStart).toBe('20%');
  });

  it('moves by step, by ten steps and to the bounds from the keyboard', async (): Promise<void> => {
    const { fixture, thumb } = await setup();
    const value: WritableSignal<number> = fixture.componentInstance.value;
    keydown(thumb, 'ArrowRight');
    expect(value()).toBe(15);
    keydown(thumb, 'ArrowDown');
    expect(value()).toBe(10);
    keydown(thumb, 'PageUp');
    expect(value()).toBe(50);
    keydown(thumb, 'Home');
    expect(value()).toBe(0);
    keydown(thumb, 'ArrowLeft');
    expect(value()).toBe(0);
    keydown(thumb, 'End');
    await fixture.whenStable();
    expect(thumb.getAttribute('aria-valuenow')).toBe('50');
  });

  it('follows the pointer on the track, snapped to the step', async (): Promise<void> => {
    const { fixture } = await setup();
    const host: HTMLElement = fixture.nativeElement.querySelector('ui-slider');
    const track: HTMLElement = host.querySelector('[data-slot="slider-track"]') as HTMLElement;
    track.getBoundingClientRect = (): DOMRect => ({ left: 100, width: 200 }) as DOMRect;

    host.dispatchEvent(new MouseEvent('pointerdown', { clientX: 162, button: 0, bubbles: true }));
    expect(fixture.componentInstance.value()).toBe(15);
    host.dispatchEvent(new MouseEvent('pointermove', { clientX: 400, bubbles: true }));
    expect(fixture.componentInstance.value()).toBe(50);
    host.dispatchEvent(new MouseEvent('pointerup', { bubbles: true }));
    host.dispatchEvent(new MouseEvent('pointermove', { clientX: 100, bubbles: true }));
    expect(fixture.componentInstance.value()).toBe(50);
  });

  it('falls back to 0–100 when a form field has no min or max rule', async (): Promise<void> => {
    const { thumb } = await configurable((host: ConfigurableHostComponent): void => {
      host.min.set(undefined);
      host.max.set(undefined);
    });
    expect(thumb.getAttribute('aria-valuemin')).toBe('0');
    expect(thumb.getAttribute('aria-valuemax')).toBe('100');
    expect(thumb.style.insetInlineStart).toBe('10%');
  });

  it('moves by 1 when the step is not positive', async (): Promise<void> => {
    const { thumb, value } = await configurable((host: ConfigurableHostComponent): void =>
      host.step.set(0),
    );
    keydown(thumb, 'ArrowUp');
    expect(value()).toBe(11);
  });

  it('pins the thumb at the start of an empty range', async (): Promise<void> => {
    const { thumb, value } = await configurable((host: ConfigurableHostComponent): void => {
      host.min.set(5);
      host.max.set(5);
    });
    expect(thumb.getAttribute('aria-valuenow')).toBe('5');
    expect(thumb.style.insetInlineStart).toBe('0%');
    keydown(thumb, 'ArrowUp');
    expect(value()).toBe(5);
  });

  it('ignores the keyboard and the pointer while disabled', async (): Promise<void> => {
    const { host, thumb, value } = await configurable((h: ConfigurableHostComponent): void =>
      h.disabled.set(true),
    );
    expect(thumb.tabIndex).toBe(-1);
    expect(thumb.getAttribute('aria-disabled')).toBe('true');
    expect(host.hasAttribute('data-disabled')).toBe(true);
    expect(thumb.className).not.toContain('hover:scale-110');
    expect(keydown(thumb, 'ArrowRight').defaultPrevented).toBe(false);
    press(host, 250);
    expect(value()).toBe(10);
  });

  it('leaves other keys, other buttons and a collapsed track alone', async (): Promise<void> => {
    const { host, thumb, track, value } = await configurable();
    expect(keydown(thumb, 'a').defaultPrevented).toBe(false);
    press(host, 250, 2);
    expect(value()).toBe(10);
    track.getBoundingClientRect = (): DOMRect => ({ left: 100, width: 0 }) as DOMRect;
    press(host, 250);
    expect(value()).toBe(10);
  });

  it('marks an invalid value on the thumb', async (): Promise<void> => {
    const { thumb } = await configurable((host: ConfigurableHostComponent): void =>
      host.invalid.set(true),
    );
    expect(thumb.getAttribute('aria-invalid')).toBe('true');
    expect(thumb.className).toContain('border-danger');
  });

  it('mirrors the arrows and the track in a right-to-left page', async (): Promise<void> => {
    TestBed.configureTestingModule({
      providers: [{ provide: Directionality, useValue: { value: 'rtl', change: of('rtl') } }],
    });
    const { host, thumb, value } = await configurable();
    keydown(thumb, 'ArrowRight');
    expect(value()).toBe(9);
    keydown(thumb, 'ArrowLeft');
    expect(value()).toBe(10);

    // 25 % from the left edge is 75 % of the range from its start.
    press(host, 150);
    expect(value()).toBe(75);
  });
});
