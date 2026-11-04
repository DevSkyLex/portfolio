import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
  type TestRequest,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { AdminLegalDocumentDto } from '@vfortin/content-contracts';
import type { AdminLegalDocument } from '@internal/content-web-data-access/lib/admin/models/admin-legal-document/admin-legal-document.interface';
import type { LegalDocumentKind } from '@internal/content-web-data-access/lib/admin/models/legal-document-kind/legal-document-kind.type';
import { AdminLegalStore } from '@internal/content-web-data-access/lib/admin/state/admin-legal/admin-legal.store';

/**
 * Constant BASE
 *
 * @description
 * Legal endpoint of the API.
 *
 * @type {string}
 */
const BASE: string = '/api/content/admin/legal';

/**
 * Function dto
 *
 * @description
 * Builds a legal document DTO.
 *
 * @param {LegalDocumentKind} kind - Document.
 * @param {number} version - Version.
 * @param {string} text - French paragraph.
 *
 * @returns {AdminLegalDocumentDto} Document DTO.
 */
const dto = (
  kind: LegalDocumentKind,
  version: number,
  text: string = 'Texte',
): AdminLegalDocumentDto => ({
  kind,
  body: {
    fr: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] },
    en: {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Text' }] }],
    },
  },
  updatedAt: '2026-11-02T12:00:00.000Z',
  version,
});

/**
 * Function setup
 *
 * @description
 * Creates the store and the HTTP testing backend, and loads both documents.
 *
 * @returns {Promise<{ store: InstanceType<typeof AdminLegalStore>; backend: HttpTestingController }>} Harness.
 */
async function setup(): Promise<{
  store: InstanceType<typeof AdminLegalStore>;
  backend: HttpTestingController;
}> {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting(), AdminLegalStore],
  });
  const store: InstanceType<typeof AdminLegalStore> =
    TestBed.inject<InstanceType<typeof AdminLegalStore>>(AdminLegalStore);
  const backend: HttpTestingController =
    TestBed.inject<HttpTestingController>(HttpTestingController);
  const loading: Promise<unknown> = store.load();
  backend.expectOne({ method: 'GET', url: `${BASE}/notice` }).flush(dto('notice', 2));
  backend.expectOne({ method: 'GET', url: `${BASE}/privacy` }).flush(dto('privacy', 1));
  await loading;
  return { store, backend };
}

describe('AdminLegalStore', (): void => {
  afterEach((): void => {
    TestBed.inject<HttpTestingController>(HttpTestingController).verify();
  });

  it('loads both documents together', async (): Promise<void> => {
    const { store } = await setup();
    expect(store.documents()?.notice.version).toBe(2);
    expect(store.documents()?.privacy.kind).toBe('privacy');
    expect(store.loadCallState().status).toBe('success');
  });

  it('saves one document with If-Match on its version, the other untouched', async (): Promise<void> => {
    const { store, backend } = await setup();
    const body: AdminLegalDocument['body'] = dto('privacy', 1, 'Nouveau').body;
    const saving: Promise<AdminLegalDocument | null> = store.save('privacy', body);
    expect(store.writing()).toBe(true);
    const request: TestRequest = backend.expectOne({ method: 'PUT', url: `${BASE}/privacy` });
    expect(request.request.headers.get('if-match')).toBe('"1"');
    expect(request.request.body).toEqual({ body });
    request.flush(dto('privacy', 2, 'Nouveau'));
    expect((await saving)?.version).toBe(2);
    expect(store.documents()?.privacy.version).toBe(2);
    expect(store.documents()?.notice.version).toBe(2);
  });

  it('names the document of a 412 and reloads it alone', async (): Promise<void> => {
    const { store, backend } = await setup();
    const saving: Promise<AdminLegalDocument | null> = store.save('notice', dto('notice', 2).body);
    backend
      .expectOne({ method: 'PUT', url: `${BASE}/notice` })
      .flush(
        { status: 412, code: 'content.version-mismatch', title: 'Changed.' },
        { status: 412, statusText: 'Precondition Failed' },
      );
    expect(await saving).toBeNull();
    expect(store.conflict()).toBe('notice');
    const reloading: Promise<AdminLegalDocument | null> = store.reload('notice');
    backend.expectOne({ method: 'GET', url: `${BASE}/notice` }).flush(dto('notice', 5));
    expect((await reloading)?.version).toBe(5);
    expect(store.conflict()).toBeNull();
    expect(store.documents()?.notice.version).toBe(5);
  });

  it('keeps a failed reload visible, and ignores a read answered after the page left', async (): Promise<void> => {
    const { store, backend } = await setup();
    const reloading: Promise<AdminLegalDocument | null> = store.reload('privacy');
    backend.expectOne(`${BASE}/privacy`).flush(null, { status: 503, statusText: 'Unavailable' });
    expect(await reloading).toBeNull();
    expect(store.writeError()?.status).toBe(503);
    store.resetWriteState();
    expect(store.writeKind()).toBeNull();
    const loading: Promise<unknown> = store.load();
    store.cancelRead();
    backend.expectOne(`${BASE}/notice`).flush(dto('notice', 9));
    backend.expectOne(`${BASE}/privacy`).flush(dto('privacy', 9));
    expect(await loading).toBeNull();
    expect(store.documents()?.notice.version).toBe(2);
  });
});
