import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  type InputSignal,
  type Signal,
} from '@angular/core';
import { bootstrapLinkedin } from '@ng-icons/bootstrap-icons';
import { NgIcon } from '@ng-icons/core';
import { lucideGlobe, lucideMail } from '@ng-icons/lucide';
import { simpleGithub, simpleMalt } from '@ng-icons/simple-icons';

/**
 * Constant PROFILE_ICONS
 *
 * @description
 * Icon of each profile link kind, the brand logos without their `<title>` (the label beside them
 * names them).
 *
 * @type {Readonly<Record<string, string>>}
 */
const PROFILE_ICONS: Readonly<Record<string, string>> = {
  email: lucideMail,
  github: simpleGithub.replace(/<title>[^<]*<\/title>/, ''),
  linkedin: bootstrapLinkedin,
  malt: simpleMalt.replace(/<title>[^<]*<\/title>/, ''),
  website: lucideGlobe,
};

/**
 * Class ProfileIconComponent
 * @class ProfileIconComponent
 *
 * @description
 * Decorative icon of a profile link in the menu. Rendered only inside a `@defer` block of the layout:
 * the brand packs are imported here alone, so that the technology logos sharing their module stay out
 * of the initial bundle (D53).
 */
@Component({
  selector: 'app-profile-icon',
  imports: [NgIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex', 'aria-hidden': 'true' },
  template: `
    @if (icon(); as svg) {
      <ng-icon [svg]="svg" size="100%" [strokeWidth]="kind() === 'website' ? 1.5 : undefined" />
    }
  `,
})
export class ProfileIconComponent {
  // #region Properties
  /**
   * Property kind
   * @readonly
   *
   * @description
   * Profile link kind (`email`, `github`, `linkedin`, `malt`, `website`).
   *
   * @type {InputSignal<string>}
   */
  public readonly kind: InputSignal<string> = input.required<string>();

  /**
   * Property icon
   * @readonly
   *
   * @description
   * SVG of the kind, undefined for a kind without icon.
   *
   * @type {Signal<string | undefined>}
   */
  protected readonly icon: Signal<string | undefined> = computed<string | undefined>(
    (): string | undefined => PROFILE_ICONS[this.kind()],
  );
  // #endregion
}
