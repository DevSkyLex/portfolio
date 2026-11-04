import { Component } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { CARD_IMPORTS } from '@internal/ui/lib/card/constants/card.imports';

/**
 * Class HostComponent
 * @class HostComponent
 *
 * @description
 * Fixture uses native article, heading, paragraph, link, content and footer elements to check semantic preservation and card layout.
 */
@Component({
  imports: [CARD_IMPORTS],
  template: `<article uiCard variant="outline" aria-labelledby="card-title">
    <header uiCardHeader>
      <h3 uiCardTitle id="card-title">Movah</h3>
      <p uiCardDescription>Plateforme de mobilité</p>
      <a uiCardAction href="/projets/movah">Voir</a>
    </header>
    <div uiCardContent>Contenu</div>
    <footer uiCardFooter class="justify-end">Pied</footer>
  </article>`,
})
class HostComponent {}

describe('Card', () => {
  it('keeps the native elements, so headings and landmarks stay meaningful', async () => {
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const card: HTMLElement = fixture.nativeElement.querySelector('[data-slot="card"]');
    expect(card.tagName).toBe('ARTICLE');
    expect(card.querySelector('h3')?.dataset['slot']).toBe('card-title');
    expect(card.getAttribute('aria-labelledby')).toBe('card-title');
  });

  it('lays out the header in two columns only when it holds an action', async () => {
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const card: HTMLElement = fixture.nativeElement.querySelector('[data-slot="card"]');
    expect(card.className).toContain('border-border');
    const header: HTMLElement | null = card.querySelector<HTMLElement>('[data-slot="card-header"]');
    expect(header?.className).toContain(
      'has-[[data-slot=card-action]]:grid-cols-[minmax(0,1fr)_auto]',
    );
    const footer: HTMLElement | null = card.querySelector<HTMLElement>('[data-slot="card-footer"]');
    expect(footer?.className).toContain('justify-end');
  });
});
