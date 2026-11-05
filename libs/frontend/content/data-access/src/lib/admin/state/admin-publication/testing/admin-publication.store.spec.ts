import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
  type TestRequest,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { PublicationStatusDto } from '@vfortin/content-contracts';
import { AdminPublicationStore } from '@internal/content-web-data-access/lib/admin/state/admin-publication/admin-publication.store';

/** Known batch state whose version is independent from the published content revision. */
const STATUS: PublicationStatusDto = {
  version: 4,
  batching: true,
  pendingChanges: true,
  revision: 8,
  publishedRevision: 6,
};
const URL: string = '/api/content/admin/publication';

describe('AdminPublicationStore', (): void => {
  beforeEach((): void => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), AdminPublicationStore],
    });
  });

  afterEach((): void => TestBed.inject<HttpTestingController>(HttpTestingController).verify());

  it('quotes the observed version and preserves an accepted publication against an obsolete read', async (): Promise<void> => {
    const store: InstanceType<typeof AdminPublicationStore> =
      TestBed.inject<InstanceType<typeof AdminPublicationStore>>(AdminPublicationStore);
    const backend: HttpTestingController =
      TestBed.inject<HttpTestingController>(HttpTestingController);
    const loading: Promise<void> = store.load();
    backend.expectOne(URL).flush(STATUS);
    await loading;
    const obsolete: Promise<void> = store.load();
    const read: TestRequest = backend.expectOne(URL);
    const publishing: Promise<PublicationStatusDto | null> = store.change('publish');
    const request: TestRequest = backend.expectOne(`${URL}/publish`);
    expect(request.request.method).toBe('POST');
    expect(request.request.headers.get('if-match')).toBe('"4"');
    request.flush({
      ...STATUS,
      version: 5,
      batching: false,
      pendingChanges: false,
      publishedRevision: 8,
    });
    await publishing;
    read.flush(STATUS);
    await obsolete;
    expect(store.publication()?.batching).toBe(false);
    expect(store.publication()?.version).toBe(5);
  });

  it('retains an optimistic conflict until deliberate reload and never retries the write', async (): Promise<void> => {
    const store: InstanceType<typeof AdminPublicationStore> =
      TestBed.inject<InstanceType<typeof AdminPublicationStore>>(AdminPublicationStore);
    const backend: HttpTestingController =
      TestBed.inject<HttpTestingController>(HttpTestingController);
    const loading: Promise<void> = store.load();
    backend.expectOne(URL).flush(STATUS);
    await loading;
    const publishing: Promise<PublicationStatusDto | null> = store.change('publish');
    backend
      .expectOne(`${URL}/publish`)
      .flush({}, { status: 412, statusText: 'Precondition Failed' });
    expect(await publishing).toBeNull();
    expect(store.conflict()).toBe(true);
    expect(store.publication()).toEqual(STATUS);
    const reload: Promise<void> = store.load();
    backend.expectOne(URL).flush({ ...STATUS, version: 5 });
    await reload;
    expect(store.conflict()).toBe(false);
  });

  it('starts with the version read and ignores reads completed after the section is destroyed', async (): Promise<void> => {
    const store: InstanceType<typeof AdminPublicationStore> =
      TestBed.inject<InstanceType<typeof AdminPublicationStore>>(AdminPublicationStore);
    const backend: HttpTestingController =
      TestBed.inject<HttpTestingController>(HttpTestingController);
    const loading: Promise<void> = store.load();
    backend.expectOne(URL).flush({ ...STATUS, batching: false });
    await loading;
    const starting: Promise<PublicationStatusDto | null> = store.change('start');
    const start: TestRequest = backend.expectOne(`${URL}/start`);
    expect(start.request.headers.get('if-match')).toBe('"4"');
    start.flush(STATUS);
    await starting;
    const reload: Promise<void> = store.load();
    store.cancelRead();
    backend.expectOne(URL).flush({ ...STATUS, version: 10 });
    await reload;
    expect(store.publication()?.version).toBe(4);
  });
});
