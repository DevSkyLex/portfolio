import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { LEGAL_ROUTES } from '@internal/legal-web-feature/lib/legal.routes';
import type { LegalDocument } from '@internal/legal-web-feature/lib/models/legal-document/legal-document.interface';
import type { LegalDocumentKind } from '@internal/legal-web-feature/lib/models/legal-document/legal-document-kind.type';
import { LEGAL_DOCUMENTS } from '@internal/legal-web-feature/lib/tokens/legal-documents/legal-documents.token';

/**
 * Constant DOCUMENTS
 *
 * @description
 * Documents served by the port, shaped as the content snapshot publishes them.
 */
const DOCUMENTS: Readonly<Record<LegalDocumentKind, LegalDocument>> = {
  notice: {
    updatedOn: '2026-11-02',
    intro: [],
    sections: [
      {
        id: 'hebergement',
        label: 'Hébergement',
        blocks: [
          {
            kind: 'paragraph',
            content: [
              { kind: 'bold', content: [{ kind: 'text', text: 'Hébergeur' }] },
              { kind: 'text', text: ' : OVH SAS' },
            ],
          },
          {
            kind: 'paragraph',
            content: [
              { kind: 'text', text: 'Voir la ' },
              {
                kind: 'link',
                href: 'https://valentin-fortin.pro/privacy',
                external: true,
                content: [{ kind: 'text', text: 'politique de confidentialité' }],
              },
            ],
          },
        ],
      },
    ],
  },
  privacy: {
    updatedOn: '2026-11-04',
    intro: [{ kind: 'paragraph', content: [{ kind: 'text', text: 'Préambule.' }] }],
    sections: [
      {
        id: 'contact',
        label: 'Contact',
        blocks: [
          {
            kind: 'list',
            ordered: false,
            start: 1,
            items: [
              [
                {
                  kind: 'paragraph',
                  content: [
                    {
                      kind: 'link',
                      href: 'mailto:morgan@example.com',
                      external: false,
                      content: [{ kind: 'text', text: 'morgan@example.com' }],
                    },
                  ],
                },
              ],
            ],
          },
          {
            kind: 'subheading',
            content: [{ kind: 'italic', content: [{ kind: 'text', text: 'Durée' }] }],
          },
          {
            kind: 'blockquote',
            blocks: [
              {
                kind: 'paragraph',
                content: [{ kind: 'text', text: 'trois ans après leur réception' }],
              },
            ],
          },
          { kind: 'code', text: 'npx nx test' },
          { kind: 'rule' },
          {
            kind: 'list',
            ordered: true,
            start: 3,
            items: [
              [
                {
                  kind: 'paragraph',
                  content: [
                    { kind: 'break' },
                    { kind: 'code', content: [{ kind: 'text', text: 'x' }] },
                  ],
                },
              ],
            ],
          },
        ],
      },
    ],
  },
};

registerLocaleData(localeFr);

describe('legal pages', (): void => {
  beforeEach((): void => {
    TestBed.configureTestingModule({
      providers: [
        { provide: LOCALE_ID, useValue: 'fr' },
        provideRouter(LEGAL_ROUTES),
        {
          provide: LEGAL_DOCUMENTS,
          useValue: { document: (kind: LegalDocumentKind): LegalDocument => DOCUMENTS[kind] },
        },
      ],
    });
  });

  it('render the legal notice from its port: a labelled section per heading and the date', async (): Promise<void> => {
    const harness: RouterTestingHarness = await RouterTestingHarness.create('/legal-notice');
    const root: HTMLElement = harness.routeNativeElement as HTMLElement;
    expect(root.querySelector('h1')?.textContent).toBe('Mentions légales');
    expect(root.textContent).toContain('Dernière mise à jour : 2 novembre 2026');
    const section: HTMLElement | null = root.querySelector(
      'section[aria-labelledby="legal-hebergement"]',
    );
    expect(section?.querySelector('h2#legal-hebergement')?.textContent).toBe('Hébergement');
    expect(section?.querySelector('strong')?.textContent).toBe('Hébergeur');
    const link: HTMLAnchorElement | null = section?.querySelector('a') ?? null;
    expect(link?.getAttribute('href')).toBe('https://valentin-fortin.pro/privacy');
    expect(link?.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('render the privacy policy blocks without innerHTML', async (): Promise<void> => {
    const harness: RouterTestingHarness = await RouterTestingHarness.create('/privacy');
    const root: HTMLElement = harness.routeNativeElement as HTMLElement;
    expect(root.querySelector('h1')?.textContent).toBe('Politique de confidentialité');
    expect(root.textContent).toContain('Préambule.');
    expect(root.textContent).toContain('trois ans après leur réception');
    const mail: HTMLAnchorElement | null = root.querySelector(
      'a[href="mailto:morgan@example.com"]',
    );
    expect(mail?.getAttribute('rel')).toBeNull();
    expect(root.querySelector('ul[role="list"] li')).not.toBeNull();
    expect(root.querySelector('h3 em')?.textContent).toBe('Durée');
    expect(root.querySelector('blockquote p')).not.toBeNull();
    expect(root.querySelector('pre code')?.textContent).toBe('npx nx test');
    expect(root.querySelector('hr')).not.toBeNull();
    expect(root.querySelector('ol')?.getAttribute('start')).toBe('3');
    expect(root.querySelector('ol br')).not.toBeNull();
    expect(root.querySelector('#legal-contact')).not.toBeNull();
  });
});
