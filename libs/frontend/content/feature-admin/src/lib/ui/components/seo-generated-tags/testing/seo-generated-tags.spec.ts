import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { SeoGeneratedTagsComponent } from '@internal/content-web-feature-admin/lib/ui/components/seo-generated-tags/seo-generated-tags.component';

describe('SeoGeneratedTagsComponent', (): void => {
  it('lists the tags closed, each full value in its title, and opens on its trigger', async (): Promise<void> => {
    const fixture: ComponentFixture<SeoGeneratedTagsComponent> =
      TestBed.createComponent(SeoGeneratedTagsComponent);
    fixture.componentRef.setInput('tags', [
      {
        name: 'title',
        value: 'Library Trails — Valentin Fortin',
        full: 'Library Trails — Valentin Fortin',
      },
      { name: 'JSON-LD', value: 'CreativeWork : headline', full: '{ "@type": "CreativeWork" }' },
    ]);
    fixture.componentRef.setInput('language', 'en');
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement as HTMLElement;
    const trigger: HTMLButtonElement | null = root.querySelector('button');

    expect(trigger?.textContent?.replace(/\s+/g, ' ').trim()).toBe('Balises générées 2');
    expect(trigger?.getAttribute('aria-expanded')).toBe('false');
    const rows: HTMLElement[] = [
      ...root.querySelectorAll<HTMLElement>('[data-slot="seo-generated-tag"]'),
    ];
    expect(
      rows.map((row: HTMLElement): string => row.querySelector('dt')?.textContent?.trim() ?? ''),
    ).toEqual(['title', 'JSON-LD']);
    expect(rows[1]?.querySelector('dd')?.getAttribute('title')).toBe('{ "@type": "CreativeWork" }');
    expect(root.querySelector('dl')?.getAttribute('lang')).toBe('en');

    trigger?.click();
    await fixture.whenStable();
    expect(trigger?.getAttribute('aria-expanded')).toBe('true');
    expect(
      root.querySelector('[data-slot="collapsible-content"]')?.getAttribute('data-state'),
    ).toBe('open');
  });
});
