import { Component } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { BREADCRUMB_IMPORTS } from '@internal/ui/lib/breadcrumb/constants/breadcrumb.imports';

/**
 * Class HostComponent
 * @class HostComponent
 *
 * @description
 * Fixture containing ancestor link, collapsed items, separators and a current-page breadcrumb.
 */
@Component({
  imports: [BREADCRUMB_IMPORTS],
  template: `<nav uiBreadcrumb>
    <ol uiBreadcrumbList>
      <li uiBreadcrumbItem><a uiBreadcrumbLink href="/">Accueil</a></li>
      <li uiBreadcrumbSeparator></li>
      <li uiBreadcrumbItem><ui-breadcrumb-ellipsis /></li>
      <li uiBreadcrumbSeparator>/</li>
      <li uiBreadcrumbItem><span uiBreadcrumbPage>Projets</span></li>
    </ol>
  </nav>`,
})
class HostComponent {}

describe('Breadcrumb', () => {
  it('names the navigation landmark and marks the current page', async () => {
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelector('nav')?.getAttribute('aria-label')).toBe('Fil d’Ariane');
    const page: HTMLElement | null = root.querySelector<HTMLElement>(
      '[data-slot="breadcrumb-page"]',
    );
    expect(page?.getAttribute('aria-current')).toBe('page');
    expect(page?.getAttribute('role')).toBe('link');
    expect(page?.getAttribute('aria-disabled')).toBe('true');
  });

  it('hides separators, with a default chevron, and keeps only list items in the list', async () => {
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    const [chevron, slash] = root.querySelectorAll<HTMLElement>(
      '[data-slot="breadcrumb-separator"]',
    );
    expect(chevron?.getAttribute('aria-hidden')).toBe('true');
    expect(chevron?.querySelector('ng-icon')).not.toBeNull();
    expect(slash?.textContent?.trim()).toBe('/');
    expect(slash?.querySelector('ng-icon')).toBeNull();
    const children: Element[] = Array.from(root.querySelector('ol')?.children ?? []);
    expect(children.every((child) => child.tagName === 'LI')).toBe(true);
  });

  it('gives the ellipsis an accessible name', async () => {
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const ellipsis: HTMLElement = fixture.nativeElement.querySelector('ui-breadcrumb-ellipsis');
    expect(ellipsis.querySelector('.sr-only')?.textContent).toBe('Pages intermédiaires');
  });
});
