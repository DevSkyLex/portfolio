import type { AdminProjectDto } from '@vfortin/content-contracts';
import type { ProjectDraft } from '@internal/content-web-data-access/lib/admin/models/project-draft/project-draft.interface';
import { toAdminProject } from '@internal/content-web-data-access/lib/admin/adapters/admin-project/admin-project.adapter';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
  type TestRequest,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { AdminProject } from '@internal/content-web-data-access/lib/admin/models/admin-project/admin-project.type';
import {
  toProjectDraft,
  toRevisionRequest,
} from '@internal/content-web-data-access/lib/admin/utils/project-draft/project-draft.utils';
import { AdminProjectsStore } from '@internal/content-web-data-access/lib/admin/state/admin-projects/admin-projects.store';

/**
 * Function t
 *
 * @description
 * Creates a localized fixture value with an optional English translation.
 *
 * @param {string} fr - French source text.
 * @param {string} [en] - English translation when present.
 *
 * @returns {{ fr: string; en?: string }} Localized project field fixture.
 */
const t = (fr: string, en?: string): { fr: string; en?: string } =>
  en === undefined ? { fr } : { fr, en };

/**
 * Function project
 *
 * @description
 * Builds an administrator project response with configurable identifier, version, and publication state.
 *
 * @param {string} id - Project identifier and route slug.
 * @param {number} [version] - Optimistic-lock version returned by the API fixture.
 * @param {AdminProject['status']} [status] - Publication state of the project.
 *
 * @returns {AdminProject} Project response fixture consumed by the store.
 */
const project: (id: string, version?: number, status?: AdminProject['status']) => AdminProject = (
  id: string,
  version: number = 1,
  status: AdminProject['status'] = 'draft',
): AdminProject => ({
  id,
  slug: id,
  status,
  version,
  position: 0,
  title: t(`Titre ${id}`, `Title ${id}`),
  summary: t('Résumé', 'Summary'),
  lead: t('Chapô', 'Lead'),
  period: { start: { year: 2026, month: null }, end: null },
  client: t('Client', 'Client'),
  role: t('Rôle', 'Role'),
  place: t('Lieu', 'Place'),
  siteUrl: null,
  techs: ['angular'],
  featured: false,
  article: {
    fr: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Un.' }] }] },
    en: {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'One.' }] }],
    },
  },
  cover: null,
  media: [],
  seo: { title: {}, description: {}, keywords: { fr: [], en: [] } },
  missing: [],
});

/**
 * Constant BASE
 *
 * @description
 * API collection endpoint used by the store's HTTP expectations.
 *
 * @type {string}
 */
const BASE: string = '/api/content/admin/projects';

/**
 * Function setup
 *
 * @description
 * Creates the store and HTTP testing backend in a fresh Angular test injector.
 *
 * @returns {{ store: InstanceType<typeof AdminProjectsStore>; backend: HttpTestingController }} Store and backend used by each test.
 */
function setup(): {
  store: InstanceType<typeof AdminProjectsStore>;
  backend: HttpTestingController;
} {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting(), AdminProjectsStore],
  });
  return {
    store: TestBed.inject<InstanceType<typeof AdminProjectsStore>>(AdminProjectsStore),
    backend: TestBed.inject<HttpTestingController>(HttpTestingController),
  };
}

describe('AdminProjectsStore', (): void => {
  afterEach((): void => TestBed.inject<HttpTestingController>(HttpTestingController).verify());

  it('keeps an accepted write pending across independent reads and reset requests', async (): Promise<void> => {
    const { store, backend } = setup();
    const saving: Promise<AdminProject | null> = store.save(
      project('a'),
      toProjectDraft(project('a')),
    );
    const write: TestRequest = backend.expectOne(BASE + '/a');
    const reading: Promise<AdminProject | null> = store.loadOne('a');
    backend.expectOne(BASE + '/a').flush(project('a'));
    await reading;
    store.resetWriteState();
    expect(store.writing()).toBe(true);
    write.flush(project('a', 2));
    await saving;
    expect(store.writing()).toBe(false);
  });

  it('lists the projects, then reports a failed list', async (): Promise<void> => {
    const { store, backend } = setup();
    const loading: Promise<void> = store.load();
    expect(store.loading()).toBe(true);
    backend.expectOne(BASE).flush({ member: [project('a'), project('b')], totalItems: 2 });
    await loading;
    expect(store.projects().map((p: AdminProject): string => p.id)).toEqual(['a', 'b']);

    const failing: Promise<void> = store.load();
    backend.expectOne(BASE).flush(null, { status: 500, statusText: 'Server Error' });
    await failing;
    expect(store.loadCallState().status).toBe('error');
  });

  it('loads one project into the list, or returns null when it fails', async (): Promise<void> => {
    const { store, backend } = setup();
    const one: Promise<AdminProject | null> = store.loadOne('a b');
    backend.expectOne(`${BASE}/a%20b`).flush(project('a b'));
    await expect(one).resolves.toMatchObject({ id: 'a b' });
    expect(store.projects()).toHaveLength(1);

    const missing: Promise<AdminProject | null> = store.loadOne('x');
    backend.expectOne(`${BASE}/x`).flush(null, { status: 404, statusText: 'Not Found' });
    await expect(missing).resolves.toBeNull();
  });

  it('saves a draft with If-Match and replaces the project in the list', async (): Promise<void> => {
    const { store, backend } = setup();
    const loading: Promise<void> = store.load();
    backend.expectOne(BASE).flush({ member: [project('a', 4)], totalItems: 1 });
    await loading;
    const draft: ProjectDraft = toProjectDraft(project('a', 4));
    draft.title.fr = 'Nouveau';
    const saving: Promise<AdminProject | null> = store.save(project('a', 4), draft);
    expect(store.writing()).toBe(true);
    const call: TestRequest = backend.expectOne(`${BASE}/a`);
    expect(call.request.method).toBe('PUT');
    expect(call.request.headers.get('if-match')).toBe('"4"');
    expect(call.request.body.title).toEqual({ fr: 'Nouveau', en: 'Title a' });
    call.flush({ ...project('a', 5), title: t('Nouveau', 'Title a') });
    await saving;
    expect(store.projects()[0]?.version).toBe(5);
    expect(store.writeError()).toBeNull();
  });

  it('creates a project with a POST without If-Match and appends it to the list', async (): Promise<void> => {
    const { store, backend } = setup();
    const draft: ProjectDraft = toProjectDraft(project('a', 4));
    const creating: Promise<AdminProject | null> = store.create(draft);
    expect(store.writing()).toBe(true);
    const call: TestRequest = backend.expectOne(BASE);
    expect(call.request.method).toBe('POST');
    expect(call.request.headers.has('if-match')).toBe(false);
    expect(call.request.body.title).toEqual({ fr: 'Titre a', en: 'Title a' });
    call.flush(project('new', 1));
    await expect(creating).resolves.toMatchObject({ id: 'new', version: 1 });
    expect(store.projects().map((item: AdminProject): string => item.id)).toEqual(['new']);
  });

  it('publishes and unpublishes, and flags a stale version', async (): Promise<void> => {
    const { store, backend } = setup();
    const publishing: Promise<AdminProject | null> = store.publish(project('a', 2));
    const publish: TestRequest = backend.expectOne(`${BASE}/a/publish`);
    expect(publish.request.headers.get('if-match')).toBe('"2"');
    publish.flush(project('a', 3, 'published'));
    await expect(publishing).resolves.toMatchObject({ status: 'published' });

    const unpublishing: Promise<AdminProject | null> = store.unpublish(project('a', 2));
    backend
      .expectOne(`${BASE}/a/unpublish`)
      .flush(
        { code: 'content.version-mismatch' },
        { status: 412, statusText: 'Precondition Failed' },
      );
    await expect(unpublishing).resolves.toBeNull();
    expect(store.conflict()).toBe(true);
  });

  it('features a project through a revision of its own values, with If-Match', async (): Promise<void> => {
    const { store, backend } = setup();
    const published: AdminProject = project('a', 6, 'published');
    const featuring: Promise<AdminProject | null> = store.feature(published, true);
    const call: TestRequest = backend.expectOne(`${BASE}/a`);
    expect(call.request.method).toBe('PUT');
    expect(call.request.headers.get('if-match')).toBe('"6"');
    // The rest of the revision is the project as loaded: only the feature changes.
    expect(call.request.body).toEqual({
      ...toRevisionRequest(toProjectDraft(published)),
      featured: true,
    });
    call.flush({ ...project('a', 7, 'published'), featured: true });
    await expect(featuring).resolves.toMatchObject({ featured: true, status: 'published' });
  });
  it('discards stale success and failure after a newer project read or owner cancellation', async (): Promise<void> => {
    const { store, backend } = setup();
    const first: Promise<AdminProject | null> = store.loadOne('a');
    const old: TestRequest = backend.expectOne(`${BASE}/a`);
    const second: Promise<AdminProject | null> = store.loadOne('b');
    backend.expectOne(`${BASE}/b`).flush(project('b'));
    await second;
    old.flush(project('a'));
    await expect(first).resolves.toBeNull();
    expect(store.projects().map((p: AdminProject): string => p.id)).toEqual(['b']);
    const cancelled: Promise<AdminProject | null> = store.loadOne('c');
    store.cancelRead();
    backend.expectOne(`${BASE}/c`).flush(null, { status: 500, statusText: 'Error' });
    await expect(cancelled).resolves.toBeNull();
    expect(store.loadCallState().status).toBe('idle');
  });
});

describe('toAdminProject', (): void => {
  it('projects transport optional values and owns nested mutable collections', (): void => {
    const media: { id: string; src: string; width: number; height: number } = {
      id: '3f2b8c1e-7a4d-4e2f-9b1a-0c5d6e7f8a90',
      src: '/media/3f2b8c1e-7a4d-4e2f-9b1a-0c5d6e7f8a90.webp',
      width: 1200,
      height: 800,
    };
    const dto: AdminProjectDto = {
      ...project('a'),
      title: { fr: 'Titre', en: undefined },
      article: {
        fr: {
          type: 'doc',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Un.' }] }],
        },
      },
      cover: { media: media.id, alt: { fr: 'Couverture', en: undefined } },
      media: [media],
      seo: {
        title: { fr: 'Titre SEO', en: undefined },
        description: { en: 'Description.' },
        keywords: { fr: ['Flutter'] },
      },
    };
    const view: AdminProject = toAdminProject(dto);
    expect(view.seo).toEqual({
      title: { fr: 'Titre SEO' },
      description: { en: 'Description.' },
      keywords: { fr: ['Flutter'], en: [] },
    });
    expect(Object.hasOwn(view.seo.title, 'en')).toBe(false);
    expect(Object.hasOwn(view.seo.description, 'fr')).toBe(false);
    const empty: { title: object; description: object; keywords: object } = {
      title: {},
      description: {},
      keywords: { fr: [], en: [] },
    };
    // A content service older than the SEO contract answers without it, or without keywords.
    const older: Partial<AdminProjectDto> = { ...dto };
    delete older.seo;
    expect(toAdminProject(older as AdminProjectDto).seo).toEqual(empty);
    const withoutKeywords: unknown = { ...dto, seo: { title: {}, description: {} } };
    expect(toAdminProject(withoutKeywords as AdminProjectDto).seo).toEqual(empty);
    expect(Object.hasOwn(view.title, 'en')).toBe(false);
    expect(view.article.en).toBeNull();
    expect(view.cover).toEqual({ media: media.id, alt: { fr: 'Couverture' } });
    dto.techs.push('changed');
    dto.article.fr.content.push({ type: 'horizontalRule' });
    media.width = 1;
    expect(view.techs).not.toContain('changed');
    expect(view.article.fr.content).toHaveLength(1);
    expect(view.media).toEqual([{ ...media, width: 1200 }]);
    expect(
      toAdminProject({ ...dto, article: { ...dto.article, en: dto.article.fr } }).article.en,
    ).toEqual(dto.article.fr);
  });
});
