import { Component } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { PaginationPreviousComponent } from '@internal/ui/lib/pagination/pagination.directive';
import { PAGINATION_IMPORTS } from '@internal/ui/lib/pagination/constants/pagination.imports';

/**
 * Component HostComponent
 * @class HostComponent
 *
 * @description
 * Renders the pagination parts with a disabled previous link and a current page link.
 */
@Component({
  imports: [PAGINATION_IMPORTS],
  template: `<nav uiPagination>
    <ul uiPaginationContent>
      <li uiPaginationItem><a uiPaginationPrevious href="?page=1" [disabled]="true">Retour</a></li>
      <li uiPaginationItem><a uiPaginationLink href="?page=1">1</a></li>
      <li uiPaginationItem><a uiPaginationLink href="?page=2" isActive>2</a></li>
      <li uiPaginationItem><ui-pagination-ellipsis /></li>
      <li uiPaginationItem><a uiPaginationNext href="?page=3">Page suivante</a></li>
    </ul>
  </nav>`,
})
class HostComponent {}

describe('Pagination parts', (): void => {
  it('names the landmark and marks the current page', async (): Promise<void> => {
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelector('nav')?.getAttribute('aria-label')).toBe('Pagination');
    const links: NodeListOf<HTMLElement> = root.querySelectorAll<HTMLElement>(
      '[data-slot="pagination-link"]',
    );
    expect(links[0]?.hasAttribute('aria-current')).toBe(false);
    expect(links[1]?.getAttribute('aria-current')).toBe('page');
  });

  it('disables a link with aria-disabled and takes it out of the tab order', async (): Promise<void> => {
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const previous: HTMLElement = fixture.nativeElement.querySelector(
      '[data-slot="pagination-previous"]',
    );
    expect(previous.getAttribute('aria-disabled')).toBe('true');
    expect(previous.getAttribute('tabindex')).toBe('-1');
    expect(previous.hasAttribute('disabled')).toBe(false);
  });

  it('lets the content replace the default label', async (): Promise<void> => {
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const next: HTMLElement = fixture.nativeElement.querySelector('[data-slot="pagination-next"]');
    expect(next.textContent?.trim()).toBe('Page suivante');
    expect(next.querySelector('ng-icon')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('falls back to a localized label, readable even when visually hidden', async (): Promise<void> => {
    const fixture: ComponentFixture<PaginationPreviousComponent> = TestBed.createComponent(
      PaginationPreviousComponent,
    );
    await fixture.whenStable();
    const previous: HTMLElement = fixture.nativeElement;
    expect(previous.textContent?.trim()).toBe('Précédent');
    expect(previous.querySelector('span')?.className).toContain('sr-only sm:not-sr-only');
  });
});
