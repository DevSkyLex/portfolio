import {
  type Signal,
  type WritableSignal,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import {
  lucideArrowLeft,
  lucideBlocks,
  lucideCircleAlert,
  lucideEye,
  lucideLoaderCircle,
  lucidePencil,
  lucideSend,
  lucideShieldAlert,
  lucideTrash2,
} from '@ng-icons/lucide';
import {
  type AuthorizationConsent,
  type McpScopeName,
  OAuthConsentStore,
  type OAuthConsentStoreType,
} from '@vfortin/identity-web-data-access';
import {
  AlertDescriptionDirective,
  AlertDirective,
  AlertTitleDirective,
  BadgeDirective,
  ButtonDirective,
  SkeletonDirective,
} from '@vfortin/ui';
import {
  OAUTH_SCOPE_TEXTS,
  type OAuthScopeText,
} from '@internal/identity-web-feature/lib/constants/oauth-scopes.constants';
import { ExternalNavigationService } from '@internal/identity-web-feature/lib/services/external-navigation/external-navigation.service';
import {
  clientRedirectHost,
  toAuthorizationQuery,
} from '@internal/identity-web-feature/lib/utils/authorization-query/authorization-query.utils';
import { knownClientLogo } from '@internal/identity-web-feature/lib/utils/known-client-logo/known-client-logo.utils';

/**
 * Interface ScopeRow
 * @interface ScopeRow
 *
 * @description
 * One requested scope as listed on the consent screen.
 */
interface ScopeRow {
  // #region Properties
  readonly scope: McpScopeName;
  readonly text: OAuthScopeText;
  readonly icon: string;
  /** Not granted by an earlier consent of the same client. */
  readonly added: boolean;
  // #endregion
}

/**
 * Constant SCOPE_ICONS
 *
 * @description
 * Lucide icon of each scope.
 *
 * @type {Readonly<Record<McpScopeName, string>>}
 */
const SCOPE_ICONS: Readonly<Record<McpScopeName, string>> = {
  'content:read': lucideEye,
  'content:write': lucidePencil,
  'content:publish': lucideSend,
  'content:delete': lucideTrash2,
};

/**
 * Component OAuthConsentPageComponent
 * @class OAuthConsentPageComponent
 *
 * @description
 * Authorization endpoint of the OAuth server for MCP clients (D45), at `/admin/oauth/authorize`
 * behind the normal administrator login. It forwards the query for review, then shows who asks (name
 * and logo from the client's metadata, its identifier, a warning for a dynamically registered client
 * and for a loopback redirect), where the browser will return (the redirect host) and the requested
 * scopes in plain words, with « Refuser » and « Autoriser ». The decision's redirect, like an error
 * redirect of the review, is followed with `location.assign` once checked; a request that cannot be
 * sent back is explained here. The page is never framed (`frame-ancestors 'none'`).
 */
@Component({
  selector: 'identity-oauth-consent-page',
  imports: [
    AlertDescriptionDirective,
    AlertDirective,
    AlertTitleDirective,
    BadgeDirective,
    ButtonDirective,
    NgIcon,
    RouterLink,
    SkeletonDirective,
  ],
  providers: [OAuthConsentStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block bg-surface' },
  templateUrl: './oauth-consent-page.component.html',
})
export class OAuthConsentPageComponent {
  // #region Properties
  /**
   * Property store
   * @readonly
   *
   * @description
   * Page-scoped review and decision.
   *
   * @type {OAuthConsentStoreType}
   */
  protected readonly store: OAuthConsentStoreType =
    inject<OAuthConsentStoreType>(OAuthConsentStore);

  /**
   * Property navigation
   * @readonly
   *
   * @description
   * Leaves for the client.
   *
   * @type {ExternalNavigationService}
   */
  private readonly navigation: ExternalNavigationService =
    inject<ExternalNavigationService>(ExternalNavigationService);

  /**
   * Property icons
   * @readonly
   *
   * @description
   * Lucide icons of the page.
   */
  protected readonly icons: {
    readonly app: typeof lucideBlocks;
    readonly back: typeof lucideArrowLeft;
    readonly error: typeof lucideCircleAlert;
    readonly loading: typeof lucideLoaderCircle;
    readonly warning: typeof lucideShieldAlert;
  } = {
    app: lucideBlocks,
    back: lucideArrowLeft,
    error: lucideCircleAlert,
    loading: lucideLoaderCircle,
    warning: lucideShieldAlert,
  } as const;

  /**
   * Property leavingFor
   * @readonly
   *
   * @description
   * Host the browser is being sent to, `null` until a redirect is followed.
   *
   * @type {WritableSignal<string | null>}
   */
  protected readonly leavingFor: WritableSignal<string | null> = signal<string | null>(null);

  /**
   * Property refused
   * @readonly
   *
   * @description
   * Whether the server returned a redirect the page refuses to follow.
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly refused: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property consent
   * @readonly
   *
   * @description
   * Request under decision.
   *
   * @type {Signal<AuthorizationConsent | null>}
   */
  protected readonly consent: Signal<AuthorizationConsent | null> =
    computed<AuthorizationConsent | null>(() => this.store.consent());

  /**
   * Property clientName
   * @readonly
   *
   * @description
   * Name the client gave, or a neutral wording without one.
   *
   * @type {Signal<string>}
   */
  protected readonly clientName: Signal<string> = computed<string>(
    () => this.consent()?.client.name ?? $localize`:@@admin.oauth.clientFallback:Cette application`,
  );

  /**
   * Property brand
   * @readonly
   *
   * @description
   * Brand logo of a known client that publishes none (Claude), shown when no logo was fetched.
   *
   * @type {Signal<string | null>}
   */
  protected readonly brand: Signal<string | null> = computed<string | null>((): string | null => {
    const request: AuthorizationConsent | null = this.consent();
    return request === null
      ? null
      : knownClientLogo(request.client.clientId, request.client.registration);
  });

  /**
   * Property clientHost
   * @readonly
   *
   * @description
   * Host of a metadata-document client identifier, the domain that vouches for its metadata.
   *
   * @type {Signal<string | null>}
   */
  protected readonly clientHost: Signal<string | null> = computed<string | null>(() => {
    const consent: AuthorizationConsent | null = this.consent();
    return consent?.client.registration === 'metadata-document' &&
      URL.canParse(consent.client.clientId)
      ? new URL(consent.client.clientId).host
      : null;
  });

  /**
   * Property resourceHost
   * @readonly
   *
   * @description
   * Host and path of the resource the tokens will reach.
   *
   * @type {Signal<string>}
   */
  protected readonly resourceHost: Signal<string> = computed<string>(() => {
    const resource: string = this.consent()?.resource ?? '';
    return URL.canParse(resource)
      ? `${new URL(resource).host}${new URL(resource).pathname}`
      : resource;
  });

  /**
   * Property scopes
   * @readonly
   *
   * @description
   * Requested scopes in plain words, marking those an earlier consent did not grant.
   *
   * @type {Signal<readonly ScopeRow[]>}
   */
  protected readonly scopes: Signal<readonly ScopeRow[]> = computed<readonly ScopeRow[]>(() => {
    const consent: AuthorizationConsent | null = this.consent();
    if (consent === null) return [];
    return consent.scopes.map((scope: McpScopeName): ScopeRow => ({
      scope,
      text: OAUTH_SCOPE_TEXTS[scope],
      icon: SCOPE_ICONS[scope],
      added: consent.grantedScopes.length > 0 && !consent.grantedScopes.includes(scope),
    }));
  });

  /**
   * Property expired
   * @readonly
   *
   * @description
   * Whether the decision was refused because the request is no longer decidable.
   *
   * @type {Signal<boolean>}
   */
  protected readonly expired: Signal<boolean> = computed<boolean>(
    () => this.store.decideCallState().error?.code === 'identity.oauth-request-expired',
  );
  // #endregion

  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Forwards the query of the page URL for review as soon as the page opens.
   */
  public constructor() {
    const route: ActivatedRoute = inject<ActivatedRoute>(ActivatedRoute);
    void this.store
      .review(toAuthorizationQuery(route.snapshot.queryParamMap))
      .then((redirect: string | null): void => this.follow(redirect));
  }
  // #endregion

  // #region Methods
  /**
   * Method decide
   * @method decide
   *
   * @description
   * Sends « Autoriser » or « Refuser » and follows the returned redirect.
   *
   * @param {'approve' | 'deny'} decision - Owner's choice.
   *
   * @returns {Promise<void>} Resolves once the redirect is followed or the failure shown.
   */
  protected async decide(decision: 'approve' | 'deny'): Promise<void> {
    this.follow(await this.store.decide(decision));
  }

  /**
   * Method follow
   * @method follow
   *
   * @description
   * Sends the browser back to the client when the redirect is acceptable.
   *
   * @param {string | null} redirect - Redirect URL, `null` when there is none.
   */
  private follow(redirect: string | null): void {
    if (redirect === null) return;
    const host: string | null = clientRedirectHost(redirect);
    if (host === null) {
      this.refused.set(true);
      return;
    }
    this.leavingFor.set(host);
    this.navigation.assign(redirect);
  }
  // #endregion
}
