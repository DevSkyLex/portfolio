import { ChangeDetectionStrategy, Component, LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding, type UrlTree } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideContentSnapshots, provideSiteOrigin } from '@vfortin/content-web-data-access';
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
      article: { type: 'doc', content: [{ type: 'paragraph' }] },
      cover: null,
      seo: { title: null, description: null, keywords: [] },
    },
  ],
  timeline: [],
  skills: [],
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
} as const;

const bilingualSnapshot = {
  ...snapshot,
  articles: [
    {
      ...snapshot.projects[0],
      slug: 'editorial',
      title: 'Editorial article',
      taxonomy: { category: { key: 'engineering', label: 'Engineering' }, tags: [] },
    },
  ],
} as const;

describe('projectExistsGuard', (): void => {
  beforeEach((): void => {
    TestBed.configureTestingModule({
      providers: [
        { provide: LOCALE_ID, useValue: 'fr' },
        provideContentSnapshots({
          fr: bilingualSnapshot,
          en: { ...bilingualSnapshot, locale: 'en' },
        }),
        provideSiteOrigin(),
        provideRouter(
          [
            ...CONTENT_ROUTES,
            {
              path: 'project-without-slug',
              component: MissingSlugPageComponent,
              canActivate: [projectExistsGuard],
            },
            { path: 'error/404', component: NotFoundPageComponent },
            { path: '**', component: NotFoundPageComponent },
          ],
          withComponentInputBinding(),
        ),
      ],
    });
  });

  it('activates the owner article route when the snapshot contains its slug', async (): Promise<void> => {
    const harness: RouterTestingHarness = await RouterTestingHarness.create('/articles/known');
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent?.trim()).toBe(
      'Known project',
    );
    expect(harness.routeNativeElement?.querySelector('article')).not.toBeNull();
  });

  it('resolves an editorial article through the same public route', async (): Promise<void> => {
    const harness: RouterTestingHarness = await RouterTestingHarness.create('/articles/editorial');
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent?.trim()).toBe(
      'Editorial article',
    );
  });

  it('redirects a legacy detail while retaining its query and fragment', async (): Promise<void> => {
    await RouterTestingHarness.create('/projects/known?source=profile#architecture');
    const router: Router = TestBed.inject<Router>(Router);
    expect(router.url).toBe('/articles/known?source=profile#architecture');
  });

  it('redirects the project list to its article category while retaining other filters', async (): Promise<void> => {
    await RouterTestingHarness.create('/projects?q=angular&tag=web#top');
    const router: Router = TestBed.inject<Router>(Router);
    const target: UrlTree = router.parseUrl(router.url);
    expect(target.root.children['primary']?.segments.map((segment) => segment.path)).toEqual([
      'articles',
    ]);
    expect(target.queryParams).toEqual({ q: 'angular', tag: 'web', category: 'projects' });
    expect(target.fragment).toBe('top');
  });

  it('returns a not-found redirect for a slug absent from the snapshot', async (): Promise<void> => {
    const harness: RouterTestingHarness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/articles/unknown', NotFoundPageComponent);
    expect(harness.routeNativeElement?.textContent).toBe('Not found');
    expect(harness.routeNativeElement?.querySelector('article')).toBeNull();
  });

  it('treats an absent route parameter as invalid rather than activating a slugless page', async (): Promise<void> => {
    const harness: RouterTestingHarness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/project-without-slug', NotFoundPageComponent);
    expect(harness.routeNativeElement?.textContent).toBe('Not found');
    expect(harness.routeNativeElement?.textContent).not.toContain('Missing slug activated');
  });
});
