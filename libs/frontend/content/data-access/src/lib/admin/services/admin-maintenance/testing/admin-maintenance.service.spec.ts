import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
  type TestRequest,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { AdminMaintenanceDto } from '@vfortin/content-contracts';
import { firstValueFrom } from 'rxjs';
import type { AdminMaintenance } from '@internal/content-web-data-access/lib/admin/models/admin-maintenance/admin-maintenance.interface';
import { AdminMaintenanceApiService } from '@internal/content-web-data-access/lib/admin/services/admin-maintenance/admin-maintenance.service';

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
 * Constant DTO
 *
 * @description
 * Enabled setting with a French message only.
 *
 * @type {AdminMaintenanceDto}
 */
const DTO: AdminMaintenanceDto = { enabled: true, message: { fr: 'Retour à 14 h.' }, version: 4 };

describe('AdminMaintenanceApiService', (): void => {
  let api: AdminMaintenanceApiService;
  let backend: HttpTestingController;

  beforeEach((): void => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject<AdminMaintenanceApiService>(AdminMaintenanceApiService);
    backend = TestBed.inject<HttpTestingController>(HttpTestingController);
  });

  afterEach((): void => {
    backend.verify();
  });

  it('reads the setting as its view model', async (): Promise<void> => {
    const read: Promise<AdminMaintenance> = firstValueFrom(api.get());
    backend.expectOne({ method: 'GET', url: URL }).flush(DTO);
    await expect(read).resolves.toEqual({
      enabled: true,
      message: { fr: 'Retour à 14 h.' },
      version: 4,
    });
  });

  it('revises with If-Match on the version read', async (): Promise<void> => {
    const current: AdminMaintenance = { enabled: true, message: { fr: 'Retour' }, version: 4 };
    const saved: Promise<AdminMaintenance> = firstValueFrom(
      api.revise(current, { enabled: false, message: { fr: '' } }),
    );
    const request: TestRequest = backend.expectOne({ method: 'PUT', url: URL });
    expect(request.request.headers.get('if-match')).toBe('"4"');
    expect(request.request.body).toEqual({ enabled: false, message: { fr: '' } });
    request.flush({ enabled: false, message: { fr: '' }, version: 5 });
    await expect(saved).resolves.toMatchObject({ enabled: false, version: 5 });
  });
});
