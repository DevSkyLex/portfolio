import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
  type TestRequest,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { AdminMaintenanceDto } from '@vfortin/content-contracts';
import type { AdminMaintenance } from '@internal/content-web-data-access/lib/admin/models/admin-maintenance/admin-maintenance.interface';
import type { MaintenanceDraft } from '@internal/content-web-data-access/lib/admin/models/maintenance-draft/maintenance-draft.interface';
import { AdminMaintenanceStore } from '@internal/content-web-data-access/lib/admin/state/admin-maintenance/admin-maintenance.store';

/**
 * Constant URL
 *
 * @description
 * Maintenance endpoint of the API.
 *
 * @type {string}
 */
const URL: string = '/api/content/admin/maintenance';

/**
 * Function dto
 *
 * @description
 * Builds the setting DTO at a version.
 *
 * @param {boolean} enabled - Switch state.
 * @param {number} version - Version.
 *
 * @returns {AdminMaintenanceDto} Setting DTO.
 */
const dto = (enabled: boolean, version: number): AdminMaintenanceDto => ({
  enabled,
  message: { fr: 'Retour à 14 h.', en: 'Back at 2 pm.' },
  version,
});

/**
 * Function setup
 *
 * @description
 * Creates the store and the HTTP testing backend.
 *
 * @returns {{ store: InstanceType<typeof AdminMaintenanceStore>; backend: HttpTestingController }} Harness.
 */
function setup(): {
  store: InstanceType<typeof AdminMaintenanceStore>;
  backend: HttpTestingController;
} {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting(), AdminMaintenanceStore],
  });
  return {
    store: TestBed.inject<InstanceType<typeof AdminMaintenanceStore>>(AdminMaintenanceStore),
    backend: TestBed.inject<HttpTestingController>(HttpTestingController),
  };
}

describe('AdminMaintenanceStore', (): void => {
  afterEach((): void => {
    TestBed.inject<HttpTestingController>(HttpTestingController).verify();
  });

  it('loads the setting', async (): Promise<void> => {
    const { store, backend } = setup();
    const loading: Promise<AdminMaintenance | null> = store.load();
    expect(store.loading()).toBe(true);
    backend.expectOne({ method: 'GET', url: URL }).flush(dto(false, 2));
    expect((await loading)?.version).toBe(2);
    expect(store.setting()?.enabled).toBe(false);
    expect(store.loading()).toBe(false);
  });

  it('saves with If-Match on the version last read, then on the version written', async (): Promise<void> => {
    const { store, backend } = setup();
    const loading: Promise<AdminMaintenance | null> = store.load();
    backend.expectOne(URL).flush(dto(false, 2));
    await loading;
    const draft: MaintenanceDraft = { enabled: true, message: { fr: ' Retour à 14 h. ', en: '' } };
    const first: Promise<AdminMaintenance | null> = store.save(draft);
    expect(store.writing()).toBe(true);
    const put: TestRequest = backend.expectOne({ method: 'PUT', url: URL });
    expect(put.request.headers.get('if-match')).toBe('"2"');
    expect(put.request.body).toEqual({ enabled: true, message: { fr: 'Retour à 14 h.' } });
    put.flush(dto(true, 3));
    expect((await first)?.enabled).toBe(true);
    const second: Promise<AdminMaintenance | null> = store.save({ ...draft, enabled: false });
    const next: TestRequest = backend.expectOne(URL);
    expect(next.request.headers.get('if-match')).toBe('"3"');
    next.flush(dto(false, 4));
    expect((await second)?.version).toBe(4);
    expect(store.setting()?.enabled).toBe(false);
  });

  it('reports a 412 as a conflict and keeps the setting read', async (): Promise<void> => {
    const { store, backend } = setup();
    const loading: Promise<AdminMaintenance | null> = store.load();
    backend.expectOne(URL).flush(dto(false, 2));
    await loading;
    const saving: Promise<AdminMaintenance | null> = store.save({
      enabled: true,
      message: { fr: '', en: '' },
    });
    backend
      .expectOne(URL)
      .flush(
        { code: 'content.version-mismatch', title: 'Stale' },
        { status: 412, statusText: 'Precondition Failed' },
      );
    expect(await saving).toBeNull();
    expect(store.conflict()).toBe(true);
    expect(store.setting()?.version).toBe(2);
    store.resetWriteState();
    expect(store.conflict()).toBe(false);
  });

  it('ignores a read answered after the page left', async (): Promise<void> => {
    const { store, backend } = setup();
    const loading: Promise<AdminMaintenance | null> = store.load();
    store.cancelRead();
    backend.expectOne(URL).flush(dto(true, 5));
    expect(await loading).toBeNull();
    expect(store.setting()).toBeNull();
  });
});
