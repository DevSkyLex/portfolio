import {
  AdminMaintenanceDtoSchema,
  MAINTENANCE_LIMITS,
  type MaintenanceRequest,
  MaintenanceRequestSchema,
} from '@internal/content-contracts/lib/admin-maintenance.contract';
import setting from '@internal/content-contracts/lib/testing/admin-maintenance.fixture.json';

describe('AdminMaintenanceDtoSchema', (): void => {
  it('accepts the fixture shared by the service and the admin screen', (): void => {
    expect(AdminMaintenanceDtoSchema.parse(setting)).toEqual(setting);
  });

  it('rejects a version below 1', (): void => {
    expect(AdminMaintenanceDtoSchema.safeParse({ ...setting, version: 0 }).success).toBe(false);
  });
});

describe('MaintenanceRequestSchema', (): void => {
  it('defaults the message to none and trims the texts', (): void => {
    expect(MaintenanceRequestSchema.parse({ enabled: true })).toEqual({
      enabled: true,
      message: { fr: '' },
    });
    const parsed: MaintenanceRequest = MaintenanceRequestSchema.parse({
      enabled: false,
      message: { fr: '  Retour à 14 h. ', en: ' ' },
    });
    expect(parsed.message).toEqual({ fr: 'Retour à 14 h.', en: '' });
  });

  it('accepts the exact bound and rejects one character more', (): void => {
    const exact: string = 'x'.repeat(MAINTENANCE_LIMITS.message);
    expect(
      MaintenanceRequestSchema.safeParse({ enabled: true, message: { fr: exact, en: exact } })
        .success,
    ).toBe(true);
    expect(
      MaintenanceRequestSchema.safeParse({ enabled: true, message: { fr: `${exact}x` } }).success,
    ).toBe(false);
  });

  it('requires the switch as a boolean', (): void => {
    expect(MaintenanceRequestSchema.safeParse({ message: { fr: '' } }).success).toBe(false);
    expect(MaintenanceRequestSchema.safeParse({ enabled: 'true' }).success).toBe(false);
  });
});
