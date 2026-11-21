import { InvalidValueError, type MaintenanceMode } from '@vfortin/content-domain';
import { VersionMismatchError } from '@internal/content-application/lib/errors/application-error';
import { InMemoryMaintenance } from '@internal/content-application/lib/testing/content.fakes';
import { GetAdminMaintenance } from '@internal/content-application/lib/use-cases/get-admin-maintenance/get-admin-maintenance.use-case';
import { ReviseMaintenance } from '@internal/content-application/lib/use-cases/revise-maintenance/revise-maintenance.use-case';

describe('GetAdminMaintenance', (): void => {
  it('reads a setting never written as disabled at version 1', async (): Promise<void> => {
    const mode: MaintenanceMode = await new GetAdminMaintenance(
      new InMemoryMaintenance(),
    ).execute();
    expect(mode.snapshot()).toEqual({ enabled: false, message: { fr: '' }, version: 1 });
  });
});

describe('ReviseMaintenance', (): void => {
  it('switches the maintenance on with its message and returns the new version', async (): Promise<void> => {
    const store: InMemoryMaintenance = new InMemoryMaintenance();
    const revised: MaintenanceMode = await new ReviseMaintenance(store).execute(1, {
      enabled: true,
      message: { fr: ' Retour à 14 h. ', en: 'Back at 2 pm.' },
    });
    expect(revised.snapshot()).toEqual({
      enabled: true,
      message: { fr: 'Retour à 14 h.', en: 'Back at 2 pm.' },
      version: 2,
    });
    expect(store.row).toEqual(revised.snapshot());
    const off: MaintenanceMode = await new ReviseMaintenance(store).execute(2, {
      enabled: false,
      message: { fr: '' },
    });
    expect(off.snapshot()).toEqual({ enabled: false, message: { fr: '' }, version: 3 });
  });

  it('refuses a stale version and keeps the stored setting', async (): Promise<void> => {
    const store: InMemoryMaintenance = new InMemoryMaintenance();
    await new ReviseMaintenance(store).execute(1, { enabled: true, message: { fr: '' } });
    await expect(
      new ReviseMaintenance(store).execute(1, { enabled: false, message: { fr: '' } }),
    ).rejects.toBeInstanceOf(VersionMismatchError);
    expect(store.row?.enabled).toBe(true);
  });

  it('refuses a message over the limit before writing', async (): Promise<void> => {
    const store: InMemoryMaintenance = new InMemoryMaintenance();
    await expect(
      new ReviseMaintenance(store).execute(1, { enabled: true, message: { fr: 'a'.repeat(501) } }),
    ).rejects.toBeInstanceOf(InvalidValueError);
    expect(store.row).toBeNull();
  });
});
