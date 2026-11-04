import { LiveAnnouncer } from '@angular/cdk/a11y';
import { CdkDropList } from '@angular/cdk/drag-drop';
import { Component, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { SORTABLE_IMPORTS } from '@internal/ui/lib/sortable/constants/sortable.imports';
import type { SortableMove } from '@internal/ui/lib/sortable/models/sortable-move/sortable-move.interface';

/**
 * Class HostComponent
 * @class HostComponent
 *
 * @description
 * Three sortable rows with a grip each, recording the moves.
 */
@Component({
  imports: [SORTABLE_IMPORTS],
  template: `<ul uiSortableList [disabled]="disabled()" (moved)="moves.push($event)">
    @for (item of items; track item; let i = $index) {
      <li [uiSortableItem]="i">
        <button uiSortableHandle type="button" [attr.aria-label]="'Déplacer ' + item">⋮</button>
        {{ item }}
      </li>
    }
  </ul>`,
})
class HostComponent {
  // #region Properties
  /**
   * Property items
   * @readonly
   *
   * @description
   * Rows.
   *
   * @type {readonly string[]}
   */
  public readonly items: readonly string[] = ['a', 'b', 'c'];

  /**
   * Property disabled
   * @readonly
   *
   * @description
   * Whether sorting is disabled.
   *
   * @type {WritableSignal<boolean>}
   */
  public readonly disabled: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property moves
   * @readonly
   *
   * @description
   * Moves emitted, oldest first.
   *
   * @type {SortableMove[]}
   */
  public readonly moves: SortableMove[] = [];
  // #endregion
}

/**
 * Function press
 *
 * @description
 * Presses a key on an element.
 *
 * @param {Element} target - Element.
 * @param {string} key - Key.
 * @param {KeyboardEventInit} init - Modifiers.
 *
 * @returns {void}
 */
const press = (target: Element, key: string, init: KeyboardEventInit = {}): void => {
  target.dispatchEvent(
    new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init }),
  );
};

describe('SortableListDirective', (): void => {
  it('moves an item one place with its grip arrows, within the list, and announces it', async (): Promise<void> => {
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const announce: ReturnType<typeof vi.spyOn> = vi.spyOn(
      TestBed.inject(LiveAnnouncer),
      'announce',
    );
    const [first, second, third] = [
      ...fixture.nativeElement.querySelectorAll('button'),
    ] as HTMLButtonElement[];
    expect(first?.getAttribute('data-slot')).toBe('sortable-handle');
    expect(first?.getAttribute('aria-keyshortcuts')).toBe('ArrowUp ArrowDown');
    if (!first || !second || !third) throw new Error('handles missing');

    press(second, 'ArrowDown');
    press(first, 'ArrowUp');
    press(third, 'ArrowDown');
    press(second, 'ArrowUp', { altKey: true });
    press(second, 'Enter');
    expect(fixture.componentInstance.moves).toEqual([
      { previousIndex: 1, currentIndex: 2, keyboard: true },
    ]);
    expect(announce).toHaveBeenCalledWith('Position 3 sur 3');

    fixture.componentInstance.disabled.set(true);
    await fixture.whenStable();
    press(first, 'ArrowDown');
    expect(fixture.componentInstance.moves).toHaveLength(1);
  });

  it('forwards a pointer drop that changed the position, as a move', async (): Promise<void> => {
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const list: CdkDropList = fixture.debugElement
      .query(By.css('[data-slot="sortable-list"]'))
      .injector.get(CdkDropList);
    const drop = (previousIndex: number, currentIndex: number): void =>
      list.dropped.emit({ previousIndex, currentIndex } as Parameters<typeof list.dropped.emit>[0]);
    drop(0, 0);
    drop(0, 2);
    expect(fixture.componentInstance.moves).toEqual([
      { previousIndex: 0, currentIndex: 2, keyboard: false },
    ]);
    expect(list.lockAxis).toBe('y');
  });

  it('marks the drag states on the items and the grab cursor on the handles', async (): Promise<void> => {
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const item: HTMLElement = fixture.nativeElement.querySelector('[data-slot="sortable-item"]');
    expect(item.className).toContain('[&.cdk-drag-placeholder]:opacity-30');
    expect(item.className).toContain('[&.cdk-drag-animating]:transition-transform');
    expect(fixture.nativeElement.querySelector('button').className).toContain('cursor-grab');
  });
});
