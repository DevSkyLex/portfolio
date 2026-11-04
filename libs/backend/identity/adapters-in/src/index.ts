export {
  AuthController,
  IDENTITY_HTTP_OPTIONS,
  type IdentityHttpOptions,
} from '@internal/identity-adapters-in/lib/http/controllers/auth/auth.controller';
export { TwoFactorController } from '@internal/identity-adapters-in/lib/http/controllers/two-factor/two-factor.controller';
export { identityProblemMapper } from '@internal/identity-adapters-in/lib/http/mappers/identity-problem/identity-problem.mapper';

export { ConnectedApplicationsController } from '@internal/identity-adapters-in/lib/http/controllers/connected-applications/connected-applications.controller';
export { OAuthConsentController } from '@internal/identity-adapters-in/lib/http/controllers/oauth-consent/oauth-consent.controller';
export {
  OAUTH_HTTP_OPTIONS,
  OAuthServerController,
  type OAuthHttpOptions,
} from '@internal/identity-adapters-in/lib/http/controllers/oauth-server/oauth-server.controller';

/** Audience of the access tokens, defined by the contract (the composition does not read contracts directly). */
export { ADMIN_AUDIENCE } from '@vfortin/identity-contracts';

/** Path of the MCP endpoint, from which composition derives the default resource (D45). */
export { MCP_RESOURCE_PATH } from '@vfortin/identity-contracts';
