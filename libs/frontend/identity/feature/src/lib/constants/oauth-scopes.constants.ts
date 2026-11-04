import type { McpScopeName } from '@vfortin/identity-web-data-access';

/**
 * Interface OAuthScopeText
 * @interface OAuthScopeText
 *
 * @description
 * Plain wording of one scope.
 */
export interface OAuthScopeText {
  // #region Properties
  /** Short label, as on the consent screen. */
  readonly title: string;
  /** What the client may then do. */
  readonly description: string;
  // #endregion
}

/**
 * Constant OAUTH_SCOPE_TEXTS
 *
 * @description
 * Localized wording of the MCP scopes on the consent screen and in « Applications connectées » (D45).
 * Every scope but reading also lets the client read.
 *
 * @type {Readonly<Record<McpScopeName, OAuthScopeText>>}
 */
export const OAUTH_SCOPE_TEXTS: Readonly<Record<McpScopeName, OAuthScopeText>> = {
  'content:read': {
    title: $localize`:@@admin.oauth.scope.read.title:Lire le contenu`,
    description: $localize`:@@admin.oauth.scope.read.description:Projets, parcours et pages du site, brouillons compris.`,
  },
  'content:write': {
    title: $localize`:@@admin.oauth.scope.write.title:Modifier le contenu`,
    description: $localize`:@@admin.oauth.scope.write.description:Créer et modifier projets, parcours, pages et images, sans les publier.`,
  },
  'content:publish': {
    title: $localize`:@@admin.oauth.scope.publish.title:Publier et dépublier`,
    description: $localize`:@@admin.oauth.scope.publish.description:Mettre en ligne ou retirer un contenu du site public.`,
  },
  'content:delete': {
    title: $localize`:@@admin.oauth.scope.delete.title:Supprimer du contenu`,
    description: $localize`:@@admin.oauth.scope.delete.description:Effacer définitivement des entrées ou des images.`,
  },
};
