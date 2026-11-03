import { type WritableSignal, Component, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { NumberedPaginationComponent } from '@internal/ui/lib/pagination/components/numbered-pagination/numbered-pagination.component';
import { paginationRange } from '@internal/ui/lib/pagination/components/numbered-pagination/utils/numbered-pagination/numbered-pagination.utils';

/**
 * Component HostComponent
 * @class HostComponent
 *
 * @description
 * Supplies a writable page and page count to the numbered pagination fixture.
 */
@Component({
  imports: [NumberedPaginationComponent],
  template: `<ui-numbered-pagination [(page)]="page" [totalPages]="total()" />`,
})
class HostComponent {
  // #region Properties
  /**
   * Property page
   * @readonly
   *
   * @description
   * Current page model bound to the pagination component.
   *
   * @type {WritableSignal<number>}
   */
  public readonly page: WritableSignal<number> = signal<number>(1);

  /**
   * Property total
   * @readonly
   *
   * @description
   * Page count supplied to the fixture's pagination component.
   *
   * @type {WritableSignal<number>}
   */
  public readonly total: WritableSignal<number> = signal<number>(10);
  // #endregion
}

describe('paginationRange', (): void => {
  it('lists every page when they fit', (): void => {
    expect(paginationRange(1, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(paginationRange(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('keeps the edges and the siblings of the current page', (): void => {
    expect(paginationRange(1, 10)).toEqual([1, 2, 3, 4, 5, 'end-ellipsis', 10]);
    expect(paginationRange(5, 10)).toEqual([1, 'start-ellipsis', 4, 5, 6, 'end-ellipsis', 10]);
    expect(paginationRange(10, 10)).toEqual([1, 'start-ellipsis', 6, 7, 8, 9, 10]);
    expect(paginationRange(3, 10, 2)).toEqual([1, 2, 3, 4, 5, 6, 7, 'end-ellipsis', 10]);
    expect(paginationRange(5, 10, 2)).toEqual([
      1,
      'start-ellipsis',
      3,
      4,
      5,
      6,
      7,
      'end-ellipsis',
      10,
    ]);
  });

  it('clamps out-of-range pages', (): void => {
    expect(paginationRange(0, 0)).toEqual([1]);
    expect(paginationRange(99, 3)).toEqual([1, 2, 3]);
  });
});

describe('NumberedPaginationComponent', (): void => {
  /**
   * Function setup
   *
   * @description
   * Creates the fixture and returns helpers for locating its page controls by text.
   *
   * @returns Fixture and page-button lookup helpers.
   */
  function setup(): {
    fixture: ComponentFixture<HostComponent>;
    root: HTMLElement;
    buttons: () => HTMLButtonElement[];
    byLabel: (label: string) => HTMLButtonElement | undefined;
  } {
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    const root: HTMLElement = fixture.nativeElement;
    const buttons = (): HTMLButtonElement[] =>
      Array.from(root.querySelectorAll<HTMLButtonElement>('button'));
    const byLabel = (label: string): HTMLButtonElement | undefined =>
      buttons().find((button: HTMLButtonElement): boolean => button.textContent?.trim() === label);
    return { fixture, root, buttons, byLabel };
  }

  it('renders the pages with names and the current page', async (): Promise<void> => {
    const { fixture, root, byLabel } = setup();
    await fixture.whenStable();
    const current: HTMLElement | null = root.querySelector<HTMLElement>('[aria-current="page"]');
    expect(current?.textContent?.trim()).toBe('1');
    expect(current?.getAttribute('aria-label')).toBe('Page 1');
    expect(byLabel('Précédent')?.disabled).toBe(true);
    expect(byLabel('Suivant')?.disabled).toBe(false);
    expect(root.querySelectorAll('ui-pagination-ellipsis')).toHaveLength(1);
  });

  it('updates the page model from the page and step buttons', async (): Promise<void> => {
    const { fixture, byLabel } = setup();
    await fixture.whenStable();
    byLabel('4')?.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.page()).toBe(4);
    byLabel('Suivant')?.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.page()).toBe(5);
    byLabel('Précédent')?.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.page()).toBe(4);
  });

  it('moves focus to the current page when the pressed step button gets disabled', async (): Promise<void> => {
    const { fixture, root, byLabel } = setup();
    fixture.componentInstance.page.set(9);
    await fixture.whenStable();
    const next: HTMLButtonElement | undefined = byLabel('Suivant');
    next?.focus();
    next?.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.page()).toBe(10);
    expect(next?.disabled).toBe(true);
    expect(document.activeElement).toBe(root.querySelector('[aria-current="page"]'));
  });
});
