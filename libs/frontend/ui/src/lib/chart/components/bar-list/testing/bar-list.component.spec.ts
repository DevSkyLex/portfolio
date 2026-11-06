import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { BarListComponent } from '@internal/ui/lib/chart/components/bar-list/bar-list.component';

describe('BarListComponent', (): void => {
  it('prints every row with its value and a bar relative to the largest one', async (): Promise<void> => {
    const fixture: ComponentFixture<BarListComponent> = TestBed.createComponent(BarListComponent);
    fixture.componentRef.setInput('label', 'Sessions par canal');
    fixture.componentRef.setInput('items', [
      { key: 'organic', label: 'Organic Search', value: 80, display: '80 · 67 %' },
      { key: 'direct', label: 'Direct', value: 40, display: '40 · 33 %' },
      { key: 'email', label: 'Email', value: 0, display: '0 · 0 %' },
    ]);
    await fixture.whenStable();
    const host: HTMLElement = fixture.nativeElement;
    expect(host.getAttribute('data-slot')).toBe('bar-list');
    expect(host.querySelector('ul')?.getAttribute('aria-label')).toBe('Sessions par canal');
    const rows: HTMLLIElement[] = [...host.querySelectorAll<HTMLLIElement>('li')];
    const text = (row: HTMLLIElement): string =>
      [...row.querySelectorAll('div > span')].map((span: Element) => span.textContent).join(' ');
    expect(rows.map(text)).toEqual([
      'Organic Search 80 · 67 %',
      'Direct 40 · 33 %',
      'Email 0 · 0 %',
    ]);
    const bars: (HTMLElement | null)[] = rows.map((row: HTMLLIElement) =>
      row.querySelector<HTMLElement>('.bg-chart-1'),
    );
    expect(bars[0]?.style.width).toBe('100%');
    expect(bars[1]?.style.width).toBe('50%');
    // A zero draws no fill, only the empty track.
    expect(bars[2]).toBeNull();
    expect(bars[0]?.className).toContain('rounded-xs');
    expect(rows[2]?.querySelector('[aria-hidden="true"]')?.className).toContain(
      'bg-surface-raised',
    );
  });

  it('dims stale rows', async (): Promise<void> => {
    const fixture: ComponentFixture<BarListComponent> = TestBed.createComponent(BarListComponent);
    fixture.componentRef.setInput('label', 'Pays');
    fixture.componentRef.setInput('items', []);
    fixture.componentRef.setInput('stale', true);
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).hasAttribute('data-stale')).toBe(true);
  });
});
