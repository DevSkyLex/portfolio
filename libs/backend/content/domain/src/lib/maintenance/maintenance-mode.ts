import { InvalidValueError } from '@internal/content-domain/lib/errors/domain-error';
import {
  LOCALES,
  type Locale,
} from '@internal/content-domain/lib/values/localized-text/localized-text';

/**
 * Constant MAINTENANCE_LIMITS
 *
 * @description
 * Longest trimmed maintenance message per locale; mirrored by `MAINTENANCE_LIMITS` in the content
 * contracts and by the admin form's browser copy (D10).
 */
export const MAINTENANCE_LIMITS: { readonly message: 500 } = { message: 500 } as const;

/**
 * Interface MaintenanceMessage
 * @interface MaintenanceMessage
 *
 * @description
 * Optional message of the maintenance screen per locale, trimmed: French may be empty (the screen
 * then shows its default line) and a missing English text falls back on French.
 */
export interface MaintenanceMessage {
  // #region Properties
  /**
   * Property fr
   * @readonly
   *
   * @description
   * French message, possibly empty.
   */
  readonly fr: string;

  /**
   * Property en
   * @readonly
   *
   * @description
   * English message; absent when not written.
   */
  readonly en?: string;
  // #endregion
}

/**
 * Interface MaintenanceModeProps
 * @interface MaintenanceModeProps
 *
 * @description
 * Complete persisted state of the singleton maintenance setting.
 */
export interface MaintenanceModeProps {
  // #region Properties
  /**
   * Property enabled
   * @readonly
   *
   * @description
   * Whether the public site shows the maintenance screen instead of its pages.
   */
  readonly enabled: boolean;

  /**
   * Property message
   * @readonly
   *
   * @description
   * Message of the maintenance screen.
   */
  readonly message: MaintenanceMessage;

  /**
   * Property version
   * @readonly
   *
   * @description
   * Optimistic-lock version, starting at 1 (the setting never written).
   */
  readonly version: number;
  // #endregion
}

/**
 * Type MaintenanceRevision
 * @type MaintenanceRevision
 *
 * @description
 * Administration-editable part of the setting; the version uses the repository's precondition.
 */
export type MaintenanceRevision = Pick<MaintenanceModeProps, 'enabled' | 'message'>;

/**
 * Interface MaintenanceModeDraft
 * @interface MaintenanceModeDraft
 *
 * @description
 * Unvalidated revision as received from an administrator, under the contract's field names
 * (`enabled`, `message.fr`, `message.en`).
 */
export interface MaintenanceModeDraft {
  // #region Properties
  /**
   * Property enabled
   * @readonly
   *
   * @description
   * Wanted state.
   */
  readonly enabled: boolean;

  /**
   * Property message
   * @readonly
   *
   * @description
   * Message per locale.
   */
  readonly message: { readonly fr: string; readonly en?: string | undefined };
  // #endregion
}

/**
 * Class MaintenanceMode
 * @class MaintenanceMode
 *
 * @description
 * Singleton switch of the public site's maintenance screen. It is not published content: a change
 * applies to the next public request, without a content revision or a publication batch.
 */
export class MaintenanceMode {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Wraps validated state; callers use `initial`, `rehydrate` or `revise`.
   *
   * @param {MaintenanceModeProps} props - Setting state.
   */
  private constructor(private props: MaintenanceModeProps) {}
  // #endregion

  // #region Methods
  /**
   * Method initial
   * @method initial
   *
   * @description
   * Setting never written: disabled, no message, version 1.
   *
   * @returns {MaintenanceMode} Default setting.
   */
  public static initial(): MaintenanceMode {
    return new MaintenanceMode({ enabled: false, message: { fr: '' }, version: 1 });
  }

  /**
   * Method revisionOf
   * @method revisionOf
   *
   * @description
   * Validates an administrator draft: each message trimmed and within `MAINTENANCE_LIMITS`, a blank
   * English message left out.
   *
   * @param {MaintenanceModeDraft} draft - Unvalidated revision.
   * @throws {InvalidValueError} With the contract path of the first message over the limit.
   * @returns {MaintenanceRevision} Domain revision.
   */
  public static revisionOf(draft: MaintenanceModeDraft): MaintenanceRevision {
    const fr: string = draft.message.fr.trim();
    const en: string = draft.message.en?.trim() ?? '';
    const message: MaintenanceMessage = en === '' ? { fr } : { fr, en };
    MaintenanceMode.assertLengths(message);
    return { enabled: draft.enabled, message };
  }

  /**
   * Method rehydrate
   * @method rehydrate
   *
   * @description
   * Rebuilds persisted state, rejecting a version below 1 and a message over its limit.
   *
   * @param {MaintenanceModeProps} props - Persisted state.
   * @returns {MaintenanceMode} Rehydrated setting.
   */
  public static rehydrate(props: MaintenanceModeProps): MaintenanceMode {
    if (!Number.isInteger(props.version) || props.version < 1) {
      throw new InvalidValueError('version', 'integer greater than or equal to 1 expected');
    }
    MaintenanceMode.assertLengths(props.message);
    return new MaintenanceMode({ ...props, message: { ...props.message } });
  }

  /**
   * Method enabled
   * @method enabled
   *
   * @description
   * Returns whether the maintenance screen replaces the public site.
   *
   * @returns {boolean} Switch state.
   */
  public get enabled(): boolean {
    return this.props.enabled;
  }

  /**
   * Method message
   * @method message
   *
   * @description
   * Returns the message per locale.
   *
   * @returns {MaintenanceMessage} Message.
   */
  public get message(): MaintenanceMessage {
    return this.props.message;
  }

  /**
   * Method version
   * @method version
   *
   * @description
   * Returns the optimistic-lock version.
   *
   * @returns {number} Version.
   */
  public get version(): number {
    return this.props.version;
  }

  /**
   * Method messageIn
   * @method messageIn
   *
   * @description
   * Message of one locale; English falls back on French, and an empty result means the screen's
   * default line.
   *
   * @param {Locale} locale - Locale of the public page.
   * @returns {string} Message, possibly empty.
   */
  public messageIn(locale: Locale): string {
    return locale === 'en'
      ? (this.props.message.en ?? this.props.message.fr)
      : this.props.message.fr;
  }

  /**
   * Method revise
   * @method revise
   *
   * @description
   * Replaces the switch and the message, keeping the version (the repository increments it).
   *
   * @param {MaintenanceRevision} revision - Validated revision.
   * @returns {void} Completes after replacing the state.
   */
  public revise(revision: MaintenanceRevision): void {
    this.props = MaintenanceMode.rehydrate({ ...this.props, ...revision }).props;
  }

  /**
   * Method snapshot
   * @method snapshot
   *
   * @description
   * Returns the persisted properties for adapters and presenters.
   *
   * @returns {MaintenanceModeProps} Current state.
   */
  public snapshot(): MaintenanceModeProps {
    return this.props;
  }

  /**
   * Method assertLengths
   * @method assertLengths
   *
   * @description
   * Rejects a message over `MAINTENANCE_LIMITS.message` in a locale.
   *
   * @param {MaintenanceMessage} message - Message to check.
   * @throws {InvalidValueError} Naming `message.<locale>`.
   * @returns {void} Completes when every message fits.
   */
  private static assertLengths(message: MaintenanceMessage): void {
    for (const locale of LOCALES) {
      if ((message[locale] ?? '').length > MAINTENANCE_LIMITS.message) {
        throw new InvalidValueError(
          `message.${locale}`,
          `at most ${MAINTENANCE_LIMITS.message} characters`,
        );
      }
    }
  }
  // #endregion
}
