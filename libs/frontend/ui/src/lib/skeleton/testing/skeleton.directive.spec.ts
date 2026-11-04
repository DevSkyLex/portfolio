import { Component } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { SkeletonDirective } from '@internal/ui/lib/skeleton/skeleton.directive';

/**
 * Component HostComponent
 * @class HostComponent
 *
 * @description
 * Places block, text and circle skeletons in a busy wrapper to assert the directive's look and
 * accessibility output.
 */
@Component({
  imports: [SkeletonDirective],
  template: `<div aria-busy="true">
    <span uiSkeleton class="h-10 w-40 rounded-none"></span>
    <span uiSkeleton shape="text" class="w-24"></span>
    <span uiSkeleton shape="circle" class="size-8"></span>
  </div>`,
})
class HostComponent {}

describe('SkeletonDirective', (): void => {
  it('is hidden from assistive technologies and sweeps a shimmer unless motion is reduced', async (): Promise<void> => {
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const [block, text, circle] = Array.from<HTMLElement>(
      fixture.nativeElement.querySelectorAll('[data-slot="skeleton"]'),
    );
    expect(block?.getAttribute('aria-hidden')).toBe('true');
    const classes: string[] = block?.className.split(' ') ?? [];
    expect(classes).toEqual(
      expect.arrayContaining([
        'bg-surface-hover',
        'via-surface-selected',
        'animate-shimmer',
        'motion-reduce:animate-none',
        'motion-reduce:bg-none',
      ]),
    );
    // Calm look: no inset ring and no opacity pulse.
    expect(block?.className).not.toContain('inset-ring');
    expect(block?.className).not.toContain('pulse');
    // The caller's radius replaces the shape's.
    expect(classes).toContain('rounded-none');
    expect(classes).not.toContain('rounded-sm');
    expect(block?.dataset['shape']).toBe('block');
    expect(text?.className.split(' ')).toEqual(
      expect.arrayContaining(['h-3', 'rounded-full', 'w-24']),
    );
    expect(text?.dataset['shape']).toBe('text');
    expect(circle?.className.split(' ')).toEqual(
      expect.arrayContaining(['aspect-square', 'rounded-full', 'size-8']),
    );
  });
});
