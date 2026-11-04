import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { SocialPreview } from '@internal/content-web-feature-admin/lib/models/social-preview/social-preview.interface';
import { SocialPreviewComponent } from '@internal/content-web-feature-admin/lib/ui/components/social-preview/social-preview.component';

/**
 * Function render
 *
 * @description
 * Renders the card for the given preview.
 */
async function render(preview: SocialPreview): Promise<HTMLElement> {
  const fixture: ComponentFixture<SocialPreviewComponent> =
    TestBed.createComponent(SocialPreviewComponent);
  fixture.componentRef.setInput('preview', preview);
  fixture.componentRef.setInput('captionId', 'edit-social-preview-fr');
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

describe('SocialPreviewComponent', (): void => {
  it('shows the cover, domain, title and description under its caption', async (): Promise<void> => {
    const root: HTMLElement = await render({
      domain: 'valentin-fortin.pro',
      title: 'Movah — Valentin Fortin',
      description: 'Une application mobile.',
      image: { src: '/media/cover.webp', alt: 'Accueil' },
    });
    const figure: HTMLElement | null = root.querySelector('figure');
    expect(figure?.getAttribute('aria-labelledby')).toBe('edit-social-preview-fr');
    expect(root.querySelector('#edit-social-preview-fr')?.textContent?.trim()).toBe(
      'Aperçu sur les réseaux sociaux',
    );
    expect(root.querySelector('img')?.getAttribute('alt')).toBe('Accueil');
    expect(root.querySelector('[data-slot="social-preview-domain"]')?.textContent).toBe(
      'valentin-fortin.pro',
    );
    expect(root.querySelector('[data-slot="social-preview-title"]')?.textContent).toBe(
      'Movah — Valentin Fortin',
    );
    expect(root.querySelector('[data-slot="social-preview-placeholder"]')).toBeNull();
  });

  it('shows a neutral placeholder without cover', async (): Promise<void> => {
    const root: HTMLElement = await render({
      domain: 'valentin-fortin.pro',
      title: 'Movah',
      description: 'Résumé.',
      image: null,
    });
    expect(root.querySelector('img')).toBeNull();
    expect(
      root.querySelector('[data-slot="social-preview-placeholder"]')?.getAttribute('aria-hidden'),
    ).toBe('true');
  });
});
