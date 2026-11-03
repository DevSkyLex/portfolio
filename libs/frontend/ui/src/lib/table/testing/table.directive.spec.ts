import { Component } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { TABLE_IMPORTS } from '@internal/ui/lib/table/constants/table.imports';

/**
 * Component HostComponent
 * @class HostComponent
 *
 * @description
 * Renders a named scroll region containing a semantic table with header, body and caption parts.
 */
@Component({
  imports: [TABLE_IMPORTS],
  template: `<div uiTableContainer aria-label="Projets">
    <table uiTable>
      <caption uiTableCaption>
        Projets récents
      </caption>
      <thead uiTableHeader>
        <tr uiTableRow>
          <th uiTableHead scope="col">Nom</th>
          <th uiTableHead scope="col" class="text-right">Année</th>
        </tr>
      </thead>
      <tbody uiTableBody>
        <tr uiTableRow data-state="selected">
          <td uiTableCell>Movah</td>
          <td uiTableCell class="text-right">2025</td>
        </tr>
      </tbody>
    </table>
  </div>`,
})
class HostComponent {}

describe('Table', (): void => {
  it('keeps the native table structure and makes the scroll box reachable', async (): Promise<void> => {
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    const container: HTMLElement | null = root.querySelector<HTMLElement>(
      '[data-slot="table-container"]',
    );
    expect(container?.getAttribute('role')).toBe('region');
    expect(container?.tabIndex).toBe(0);
    const table: HTMLTableElement | null = root.querySelector('table');
    expect(table?.caption?.textContent?.trim()).toBe('Projets récents');
    expect(table?.tHead?.rows[0]?.cells[0]?.getAttribute('scope')).toBe('col');
    expect(table?.tBodies[0]?.rows[0]?.cells[1]?.textContent?.trim()).toBe('2025');
  });

  it("merges the caller's alignment over the default one", async (): Promise<void> => {
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const head: HTMLElement = fixture.nativeElement.querySelectorAll('th')[1];
    expect(head.className).toContain('text-right');
    expect(head.className).not.toContain('text-left');
  });
});
