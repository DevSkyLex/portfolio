import { Component } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { ProjectSummary, SkillColumn, TimelineStep } from '@vfortin/content-web-model';
import { ProjectCardComponent } from '@internal/content-web-ui/lib/project-card/project-card.component';
import { SkillColumnsComponent } from '@internal/content-web-ui/lib/skill-columns/skill-columns.component';
import { techDefinition } from '@internal/content-web-ui/lib/tech/utils/tech-definition/tech-definition.utils';
import { TimelineComponent } from '@internal/content-web-ui/lib/timeline/timeline.component';

/**
 * Constant project
 *
 * @description
 * Featured project fixture with known and unknown technology keys for the shared component host.
 */
const project: ProjectSummary = {
  slug: 'movah',
  title: 'Movah',
  summary: 'Suivre ses séries.',
  periodLabel: 'Depuis 2026',
  techs: ['flutter', 'ci-cd', 'unknown'],
  featured: true,
};

/**
 * Constant skills
 *
 * @description
 * Single backend column fixture used to verify the skill component's rendered content.
 */
const skills: SkillColumn[] = [
  { id: 'back', domain: 'Back-end', techs: [{ key: 'django', language: 'Python' }], usage: 'API.' },
];

/**
 * Constant steps
 *
 * @description
 * Education and experience fixture records spanning the two timeline tracks.
 */
const steps: TimelineStep[] = [
  {
    id: 'bts',
    kind: 'education',
    title: 'BTS SIO',
    place: 'Tours',
    description: 'Formation.',
    dateLabel: '2021 — 2023',
    start: 2021.67,
    end: 2023.5,
    techs: [],
  },
  {
    id: 'job',
    kind: 'experience',
    title: 'Développeur',
    place: 'Blois',
    description: 'Poste.',
    dateLabel: 'Depuis 2023',
    start: 2023.67,
    end: 2027,
    techs: ['angular'],
  },
];

/**
 * Class HostComponent
 * @class HostComponent
 *
 * @description
 * Supplies project, skill and timeline fixtures to the content component integration tests.
 */
@Component({
  imports: [ProjectCardComponent, SkillColumnsComponent, TimelineComponent],
  template: `
    <content-project-card
      [project]="project"
      [link]="['/projects', project.slug]"
      [featured]="true"
    />
    <content-skill-columns [columns]="skills" />
    <content-timeline [steps]="steps" educationLabel="Formation" experienceLabel="Expérience" />
  `,
})
class HostComponent {
  // #region Properties
  /**
   * Property project
   * @readonly
   *
   * @description
   * Project fixture bound to the project card.
   *
   * @type {ProjectSummary}
   */
  protected readonly project: ProjectSummary = project;

  /**
   * Property skills
   * @readonly
   *
   * @description
   * Skills fixture bound to the skill columns component.
   *
   * @type {SkillColumn[]}
   */
  protected readonly skills: SkillColumn[] = skills;

  /**
   * Property steps
   * @readonly
   *
   * @description
   * Timeline fixture bound to the timeline component.
   *
   * @type {TimelineStep[]}
   */
  protected readonly steps: TimelineStep[] = steps;
  // #endregion
}

/**
 * Constant content components specification
 *
 * @description
 * Verifies link, technology label and timeline markup contracts across the composed content components.
 */
describe('content components', (): void => {
  it('renders the card as a link to the project, with its techs', async (): Promise<void> => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;

    const link: Element | null = root.querySelector('content-project-card a');
    expect(link?.getAttribute('href')).toBe('/projects/movah');
    expect(link?.className).toContain('grid-cols-[minmax(0,2fr)_minmax(0,1fr)]');
    expect(
      [...root.querySelectorAll('content-project-card li')].map((li: Element): string =>
        li.textContent?.trim(),
      ),
    ).toEqual(['Flutter', 'CI/CD', 'unknown']);
  });

  it('shows the language next to the skill tech', async (): Promise<void> => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const tech: HTMLLIElement | null = fixture.nativeElement.querySelector(
      'content-skill-columns li li',
    );
    if (!tech?.textContent) throw new Error('Missing skill technology text.');
    expect(tech.textContent.replace(/\s+/g, ' ').trim()).toBe('Django Python');
  });

  it('places the journey steps in their track', async (): Promise<void> => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const tracks: NodeListOf<HTMLOListElement> = fixture.nativeElement.querySelectorAll(
      'content-timeline ol[data-track]',
    );
    const education: HTMLOListElement | undefined = tracks[0];
    const experience: HTMLOListElement | undefined = tracks[1];
    const firstStep: HTMLLIElement | null | undefined = education?.querySelector('li');
    if (!education || !experience || !firstStep)
      throw new Error('Missing timeline tracks or first education step.');
    expect(education.getAttribute('aria-label')).toBe('Formation');
    expect(firstStep.getAttribute('data-start')).toBe('2021.67');
    expect(education.textContent).toContain('BTS SIO');
    expect(experience.textContent).toContain('Développeur');
  });

  it('keeps a label for a tech outside the catalogue', (): void => {
    expect(techDefinition('rust')).toEqual({ label: 'rust' });
  });
});
