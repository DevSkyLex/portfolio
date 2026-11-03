import { Component, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { NgIcon } from '@ng-icons/core';
import { lucideCircleAlert } from '@ng-icons/lucide';
import { ALERT_IMPORTS } from '@internal/ui/lib/alert/constants/alert.imports';
import type { AlertVariant } from '@internal/ui/lib/alert/constants/alert.variants';

/**
 * Component HostComponent
 * @class HostComponent
 *
 * @description
 * Provides mutable variant and announcement-role inputs for an alert containing an icon, title,
 * and description.
 */
@Component({
  imports: [ALERT_IMPORTS, NgIcon],
  template: `<div uiAlert [variant]="variant()" [role]="role()">
    <ng-icon [svg]="icon" size="16" aria-hidden="true" />
    <p uiAlertTitle>Envoi impossible</p>
    <div uiAlertDescription>Réessayez plus tard.</div>
  </div>`,
})
class HostComponent {
  // #region Properties
  /**
   * Property icon
   * @readonly
   *
   * @description
   * Alert icon projected beside the title and description.
   */
  protected readonly icon: string = lucideCircleAlert;

  /**
   * Property variant
   * @readonly
   *
   * @description
   * Variant changed by the host test to verify host and title styling updates.
   *
   * @type {WritableSignal<AlertVariant>}
   */
  public readonly variant: WritableSignal<AlertVariant> = signal<AlertVariant>('default');

  /**
   * Property role
   * @readonly
   *
   * @description
   * Announcement role changed by the host test to cover urgent, polite, and static messages.
   *
   * @type {WritableSignal<'alert' | 'status' | null>}
   */
  public readonly role: WritableSignal<'alert' | 'status' | null> = signal<
    'alert' | 'status' | null
  >('alert');
  // #endregion
}

describe('AlertDirective', () => {
  it('announces itself as an alert and exposes the variant to its parts', async () => {
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    fixture.componentInstance.variant.set('danger');
    await fixture.whenStable();
    const alert: HTMLElement = fixture.nativeElement.querySelector('[data-slot="alert"]');
    expect(alert.getAttribute('role')).toBe('alert');
    expect(alert.dataset['variant']).toBe('danger');
    expect(alert.className).toContain('border-danger');
    const title: HTMLElement | null = alert.querySelector<HTMLElement>('[data-slot="alert-title"]');
    expect(title?.className).toContain('group-data-[variant=danger]/alert:text-danger-ink');
  });

  it('switches to a polite status or to no role at all', async () => {
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    fixture.componentInstance.role.set('status');
    await fixture.whenStable();
    const alert: HTMLElement = fixture.nativeElement.querySelector('[data-slot="alert"]');
    expect(alert.getAttribute('role')).toBe('status');
    fixture.componentInstance.role.set(null);
    await fixture.whenStable();
    expect(alert.hasAttribute('role')).toBe(false);
  });
});
