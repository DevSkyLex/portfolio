/**
 * Constant INBOX_CONFLICT_MESSAGE
 *
 * @description
 * Warning toast of a write refused with 412: another session changed the message first (If-Match),
 * and the store has already reloaded the list, so no action is left to the administrator.
 *
 * @type {string}
 */
export const INBOX_CONFLICT_MESSAGE: string = $localize`:@@admin.inbox.toast.conflict:Ce message a changé entre-temps ; la liste a été rechargée.`;
