import { Component } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { AlertDialogHeaderDirective } from '@internal/ui/lib/alert-dialog/directives/alert-dialog-parts/alert-dialog-parts.directive';

/**
 * Class HostComponent
 * @class HostComponent
 *
 * @description
 * Renders the default alert-dialog header and its bar variant.
 */
@Component({
  imports: [AlertDialogHeaderDirective],
  template: `
    <div uiAlertDialogHeader id="default"></div>
    <div uiAlertDialogHeader variant="bar" id="bar"></div>
  `,
})
class HostComponent {}

describe('AlertDialogHeaderDirective', () => {
  it('keeps the stacked header by default and draws the edge-to-edge bar on request', async () => {
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const stacked: HTMLElement = fixture.nativeElement.querySelector('#default');
    expect(stacked.getAttribute('data-slot')).toBe('alert-dialog-header');
    expect(stacked.getAttribute('data-variant')).toBe('default');
    expect(stacked.className).toBe('flex flex-col gap-2 text-left');

    const bar: HTMLElement = fixture.nativeElement.querySelector('#bar');
    expect(bar.getAttribute('data-variant')).toBe('bar');
    for (const name of ['-mx-(--dialog-inset)', '-mt-(--dialog-inset)', 'border-b', 'min-h-13']) {
      expect(bar.classList).toContain(name);
    }
    // No close button in an alert dialog: the padding stays symmetric, with no fill of its own.
    expect(bar.classList).not.toContain('pr-14');
    expect(bar.className).not.toMatch(/\bbg-/);
  });
});
