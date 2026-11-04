import { registerLocaleData } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import localeFr from '@angular/common/locales/fr';
import { LOCALE_ID } from '@angular/core';
import {
  DeferBlockBehavior,
  DeferBlockState,
  type DeferBlockFixture,
  TestBed,
} from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideContentSnapshots } from '@vfortin/content-web-data-access';
import { APP_ROUTES } from '@internal/web-shell/lib/app.routes';

registerLocaleData(localeFr);

/**
 * Constant snapshot
 *
 * @description
 * French snapshot with public links and a legal notice of two sections.
 */
const snapshot: Record<string, unknown> = {
  locale: 'fr',
  revision: 2,
  profile: {
    heroIntro: 'Intro.',
    aboutStatement: 'Phrase.',
    aboutLead: 'Lead.',
    facts: [],
    links: [
      { kind: 'email', url: 'mailto:hello@exemple.fr', label: null },
      { kind: 'github', url: 'https://github.com/exemple', label: null },
      { kind: 'malt', url: 'https://www.malt.fr/profile/exemple', label: 'Mon profil Malt' },
    ],
  },
  projects: [],
  timeline: [],
  skills: [],
  legal: {
    notice: {
      updatedOn: '2026-11-04',
      document: {
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: 'Éditeur du site' }],
          },
          { type: 'paragraph', content: [{ type: 'text', text: 'Valentin Fortin, particulier.' }] },
          {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: 'Hébergement' }],
          },
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Hébergeur', marks: [{ type: 'bold' }] },
              { type: 'text', text: ' : OVH SAS' },
            ],
          },
        ],
      },
    },
    privacy: {
      updatedOn: '2026-11-03',
      document: {
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Trois ans.' }] }],
      },
    },
  },
};

beforeEach((): void => {
  TestBed.configureTestingModule({
    deferBlockBehavior: DeferBlockBehavior.Manual,
    providers: [
      provideRouter(APP_ROUTES, withComponentInputBinding()),
      provideHttpClient(),
      { provide: LOCALE_ID, useValue: 'fr' },
      provideContentSnapshots({ fr: snapshot, en: { ...snapshot, locale: 'en' } }),
    ],
  });
});

describe('site texts from the snapshot', (): void => {
  it('render the legal notice of the snapshot, one labelled section per heading, with its date', async (): Promise<void> => {
    const harness: RouterTestingHarness = await RouterTestingHarness.create('/legal-notice');
    const root: HTMLElement = harness.routeNativeElement as HTMLElement;
    expect(root.querySelector('h1')?.textContent?.trim()).toBe('Mentions légales');
    expect(root.textContent).toContain('Dernière mise à jour : 4 novembre 2026');
    const sections: string[] = [...root.querySelectorAll('section[aria-labelledby] h2')].map(
      (heading: Element): string => heading.textContent?.trim() ?? '',
    );
    expect(sections).toEqual(['Éditeur du site', 'Hébergement']);
    expect(
      root.querySelector('section[aria-labelledby="legal-hebergement"] p strong')?.textContent,
    ).toBe('Hébergeur');
    await harness.navigateByUrl('/privacy');
    expect(harness.routeNativeElement?.textContent).toContain('Trois ans.');
  });

  it('list the e-mail and the profiles of the snapshot in the menu, the footer and the contact section', async (): Promise<void> => {
    const harness: RouterTestingHarness = await RouterTestingHarness.create('/');
    const doc: Document = harness.fixture.nativeElement.ownerDocument as Document;
    const footer: HTMLElement | null = doc.querySelector('footer');
    expect(footer?.querySelector('a[href="mailto:hello@exemple.fr"]')?.textContent?.trim()).toBe(
      'hello@exemple.fr',
    );
    expect(
      [...(footer?.querySelectorAll('a[href^="https://"]') ?? [])].map((link: Element) => [
        link.getAttribute('href'),
        link.textContent?.trim(),
      ]),
    ).toEqual([
      ['https://github.com/exemple', 'GitHub'],
      ['https://www.malt.fr/profile/exemple', 'Mon profil Malt'],
    ]);
    expect(doc.querySelector('#site-menu')?.textContent).toContain('hello@exemple.fr');
    // The layout's consent banner block comes first (D48); it renders nothing before a choice is read.
    const blocks: DeferBlockFixture[] = await harness.fixture.getDeferBlocks();
    for (const block of blocks) await block.render(DeferBlockState.Complete);
    await harness.fixture.whenStable();
    const section: HTMLElement | null = doc.querySelector('contact-section');
    expect(
      [...(section?.querySelectorAll('ul[role="list"] a') ?? [])].map((link: Element) =>
        link.getAttribute('href'),
      ),
    ).toEqual([
      'mailto:hello@exemple.fr',
      'https://github.com/exemple',
      'https://www.malt.fr/profile/exemple',
    ]);
  });

  it('leave the links out of an error page rendered without the snapshot', async (): Promise<void> => {
    const harness: RouterTestingHarness = await RouterTestingHarness.create('/error/404');
    const doc: Document = harness.fixture.nativeElement.ownerDocument as Document;
    expect(doc.querySelector('#site-menu')?.textContent).not.toContain('@');
    expect(doc.querySelector('h1')?.textContent).toContain('Page introuvable');
  });
});
