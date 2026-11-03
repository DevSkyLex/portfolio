export {
  AuthController,
  IDENTITY_HTTP_OPTIONS,
  type IdentityHttpOptions,
} from '@internal/identity-adapters-in/lib/http/controllers/auth/auth.controller';
export { identityProblemMapper } from '@internal/identity-adapters-in/lib/http/mappers/identity-problem/identity-problem.mapper';

/** Audience of the access tokens, defined by the contract (the composition does not read contracts directly). */
export { ADMIN_AUDIENCE } from '@vfortin/identity-contracts';
