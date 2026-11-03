import { Component } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { NavigationMenuImports } from '@internal/ui/lib/navigation-menu/constants/navigation-menu.imports';

/**
 * Class HostComponent
 * @class HostComponent
 *
 * @description
 * Renders plain links, disclosure items, projected panels, the indicator and viewport for keyboard and pointer assertions.
 */
@Component({
  imports: [NavigationMenuImports],
  template: `
    <nav uiNavigationMenu aria-label="Principale">
      <ul uiNavigationMenuList>
        <li uiNavigationMenuItem>
          <a uiNavigationMenuLink href="/" [active]="true">Accueil</a>
        </li>
        <li uiNavigationMenuItem value="work">
          <button uiNavigationMenuTrigger>Travaux <ui-navigation-menu-chevron /></button>
          <ng-template uiNavigationMenuContent>
            <a uiNavigationMenuLink href="/projets">Projets</a>
          </ng-template>
        </li>
        <li uiNavigationMenuItem value="about">
          <button uiNavigationMenuTrigger>À propos</button>
          <ng-template uiNavigationMenuContent><p>Parcours</p></ng-template>
        </li>
      </ul>
      <ui-navigation-menu-indicator />
      <ui-navigation-menu-viewport />
    </nav>
    <button id="outside">Ailleurs</button>
  `,
})
class HostComponent {}

describe('NavigationMenu', (): void => {
  /**
   * Function setup
   *
   * @description
   * Creates the navigation fixture and returns its root, two disclosure triggers and current viewport panel query.
   *
   * @returns {Promise<{ fixture: ComponentFixture<HostComponent>; root: HTMLElement; work: HTMLButtonElement; about: HTMLButtonElement; panel: () => HTMLElement | null }>} Stable navigation test handles.
   * @throws {Error} When either expected disclosure trigger is missing.
   */
  async function setup(): Promise<{
    fixture: ComponentFixture<HostComponent>;
    root: HTMLElement;
    work: HTMLButtonElement;
    about: HTMLButtonElement;
    panel: () => HTMLElement | null;
  }> {
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    const [work, about] = Array.from(
      root.querySelectorAll<HTMLButtonElement>('[data-slot="navigation-menu-trigger"]'),
    );
    if (!work || !about) throw new Error('Missing triggers');
    const panel = (): HTMLElement | null =>
      root.querySelector<HTMLElement>('[data-slot="navigation-menu-content"]');
    return { fixture, root, work, about, panel };
  }

  it('renders plain links and disclosure buttons, not an ARIA menu', async (): Promise<void> => {
    const { root, work } = await setup();
    const home: HTMLAnchorElement | null = root.querySelector('a');
    expect(home?.getAttribute('href')).toBe('/');
    expect(home?.getAttribute('aria-current')).toBe('page');
    expect(root.querySelector('[role^="menu"]')).toBeNull();
    expect(work.type).toBe('button');
    expect(work.getAttribute('aria-expanded')).toBe('false');
    expect(work.hasAttribute('aria-controls')).toBe(false);
  });

  it('reveals the content of the clicked trigger in the viewport, one at a time', async (): Promise<void> => {
    const { fixture, work, about, panel } = await setup();
    work.click();
    await fixture.whenStable();
    expect(work.getAttribute('aria-expanded')).toBe('true');
    expect(work.getAttribute('aria-controls')).toBe(panel()?.id);
    expect(panel()?.getAttribute('aria-labelledby')).toBe(work.id);
    expect(panel()?.textContent?.trim()).toBe('Projets');

    about.click();
    await fixture.whenStable();
    expect(work.getAttribute('aria-expanded')).toBe('false');
    expect(panel()?.textContent?.trim()).toBe('Parcours');

    about.click();
    await fixture.whenStable();
    expect(panel()).toBeNull();
  });

  it('closes on Escape and gives the focus back to the trigger', async (): Promise<void> => {
    const { fixture, work, panel } = await setup();
    work.click();
    await fixture.whenStable();
    const link: HTMLElement = panel()?.querySelector('a') as HTMLElement;
    link.focus();
    link.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await fixture.whenStable();
    expect(panel()).toBeNull();
    expect(document.activeElement).toBe(work);
  });

  it('closes when the focus or the pointer leaves the navigation', async (): Promise<void> => {
    const { fixture, root, work, panel } = await setup();
    work.click();
    await fixture.whenStable();
    const outside: HTMLElement = root.querySelector('#outside') as HTMLElement;
    work.focus();
    outside.focus();
    await fixture.whenStable();
    expect(panel()).toBeNull();

    work.click();
    await fixture.whenStable();
    outside.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    await fixture.whenStable();
    expect(panel()).toBeNull();
  });
});
