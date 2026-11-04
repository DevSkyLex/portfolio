/**
 * Constant dataTableInteractiveSelector
 *
 * @description
 * Elements of a row that own their click: a click inside one of them never activates the row, so that
 * links, buttons, menus and checkboxes keep their behaviour.
 *
 * @type {string}
 */
export const dataTableInteractiveSelector: string =
  'a, button, input, select, textarea, label, summary, [role="button"], [role="menuitem"], [role="checkbox"], [contenteditable="true"], [data-row-activation="ignore"]';
