import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { DataTableEmptyCellComponent } from '@internal/ui/lib/data-table/components/data-table-empty-cell/data-table-empty-cell.component';

describe('DataTableEmptyCellComponent', (): void => {
  it('shows a faint dash and names the missing value for assistive technology', async (): Promise<void> => {
    const fixture: ComponentFixture<DataTableEmptyCellComponent> = TestBed.createComponent(
      DataTableEmptyCellComponent,
    );
    await fixture.whenStable();
    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(host.getAttribute('data-slot')).toBe('data-table-empty-cell');
    expect(host.classList).toContain('text-fg-faint');
    expect(host.querySelector('[aria-hidden="true"]')?.textContent).toBe('—');
    expect(host.querySelector('.sr-only')?.textContent).toBe('Non renseigné');
  });
});
