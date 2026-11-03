import { Component } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { ProjectSummary, SkillColumn } from '@vfortin/content-web-model';
import { ScrollWordsComponent } from '@internal/content-web-ui/lib/about/components/scroll-words/scroll-words.component';
import { ProjectCardComponent } from '@internal/content-web-ui/lib/project-card/project-card.component';
import { SkillColumnsComponent } from '@internal/content-web-ui/lib/skill-columns/skill-columns.component';

/**
 * Constant project
 *
 * @description
 * Regular project fixture used to inspect the card's tint and reveal styling.
 */
const project: ProjectSummary = {
  slug: 'rdi',
  title: 'RDI Manager',
  summary: 'Suivi.',
  periodLabel: '2023 — 2026',
  techs: ['php'],
  featured: false,
};

/**
 * Constant columns
 *
 * @description
 * Three ordered skill fixtures exercise the positional glyph and tint cycle.
 */
const columns: SkillColumn[] = ['a', 'b', 'c'].map(
  (
    id: string,
  ): { id: string; domain: string; techs: { key: string; language: null }[]; usage: string } => ({
    id,
    domain: id,
    techs: [{ key: 'git', language: null }],
    usage: 'Usage.',
  }),
);

/**
 * Class HostComponent
 * @class HostComponent
 *
 * @description
 * Binds project and skill fixtures to the visual components under test.
 */
@Component({
  imports: [ProjectCardComponent, ScrollWordsComponent, SkillColumnsComponent],
  template: `
    <content-project-card [project]="project" [link]="'/projects/rdi'" [tint]="2" [delay]="80" />
    <content-scroll-words text="J'aime concevoir des applications" />
    <content-skill-columns [columns]="columns" />
  `,
})
class HostComponent {
  // #region Properties
  /**
   * Property project
   * @readonly
   *
   * @description
   * Project fixture bound to the card.
   *
   * @type {ProjectSummary}
   */
  protected readonly project: ProjectSummary = project;

  /**
   * Property columns
   * @readonly
   *
   * @description
   * Skill fixture collection bound to the columns component.
   *
   * @type {SkillColumn[]}
   */
  protected readonly columns: SkillColumn[] = columns;
  // #endregion
}

/**
 * Function render
 *
 * @description
 * Creates the visual test host with router providers and returns its rendered root element.
 *
 * @returns {Promise<HTMLElement>} Root element after Angular becomes stable.
 */
async function render(): Promise<HTMLElement> {
  TestBed.configureTestingModule({ providers: [provideRouter([])] });
  const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
  await fixture.whenStable();
  return fixture.nativeElement;
}

/**
 * Constant content visuals specification
 *
 * @description
 * Checks project tint and reveal styles, word splitting and skill column marker styles.
 */
describe('content visuals', (): void => {
  it('gives a regular card its tint, its reveal delay and the subgrid rows', async (): Promise<void> => {
    const link: HTMLElement | null = (await render()).querySelector<HTMLElement>(
      'content-project-card a',
    );
    expect(link?.className).toContain('grid-rows-subgrid');
    expect(link?.style.getPropertyValue('--rd')).toBe('80ms');
    expect(link?.querySelector('div > div')?.className).toContain('var(--aurora-blue)_14%');
  });

  it('splits the statement into words ranked for the reading progress', async (): Promise<void> => {
    const block: HTMLElement | null = (await render()).querySelector<HTMLElement>(
      'content-scroll-words',
    );
    const words: HTMLElement[] = [...(block?.querySelectorAll<HTMLElement>('span') ?? [])];
    expect(block?.style.getPropertyValue('--n')).toBe('4');
    expect(words.map((word: HTMLElement): string => word.textContent?.trim())).toEqual([
      "J'aime",
      'concevoir',
      'des',
      'applications',
    ]);
    expect(words[3]?.style.getPropertyValue('--k')).toBe('3');
  });

  it('marks each skill column with its shape and aurora tint, pink to cyan', async (): Promise<void> => {
    const items: HTMLElement[] = [
      ...(await render()).querySelectorAll<HTMLElement>('content-skill-columns > ul > li'),
    ];
    expect(items.map((item: HTMLElement): string => item.style.getPropertyValue('--c'))).toEqual([
      'var(--aurora-pink)',
      'var(--aurora-violet)',
      'var(--aurora-blue)',
    ]);
    expect(items[2]?.querySelector('ui-glyph')?.className).toContain('text-[32px]');
    expect(items[1]?.style.getPropertyValue('--rd')).toBe('80ms');
  });
});

describe('ScrollWordsComponent', (): void => {
  afterEach(() => vi.restoreAllMocks());

  it('sets the reading progress in a page that scrolls, and full words otherwise', async (): Promise<void> => {
    let height: number = 8000;
    vi.spyOn(document.documentElement, 'scrollHeight', 'get').mockImplementation(
      (): number => height,
    );
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      top: window.innerHeight,
      height: 200,
    } as DOMRect);
    const fixture: ComponentFixture<ScrollWordsComponent> =
      TestBed.createComponent(ScrollWordsComponent);
    fixture.componentRef.setInput('text', 'Un deux trois');
    await fixture.whenStable();
    const host: HTMLElement = fixture.nativeElement;
    expect(host.style.getPropertyValue('--wp')).toBe('0.0000');
    height = 100;
    window.dispatchEvent(new Event('resize'));
    await new Promise((resolve: (value: unknown) => void): number =>
      requestAnimationFrame(resolve),
    );
    expect(host.style.getPropertyValue('--wp')).toBe('1');
  });
});
