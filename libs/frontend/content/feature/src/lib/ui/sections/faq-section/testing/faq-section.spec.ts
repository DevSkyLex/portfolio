import { LOCALE_ID } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideContentSnapshots } from '@vfortin/content-web-data-access';
import { FaqSectionComponent } from '@internal/content-web-feature/lib/ui/sections/faq-section/faq-section.component';

/**
 * Constant snapshot
 *
 * @description
 * Minimal French content snapshot whose only filled collection is the FAQ.
 */
const snapshot: {
  readonly faq: { readonly id: string; readonly question: string; readonly answer: string }[];
  readonly [key: string]: unknown;
} = {
  locale: 'fr',
  revision: 1,
  profile: { heroIntro: '', aboutStatement: '', aboutLead: '', facts: [] },
  projects: [],
  timeline: [],
  skills: [],
  faq: [
    { id: 'availability', question: 'Êtes-vous disponible ?', answer: 'Oui.\nDès janvier.' },
    { id: 'remote', question: 'Travaillez-vous à distance ?', answer: 'Oui.' },
  ],
  legal: {
    notice: {
      updatedOn: '2026-11-02',
      document: { type: 'doc', content: [{ type: 'paragraph' }] },
    },
    privacy: {
      updatedOn: '2026-11-02',
      document: { type: 'doc', content: [{ type: 'paragraph' }] },
    },
  },
};

/**
 * Function render
 *
 * @description
 * Renders the section over a French snapshot holding the supplied questions.
 *
 * @param {typeof snapshot.faq} faq - Questions of the snapshot.
 *
 * @returns {Promise<ComponentFixture<FaqSectionComponent>>} Stable fixture.
 */
async function render(
  faq: typeof snapshot.faq = snapshot.faq,
): Promise<ComponentFixture<FaqSectionComponent>> {
  TestBed.configureTestingModule({
    providers: [
      { provide: LOCALE_ID, useValue: 'fr' },
      provideContentSnapshots({
        fr: { ...snapshot, faq },
        en: { ...snapshot, locale: 'en', faq },
      }),
    ],
  });
  const fixture: ComponentFixture<FaqSectionComponent> =
    TestBed.createComponent(FaqSectionComponent);
  await fixture.whenStable();
  return fixture;
}

describe('FaqSectionComponent', (): void => {
  it('titles the anchored section and lists the questions closed, in editorial order', async (): Promise<void> => {
    const root: HTMLElement = (await render()).nativeElement;
    const section: HTMLElement | null = root.querySelector('section#faq');
    expect(section?.getAttribute('aria-labelledby')).toBe('faq-title');
    expect(section?.querySelector('h2#faq-title')?.textContent?.trim()).toBe(
      'Questions fréquentes',
    );
    const triggers: HTMLButtonElement[] = [
      ...root.querySelectorAll<HTMLButtonElement>('h3 > button[data-slot="accordion-trigger"]'),
    ];
    // Each question is numbered for the eye only; the number stays out of the accessible name.
    expect(
      triggers.map((trigger: HTMLButtonElement): string =>
        (trigger.textContent ?? '').replace(/\s+/g, ' ').trim(),
      ),
    ).toEqual(['01Êtes-vous disponible ?', '02Travaillez-vous à distance ?']);
    expect(
      triggers.every(
        (trigger: HTMLButtonElement): boolean =>
          trigger.querySelector('.tabular-nums')?.getAttribute('aria-hidden') === 'true',
      ),
    ).toBe(true);
    expect(
      triggers.map((t: HTMLButtonElement): string | null => t.getAttribute('aria-expanded')),
    ).toEqual(['false', 'false']);
  });

  it('opens one answer at a time, keeps its line breaks, and closes it again', async (): Promise<void> => {
    const fixture: ComponentFixture<FaqSectionComponent> = await render();
    const root: HTMLElement = fixture.nativeElement;
    const triggers: HTMLButtonElement[] = [
      ...root.querySelectorAll<HTMLButtonElement>('button[data-slot="accordion-trigger"]'),
    ];
    triggers[0]?.click();
    await fixture.whenStable();
    const answer: HTMLElement | null = root.querySelector(
      '[data-slot="accordion-content"][data-state="open"] p',
    );
    expect(answer?.textContent).toBe('Oui.\nDès janvier.');
    expect(answer?.classList).toContain('whitespace-pre-line');

    triggers[1]?.click();
    await fixture.whenStable();
    expect(
      triggers.map((t: HTMLButtonElement): string | null => t.getAttribute('aria-expanded')),
    ).toEqual(['false', 'true']);

    triggers[1]?.click();
    await fixture.whenStable();
    expect(triggers[1]?.getAttribute('aria-expanded')).toBe('false');
  });

  it('renders no section without a question', async (): Promise<void> => {
    const root: HTMLElement = (await render([])).nativeElement;
    expect(root.querySelector('section')).toBeNull();
    expect(root.textContent?.trim()).toBe('');
  });
});
