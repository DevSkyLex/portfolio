import { Component, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { PAGE_HEADER_IMPORTS } from '@internal/ui/lib/page-header/constants/page-header.imports';
import {
  TabsDirective,
  TabsListDirective,
  TabsTriggerDirective,
} from '@internal/ui/lib/tabs/tabs.directive';

/**
 * Class HostComponent
 * @class HostComponent
 *
 * @description
 * Renders a page header with every slot, its tabs optional, and stray content after them.
 */
@Component({
  imports: [PAGE_HEADER_IMPORTS, TabsDirective, TabsListDirective, TabsTriggerDirective],
  template: `
    <div uiTabs value="fr">
      <ui-page-header class="bg-surface-sunk">
        <p id="extra">Après</p>
        <div uiPageHeaderActions id="actions"><button type="button">Publier</button></div>
        <p uiPageHeaderMeta id="meta">version 4</p>
        <h1 uiPageHeaderTitle id="title" class="text-fg-muted">Library Trails</h1>
        @if (tabs()) {
          <div uiPageHeaderTabs id="tabs">
            <div uiTabsList aria-label="Langue">
              <button uiTabsTrigger="fr">Français</button>
            </div>
          </div>
        }
      </ui-page-header>
    </div>
  `,
})
class HostComponent {
  // #region Properties
  /**
   * Property tabs
   * @readonly
   *
   * @description
   * Whether the header holds tabs, changed by the specs.
   *
   * @type {WritableSignal<boolean>}
   */
  public readonly tabs: WritableSignal<boolean> = signal<boolean>(true);
  // #endregion
}

describe('PageHeaderComponent', () => {
  /**
   * Function render
   *
   * @description
   * Creates the host fixture and waits for its first render.
   *
   * @returns {Promise<{ fixture: ComponentFixture<HostComponent>; header: HTMLElement }>} Fixture and header host.
   */
  const render = async (): Promise<{
    fixture: ComponentFixture<HostComponent>;
    header: HTMLElement;
  }> => {
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const header: HTMLElement = fixture.nativeElement.querySelector('ui-page-header');
    return { fixture, header };
  };

  it('lays the title and meta before the actions, then the tabs and other content', async () => {
    const { header } = await render();
    const row: Element | null = header.firstElementChild;
    const heading: Element | null | undefined = row?.firstElementChild;
    expect([...(heading?.children ?? [])].map((child: Element): string => child.id)).toEqual([
      'title',
      'meta',
    ]);
    expect(row?.lastElementChild?.id).toBe('actions');
    expect([...header.children].map((child: Element): string => child.id).slice(1)).toEqual([
      'tabs',
      'extra',
    ]);
  });

  it('marks every slot and draws a hairline band whose actions wrap under a long title', async () => {
    const { header } = await render();
    expect(header.getAttribute('data-slot')).toBe('page-header');
    expect(header.classList).toContain('border-b');
    // The caller's surface replaces the default one.
    expect(header.classList).toContain('bg-surface-sunk');
    expect(header.classList).not.toContain('bg-surface');
    expect(header.firstElementChild?.classList).toContain('flex-wrap');
    expect(header.querySelector('#title')?.getAttribute('data-slot')).toBe('page-header-title');
    expect(header.querySelector('#title')?.classList).toContain('text-[20px]/7');
    expect(header.querySelector('#title')?.classList).toContain('text-fg-muted');
    expect(header.querySelector('#title')?.classList).not.toContain('text-fg');
    expect(header.querySelector('#meta')?.getAttribute('data-slot')).toBe('page-header-meta');
    // A meta line led by an icon stays on one row: the text wraps beside the icon, never under it.
    expect(header.querySelector('#meta')?.classList).toContain(
      'has-[>ng-icon:first-child]:flex-nowrap',
    );
    expect(header.querySelector('#meta')?.classList).toContain('[&>ng-icon:first-child]:mt-0.5');
    expect(header.querySelector('#actions')?.getAttribute('data-slot')).toBe('page-header-actions');
    expect(header.querySelector('#actions')?.classList).toContain('flex-wrap');
  });

  it('holds tabs whose list leaves its hairline to the band', async () => {
    const { fixture, header } = await render();
    const tabs: HTMLElement | null = header.querySelector('#tabs');
    expect(tabs?.getAttribute('data-slot')).toBe('page-header-tabs');
    expect(tabs?.classList).toContain('[&_[data-slot=tabs-list]]:border-b-0');
    expect(tabs?.querySelector('[role="tab"]')?.getAttribute('aria-selected')).toBe('true');

    fixture.componentInstance.tabs.set(false);
    await fixture.whenStable();
    expect(header.querySelector('[data-slot="page-header-tabs"]')).toBeNull();
  });
});
