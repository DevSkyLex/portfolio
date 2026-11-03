import { Component } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { ITEM_IMPORTS } from '@internal/ui/lib/item/constants/item.imports';

/**
 * Class HostComponent
 * @class HostComponent
 *
 * @description
 * Renders grouped item rows, a decorative separator and a standalone link for directive behavior assertions.
 */
@Component({
  imports: [ITEM_IMPORTS],
  template: `<div uiItemGroup>
      <div uiItem variant="outline">
        <div uiItemMedia variant="icon">A</div>
        <div uiItemContent>
          <p uiItemTitle>Angular</p>
          <p uiItemDescription>Framework</p>
        </div>
        <div uiItemActions><button type="button">Ouvrir</button></div>
      </div>
      <hr uiItemSeparator />
      <div uiItem variant="muted" size="sm">Nx</div>
    </div>
    <a uiItem href="/projets">Projets</a>`,
})
class HostComponent {}

describe('Item', () => {
  it('builds a list out of a group of items', async () => {
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelector('[data-slot="item-group"]')?.getAttribute('role')).toBe('list');
    const items: NodeListOf<HTMLElement> = root.querySelectorAll<HTMLElement>(
      '[data-slot="item-group"] [data-slot="item"]',
    );
    expect(Array.from(items).map((item) => item.getAttribute('role'))).toEqual([
      'listitem',
      'listitem',
    ]);
    expect(root.querySelector('[data-slot="item-separator"]')?.getAttribute('role')).toBe('none');
  });

  it('keeps the link role of a standalone link item', async () => {
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const link: HTMLElement = fixture.nativeElement.querySelector('a[data-slot="item"]');
    expect(link.hasAttribute('role')).toBe(false);
    expect(link.className).toContain('[a&]:hover:bg-void-raised');
  });

  it('applies variants and sizes', async () => {
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const [outline, muted] = fixture.nativeElement.querySelectorAll('[data-slot="item"]');
    expect(outline.className).toContain('border-line');
    expect(outline.className).toContain('p-4');
    expect(muted.className).toContain('bg-void-raised');
    expect(muted.className).toContain('py-3');
  });
});
