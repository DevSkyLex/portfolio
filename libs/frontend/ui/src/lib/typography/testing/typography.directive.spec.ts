import { Component } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { TYPOGRAPHY_IMPORTS } from '@internal/ui/lib/typography/constants/typography.imports';

/**
 * Component HostComponent
 * @class HostComponent
 *
 * @description
 * Renders semantic headings, paragraphs, lists and inline code with catalogue typography directives for host-style assertions.
 */
@Component({
  imports: [TYPOGRAPHY_IMPORTS],
  template: `<h1 uiH1>Titre</h1>
    <h2 uiH3 class="text-star-muted">Niveau 2, style 3</h2>
    <p uiLead>Chapeau</p>
    <p uiP>Paragraphe avec <code uiInlineCode>nx affected</code>.</p>
    <ul uiList>
      <li>Un</li>
    </ul>
    <ol uiList>
      <li>Premier</li>
    </ol>
    <p uiOverline>Rôle</p>`,
})
class HostComponent {}

describe('Typography', (): void => {
  it('styles the semantic element without changing it', async (): Promise<void> => {
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelector('h1')?.dataset['slot']).toBe('h1');
    expect(root.querySelector('h1')?.className).toContain('font-display');
    const h2: HTMLHeadingElement | null = root.querySelector('h2');
    expect(h2?.dataset['slot']).toBe('h3');
    expect(h2?.className).toContain('text-star-muted');
    expect(root.querySelector('code')?.className).toContain('font-mono');
    expect(root.querySelector('[data-slot="overline"]')?.className).toContain('uppercase');
  });

  it('numbers ordered lists and bullets the others', async (): Promise<void> => {
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelector('ul')?.className).toContain('list-disc');
    expect(root.querySelector('ol')?.className).toContain('list-decimal');
  });
});
