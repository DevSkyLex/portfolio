/**
 * Type AdminMessageTransition
 * @type AdminMessageTransition
 *
 * @description
 * Lifecycle transitions the inbox API exposes as `POST /messages/:id/<transition>`.
 *
 * @type {'read' | 'archive'}
 */
export type AdminMessageTransition = 'read' | 'archive';
