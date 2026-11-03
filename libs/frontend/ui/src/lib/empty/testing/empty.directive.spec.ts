import { Component } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { NgIcon } from '@ng-icons/core';
import { lucideInbox } from '@ng-icons/lucide';
import { EMPTY_IMPORTS } from '@internal/ui/lib/empty/constants/empty.imports';

/**
 * Class HostComponent
 * @class HostComponent
 *
 * @description
 * Test fixture composes every empty-state part with decorative inbox media and an action button.
 */
@Component({
  imports: [EMPTY_IMPORTS, NgIcon],
  template: `<section uiEmpty aria-labelledby="empty-title">
    <div uiEmptyHeader>
      <div uiEmptyMedia variant="icon"><ng-icon [svg]="icon" size="22" /></div>
      <h2 uiEmptyTitle id="empty-title">Aucun message</h2>
      <p uiEmptyDescription>Les demandes reçues apparaîtront ici.</p>
    </div>
    <div uiEmptyContent><button type="button">Actualiser</button></div>
  </section>`,
})
class HostComponent {
  // #region Properties
  /**
   * Property icon
   * @readonly
   *
   * @description
   * Inbox illustration used to verify that media remains decorative in the rendered state.
   *
   * @type {typeof lucideInbox}
   */
  protected readonly icon: string = lucideInbox;
  // #endregion
}

describe('Empty', () => {
  it('hides the decorative media and keeps the heading', async () => {
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    const media: HTMLElement | null = root.querySelector<HTMLElement>('[data-slot="empty-media"]');
    expect(media?.getAttribute('aria-hidden')).toBe('true');
    expect(media?.className).toContain('rounded-full');
    expect(root.querySelector('h2')?.dataset['slot']).toBe('empty-title');
    expect(root.querySelector('[data-slot="empty-content"] button')).not.toBeNull();
  });
});
