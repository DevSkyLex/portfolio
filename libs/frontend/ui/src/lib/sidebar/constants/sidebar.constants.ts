/**
 * Constant SIDEBAR_MOBILE_QUERY
 *
 * @description
 * Media query matching viewports below the sidebar's desktop breakpoint, where the sidebar is presented as a drawer.
 *
 * @type {string}
 */
export const SIDEBAR_MOBILE_QUERY = '(max-width: 767.98px)' as const;

/**
 * Function SIDEBAR_TOGGLE_LABEL
 *
 * @description
 * Returns the localized accessible name shared by sidebar trigger controls.
 *
 * @returns {string} Localized toggle label.
 */
export const SIDEBAR_TOGGLE_LABEL = (): string =>
  $localize`:@@ui.sidebar.toggle:Afficher ou masquer la barre latérale`;
