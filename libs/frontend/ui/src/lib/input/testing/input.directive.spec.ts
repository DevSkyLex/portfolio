import { Component } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { InputDirective } from '@internal/ui/lib/input/input.directive';

/**
 * Component HostComponent
 * @class HostComponent
 *
 * @description
 * Places a sized input and multiline textarea in a standalone host for directive rendering assertions.
 */
@Component({
  imports: [InputDirective],
  template: `<input uiInput size="lg" /><textarea uiInput multiline></textarea>`,
})
class HostComponent {}

describe('InputDirective', () => {
  it('applies the requested size and the free height of text areas', async () => {
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const [input, textarea] = fixture.nativeElement.querySelectorAll('[data-slot="input"]');
    expect(input.className).toContain('h-14');
    expect(textarea.className).toContain('min-h-36');
  });
});
