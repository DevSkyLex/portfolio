import {
  type WritableSignal,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  LOCALE_ID,
  afterNextRender,
  inject,
  input,
  signal,
  type InputSignal,
} from '@angular/core';
import {
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
import { NgIcon } from '@ng-icons/core';
import { lucideCheck } from '@ng-icons/lucide';
import { CONTACT_DECO } from '@internal/contact-web-feature/lib/ui/sections/contact-section/constants/contact-deco.constants';
import {
  CONTACT_LINK_CLASS,
  CONTACT_REVEAL_CLASS,
} from '@internal/contact-web-feature/lib/ui/sections/contact-section/constants/contact-section-classes.constants';
import { ContactFormComponent } from '@internal/contact-web-feature/lib/ui/forms/contact-form/contact-form.component';
import type { ContactLink } from '@internal/contact-web-feature/lib/ui/sections/contact-section/models/contact-link.interface';
import { ContactLinkIconComponent } from '@internal/contact-web-feature/lib/ui/sections/contact-section/components/contact-link-icon/contact-link-icon.component';
import type { ContactFormValues } from '@internal/contact-web-feature/lib/ui/forms/contact-form/models/contact-form-values.model';

/**
 * Component ContactSectionComponent
 * @class ContactSectionComponent
 *
 * @description
 * Home contact section: contact details beside the contact form. A sent message replaces the form
 * with a confirmation, which can bring back a blank form; failures stay in toasts. It owns a scoped store, so pending, success and failure state is isolated to this
 * section instance; the shell defers and hydrates it on viewport (D16, D22).
 */
@Component({
  selector: 'contact-section',
  imports: [
    ButtonDirective,
    ContactLinkIconComponent,
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
   * Property links
   * @readonly
   *
   * @description
   * E-mail and profile links shown beside the form, in display order; the shell passes the
   * snapshot's.
   *
   * @type {InputSignal<readonly ContactLink[]>}
   */
  public readonly links: InputSignal<readonly ContactLink[]> = input<readonly ContactLink[]>([]);

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
   * Property sent
   * @readonly
   *
   * @description
   * First name and address of the last sent message while its confirmation replaces the form,
   * `null` while the form is shown.
   *
   * @type {WritableSignal<{ readonly name: string; readonly email: string } | null>}
   */
  protected readonly sent: WritableSignal<{
    readonly name: string;
    readonly email: string;
  } | null> = signal<{ readonly name: string; readonly email: string } | null>(null);

  /**
   * Property formHeight
   * @readonly
   *
   * @description
   * Height in pixels of the form when it was sent: the confirmation keeps it, so the page below does
   * not jump up. `null` before the first sending.
   *
   * @type {WritableSignal<number | null>}
   */
  protected readonly formHeight: WritableSignal<number | null> = signal<number | null>(null);

  /**
   * Property icons
   * @readonly
   *
   * @description
   * Icon of the confirmation panel.
   *
   * @type {{ readonly sent: typeof lucideCheck }}
   */
  protected readonly icons: { readonly sent: typeof lucideCheck } = { sent: lucideCheck } as const;

  /**
   * Property generation
   * @readonly
   *
   * @description
   * Instance number of the form: incremented when the visitor writes another message, so that a blank
   * form replaces the sent one.
   *
   * @type {WritableSignal<number>}
   */
  protected readonly generation: WritableSignal<number> = signal<number>(0);

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

  // #endregion

  // #region Methods
  /**
   * Method send
   * @method send
   *
   * @description
   * Sends the form values in the page locale and returns server field errors to the form. Once sent,
   * a confirmation replaces the form and takes the focus, so assistive technologies announce it.
   *
   * @param {ContactFormValues} values - Valid values emitted by the form.
   *
   * @returns {Promise<void>} Resolves once the request completes.
   */
  protected async send(values: ContactFormValues): Promise<void> {
    this.serverErrors.set(await this.store.send({ ...values, locale: this.locale }));
    if (!this.store.sent()) return;
    const name: string = values.name.trim().split(/\s+/)[0] ?? '';
    this.formHeight.set(
      this.host.nativeElement.querySelector<HTMLElement>('contact-form form')?.offsetHeight ?? null,
    );
    this.sent.set({ name, email: this.store.sentTo() ?? values.email });
    this.store.reset();
    this.serverErrors.set([]);
    this.focus('#contact-sent-title');
  }

  /**
   * Method again
   * @method again
   *
   * @description
   * Brings back a blank form in place of the confirmation, focused on its first field.
   */
  protected again(): void {
    this.sent.set(null);
    this.generation.update((n: number): number => n + 1);
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
