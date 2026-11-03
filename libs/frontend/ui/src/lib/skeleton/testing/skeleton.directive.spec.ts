import { Component } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { SkeletonDirective } from '@internal/ui/lib/skeleton/skeleton.directive';

/**
 * Component HostComponent
 * @class HostComponent
 *
 * @description
 * Places a busy wrapper around a skeleton span to assert the directive's visual and accessibility output.
 */
@Component({
  imports: [SkeletonDirective],
  template: `<div aria-busy="true"><span uiSkeleton class="h-4 w-40 rounded-none"></span></div>`,
})
class HostComponent {}

describe('SkeletonDirective', (): void => {
  it('is hidden from assistive technologies and pulses unless motion is reduced', async (): Promise<void> => {
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const skeleton: HTMLElement = fixture.nativeElement.querySelector('[data-slot="skeleton"]');
    expect(skeleton.getAttribute('aria-hidden')).toBe('true');
    expect(skeleton.className).toContain('motion-reduce:animate-none');
    expect(skeleton.className).toContain('rounded-none');
    expect(skeleton.className).not.toContain('rounded-sm');
  });
});
