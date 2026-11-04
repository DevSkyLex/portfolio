import { Component, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { KbdHintComponent } from '@internal/ui/lib/kbd/components/kbd-hint/kbd-hint.component';

/**
 * Class HostComponent
 * @class HostComponent
 *
 * @description
 * Renders a symbol hint with a spoken name and a word combination read as written.
 */
@Component({
  imports: [KbdHintComponent],
  template: `
    <ui-kbd-hint id="enter" [keys]="['↵']" label="Valider" spokenKeys="Entrée" class="gap-2" />
    <ui-kbd-hint id="combo" [keys]="keys()" label="Ouvrir la palette" />
  `,
})
class HostComponent {
  // #region Properties
  /**
   * Property keys
   * @readonly
   *
   * @description
   * Keys of the second hint, changed by the specs.
   *
   * @type {WritableSignal<readonly string[]>}
   */
  public readonly keys: WritableSignal<readonly string[]> = signal<readonly string[]>([
    'Ctrl',
    'K',
  ]);
  // #endregion
}

describe('KbdHintComponent', () => {
  it('draws one keycap per key in a group, then the label, in faint small text', async () => {
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const hint: HTMLElement = fixture.nativeElement.querySelector('#combo');
    expect(hint.getAttribute('data-slot')).toBe('kbd-hint');
    expect(hint.classList).toContain('text-[12px]/4');
    expect(hint.classList).toContain('text-fg-faint');
    const group: HTMLElement | null = hint.querySelector('kbd[data-slot="kbd-group"]');
    expect(group?.getAttribute('aria-hidden')).toBe('true');
    const keys: HTMLElement[] = Array.from(
      group?.querySelectorAll<HTMLElement>('kbd[data-slot="kbd"]') ?? [],
    );
    expect(keys.map((key) => key.textContent)).toEqual(['Ctrl', 'K']);
    expect(hint.lastElementChild?.textContent).toBe('Ouvrir la palette');
    expect(hint.lastElementChild?.getAttribute('aria-hidden')).toBe('true');

    fixture.componentInstance.keys.set(['↑', '↓']);
    await fixture.whenStable();
    expect(hint.querySelectorAll('kbd[data-slot="kbd"]')).toHaveLength(2);
    expect(hint.querySelector('.sr-only')?.textContent).toBe('↑ ↓ : Ouvrir la palette');
  });

  it('reads one sentence built from the spoken keys and merges caller classes', async () => {
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const enter: HTMLElement = fixture.nativeElement.querySelector('#enter');
    expect(enter.querySelector('.sr-only')?.textContent).toBe('Entrée : Valider');
    expect(enter.classList).toContain('gap-2');
    expect(enter.classList).not.toContain('gap-1.5');
    expect(fixture.nativeElement.querySelector('#combo .sr-only')?.textContent).toBe(
      'Ctrl K : Ouvrir la palette',
    );
  });
});
