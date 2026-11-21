import { InvalidValueError } from '@internal/content-domain/lib/errors/domain-error';
import {
  MAINTENANCE_LIMITS,
  MaintenanceMode,
} from '@internal/content-domain/lib/maintenance/maintenance-mode';

describe('MaintenanceMode', (): void => {
  it('starts disabled, without message, at version 1', (): void => {
    const mode: MaintenanceMode = MaintenanceMode.initial();
    expect(mode.snapshot()).toEqual({ enabled: false, message: { fr: '' }, version: 1 });
    expect(mode.messageIn('fr')).toBe('');
    expect(mode.messageIn('en')).toBe('');
  });

  it('trims the messages and leaves a blank English message out', (): void => {
    expect(
      MaintenanceMode.revisionOf({ enabled: true, message: { fr: '  Retour à 14 h. ', en: '  ' } }),
    ).toEqual({ enabled: true, message: { fr: 'Retour à 14 h.' } });
    expect(
      MaintenanceMode.revisionOf({ enabled: false, message: { fr: '', en: ' Back at 2 pm. ' } }),
    ).toEqual({ enabled: false, message: { fr: '', en: 'Back at 2 pm.' } });
  });

  it('refuses a message over the limit under its contract path', (): void => {
    const long: string = 'a'.repeat(MAINTENANCE_LIMITS.message + 1);
    expect(() => MaintenanceMode.revisionOf({ enabled: true, message: { fr: long } })).toThrow(
      new InvalidValueError('message.fr', 'at most 500 characters'),
    );
    expect(() =>
      MaintenanceMode.revisionOf({ enabled: true, message: { fr: 'ok', en: long } }),
    ).toThrow(InvalidValueError);
    expect(
      MaintenanceMode.revisionOf({
        enabled: true,
        message: { fr: 'a'.repeat(MAINTENANCE_LIMITS.message) },
      }).message.fr,
    ).toHaveLength(500);
  });

  it('falls back on French for an English page', (): void => {
    const mode: MaintenanceMode = MaintenanceMode.rehydrate({
      enabled: true,
      message: { fr: 'Retour à 14 h.' },
      version: 3,
    });
    expect(mode.messageIn('en')).toBe('Retour à 14 h.');
    mode.revise({ enabled: true, message: { fr: 'Retour à 14 h.', en: 'Back at 2 pm.' } });
    expect(mode.messageIn('en')).toBe('Back at 2 pm.');
    expect(mode.messageIn('fr')).toBe('Retour à 14 h.');
    expect(mode.version).toBe(3);
    expect(mode.enabled).toBe(true);
  });

  it('rejects invalid persisted state', (): void => {
    expect(() =>
      MaintenanceMode.rehydrate({ enabled: false, message: { fr: '' }, version: 0 }),
    ).toThrow(InvalidValueError);
    expect(() =>
      MaintenanceMode.rehydrate({
        enabled: false,
        message: { fr: '', en: 'b'.repeat(501) },
        version: 1,
      }),
    ).toThrow(new InvalidValueError('message.en', 'at most 500 characters'));
  });
});
