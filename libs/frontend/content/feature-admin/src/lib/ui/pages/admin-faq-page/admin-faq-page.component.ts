import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  viewChild,
  type Signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { lucideCircleAlert } from '@ng-icons/lucide';
import { type AdminFaqEntry, AdminFaqStore } from '@vfortin/content-web-data-access/admin';
import {
  AlertDescriptionDirective,
  AlertDirective,
  AlertTitleDirective,
  ButtonDirective,
  ConfirmDialogService,
  PAGE_HEADER_IMPORTS,
  SidebarTriggerComponent,
  ToastService,
  type SortableMove,
} from '@vfortin/ui';
import { FaqListDataviewComponent } from '@internal/content-web-feature-admin/lib/ui/dataviews/faq-list-dataview/faq-list-dataview.component';
import { withSiteRebuildNotice } from '@internal/content-web-feature-admin/lib/utils/site-rebuild/site-rebuild.utils';

/**
 * Component AdminFaqPageComponent
 * @class AdminFaqPageComponent
 *
 * @description
 * « FAQ » list route: loads the questions in their public order, offers « Nouvelle question » in the
 * page header (D43), stores each move of a row at once with the list version (the list shows the move
 * before the answer and restores the previous order on a refusal), deletes after a danger
 * confirmation (focus back on the row's menu button), and toasts each outcome with the site rebuild
 * notice. A version conflict reloads the list and warns; a failed load stays an inline alert offering
 * to retry. Copy is French source with English targets.
 */
@Component({
  selector: 'content-admin-faq-page',
  imports: [
    AlertDescriptionDirective,
    AlertDirective,
    AlertTitleDirective,
    ButtonDirective,
    FaqListDataviewComponent,
    NgIcon,
    PAGE_HEADER_IMPORTS,
    RouterLink,
    SidebarTriggerComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-auto flex-col' },
  providers: [AdminFaqStore],
  templateUrl: './admin-faq-page.component.html',
})
export class AdminFaqPageComponent {
  // #region Properties
  /**
   * Property store
   * @readonly
   *
   * @description
   * Page-scoped list state and commands.
   *
   * @type {InstanceType<typeof AdminFaqStore>}
   */
  protected readonly store: InstanceType<typeof AdminFaqStore> =
    inject<InstanceType<typeof AdminFaqStore>>(AdminFaqStore);

  /**
   * Property countNoun
   * @readonly
   *
   * @description
   * Noun read after the header count by screen readers, singular up to one in both locales.
   *
   * @type {Signal<string>}
   */
  protected readonly countNoun: Signal<string> = computed<string>((): string =>
    this.store.entries().length <= 1
      ? $localize`:@@admin.faq.one:question`
      : $localize`:@@admin.faq.many:questions`,
  );

  /**
   * Property loadFailed
   * @readonly
   *
   * @description
   * Whether the last load failed.
   *
   * @type {Signal<boolean>}
   */
  protected readonly loadFailed: Signal<boolean> = computed<boolean>(
    (): boolean => this.store.loadCallState().status === 'error',
  );

  /**
   * Property icons
   * @readonly
   *
   * @description
   * Lucide icon of the load alert.
   */
  protected readonly icons: { readonly error: typeof lucideCircleAlert } = {
    error: lucideCircleAlert,
  } as const;

  /**
   * Property dataview
   * @readonly
   *
   * @description
   * List, asked for a row's menu button to focus.
   *
   * @type {Signal<FaqListDataviewComponent | undefined>}
   */
  private readonly dataview: Signal<FaqListDataviewComponent | undefined> = viewChild<
    FaqListDataviewComponent | undefined
  >(FaqListDataviewComponent);

  /**
   * Property confirmations
   * @readonly
   *
   * @description
   * Asks before a deletion.
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
   * Outcome of each request, through the admin layout's toaster.
   *
   * @type {ToastService}
   */
  private readonly toasts: ToastService = inject<ToastService>(ToastService);
  // #endregion

  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Loads the list.
   */
  public constructor() {
    void this.store.load();
  }
  // #endregion

  // #region Methods
  /**
   * Method reload
   * @method reload
   *
   * @description
   * Loads the list again.
   *
   * @returns {Promise<void>} Completion after the load.
   */
  protected reload(): Promise<void> {
    return this.store.load();
  }

  /**
   * Method move
   * @method move
   *
   * @description
   * Stores a row move; a conflict reloads the list and warns, another failure is toasted.
   *
   * @param {SortableMove} move - Positions before and after the move.
   *
   * @returns {Promise<void>} Completion after the request.
   */
  protected async move(move: SortableMove): Promise<void> {
    if (await this.store.move(move.previousIndex, move.currentIndex)) {
      this.toasts.success($localize`:@@admin.faq.toast.moved:Ordre enregistré.`, {
        description: withSiteRebuildNotice(),
      });
    } else if (this.store.writeCallState().status === 'error') {
      await this.reportFailure();
    }
  }

  /**
   * Method remove
   * @method remove
   *
   * @description
   * Deletes a question once confirmed.
   *
   * @param {AdminFaqEntry} entry - Question to delete.
   *
   * @returns {Promise<void>} Completion after the request.
   */
  protected async remove(entry: AdminFaqEntry): Promise<void> {
    const confirmed: boolean = await this.confirmations.confirm({
      title: $localize`:@@admin.faq.confirm.delete.title:Supprimer « ${entry.question.fr}:question: » ?`,
      description: $localize`:@@admin.faq.confirm.delete.description:Elle disparaîtra du site public à la prochaine reconstruction (quelques minutes). Cette action est définitive.`,
      confirmLabel: $localize`:@@admin.faq.action.delete:Supprimer`,
      cancelLabel: $localize`:@@admin.faq.action.cancel:Annuler`,
      tone: 'danger',
      // The menu item that opened the dialog is gone: its row's menu button takes the focus back.
      restoreFocus: this.dataview()?.actionsTrigger(entry) ?? null,
    });
    if (!confirmed) return;
    if (await this.store.remove(entry)) {
      this.toasts.success(
        $localize`:@@admin.faq.toast.deleted:« ${entry.question.fr}:question: » supprimée.`,
        { description: withSiteRebuildNotice() },
      );
    } else {
      await this.reportFailure();
    }
  }

  /**
   * Method reportFailure
   * @method reportFailure
   *
   * @description
   * Reloads the list after a conflict and warns; toasts any other failure.
   *
   * @returns {Promise<void>} Completion after the reload.
   */
  private async reportFailure(): Promise<void> {
    if (this.store.conflict()) {
      this.toasts.warning(
        $localize`:@@admin.faq.toast.listChanged:La liste a été modifiée entre-temps : elle a été rechargée, recommencez.`,
      );
      await this.reload();
      this.store.resetWriteState();
      return;
    }
    const error: { readonly message: string } | null = this.store.writeError();
    if (error) this.toasts.error(error.message);
  }
  // #endregion
}
