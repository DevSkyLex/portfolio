import { Component } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { AlertDialogFooterDirective } from '@internal/ui/lib/alert-dialog/directives/alert-dialog-parts/alert-dialog-parts.directive';
import { alertDialogContentVariants } from '@internal/ui/lib/alert-dialog/constants/alert-dialog-content.variants';

/**
 * Class HostComponent
 * @class HostComponent
 *
 * @description
 * Renders the default alert-dialog footer and its bar variant.
 */
@Component({
  imports: [AlertDialogFooterDirective],
  template: `
    <div uiAlertDialogFooter id="actions"></div>
    <div uiAlertDialogFooter variant="bar" id="bar"></div>
  `,
})
class HostComponent {}

describe('AlertDialogFooterDirective', () => {
  it('keeps the action row by default and draws the edge-to-edge bar on request', async () => {
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const actions: HTMLElement = fixture.nativeElement.querySelector('#actions');
    expect(actions.getAttribute('data-slot')).toBe('alert-dialog-footer');
    expect(actions.getAttribute('data-variant')).toBe('actions');
    expect(actions.classList).toContain('sm:justify-end');
    expect(actions.classList).not.toContain('border-t');

    const bar: HTMLElement = fixture.nativeElement.querySelector('#bar');
    expect(bar.getAttribute('data-variant')).toBe('bar');
    expect(bar.classList).toContain('-mx-(--dialog-inset)');
    expect(bar.classList).toContain('-mb-(--dialog-inset)');
    expect(bar.classList).toContain('sticky');
    expect(bar.classList).toContain('-bottom-(--dialog-inset)');
    expect(bar.classList).not.toContain('bottom-0');
    expect(bar.classList).toContain('border-t');
    expect(bar.classList).toContain('bg-surface-raised');
    expect(bar.classList).not.toContain('bg-surface-sunk');
  });

  it('pads the alert panel with the inset the bar cancels', () => {
    const classes: string = alertDialogContentVariants();
    expect(classes).toContain('p-(--dialog-inset)');
    expect(classes).toContain('[--dialog-inset:--spacing(6)]');
    expect(classes).not.toContain('sm:[--dialog-inset:--spacing(8)]');
  });
});
