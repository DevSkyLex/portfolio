/**
 * Constant ADMIN_STYLESHEET_HREF
 *
 * @description
 * Address of the administration stylesheet, the non-injected `admin` bundle of `apps/web/project.json`
 * (D31). Relative, so it resolves against the document's `<base href>`: each locale build writes its
 * copy, `/admin.css` for the French administration and `/en/admin.css` for the English one (D18). Angular does not hash non-injected
 * bundles: the origin revalidates this name on every request (`docker/nginx/snippets/site.conf`).
 *
 * @type {string}
 */
export const ADMIN_STYLESHEET_HREF = 'admin.css' as const;

/**
 * Constant ADMIN_STYLESHEET_ATTRIBUTE
 *
 * @description
 * Marker attribute of the `<link>` the shell appends, so that tests and the e2e suite can find it.
 *
 * @type {string}
 */
export const ADMIN_STYLESHEET_ATTRIBUTE = 'data-admin-stylesheet' as const;
