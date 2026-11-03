import {
  type Signal,
  type WritableSignal,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  LOCALE_ID,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { bootstrapLinkedin } from '@ng-icons/bootstrap-icons';
import { lucideCheck, lucideMail } from '@ng-icons/lucide';
import { simpleGithub } from '@ng-icons/simple-icons';
import {
  CONTACT_LINKS,
  ContactFormStore,
  type ContactFormStoreType,
  type ContactRequest,
  type ServerFieldError,
} from '@vfortin/contact-web-data-access';
import {
  ButtonDirective,
  DecoComponent,
  RevealDirective,
  SECTION_FX_CONTENT,
  SectionFxDirective,
  SectionHeadingComponent,
} from '@vfortin/ui';
import { CONTACT_DECO } from '@internal/contact-web-feature/lib/ui/sections/contact-section/constants/contact-deco.constants';
import {
  CONTACT_LINK_CLASS,
  CONTACT_REVEAL_CLASS,
} from '@internal/contact-web-feature/lib/ui/sections/contact-section/constants/contact-section-classes.constants';
import { ContactFormComponent } from '@internal/contact-web-feature/lib/ui/forms/contact-form/contact-form.component';
import type { ContactFormValues } from '@internal/contact-web-feature/lib/ui/forms/contact-form/models/contact-form-values.model';

/**
 * Component ContactSectionComponent
 * @class ContactSectionComponent
 *
 * @description
 * Home contact section: contact details beside the contact form, then the confirmation once the
 * message is sent. It owns a scoped store, so pending, success and failure state is isolated to this
 * section instance; the shell defers and hydrates it on viewport (D16, D22).
 */
@Component({
  selector: 'contact-section',
  imports: [
    ButtonDirective,
    ContactFormComponent,
    DecoComponent,
    NgIcon,
    RevealDirective,
    SectionFxDirective,
    SectionHeadingComponent,
  ],
  templateUrl: './contact-section.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ContactFormStore],
})
export class ContactSectionComponent {
  // #region Properties
  /**
   * Property store
   * @readonly
   *
   * @description
   * Component-scoped submission store used to send messages and expose confirmation state.
   *
   * @type {ContactFormStoreType}
   */
  protected readonly store: ContactFormStoreType = inject<ContactFormStoreType>(ContactFormStore);

  /**
   * Property host
   * @readonly
   *
   * @description
   * Section host element used to locate and focus elements after rendering.
   *
   * @type {ElementRef<HTMLElement>}
   */
  private readonly host: ElementRef<HTMLElement> = inject<ElementRef<HTMLElement>>(ElementRef);

  /**
   * Property injector
   * @readonly
   *
   * @description
   * Current injector passed to `afterNextRender` for safe focus scheduling.
   *
   * @type {Injector}
   */
  private readonly injector: Injector = inject<Injector>(Injector);

  /**
   * Property locale
   * @readonly
   *
   * @description
   * Contact request locale normalized from Angular's active locale identifier.
   *
   * @type {ContactRequest['locale']}
   */
  private readonly locale: ContactRequest['locale'] = inject<string>(LOCALE_ID).startsWith('en')
    ? 'en'
    : 'fr';

  /**
   * Property deco
   * @readonly
   *
   * @description
   * Decorative glyphs displayed around the section content.
   *
   * @type {typeof CONTACT_DECO}
   */
  protected readonly deco: typeof CONTACT_DECO = CONTACT_DECO;

  /**
   * Property links
   * @readonly
   *
   * @description
   * Email and profile destinations displayed beside the contact form.
   *
   * @type {typeof CONTACT_LINKS}
   */
  protected readonly links: typeof CONTACT_LINKS = CONTACT_LINKS;

  /**
   * Property icons
   * @readonly
   *
   * @description
   * Icons of the contact links and of the confirmation.
   */
  protected readonly icons: {
    readonly mail: typeof lucideMail;
    readonly github: string;
    readonly linkedin: typeof bootstrapLinkedin;
    readonly check: typeof lucideCheck;
  } = {
    mail: lucideMail,
    github: simpleGithub.replace(/<title>[^<]*<\/title>/, ''),
    linkedin: bootstrapLinkedin,
    check: lucideCheck,
  } as const;

  /**
   * Property reveal
   * @readonly
   *
   * @description
   * Entrance transition classes of the two columns.
   *
   * @type {string}
   */
  protected readonly reveal: string = CONTACT_REVEAL_CLASS;

  /**
   * Property link
   * @readonly
   *
   * @description
   * Classes of the contact and profile links.
   *
   * @type {string}
   */
  protected readonly link: string = CONTACT_LINK_CLASS;

  /**
   * Property sectionFx
   * @readonly
   *
   * @description
   * Shared section effect configuration consumed by the template directive.
   *
   * @type {typeof SECTION_FX_CONTENT}
   */
  protected readonly sectionFx: typeof SECTION_FX_CONTENT = SECTION_FX_CONTENT;

  /**
   * Property serverErrors
   * @readonly
   *
   * @description
   * Field errors returned for the last submission, handed back to the form.
   *
   * @type {WritableSignal<readonly ServerFieldError[]>}
   */
  protected readonly serverErrors: WritableSignal<readonly ServerFieldError[]> = signal<
    readonly ServerFieldError[]
  >([]);

  /**
   * Property sentName
   * @readonly
   *
   * @description
   * Name of the last submitted message, used in the confirmation copy.
   *
   * @type {WritableSignal<string>}
   */
  private readonly sentName: WritableSignal<string> = signal<string>('');

  /**
   * Property firstName
   * @readonly
   *
   * @description
   * First whitespace-delimited part of the sent name, used in the confirmation copy.
   *
   * @type {Signal<string>}
   */
  protected readonly firstName: Signal<string> = computed<string>(
    () => this.sentName().trim().split(/\s+/)[0] ?? '',
  );
  // #endregion

  // #region Methods
  /**
   * Method send
   * @method send
   *
   * @description
   * Sends the form values in the page locale, returns server field errors to the form and moves the
   * focus to the confirmation once the form disappears.
   *
   * @param {ContactFormValues} values - Valid values emitted by the form.
   *
   * @returns {Promise<void>} Resolves once the request completes.
   */
  protected async send(values: ContactFormValues): Promise<void> {
    this.sentName.set(values.name);
    this.serverErrors.set(await this.store.send({ ...values, locale: this.locale }));

    // The form disappears: focus moves to the confirmation, otherwise it would fall back to the page.
    if (this.store.sent()) {
      this.focus('#contact-sent');
    }
  }

  /**
   * Method writeAnother
   * @method writeAnother
   *
   * @description
   * Clears the submission state, which brings back a blank form, and focuses its name field.
   */
  protected writeAnother(): void {
    this.store.reset();
    this.serverErrors.set([]);
    this.focus('#contact-name');
  }

  /**
   * Method focus
   * @method focus
   *
   * @description
   * Schedules focus on the first matching section element after Angular renders the current state.
   *
   * @param {string} selector - CSS selector for the target within the section host.
   */
  private focus(selector: string): void {
    afterNextRender(() => this.host.nativeElement.querySelector<HTMLElement>(selector)?.focus(), {
      injector: this.injector,
    });
  }
  // #endregion
}
