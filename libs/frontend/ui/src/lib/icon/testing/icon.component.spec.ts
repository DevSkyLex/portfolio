import { Component, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { lucideMail } from '@ng-icons/lucide';
import { IconComponent } from '@internal/ui/lib/icon/icon.component';
import type { IconSize } from '@internal/ui/lib/icon/models/icon/icon-size.model';

/**
 * Class HostComponent
 * @class HostComponent
 *
 * @description
 * Test fixture exposes an icon pack entry and mutable size and label signals to exercise decorative
 * and labelled rendering.
 */
@Component({
  imports: [IconComponent],
  template: `<ui-icon [svg]="icon" [size]="size()" [label]="label()" />`,
})
class HostComponent {
  // #region Properties
  /**
   * Property icon
   * @readonly
   *
   * @description
   * Icon-pack definition bound to the component's required SVG input.
   *
   * @type {typeof lucideMail}
   */
  protected readonly icon: string = lucideMail;

  /**
   * Property size
   * @readonly
   *
   * @description
   * Mutable token or pixel size selected by each fixture scenario.
   *
   * @type {WritableSignal<IconSize | number>}
   */
  public readonly size: WritableSignal<number | 'sm' | 'md' | 'lg' | 'xs' | 'xl'> = signal<
    IconSize | number
  >('sm');

  /**
   * Property label
   * @readonly
   *
   * @description
   * Optional accessible name used to switch the icon from decorative to meaningful image semantics.
   *
   * @type {WritableSignal<string | undefined>}
   */
  public readonly label: WritableSignal<string | undefined> = signal<string | undefined>(undefined);
  // #endregion
}

describe('IconComponent', () => {
  it('is decorative by default and renders the svg at the token size', async () => {
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    fixture.componentInstance.size.set('lg');
    await fixture.whenStable();
    const host: HTMLElement = fixture.nativeElement.querySelector('ui-icon');
    expect(host.getAttribute('aria-hidden')).toBe('true');
    expect(host.hasAttribute('role')).toBe(false);
    expect(host.dataset['size']).toBe('lg');
    const icon: HTMLElement | null = host.querySelector<HTMLElement>('ng-icon');
    expect(icon?.querySelector('svg')).not.toBeNull();
    expect(icon?.style.getPropertyValue('--ng-icon__size')).toBe('24px');
  });

  it('becomes an image with a name when labelled', async () => {
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    fixture.componentInstance.label.set('E-mail');
    fixture.componentInstance.size.set(18);
    await fixture.whenStable();
    const host: HTMLElement = fixture.nativeElement.querySelector('ui-icon');
    expect(host.getAttribute('role')).toBe('img');
    expect(host.getAttribute('aria-label')).toBe('E-mail');
    expect(host.hasAttribute('aria-hidden')).toBe(false);
    expect(
      host.querySelector<HTMLElement>('ng-icon')?.style.getPropertyValue('--ng-icon__size'),
    ).toBe('18px');
  });
});
