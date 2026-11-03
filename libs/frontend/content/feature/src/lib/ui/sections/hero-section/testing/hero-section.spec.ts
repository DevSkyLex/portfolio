import type { Mock } from 'vitest';
import { Component, LOCALE_ID, input, type InputSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideContentSnapshots } from '@vfortin/content-web-data-access';
import { AsciiPlanetComponent } from '@vfortin/content-web-ui';
import { ScrollFrameService, type ScrollFrameTask } from '@vfortin/ui';
import { HeroSectionComponent } from '@internal/content-web-feature/lib/ui/sections/hero-section/hero-section.component';

/**
 * Component PlanetStubComponent
 * @class PlanetStubComponent
 *
 * @description
 * Lightweight input-compatible replacement for the animated planet in hero component tests.
 */
@Component({ selector: 'content-ascii-planet', template: '' })
class PlanetStubComponent {
  // #region Properties
  /**
   * Property forms
   * @readonly
   *
   * @description
   * Planet form selection captured from the hero component binding.
   *
   * @type {InputSignal<string>}
   */
  readonly forms: InputSignal<string> = input<string>('');

  /**
   * Property scale
   * @readonly
   *
   * @description
   * Planet scale captured from the hero component binding.
   *
   * @type {InputSignal<number>}
   */
  readonly scale: InputSignal<number> = input<number>(0);

  /**
   * Property lift
   * @readonly
   *
   * @description
   * Planet vertical lift captured from the hero component binding.
   *
   * @type {InputSignal<number>}
   */
  readonly lift: InputSignal<number> = input<number>(0);

  /**
   * Property fixed
   * @readonly
   *
   * @description
   * Whether the hero requests a fixed planet layer, captured for assertions.
   *
   * @type {InputSignal<boolean | ''>}
   */
  readonly fixed: InputSignal<boolean | ''> = input<boolean | ''>(false);
  // #endregion
}

/**
 * Constant snapshot
 *
 * @description
 * Minimal French content snapshot that supplies hero copy while all unrelated public collections remain empty.
 *
 * @type {{ locale: string; revision: number; profile: { heroIntro: string; aboutStatement: string; aboutLead: string; facts: never[] }; projects: never[]; timeline: never[]; skills: never[] }}
 */
const snapshot = {
  locale: 'fr',
  revision: 1,
  profile: { heroIntro: 'Intro du hero.', aboutStatement: '', aboutLead: '', facts: [] },
  projects: [],
  timeline: [],
  skills: [],
} as const;

describe('HeroSectionComponent', (): void => {
  beforeEach((): void => {
    TestBed.configureTestingModule({
      providers: [
        { provide: LOCALE_ID, useValue: 'fr' },
        provideContentSnapshots({ fr: snapshot, en: { ...snapshot, locale: 'en' } }),
      ],
    }).overrideComponent(HeroSectionComponent, {
      remove: { imports: [AsciiPlanetComponent] },
      add: { imports: [PlanetStubComponent] },
    });
  });

  it('spells the name letter by letter, each after a dot, a cross or a square', async (): Promise<void> => {
    const fixture: ComponentFixture<HeroSectionComponent> =
      TestBed.createComponent(HeroSectionComponent);
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelector('h1 .sr-only')?.textContent).toBe('Valentin Fortin');
    const slots: HTMLElement[] = [...root.querySelectorAll<HTMLElement>('.animate-slot-up')];
    expect(slots.map((s: HTMLElement): string => s.textContent?.trim()).join('')).toBe(
      'ValentinFortin',
    );
    expect(slots.map((s: HTMLElement): string => s.style.getPropertyValue('--k'))).toEqual(
      Array.from({ length: 14 }, (_: unknown, k: number): string => String(k)),
    );
    const glyphs: string[] = slots.map(
      (s: HTMLElement): string => s.querySelector('ui-glyph')?.className ?? '',
    );
    expect(glyphs[0]).toContain('rounded-[50%]');
    expect(glyphs[1]).toContain('linear-gradient');
    expect(glyphs[8]).toContain('text-aurora-pink');
    expect(root.querySelector('p')?.textContent?.trim()).toBe('Intro du hero.');
  });

  it('pins the square-form planet behind the page, raised and scaled down', async (): Promise<void> => {
    const fixture: ComponentFixture<HeroSectionComponent> =
      TestBed.createComponent(HeroSectionComponent);
    await fixture.whenStable();
    const planet: PlanetStubComponent = fixture.debugElement.query(
      (d): boolean => d.componentInstance instanceof PlanetStubComponent,
    ).componentInstance as PlanetStubComponent;
    expect([planet.forms(), planet.scale(), planet.lift(), planet.fixed()]).toEqual([
      'squares',
      0.65,
      0.16,
      '',
    ]);
  });

  it('skips the scroll-linked exit when the visitor prefers reduced motion', async (): Promise<void> => {
    const add: Mock<ScrollFrameService['add']> = vi.fn<ScrollFrameService['add']>(
      (): (() => undefined) => (): undefined => undefined,
    );
    TestBed.overrideProvider(ScrollFrameService, { useValue: { add } });
    vi.stubGlobal(
      'matchMedia',
      (query: string): MediaQueryList =>
        ({ matches: query === '(prefers-reduced-motion: reduce)' }) as MediaQueryList,
    );
    try {
      const fixture: ComponentFixture<HeroSectionComponent> =
        TestBed.createComponent(HeroSectionComponent);
      await fixture.whenStable();
      const root: HTMLElement = fixture.nativeElement;
      expect(root.querySelector('[data-scroll]')).toBeNull();
      expect(add).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('writes the exit progress only when it changes, until the hero is destroyed', async (): Promise<void> => {
    const tasks: ScrollFrameTask[] = [];
    const remove: Mock<() => void> = vi.fn();
    TestBed.overrideProvider(ScrollFrameService, {
      useValue: {
        add: (task: ScrollFrameTask) => {
          tasks.push(task);
          return remove;
        },
      },
    });
    const fixture: ComponentFixture<HeroSectionComponent> =
      TestBed.createComponent(HeroSectionComponent);
    await fixture.whenStable();
    const hero: HTMLElement | null = (
      fixture.nativeElement as HTMLElement
    ).querySelector<HTMLElement>('[data-scroll]');
    if (!hero) throw new Error('hero');
    expect(tasks).toHaveLength(1);
    const [task] = tasks;
    if (!task) throw new Error('task');
    vi.spyOn(hero, 'getBoundingClientRect').mockReturnValue({
      top: -400,
      height: 1000,
    } as DOMRect);

    task.read();
    expect(task.write()).toBe(true);
    expect(hero.style.getPropertyValue('--hp')).toBe('0.5000');
    task.read();
    expect(task.write()).toBe(false);

    fixture.destroy();
    expect(remove).toHaveBeenCalledOnce();
  });
});
