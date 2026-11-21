import type { AdminMaintenance } from '@internal/content-web-data-access/lib/admin/models/admin-maintenance/admin-maintenance.interface';
import {
  toAdminMaintenance,
  toMaintenanceDraft,
  toMaintenanceRequest,
} from '@internal/content-web-data-access/lib/admin/utils/maintenance-draft/maintenance-draft.utils';

describe('toAdminMaintenance', (): void => {
  it('keeps the switch, the version and an absent English message absent', (): void => {
    expect(
      toAdminMaintenance({ enabled: true, message: { fr: 'Retour à 14 h.' }, version: 3 }),
    ).toEqual({ enabled: true, message: { fr: 'Retour à 14 h.' }, version: 3 });
    expect(
      toAdminMaintenance({ enabled: false, message: { fr: '', en: 'Back' }, version: 1 }).message,
    ).toEqual({ fr: '', en: 'Back' });
  });
});

describe('toMaintenanceDraft', (): void => {
  it('reads an English message not written as empty', (): void => {
    const setting: AdminMaintenance = { enabled: true, message: { fr: 'Retour' }, version: 2 };
    expect(toMaintenanceDraft(setting)).toEqual({
      enabled: true,
      message: { fr: 'Retour', en: '' },
    });
  });
});

describe('toMaintenanceRequest', (): void => {
  it('trims the messages and leaves a blank English message out', (): void => {
    expect(
      toMaintenanceRequest({ enabled: true, message: { fr: '  Retour à 14 h. ', en: '  ' } }),
    ).toEqual({ enabled: true, message: { fr: 'Retour à 14 h.' } });
    expect(
      toMaintenanceRequest({ enabled: false, message: { fr: '', en: ' Back at 2 pm. ' } }),
    ).toEqual({ enabled: false, message: { fr: '', en: 'Back at 2 pm.' } });
  });
});
