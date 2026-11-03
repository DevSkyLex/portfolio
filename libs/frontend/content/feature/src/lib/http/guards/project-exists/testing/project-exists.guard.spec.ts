import { ChangeDetectionStrategy, Component, LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideContentSnapshots } from '@vfortin/content-web-data-access';
import { CONTENT_ROUTES } from '@internal/content-web-feature/lib/content.routes';
import { projectExistsGuard } from '@internal/content-web-feature/lib/http/guards/project-exists/project-exists.guard';

@Component({ template: 'Not found', changeDetection: ChangeDetectionStrategy.OnPush })
class NotFoundPageComponent {}

@Component({ template: 'Missing slug activated', changeDetection: ChangeDetectionStrategy.OnPush })
class MissingSlugPageComponent {}

/** The real content projection owns slug existence; these guards do not substitute an API-shaped mock. */
const snapshot = {
  locale: 'fr',
  revision: 1,
  profile: { heroIntro: 'Intro', aboutStatement: 'About', aboutLead: 'Lead', facts: [] },
  projects: [
    {
      slug: 'known',
      title: 'Known project',
      summary: 'Summary',
      lead: 'Lead',
      periodLabel: '2026',
      client: 'Client',
      role: 'Role',
      place: 'Place',
      siteUrl: null,
      techs: [],
      featured: true,
      article: {
        context: [],
        work: [],
        workList: [],
        choices: [],
        result: [],
        lessons: [],
        captions: [],
      },
    },
  ],
  timeline: [],
  skills: [],
} as const;

describe('projectExistsGuard', (): void => {
  beforeEach((): void => {
    TestBed.configureTestingModule({
      providers: [
        { provide: LOCALE_ID, useValue: 'fr' },
        provideContentSnapshots({ fr: snapshot, en: { ...snapshot, locale: 'en' } }),
        provideRouter(
          [
            ...CONTENT_ROUTES,
            {
              path: 'projects',
              component: MissingSlugPageComponent,
              canActivate: [projectExistsGuard],
            },
            { path: 'error/404', component: NotFoundPageComponent },
          ],
          withComponentInputBinding(),
        ),
      ],
    });
  });

  it('activates the owner article route when the snapshot contains its slug', async (): Promise<void> => {
    const harness: RouterTestingHarness = await RouterTestingHarness.create('/projects/known');
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent?.trim()).toBe(
      'Known project',
    );
    expect(harness.routeNativeElement?.querySelector('article')).not.toBeNull();
  });

  it('returns a not-found redirect for a slug absent from the snapshot', async (): Promise<void> => {
    const harness: RouterTestingHarness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/projects/unknown', NotFoundPageComponent);
    expect(harness.routeNativeElement?.textContent).toBe('Not found');
    expect(harness.routeNativeElement?.querySelector('article')).toBeNull();
  });

  it('treats an absent route parameter as invalid rather than activating a slugless page', async (): Promise<void> => {
    const harness: RouterTestingHarness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/projects', NotFoundPageComponent);
    expect(harness.routeNativeElement?.textContent).toBe('Not found');
    expect(harness.routeNativeElement?.textContent).not.toContain('Missing slug activated');
  });
});
