import { DOCUMENT } from '@angular/common';
import {
  type ElementRef,
  type Signal,
  type TemplateRef,
  type WritableSignal,
  ChangeDetectionStrategy,
  Component,
  Injector,
  afterNextRender,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  ButtonDirective,
  DialogDescriptionDirective,
  DialogFooterDirective,
  DialogHeaderDirective,
  type DialogRef,
  DialogService,
  DialogTitleDirective,
  SwitchDirective,
} from '@vfortin/ui';
import { ConsentService } from '@internal/web-shell/lib/consent/consent.service';

/**
 * Component ConsentBannerComponent
 * @class ConsentBannerComponent
 *
 * @description
 * Cookie banner and preferences dialog of the public site (D48). The layout loads it in a deferred
 * block once the stored choice is read in the browser, so it is never in the prerendered HTML and
 * shifts nothing (fixed position). The banner is a labelled, non-modal region placed first after the
 * skip link: « Tout refuser » and « Tout accepter » have the same weight, « Personnaliser » opens a
 * modal dialog (focus trapped and restored) with the single purpose off unless accepted. When a choice
 * removes the control that had focus, focus moves to the main content.
 */
@Component({
  selector: 'app-consent-banner',
  imports: [
    ButtonDirective,
    DialogDescriptionDirective,
    DialogFooterDirective,
    DialogHeaderDirective,
    DialogTitleDirective,
    RouterLink,
    SwitchDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './consent-banner.component.html',
})
export class ConsentBannerComponent {
  // #region Properties
  /**
   * Property consent
   * @readonly
   *
   * @description
   * Visitor's choice and the banner state.
   *
   * @type {ConsentService}
   */
  protected readonly consent: ConsentService = inject<ConsentService>(ConsentService);

  /**
   * Property analytics
   * @readonly
   *
   * @description
   * State of the « Mesure d'audience » switch in the dialog, off unless already accepted.
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly analytics: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property preferences
   * @readonly
   *
   * @description
   * Template of the preferences dialog.
   *
   * @type {Signal<TemplateRef<unknown>>}
   */
  private readonly preferences: Signal<TemplateRef<unknown>> =
    viewChild.required<TemplateRef<unknown>>('preferences');

  /**
   * Property banner
   * @readonly
   *
   * @description
   * Banner region, absent once a choice is made.
   *
   * @type {Signal<ElementRef<HTMLElement> | undefined>}
   */
  private readonly banner: Signal<ElementRef<HTMLElement> | undefined> =
    viewChild<ElementRef<HTMLElement>>('banner');

  /**
   * Property dialogs
   * @readonly
   *
   * @description
   * Catalogue dialog service.
   *
   * @type {DialogService}
   */
  private readonly dialogs: DialogService = inject<DialogService>(DialogService);

  /**
   * Property document
   * @readonly
   *
   * @description
   * Document holding the focus and the main content.
   *
   * @type {Document}
   */
  private readonly document: Document = inject<Document>(DOCUMENT);

  /**
   * Property injector
   * @readonly
   *
   * @description
   * Injector of the render hook that restores a lost focus.
   *
   * @type {Injector}
   */
  private readonly injector: Injector = inject<Injector>(Injector);

  /**
   * Property dialog
   *
   * @description
   * Open preferences dialog, `null` when closed.
   *
   * @type {DialogRef<unknown> | null}
   */
  private dialog: DialogRef<unknown> | null = null;
  // #endregion

  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Opens the preferences for every request counted by the consent service, including the one that
   * loaded this component (« Gérer les cookies »).
   */
  public constructor() {
    let handled: number = 0;
    effect((): void => {
      const requests: number = this.consent.preferencesRequests();
      if (requests > handled) {
        handled = requests;
        untracked((): void => this.openPreferences());
      }
    });
  }
  // #endregion

  // #region Methods
  /**
   * Method choose
   * @method choose
   *
   * @description
   * Applies « Tout accepter » or « Tout refuser », from the banner or the dialog, then closes the
   * dialog.
   *
   * @param {boolean} analytics - Whether the audience measurement is accepted.
   * @returns {void}
   */
  protected choose(analytics: boolean): void {
    this.apply(analytics);
  }

  /**
   * Method save
   * @method save
   *
   * @description
   * Applies the dialog's switch (« Enregistrer mes choix »).
   *
   * @returns {void}
   */
  protected save(): void {
    this.apply(this.analytics());
  }

  /**
   * Method customize
   * @method customize
   *
   * @description
   * Opens the preferences from the banner.
   *
   * @returns {void}
   */
  protected customize(): void {
    this.consent.openPreferences();
  }

  /**
   * Method apply
   * @method apply
   *
   * @description
   * Stores the choice, closes the dialog and, when the banner that held the focus (directly or as the
   * dialog's return target) disappears, moves the focus to the main content.
   *
   * @param {boolean} analytics - Whether the audience measurement is accepted.
   * @returns {void}
   */
  private apply(analytics: boolean): void {
    const banner: HTMLElement | undefined = this.banner()?.nativeElement;
    const active: Element | null = this.document.activeElement;
    const focusInBanner: boolean =
      banner !== undefined &&
      (this.dialog !== null || (active !== null && banner.contains(active)));
    this.consent.decide(analytics);
    this.dialog?.close();
    if (!focusInBanner) return;
    afterNextRender(
      {
        write: (): void => {
          const current: Element | null = this.document.activeElement;
          if (current === null || current === this.document.body || !current.isConnected) {
            this.document.getElementById('content')?.focus({ preventScroll: true });
          }
        },
      },
      { injector: this.injector },
    );
  }

  /**
   * Method openPreferences
   * @method openPreferences
   *
   * @description
   * Opens the preferences dialog unless it is open, its switch showing the current choice.
   *
   * @returns {void}
   */
  private openPreferences(): void {
    if (this.dialog !== null) return;
    this.analytics.set(this.consent.analyticsGranted());
    const dialog: DialogRef<unknown> = this.dialogs.open(this.preferences(), { size: 'md' });
    this.dialog = dialog;
    dialog.closed.subscribe((): void => {
      if (this.dialog === dialog) this.dialog = null;
    });
  }
  // #endregion
}
