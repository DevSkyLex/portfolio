import { InjectionToken } from '@angular/core';

/**
 * Constant INPUT_GROUP_HOST
 *
 * @description
 * Provided by `uiInputGroup`: a `uiInput` (directly, or inside a catalogue control such as
 * `ui-autocomplete`) that finds it becomes the frameless group control. A token rather than the
 * group directive itself, so the public pages that use `uiInput` do not reach the input group.
 *
 * @type {InjectionToken<true>}
 */
export const INPUT_GROUP_HOST: InjectionToken<true> = new InjectionToken<true>('INPUT_GROUP_HOST');
