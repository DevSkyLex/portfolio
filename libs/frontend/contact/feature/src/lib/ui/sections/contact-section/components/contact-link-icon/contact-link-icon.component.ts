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
import type { ContactLinkKind } from '@internal/contact-web-feature/lib/ui/sections/contact-section/models/contact-link-kind.type';

/**
 * Constant LINK_ICONS
 *
 * @description
 * Icon of each link kind; the brand logos lose their `<title>`, the label beside them naming them.
 *
 * @type {Readonly<Record<ContactLinkKind, string>>}
 */
const LINK_ICONS: Readonly<Record<ContactLinkKind, string>> = {
  email: lucideMail,
  github: simpleGithub.replace(/<title>[^<]*<\/title>/, ''),
  linkedin: bootstrapLinkedin,
  malt: simpleMalt.replace(/<title>[^<]*<\/title>/, ''),
  website: lucideGlobe,
};

/**
 * Class ContactLinkIconComponent
 * @class ContactLinkIconComponent
 *
 * @description
 * Decorative icon of a contact link. Rendered only inside a `@defer` block of the section: the brand
 * packs are imported here alone, so that the technology logos sharing their module stay out of the
 * initial bundle (D53).
 */
@Component({
  selector: 'contact-link-icon',
  imports: [NgIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex', 'aria-hidden': 'true' },
  template: `
    <ng-icon
      [svg]="icon()"
      size="100%"
      [strokeWidth]="kind() === 'email' || kind() === 'website' ? 2.25 : undefined"
    />
  `,
})
export class ContactLinkIconComponent {
  // #region Properties
  /**
   * Property kind
   * @readonly
   *
   * @description
   * Kind of the contact link whose icon is drawn.
   *
   * @type {InputSignal<ContactLinkKind>}
   */
  public readonly kind: InputSignal<ContactLinkKind> = input.required<ContactLinkKind>();

  /**
   * Property icon
   * @readonly
   *
   * @description
   * SVG of the link kind.
   *
   * @type {Signal<string>}
   */
  protected readonly icon: Signal<string> = computed<string>((): string => LINK_ICONS[this.kind()]);
  // #endregion
}
