/**
 * Export OAuth transport shapes
 *
 * @description
 * Contract types the identity feature renders (D45): the consent screen data, a connected application
 * and the scope vocabulary, re-exported type-only so the feature never reads the contracts (D10).
 */
export type {
  AuthorizationConsent,
  AuthorizationReviewRequest,
  ConnectedApplication,
  McpScopeName,
} from '@vfortin/identity-contracts';
