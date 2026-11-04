/**
 * Constant OAUTH_ERROR_MESSAGES
 *
 * @description
 * Localized messages of the problem codes of the administrator OAuth routes (French source, English
 * targets, D45); the browser imports no value from the contracts (D10), so the codes are repeated here.
 *
 * @type {Readonly<Record<string, string>>}
 */
export const OAUTH_ERROR_MESSAGES: Readonly<Record<string, string>> = {
  'identity.oauth-invalid-client': $localize`:@@admin.identity.oauthError.invalidClient:L’application n’a pas pu être identifiée : elle n’est pas enregistrée, ou son document de description est introuvable ou invalide.`,
  'identity.oauth-invalid-redirect-uri': $localize`:@@admin.identity.oauthError.invalidRedirectUri:L’adresse de retour demandée n’est pas déclarée par cette application. Aucune redirection n’a été faite.`,
  'identity.oauth-invalid-request': $localize`:@@admin.identity.oauthError.invalidRequest:La demande d’autorisation est incomplète ou mal formée.`,
  'identity.oauth-request-expired': $localize`:@@admin.identity.oauthError.requestExpired:Cette demande a expiré ou a déjà été traitée. Relancez la connexion depuis l’application.`,
  'identity.oauth-application-not-found': $localize`:@@admin.identity.oauthError.applicationNotFound:Cette application n’est plus connectée. La liste a été rechargée.`,
};
