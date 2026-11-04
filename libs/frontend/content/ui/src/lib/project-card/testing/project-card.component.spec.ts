import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { ProjectImage, ProjectSummary } from '@vfortin/content-web-model';
import { ProjectCardComponent } from '@internal/content-web-ui/lib/project-card/project-card.component';

/**
 * Constant cover
 *
 * @description
 * Cover uploaded with a 960 px rendition.
 */
const cover: ProjectImage = {
  src: '/media/8c9d0e1f-2a3b-4c5d-8e6f-7a8b9c0d1e2f.webp',
  small: '/media/8c9d0e1f-2a3b-4c5d-8e6f-7a8b9c0d1e2f-960.webp',
  width: 2400,
  height: 1350,
  alt: 'Accueil de Movah',
};

/**
 * Function render
 *
 * @description
 * Renders a card for a project with the given cover and layout, and returns its visual.
 */
async function render(image: ProjectImage | null, featured: boolean): Promise<HTMLElement> {
  TestBed.configureTestingModule({ providers: [provideRouter([])] });
  const fixture: ComponentFixture<ProjectCardComponent> =
    TestBed.createComponent(ProjectCardComponent);
  const project: ProjectSummary = {
    slug: 'movah',
    title: 'Movah',
    summary: 'Suivre ses séries.',
    periodLabel: 'Depuis 2026',
    techs: [],
    featured,
    cover: image,
  };
  fixture.componentRef.setInput('project', project);
  fixture.componentRef.setInput('link', '/projects/movah');
  fixture.componentRef.setInput('featured', featured);
  await fixture.whenStable();
  const visual: HTMLElement | null = fixture.nativeElement.querySelector('[aria-hidden="true"]');
  if (!visual) throw new Error('Missing card visual.');
  return visual;
}

describe('ProjectCardComponent', (): void => {
  it('shows the cover as a decorative image with its renditions', async (): Promise<void> => {
    const visual: HTMLElement = await render(cover, true);
    const image: HTMLImageElement | null = visual.querySelector('img');
    expect(visual.hasAttribute('uiScrollProgress')).toBe(true);
    expect(image?.getAttribute('alt')).toBe('');
    expect(image?.getAttribute('src')).toBe(cover.src);
    expect(image?.getAttribute('srcset')).toBe(`${cover.small} 960w, ${cover.src} 2400w`);
    expect(image?.getAttribute('sizes')).toBe('(min-width: 960px) 780px, 100vw');
    expect(image?.getAttribute('width')).toBe('2400');
    expect(image?.getAttribute('height')).toBe('1350');
    expect(image?.getAttribute('loading')).toBe('lazy');
    expect(image?.className).toContain('group-hover:scale-105');
    expect(image?.className).toContain('object-cover');
  });

  it('omits srcset and sizes when there is no smaller rendition', async (): Promise<void> => {
    const image: HTMLImageElement | null = (
      await render({ ...cover, small: null, width: 800, height: 600 }, false)
    ).querySelector('img');
    expect(image?.hasAttribute('srcset')).toBe(false);
    expect(image?.hasAttribute('sizes')).toBe(false);
    expect(image?.getAttribute('width')).toBe('800');
  });

  it('sizes a regular card cover for a third of the page column', async (): Promise<void> => {
    const image: HTMLImageElement | null = (await render(cover, false)).querySelector('img');
    expect(image?.getAttribute('sizes')).toBe(
      '(min-width: 960px) 380px, (min-width: 768px) 50vw, 100vw',
    );
  });

  it('keeps the tint without a cover', async (): Promise<void> => {
    const visual: HTMLElement = await render(null, false);
    expect(visual.querySelector('img')).toBeNull();
    expect(visual.querySelector(':scope > div')?.className).toContain(
      'bg-[color-mix(in_srgb,var(--fg)_6%,var(--surface-raised))]',
    );
  });
});
