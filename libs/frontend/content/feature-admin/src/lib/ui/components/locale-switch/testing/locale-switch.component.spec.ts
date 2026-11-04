import { Component, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { ContentLocale } from '@internal/content-web-feature-admin/lib/models/content-locale/content-locale.type';
import type { LocaleFieldState } from '@internal/content-web-feature-admin/lib/models/locale-field-state/locale-field-state.type';
import { LocaleSwitchComponent } from '@internal/content-web-feature-admin/lib/ui/components/locale-switch/locale-switch.component';

/**
 * Class HostComponent
 * @class HostComponent
 *
 * @description
 * Binds the shown language, the states and the attachment of a toggle.
 */
@Component({
  imports: [LocaleSwitchComponent],
  template: `<content-locale-switch
    label="Intitulé"
    [attached]="attached()"
    [compact]="compact()"
    [states]="states()"
    [(value)]="shown"
  />`,
})
class HostComponent {
  // #region Properties
  /**
   * Property shown
   * @readonly
   *
   * @description
   * Shown language.
   *
   * @type {WritableSignal<ContentLocale>}
   */
  public readonly shown: WritableSignal<ContentLocale> = signal<ContentLocale>('fr');

  /**
   * Property states
   * @readonly
   *
   * @description
   * Language states.
   *
   * @type {WritableSignal<Readonly<Record<ContentLocale, LocaleFieldState>>>}
   */
  public readonly states: WritableSignal<Readonly<Record<ContentLocale, LocaleFieldState>>> =
    signal<Readonly<Record<ContentLocale, LocaleFieldState>>>({ fr: 'filled', en: 'empty' });

  /**
   * Property attached
   * @readonly
   *
   * @description
   * Whether the toggle joins the control before it.
   *
   * @type {WritableSignal<boolean>}
   */
  public readonly attached: WritableSignal<boolean> = signal<boolean>(true);

  /**
   * Property compact
   * @readonly
   *
   * @description
   * Whether the buttons are the small ones of a strip or toolbar.
   *
   * @type {WritableSignal<boolean>}
   */
  public readonly compact: WritableSignal<boolean> = signal<boolean>(false);
  // #endregion
}

/**
 * Function setup
 *
 * @description
 * Mounts the host and returns its two flag buttons.
 *
 * @returns {Promise<{ fixture: ComponentFixture<HostComponent>; fr: HTMLButtonElement; en: HTMLButtonElement }>} Handles.
 */
async function setup(): Promise<{
  fixture: ComponentFixture<HostComponent>;
  fr: HTMLButtonElement;
  en: HTMLButtonElement;
}> {
  const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
  await fixture.whenStable();
  const [fr, en] = [...fixture.nativeElement.querySelectorAll('button')] as HTMLButtonElement[];
  if (!fr || !en) throw new Error('flag buttons missing');
  return { fixture, fr, en };
}

/**
 * Function name
 *
 * @description
 * Text a screen reader announces for a button, spaces collapsed.
 *
 * @param {HTMLElement} button - Button.
 *
 * @returns {string} Text.
 */
const name = (button: HTMLElement): string =>
  button.textContent?.replace(/\s+/g, ' ').replace(' ,', ',').trim() ?? '';

describe('LocaleSwitchComponent', (): void => {
  it('shows one flag per language, the shown one pressed, named and dotted by its state', async (): Promise<void> => {
    const { fixture, fr, en } = await setup();
    const group: HTMLElement | null = fixture.nativeElement.querySelector('[role="group"]');
    expect(group?.getAttribute('aria-label')).toBe('Langue du champ Intitulé');
    expect(fr.querySelector('ng-icon')).not.toBeNull();
    expect(fr.getAttribute('aria-pressed')).toBe('true');
    expect(en.getAttribute('aria-pressed')).toBe('false');
    expect(name(fr)).toBe('Français');
    expect(name(en)).toBe('English, à compléter');
    expect(en.querySelector('[lang="en"]')?.textContent).toBe('English');
    expect(en.querySelector('.rounded-full')?.className).toContain('bg-warning-ink');
    expect(fr.querySelector('.rounded-full')).toBeNull();

    fixture.componentInstance.states.set({ fr: 'error', en: 'filled' });
    await fixture.whenStable();
    expect(name(fr)).toBe('Français, à corriger');
    expect(fr.querySelector('.rounded-full')?.className).toContain('bg-danger-ink');
    expect(en.querySelector('.rounded-full')).toBeNull();
  });

  it('switches the language, sliding the thumb, and always keeps one shown', async (): Promise<void> => {
    const { fixture, en } = await setup();
    const thumb: HTMLElement | null = fixture.nativeElement.querySelector(
      '[role="group"] > span[aria-hidden="true"]',
    );
    expect(thumb?.style.transform).toBe('translateX(0%)');
    expect(thumb?.className).toContain('transition-transform');
    expect(thumb?.className).toContain('motion-reduce:transition-none');
    en.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.shown()).toBe('en');
    expect(en.getAttribute('aria-pressed')).toBe('true');
    expect(thumb?.style.transform).toBe('translateX(100%)');
    en.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.shown()).toBe('en');
  });

  it('draws one frame, joined to the control before it or standing alone, compact on demand', async (): Promise<void> => {
    const { fixture } = await setup();
    const frame: HTMLElement = fixture.nativeElement.querySelector('[role="group"]');
    expect(frame.className).toContain('border-border-field');
    expect(frame.className).toContain('rounded-s-none');
    expect(frame.className).toContain('h-9');
    fixture.componentInstance.attached.set(false);
    await fixture.whenStable();
    expect(frame.className).not.toContain('rounded-s-none');
    // The small control of a strip under a textarea or of an editor toolbar.
    fixture.componentInstance.compact.set(true);
    await fixture.whenStable();
    expect(frame.className).toContain('h-7');
    expect(frame.className).toContain('rounded-sm');
  });
});
