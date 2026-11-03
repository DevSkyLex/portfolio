import { Component } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { LabelDirective } from '@internal/ui/lib/label/label.directive';

/**
 * Class HostComponent
 * @class HostComponent
 *
 * @description
 * Renders a label associated with a native input to verify control association and class merging.
 */
@Component({
  imports: [LabelDirective],
  template: `<label uiLabel for="email" class="text-sm">E-mail</label><input id="email" />`,
})
class HostComponent {}

describe('LabelDirective', () => {
  it('labels its control and merges the caller classes', async () => {
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const label: HTMLLabelElement = fixture.nativeElement.querySelector('label');
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
    expect(label.control).toBe(input);
    expect(label.dataset['slot']).toBe('label');
    expect(label.className).toContain('text-sm');
    expect(label.className).not.toContain('text-control');
  });
});
