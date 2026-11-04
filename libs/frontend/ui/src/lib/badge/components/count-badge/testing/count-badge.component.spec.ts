import { Component, signal, type WritableSignal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { CountBadgeComponent } from '@internal/ui/lib/badge/components/count-badge/count-badge.component';

/**
 * Component HostComponent
 *
 * @description
 * Places a count badge with its spoken suffix and a compact class.
 */
@Component({
  imports: [CountBadgeComponent],
  template: `<ui-count-badge [count]="count()" class="h-4"
    ><span class="sr-only"> non lus</span></ui-count-badge
  >`,
})
class HostComponent {
  public readonly count: WritableSignal<number> = signal<number>(3);
}

describe('CountBadgeComponent', (): void => {
  it('shows the grey figure alone, capped at 99+, with the spoken words projected', async (): Promise<void> => {
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const badge: HTMLElement | null = (fixture.nativeElement as HTMLElement).querySelector(
      '[data-slot="count-badge"]',
    );
    expect(badge?.textContent).toBe('3 non lus');
    expect(badge?.classList).toContain('bg-surface-selected');
    expect(badge?.classList).toContain('text-fg-muted');
    // The caller's height wins over the default one.
    expect(badge?.classList).toContain('h-4');
    expect(badge?.classList).not.toContain('h-5');
    expect(badge?.querySelector('ng-icon')).toBeNull();
    fixture.componentInstance.count.set(99);
    await fixture.whenStable();
    expect(badge?.firstChild?.textContent).toBe('99');
    fixture.componentInstance.count.set(140);
    await fixture.whenStable();
    expect(badge?.firstChild?.textContent).toBe('99+');
  });
});
