import { Component, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { NgIcon } from '@ng-icons/core';
import { lucideInbox } from '@ng-icons/lucide';
import type { EmptyAppearance, EmptyLayout } from '@internal/ui/lib/empty/constants/empty.variants';
import { EMPTY_IMPORTS } from '@internal/ui/lib/empty/constants/empty.imports';

/**
 * Class HostComponent
 * @class HostComponent
 *
 * @description
 * Test fixture composes every empty-state part with an icon tile and an action button.
 */
@Component({
  imports: [EMPTY_IMPORTS, NgIcon],
  template: `<section
    uiEmpty
    aria-labelledby="empty-title"
    [layout]="layout()"
    [appearance]="appearance()"
  >
    <div uiEmptyHeader>
      <div uiEmptyMedia variant="icon"><ng-icon [svg]="icon" size="16" /></div>
      <h2 uiEmptyTitle id="empty-title">Aucun message</h2>
      <p uiEmptyDescription>Les demandes reçues apparaîtront ici.</p>
    </div>
    <div uiEmptyContent><button type="button">Actualiser</button></div>
  </section>`,
})
class HostComponent {
  // #region Properties
  /**
   * Property layout
   * @readonly
   *
   * @description
   * Layout under test.
   *
   * @type {WritableSignal<EmptyLayout>}
   */
  public readonly layout: WritableSignal<EmptyLayout> = signal<EmptyLayout>('inline');

  /**
   * Property appearance
   * @readonly
   *
   * @description
   * Look of the empty state.
   *
   * @type {WritableSignal<EmptyAppearance>}
   */
  public readonly appearance: WritableSignal<EmptyAppearance> = signal<EmptyAppearance>('plain');

  /**
   * Property icon
   * @readonly
   *
   * @description
   * Inbox glyph used to verify that media remains decorative in the rendered state.
   *
   * @type {typeof lucideInbox}
   */
  protected readonly icon: string = lucideInbox;
  // #endregion
}

describe('EmptyDirective', () => {
  /**
   * Function setup
   *
   * @description
   * Renders the host and returns its root element.
   *
   * @returns {Promise<{ fixture: ComponentFixture<HostComponent>; root: HTMLElement }>} Fixture and root.
   */
  const setup = async (): Promise<{
    fixture: ComponentFixture<HostComponent>;
    root: HTMLElement;
  }> => {
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    return { fixture, root: fixture.nativeElement };
  };

  it('hides the decorative tile, keeps the heading and the actions, centred', async () => {
    const { root } = await setup();
    const media: HTMLElement | null = root.querySelector<HTMLElement>('[data-slot="empty-media"]');
    expect(media?.getAttribute('aria-hidden')).toBe('true');
    expect(media?.className).toContain('size-9');
    expect(media?.className).toContain('rounded-md');
    expect(root.querySelector('h2')?.dataset['slot']).toBe('empty-title');
    expect(root.querySelector('[data-slot="empty-content"] button')).not.toBeNull();
    const empty: HTMLElement | null = root.querySelector<HTMLElement>('[data-slot="empty"]');
    expect(empty?.classList).toContain('items-center');
    expect(empty?.classList).toContain('text-center');
    expect(empty?.className).not.toContain('text-left');
    // Inline stays compact: centred horizontally only.
    expect(empty?.classList).not.toContain('justify-center');
    const header: HTMLElement | null = root.querySelector<HTMLElement>(
      '[data-slot="empty-header"]',
    );
    expect(header?.classList).toContain('items-center');
    expect(header?.classList).toContain('text-center');
    const description: HTMLElement | null = root.querySelector<HTMLElement>(
      '[data-slot="empty-description"]',
    );
    expect(description?.classList).toContain('mx-auto');
    expect(description?.classList).toContain('max-w-[60ch]');
    expect(root.querySelector('[data-slot="empty-content"]')?.classList).toContain(
      'justify-center',
    );
  });

  it('applies the height rule of its layout', async () => {
    const { fixture, root } = await setup();
    const empty = (): HTMLElement =>
      root.querySelector<HTMLElement>('[data-slot="empty"]') as HTMLElement;
    expect(empty().dataset['layout']).toBe('inline');
    expect(empty().className).toContain('py-8');
    expect(empty().className).not.toContain('flex-1');

    fixture.componentInstance.layout.set('fill');
    await fixture.whenStable();
    expect(empty().dataset['layout']).toBe('fill');
    expect(empty().className).toContain('flex-1');
    expect(empty().className).toContain('min-h-72');
    // The content is centred in the free room, without spacers.
    expect(empty().classList).toContain('justify-center');
    expect(empty().className).not.toContain('before:');
    expect(empty().className).not.toContain('after:');

    fixture.componentInstance.layout.set('panel');
    await fixture.whenStable();
    expect(empty().dataset['layout']).toBe('panel');
    expect(empty().className).toContain('h-full');
    expect(empty().className).toContain('min-h-0');
    expect(empty().className).not.toContain('min-h-72');
    expect(empty().classList).toContain('justify-center');
    expect(empty().classList).toContain('text-center');
  });

  it('frames a dashed empty state on a light surface', async () => {
    const { fixture, root } = await setup();
    const empty: HTMLElement = root.querySelector<HTMLElement>(
      '[data-slot="empty"]',
    ) as HTMLElement;
    expect(empty.dataset['appearance']).toBe('plain');
    expect(empty.className).not.toContain('border-dashed');
    fixture.componentInstance.appearance.set('dashed');
    await fixture.whenStable();
    expect(empty.dataset['appearance']).toBe('dashed');
    for (const name of [
      'border-dashed',
      'border-border-hover',
      'bg-surface-raised/50',
      'rounded-xl',
      'py-10',
    ]) {
      expect(empty.classList).toContain(name);
    }
    expect(empty.classList).not.toContain('py-8');
  });
});
