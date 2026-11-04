import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { lucideBlocks, lucideCircleAlert, lucidePlug } from '@ng-icons/lucide';
import {
  type ConnectedApplication,
  ConnectedApplicationsStore,
  type ConnectedApplicationsStoreType,
  type McpScopeName,
} from '@vfortin/identity-web-data-access';
import {
  AlertDirective,
  BadgeDirective,
  ButtonDirective,
  ConfirmDialogService,
  EmptyDescriptionDirective,
  EmptyDirective,
  EmptyHeaderDirective,
  EmptyMediaDirective,
  EmptyTitleDirective,
  SkeletonDirective,
  ToastService,
} from '@vfortin/ui';
import { OAUTH_SCOPE_TEXTS } from '@internal/identity-web-feature/lib/constants/oauth-scopes.constants';

/**
 * Component ConnectedApplicationsSectionComponent
 * @class ConnectedApplicationsSectionComponent
 *
 * @description
 * « Applications connectées » section of the security page (D36 settings revision, D45): the MCP
 * clients the owner authorized, one flat hairline row each (logo or icon tile, name, an « Non
 * vérifiée » badge for a dynamic registration, host and scopes, consent and last-use dates) with a
 * danger ghost « Révoquer » confirmed in an alert dialog; `uiEmpty` when none. It lays itself out on
 * the page's settings grid and owns its store.
 */
@Component({
  selector: 'identity-connected-applications-section',
  imports: [
    AlertDirective,
    BadgeDirective,
    ButtonDirective,
    DatePipe,
    EmptyDescriptionDirective,
    EmptyDirective,
    EmptyHeaderDirective,
    EmptyMediaDirective,
    EmptyTitleDirective,
    NgIcon,
    SkeletonDirective,
  ],
  providers: [ConnectedApplicationsStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  templateUrl: './connected-applications-section.component.html',
})
export class ConnectedApplicationsSectionComponent {
  // #region Properties
  /**
   * Property store
   * @readonly
   *
   * @description
   * Section-scoped list and revocation.
   *
   * @type {ConnectedApplicationsStoreType}
   */
  protected readonly store: ConnectedApplicationsStoreType = inject<ConnectedApplicationsStoreType>(
    ConnectedApplicationsStore,
  );

  /**
   * Property confirmDialog
   * @readonly
   *
   * @description
   * Confirms a revocation.
   *
   * @type {ConfirmDialogService}
   */
  private readonly confirmDialog: ConfirmDialogService =
    inject<ConfirmDialogService>(ConfirmDialogService);

  /**
   * Property toasts
   * @readonly
   *
   * @description
   * Administration toaster.
   *
   * @type {ToastService}
   */
  private readonly toasts: ToastService = inject<ToastService>(ToastService);

  /**
   * Property icons
   * @readonly
   *
   * @description
   * Lucide icons of the section.
   */
  protected readonly icons: {
    readonly app: typeof lucideBlocks;
    readonly empty: typeof lucidePlug;
    readonly error: typeof lucideCircleAlert;
  } = { app: lucideBlocks, empty: lucidePlug, error: lucideCircleAlert } as const;
  // #endregion

  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Reads the list.
   */
  public constructor() {
    void this.store.load();
  }
  // #endregion

  // #region Methods
  /**
   * Method nameOf
   * @method nameOf
   *
   * @description
   * Display name of an application, its host without one.
   *
   * @param {ConnectedApplication} application - Listed application.
   *
   * @returns {string} Name.
   */
  protected nameOf(application: ConnectedApplication): string {
    return application.name ?? application.host;
  }

  /**
   * Method scopesOf
   * @method scopesOf
   *
   * @description
   * Granted scopes in plain words.
   *
   * @param {ConnectedApplication} application - Listed application.
   *
   * @returns {string} Comma-separated labels.
   */
  protected scopesOf(application: ConnectedApplication): string {
    return application.scopes
      .map((scope: McpScopeName): string => OAUTH_SCOPE_TEXTS[scope].title)
      .join(', ');
  }

  /**
   * Method revokeLabelOf
   * @method revokeLabelOf
   *
   * @description
   * Accessible name of the revoke button of an application.
   *
   * @param {ConnectedApplication} application - Listed application.
   *
   * @returns {string} Label naming the application.
   */
  protected revokeLabelOf(application: ConnectedApplication): string {
    const name: string = this.nameOf(application);
    return $localize`:@@admin.apps.revokeLabel:Révoquer ${name}:name:`;
  }

  /**
   * Method revoke
   * @method revoke
   *
   * @description
   * Confirms, then revokes an application and reports the outcome in a toast.
   *
   * @param {ConnectedApplication} application - Application to revoke.
   *
   * @returns {Promise<void>} Resolves once reported, or at once on cancel.
   */
  protected async revoke(application: ConnectedApplication): Promise<void> {
    const name: string = this.nameOf(application);
    const confirmed: boolean = await this.confirmDialog.confirm({
      title: $localize`:@@admin.apps.confirm.title:Révoquer l’accès de ${name}:name: ?`,
      description: $localize`:@@admin.apps.confirm.description:L’application ne pourra plus renouveler ses accès ni agir sur le contenu du site ; elle devra demander une nouvelle autorisation. Un jeton déjà délivré expire au plus tard dans cinq minutes.`,
      confirmLabel: $localize`:@@admin.apps.confirm.revoke:Révoquer`,
      tone: 'danger',
    });
    if (!confirmed) return;
    if (await this.store.revoke(application.id)) {
      this.toasts.success($localize`:@@admin.apps.toast.revoked:Accès révoqué.`);
      return;
    }
    const message: string | undefined = this.store.revokeCallState().error?.message;
    if (message !== undefined) this.toasts.error(message);
  }
  // #endregion
}
