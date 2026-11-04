import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';

/**
 * Service ModifierKeyService
 * @class ModifierKeyService
 *
 * @description
 * Names the platform's shortcut modifier for key caps: `⌘` on macOS and iOS, `Ctrl` elsewhere, so a
 * shortcut reads "Ctrl K" or "⌘ K" rather than both. The platform is read in the browser only;
 * prerendering and unknown platforms get `Ctrl`, so a hydrated page should show the caps after its
 * first render (the client-rendered administration reads them at once). `caps` and `ariaKeys` spell a
 * whole combination for the key caps and for `aria-keyshortcuts`.
 */
@Injectable({ providedIn: 'root' })
export class ModifierKeyService {
  // #region Properties
  /**
   * Property apple
   * @readonly
   *
   * @description
   * Whether the browser runs on an Apple platform, whose shortcuts use the Command key.
   *
   * @type {boolean}
   */
  public readonly apple: boolean = ((): boolean => {
    if (!isPlatformBrowser(inject<object>(PLATFORM_ID))) return false;
    const navigator:
      (Navigator & { readonly userAgentData?: { readonly platform?: string } }) | undefined =
      inject<Document>(DOCUMENT).defaultView?.navigator;
    const platform: string = navigator?.userAgentData?.platform || navigator?.platform || '';
    return /mac|iphone|ipad|ipod/i.test(platform);
  })();

  /**
   * Property key
   * @readonly
   *
   * @description
   * Key cap of the modifier: `⌘` or `Ctrl`.
   *
   * @type {'⌘' | 'Ctrl'}
   */
  public readonly key: '⌘' | 'Ctrl' = this.apple ? '⌘' : 'Ctrl';
  // #endregion

  // #region Methods
  /**
   * Method caps
   * @method caps
   *
   * @description
   * Key caps of a shortcut for `tooltipShortcut` or `uiKbd`, one entry per key. `Mod` names the
   * platform modifier (`Ctrl` or `⌘`); on Apple platforms `Alt` becomes `⌥` and `Shift` (or the French
   * cap `Maj`) becomes `⇧`; every other key is kept as written, so `['Mod', 'Maj', '8']` reads
   * « Ctrl Maj 8 » on Windows and « ⌘ ⇧ 8 » on a Mac.
   *
   * @param {readonly string[]} keys - Keys of the combination, modifiers first.
   * @returns {readonly string[]} Caps to display.
   */
  public caps(keys: readonly string[]): readonly string[] {
    return keys.map((key: string): string => {
      if (key === 'Mod') return this.key;
      if (!this.apple) return key;
      if (key === 'Alt') return '⌥';
      return key === 'Shift' || key === 'Maj' ? '⇧' : key;
    });
  }

  /**
   * Method ariaKeys
   * @method ariaKeys
   *
   * @description
   * `aria-keyshortcuts` value of the same combination: `Mod` becomes `Meta` on Apple platforms and
   * `Control` elsewhere, `Maj` becomes `Shift`, and the keys are joined with `+`
   * (`['Mod', 'Alt', '2']` → `Control+Alt+2` or `Meta+Alt+2`).
   *
   * @param {readonly string[]} keys - Keys of the combination, modifiers first.
   * @returns {string} Value for the trigger's `aria-keyshortcuts` attribute.
   */
  public ariaKeys(keys: readonly string[]): string {
    return keys
      .map((key: string): string => {
        if (key === 'Mod') return this.apple ? 'Meta' : 'Control';
        return key === 'Maj' ? 'Shift' : key;
      })
      .join('+');
  }
  // #endregion
}
