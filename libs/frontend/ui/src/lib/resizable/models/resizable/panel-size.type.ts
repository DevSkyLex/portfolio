/**
 * Type PanelSize
 * @type PanelSize
 *
 * @description
 * Size or bound of a resizable panel: a number is a percentage of the group, a `'<n>px'` string a
 * length in CSS pixels, converted with the group's measured size (`'232px'`).
 *
 * @type {number | `${number}px`}
 */
export type PanelSize = number | `${number}px`;
