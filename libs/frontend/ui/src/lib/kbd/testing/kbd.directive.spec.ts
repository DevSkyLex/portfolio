import { Component } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { KBD_IMPORTS } from '@internal/ui/lib/kbd/constants/kbd.imports';

/**
 * Class HostComponent
 * @class HostComponent
 *
 * @description
 * Renders a native keyboard combination with a caller class override for directive assertions.
 */
@Component({
  imports: [KBD_IMPORTS],
  template: `<kbd uiKbdGroup><kbd uiKbd>Ctrl</kbd>+<kbd uiKbd class="px-2">K</kbd></kbd>`,
})
class HostComponent {}

describe('Kbd', () => {
  it('nests native kbd elements, as HTML specifies for key combinations', async () => {
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const group: HTMLElement = fixture.nativeElement.querySelector('[data-slot="kbd-group"]');
    expect(group.tagName).toBe('KBD');
    const keys: NodeListOf<HTMLElement> =
      group.querySelectorAll<HTMLElement>('kbd[data-slot="kbd"]');
    expect(Array.from(keys).map((key) => key.textContent)).toEqual(['Ctrl', 'K']);
    expect(group.textContent).toBe('Ctrl+K');
    expect(keys[1]?.className).toContain('px-2');
    expect(keys[1]?.className).not.toContain('px-1.5');
  });
});
