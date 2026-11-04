/**
 * Constant INPUT_GROUP_CONTROL_CLASSES
 *
 * @description
 * Frameless control of an input group: the group draws the border, background, focus ring and
 * invalid state, the control fills the remaining width. Shared by `uiInputGroupInput` and by
 * `uiInput` placed in a `uiInputGroup` (directly or inside a catalogue control such as
 * `ui-autocomplete`).
 *
 * @type {string}
 */
export const INPUT_GROUP_CONTROL_CLASSES: string =
  'h-full min-w-0 flex-1 rounded-none border-0 bg-transparent px-4 text-fg placeholder:text-fg-faint ' +
  'outline-none focus-visible:outline-none disabled:cursor-not-allowed ' +
  'group-data-[size=lg]/input-group:px-5 group-data-[size=sm]/input-group:px-3';

/**
 * Constant INPUT_GROUP_TEXTAREA_CLASSES
 *
 * @description
 * Extra classes of a textarea control in an input group: its own height, with less padding in the
 * small group.
 *
 * @type {string}
 */
export const INPUT_GROUP_TEXTAREA_CLASSES: string =
  'min-h-24 w-full resize-none py-3 group-data-[size=sm]/input-group:py-2';
