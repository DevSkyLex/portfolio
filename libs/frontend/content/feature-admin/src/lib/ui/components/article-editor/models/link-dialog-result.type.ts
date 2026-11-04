/**
 * Type LinkDialogResult
 * @type LinkDialogResult
 *
 * @description
 * Answer of the link dialog: the target to apply, or the removal of the link.
 */
export type LinkDialogResult = { readonly href: string } | 'remove';
