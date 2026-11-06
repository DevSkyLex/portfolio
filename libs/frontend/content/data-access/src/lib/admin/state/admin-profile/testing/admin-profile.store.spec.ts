import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
  type TestRequest,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { AdminProfileDto } from '@vfortin/content-contracts';
import type { AdminProfile } from '@internal/content-web-data-access/lib/admin/models/admin-profile/admin-profile.interface';
import type { ProfileDraft } from '@internal/content-web-data-access/lib/admin/models/profile-draft/profile-draft.interface';
import { AdminProfileStore } from '@internal/content-web-data-access/lib/admin/state/admin-profile/admin-profile.store';
import { toProfileDraft } from '@internal/content-web-data-access/lib/admin/utils/site-texts-draft/site-texts-draft.utils';

/**
 * Constant URL
 *
 * @description
 * Profile endpoint of the API.
 *
 * @type {string}
 */
const URL: string = '/api/content/admin/profile';

/**
 * Function dto
 *
 * @description
 * Builds the profile DTO at a version, without English lead.
 *
 * @param {number} version - Version.
 *
 * @returns {AdminProfileDto} Profile DTO.
 */
const dto = (version: number): AdminProfileDto => ({
  heroIntro: { fr: 'Intro', en: 'Intro' },
  aboutStatement: { fr: 'Phrase', en: 'Statement' },
  aboutLead: { fr: 'Chapeau' },
  facts: [
    {
      label: { fr: 'Basé à', en: 'Based in' },
      value: { fr: 'Ville-Exemple', en: 'Ville-Exemple' },
    },
  ],
  links: [{ kind: 'github', url: 'https://example.com/demo/code', label: null }],
  version,
});

/**
 * Function setup
 *
 * @description
 * Creates the store and the HTTP testing backend.
 *
 * @returns {{ store: InstanceType<typeof AdminProfileStore>; backend: HttpTestingController }} Harness.
 */
function setup(): {
  store: InstanceType<typeof AdminProfileStore>;
  backend: HttpTestingController;
} {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting(), AdminProfileStore],
  });
  return {
    store: TestBed.inject<InstanceType<typeof AdminProfileStore>>(AdminProfileStore),
    backend: TestBed.inject<HttpTestingController>(HttpTestingController),
  };
}

describe('AdminProfileStore', (): void => {
  afterEach((): void => {
    TestBed.inject<HttpTestingController>(HttpTestingController).verify();
  });

  it('loads the profile, an English text not written yet reading as empty', async (): Promise<void> => {
    const { store, backend } = setup();
    const loading: Promise<AdminProfile | null> = store.load();
    expect(store.loading()).toBe(true);
    backend.expectOne({ method: 'GET', url: URL }).flush(dto(3));
    const profile: AdminProfile | null = await loading;
    expect(profile?.aboutLead).toEqual({ fr: 'Chapeau', en: '' });
    expect(store.profile()?.version).toBe(3);
    expect(store.loadCallState().status).toBe('success');
  });

  it('saves with If-Match on the version read, trimming the texts and nulling a blank label', async (): Promise<void> => {
    const { store, backend } = setup();
    const loading: Promise<AdminProfile | null> = store.load();
    backend.expectOne(URL).flush(dto(3));
    const draft: ProfileDraft = toProfileDraft((await loading) as AdminProfile);
    draft.heroIntro.fr = '  Nouvelle intro ';
    draft.links.push({ kind: 'website', url: ' https://blog.example ', label: '  ' });
    const saving: Promise<AdminProfile | null> = store.save(draft);
    expect(store.writing()).toBe(true);
    const request: TestRequest = backend.expectOne({ method: 'PUT', url: URL });
    expect(request.request.headers.get('if-match')).toBe('"3"');
    expect(request.request.body).toEqual({
      heroIntro: { fr: 'Nouvelle intro', en: 'Intro' },
      aboutStatement: { fr: 'Phrase', en: 'Statement' },
      aboutLead: { fr: 'Chapeau' },
      facts: [
        {
          label: { fr: 'Basé à', en: 'Based in' },
          value: { fr: 'Ville-Exemple', en: 'Ville-Exemple' },
        },
      ],
      links: [
        { kind: 'github', url: 'https://example.com/demo/code', label: null },
        { kind: 'website', url: 'https://blog.example', label: null },
      ],
    });
    request.flush(dto(4));
    expect((await saving)?.version).toBe(4);
    expect(store.profile()?.version).toBe(4);
  });

  it('reports a conflict on 412 and field errors on 422', async (): Promise<void> => {
    const { store, backend } = setup();
    const loading: Promise<AdminProfile | null> = store.load();
    backend.expectOne(URL).flush(dto(3));
    const draft: ProfileDraft = toProfileDraft((await loading) as AdminProfile);
    const stale: Promise<AdminProfile | null> = store.save(draft);
    backend
      .expectOne({ method: 'PUT', url: URL })
      .flush(
        { status: 412, code: 'content.version-mismatch', title: 'Changed.' },
        { status: 412, statusText: 'Precondition Failed' },
      );
    expect(await stale).toBeNull();
    expect(store.conflict()).toBe(true);
    const incomplete: Promise<AdminProfile | null> = store.save(draft);
    backend.expectOne({ method: 'PUT', url: URL }).flush(
      {
        status: 422,
        code: 'content.profile-incomplete',
        title: 'Write both.',
        errors: [{ field: 'aboutLead.en', message: 'Write both.' }],
      },
      { status: 422, statusText: 'Unprocessable Entity' },
    );
    expect(await incomplete).toBeNull();
    expect(store.conflict()).toBe(false);
    expect(store.writeError()?.fieldErrors).toEqual([
      { field: 'aboutLead.en', message: 'Write both.' },
    ]);
    store.resetWriteState();
    expect(store.writeCallState().status).toBe('idle');
  });

  it('ignores a read answered after the page left, and saves nothing before a read', async (): Promise<void> => {
    const { store, backend } = setup();
    const draft: ProfileDraft = toProfileDraft({
      ...dto(1),
      heroIntro: { fr: 'a', en: 'a' },
      aboutStatement: { fr: 'b', en: 'b' },
      aboutLead: { fr: 'c', en: '' },
      facts: [],
    });
    expect(await store.save(draft)).toBeNull();
    const loading: Promise<AdminProfile | null> = store.load();
    store.cancelRead();
    backend.expectOne(URL).flush(dto(3));
    expect(await loading).toBeNull();
    expect(store.profile()).toBeNull();
    const failing: Promise<AdminProfile | null> = store.load();
    backend.expectOne(URL).flush(null, { status: 503, statusText: 'Unavailable' });
    expect(await failing).toBeNull();
    expect(store.loadCallState().status).toBe('error');
  });
});
