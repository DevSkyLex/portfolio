import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  LOCALE_ID,
  computed,
  inject,
  signal,
  viewChildren,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import {
  lucideCircleAlert,
  lucideScale,
  lucideShield,
  lucideTriangleAlert,
} from '@ng-icons/lucide';
import {
  type AdminLegalDocument,
  AdminLegalStore,
  type AdminLegalStoreType,
  type LegalDocumentKind,
} from '@vfortin/content-web-data-access/admin';
import {
  AlertDescriptionDirective,
  AlertDirective,
  AlertTitleDirective,
  ButtonDirective,
  ConfirmDialogService,
  PAGE_HEADER_IMPORTS,
  SidebarTriggerComponent,
  SkeletonDirective,
  TabsContentDirective,
  TabsDirective,
  TabsListDirective,
  TabsTriggerDirective,
  ToastService,
} from '@vfortin/ui';
import { LEGAL_DOCUMENT_TEXTS } from '@internal/content-web-feature-admin/lib/constants/legal-document-texts.constants';
import type { LegalDocumentTexts } from '@internal/content-web-feature-admin/lib/models/legal-document-texts/legal-document-texts.interface';
import { LegalDocumentFormComponent } from '@internal/content-web-feature-admin/lib/ui/forms/legal-document-form/legal-document-form.component';
import type { LegalDocumentFormValues } from '@internal/content-web-feature-admin/lib/ui/forms/legal-document-form/models/legal-document-form-values.model';
import { withSiteRebuildNotice } from '@internal/content-web-feature-admin/lib/utils/site-rebuild/site-rebuild.utils';

/**
 * Component AdminLegalPageComponent
 * @class AdminLegalPageComponent
 *
 * @description
 * « Légal » page: the legal notice and the privacy policy, each in French and English, in the page
 * layout of « Sécurité » (D36 settings page revision). The page header carries the document tabs and a
 * meta line with the shown document's « Dernière mise à jour » (set by the service on each save, and
 * shown on the public page) and version; each tab panel holds that document's form, both staying
 * mounted so that switching keeps the edits. Saves with `If-Match` (Ctrl/Cmd+S saves the shown
 * document), toasts with the rebuild notice, keeps a conflict as an inline alert reloading that
 * document, and asks before leaving with unsaved changes.
 */
@Component({
  selector: 'content-admin-legal-page',
  imports: [
    AlertDescriptionDirective,
    AlertDirective,
    AlertTitleDirective,
    ButtonDirective,
    LegalDocumentFormComponent,
    NgIcon,
    PAGE_HEADER_IMPORTS,
    SidebarTriggerComponent,
    SkeletonDirective,
    TabsContentDirective,
    TabsDirective,
    TabsListDirective,
    TabsTriggerDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [AdminLegalStore],
  host: {
    class: 'flex min-h-dvh flex-col',
    '(window:keydown.control.s)': 'shortcut($event)',
    '(window:keydown.meta.s)': 'shortcut($event)',
    '(window:beforeunload)': 'beforeUnload($event)',
  },
  templateUrl: './admin-legal-page.component.html',
})
export class AdminLegalPageComponent {
  // #region Properties
  /**
   * Property store
   * @readonly
   *
   * @description
   * Page-scoped legal documents state and commands.
   *
   * @type {AdminLegalStoreType}
   */
  protected readonly store: AdminLegalStoreType = inject<AdminLegalStoreType>(AdminLegalStore);

  /**
   * Property kinds
   * @readonly
   *
   * @description
   * Documents, in tab order.
   *
   * @type {readonly LegalDocumentKind[]}
   */
  protected readonly kinds: readonly LegalDocumentKind[] = ['notice', 'privacy'];

  /**
   * Property texts
   * @readonly
   *
   * @description
   * Copy of each document.
   *
   * @type {Readonly<Record<LegalDocumentKind, LegalDocumentTexts>>}
   */
  protected readonly texts: Readonly<Record<LegalDocumentKind, LegalDocumentTexts>> =
    LEGAL_DOCUMENT_TEXTS;

  /**
   * Property tab
   * @readonly
   *
   * @description
   * Document tab shown.
   *
   * @type {WritableSignal<string | null>}
   */
  protected readonly tab: WritableSignal<string | null> = signal<string | null>('notice');

  /**
   * Property current
   * @readonly
   *
   * @description
   * Document of the shown tab, once read.
   *
   * @type {Signal<AdminLegalDocument | null>}
   */
  protected readonly current: Signal<AdminLegalDocument | null> =
    computed<AdminLegalDocument | null>(
      (): AdminLegalDocument | null =>
        this.store.documents()?.[this.tab() === 'privacy' ? 'privacy' : 'notice'] ?? null,
    );

  /**
   * Property values
   * @readonly
   *
   * @description
   * Form values of each document last read or saved, `null` before the read.
   *
   * @type {Signal<Readonly<Record<LegalDocumentKind, LegalDocumentFormValues>> | null>}
   */
  protected readonly values: Signal<Readonly<
    Record<LegalDocumentKind, LegalDocumentFormValues>
  > | null> = computed<Readonly<Record<LegalDocumentKind, LegalDocumentFormValues>> | null>(
    (): Readonly<Record<LegalDocumentKind, LegalDocumentFormValues>> | null => {
      const documents: Readonly<Record<LegalDocumentKind, AdminLegalDocument>> | null =
        this.store.documents();
      return documents
        ? {
            notice: { fr: documents.notice.body.fr, en: documents.notice.body.en },
            privacy: { fr: documents.privacy.body.fr, en: documents.privacy.body.en },
          }
        : null;
    },
  );

  /**
   * Property icons
   * @readonly
   *
   * @description
   * Lucide icons of the alerts and of the document tabs (the scale of the sidebar's « Légal » entry for
   * the legal notice, a shield for the privacy policy).
   */
  protected readonly icons: {
    readonly conflict: typeof lucideTriangleAlert;
    readonly error: typeof lucideCircleAlert;
    readonly notice: typeof lucideScale;
    readonly privacy: typeof lucideShield;
  } = {
    conflict: lucideTriangleAlert,
    error: lucideCircleAlert,
    notice: lucideScale,
    privacy: lucideShield,
  } as const;

  /**
   * Property forms
   * @readonly
   *
   * @description
   * Both document forms, in tab order, once read.
   *
   * @type {Signal<readonly LegalDocumentFormComponent[]>}
   */
  private readonly forms: Signal<readonly LegalDocumentFormComponent[]> =
    viewChildren<LegalDocumentFormComponent>(LegalDocumentFormComponent);

  /**
   * Property dirty
   * @readonly
   *
   * @description
   * Whether a document holds unsaved changes.
   *
   * @type {Signal<boolean>}
   */
  protected readonly dirty: Signal<boolean> = computed<boolean>((): boolean =>
    this.forms().some((form: LegalDocumentFormComponent): boolean => form.dirty()),
  );

  /**
   * Property confirmations
   * @readonly
   *
   * @description
   * Asks before leaving with unsaved changes.
   *
   * @type {ConfirmDialogService}
   */
  private readonly confirmations: ConfirmDialogService =
    inject<ConfirmDialogService>(ConfirmDialogService);

  /**
   * Property toasts
   * @readonly
   *
   * @description
   * Outcome of each save.
   *
   * @type {ToastService}
   */
  private readonly toasts: ToastService = inject<ToastService>(ToastService);

  /**
   * Property dates
   * @readonly
   *
   * @description
   * Writes a save date in the admin's locale (« 2 novembre 2026 », "November 2, 2026"), in Paris time
   * like the snapshot. `Intl` rather than Angular's `formatDate`, which takes a fixed offset instead of
   * the Paris time zone.
   *
   * @type {Intl.DateTimeFormat}
   */
  private readonly dates: Intl.DateTimeFormat = new Intl.DateTimeFormat(inject<string>(LOCALE_ID), {
    timeZone: 'Europe/Paris',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  // #endregion

  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Reads both documents, ignoring an answer arriving after the page left.
   */
  public constructor() {
    void this.store.load();
    inject<DestroyRef>(DestroyRef).onDestroy((): void => this.store.cancelRead());
  }
  // #endregion

  // #region Methods
  /**
   * Method canLeave
   *
   * @description
   * Blocks navigation during a save and asks before discarding unsaved changes.
   *
   * @returns {Promise<boolean>} Whether route deactivation is accepted.
   */
  public async canLeave(): Promise<boolean> {
    if (this.store.writing()) return false;
    if (!this.dirty()) return true;
    const accepted: boolean = await this.confirmations.confirm({
      title: $localize`:@@admin.legal.leave.title:Quitter sans enregistrer ?`,
      description: $localize`:@@admin.legal.leave.description:Les modifications des documents légaux seront perdues.`,
      confirmLabel: $localize`:@@admin.legal.leave.confirm:Quitter`,
      cancelLabel: $localize`:@@admin.legal.keepEditing:Continuer la modification`,
      tone: 'danger',
    });
    return accepted && !this.store.writing();
  }

  /**
   * Method beforeUnload
   *
   * @description
   * Requests the browser's exit warning while unsaved changes or a save need protection.
   *
   * @param {BeforeUnloadEvent} event - Document exit event.
   */
  protected beforeUnload(event: BeforeUnloadEvent): void {
    if (this.dirty() || this.store.writing()) {
      event.preventDefault();
      event.returnValue = '';
    }
  }

  /**
   * Method shortcut
   * @method shortcut
   *
   * @description
   * Saves the shown document on Ctrl+S / Cmd+S instead of the browser's "save page", when it holds
   * changes.
   *
   * @param {Event} event - Keyboard event.
   */
  protected shortcut(event: Event): void {
    event.preventDefault();
    const form: LegalDocumentFormComponent | undefined =
      this.forms()[this.tab() === 'privacy' ? 1 : 0];
    if (form?.dirty()) form.submit();
  }

  /**
   * Method updated
   * @method updated
   *
   * @description
   * Date of a document's last save, spelled out in the admin's locale (« 2 novembre 2026 »).
   *
   * @param {AdminLegalDocument} document - Document.
   *
   * @returns {string} Date.
   */
  protected updated(document: AdminLegalDocument): string {
    return this.dates.format(new Date(document.updatedAt));
  }

  /**
   * Method reload
   * @method reload
   *
   * @description
   * Reads a document again after a conflict, replacing its form.
   *
   * @param {LegalDocumentKind} kind - Document.
   *
   * @returns {Promise<void>} Completion after the read.
   */
  protected async reload(kind: LegalDocumentKind): Promise<void> {
    await this.store.reload(kind);
  }

  /**
   * Method retry
   * @method retry
   *
   * @description
   * Reads both documents again after a failed read.
   *
   * @returns {Promise<void>} Completion after the read.
   */
  protected async retry(): Promise<void> {
    await this.store.load();
  }

  /**
   * Method save
   * @method save
   *
   * @description
   * Saves a document with `If-Match`; the answer resets its form and a toast confirms or reports the
   * failure (a conflict is left to the inline alert, field errors stay under the documents).
   *
   * @param {LegalDocumentKind} kind - Document.
   * @param {LegalDocumentFormValues} values - Valid documents from the form.
   *
   * @returns {Promise<void>} Completion after the request.
   */
  protected async save(kind: LegalDocumentKind, values: LegalDocumentFormValues): Promise<void> {
    if (this.store.writing()) return;
    if (await this.store.save(kind, values)) {
      const name: string = this.texts[kind].tab;
      this.toasts.success(
        $localize`:@@admin.legal.toast.saved:« ${name}:document: » : modifications enregistrées.`,
        { description: withSiteRebuildNotice() },
      );
      return;
    }
    const error: { readonly message: string; readonly code: string | null } | null =
      this.store.writeError();
    if (!error || this.store.conflict()) return;
    // LEGAL_ERROR_CODES.incomplete: the browser imports no value from the contracts (D10).
    if (error.code === 'content.legal-document-incomplete') {
      this.toasts.error($localize`:@@admin.legal.toast.incomplete:Complétez les deux langues.`, {
        description: $localize`:@@admin.legal.toast.incompleteDescription:La page est publiée dès son enregistrement, en français et en anglais.`,
      });
      return;
    }
    this.toasts.error(error.message);
  }

  /**
   * Method fieldErrors
   * @method fieldErrors
   *
   * @description
   * Server field errors of the last save, for the form of the document it concerned.
   *
   * @param {LegalDocumentKind} kind - Document.
   *
   * @returns {readonly { readonly field: string; readonly message: string }[]} Field errors.
   */
  protected fieldErrors(
    kind: LegalDocumentKind,
  ): readonly { readonly field: string; readonly message: string }[] {
    return this.store.writeKind() === kind ? (this.store.writeError()?.fieldErrors ?? []) : [];
  }
  // #endregion
}
