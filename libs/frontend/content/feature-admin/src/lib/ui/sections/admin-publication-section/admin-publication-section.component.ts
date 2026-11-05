import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import {
  AdminPublicationStore,
  type AdminPublicationStatus,
  type AdminPublicationStoreType,
} from '@vfortin/content-web-data-access/admin';
import { ButtonDirective, ConfirmDialogService, ToastService } from '@vfortin/ui';

/** Explicit batch controls, shared by the content owner's administration pages. */
@Component({
  selector: 'content-admin-publication-section',
  imports: [ButtonDirective],
  providers: [AdminPublicationStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-publication-section.component.html',
})
export class AdminPublicationSectionComponent {
  protected readonly store: AdminPublicationStoreType =
    inject<AdminPublicationStoreType>(AdminPublicationStore);
  private readonly toasts: ToastService = inject<ToastService>(ToastService);
  private readonly confirmations: ConfirmDialogService =
    inject<ConfirmDialogService>(ConfirmDialogService);
  private readonly destroyRef: DestroyRef = inject<DestroyRef>(DestroyRef);

  public constructor() {
    void this.store.load();
    this.destroyRef.onDestroy((): void => this.store.cancelRead());
  }

  protected async change(action: 'start' | 'publish'): Promise<void> {
    if (this.store.loading() || this.store.writing()) return;
    if (action === 'publish') {
      await this.store.load();
      if (
        this.destroyRef.destroyed ||
        this.store.loadCallState().status !== 'success' ||
        !this.store.publication()?.batching
      )
        return;
      const confirmed: boolean = await this.confirmations.confirm({
        title: $localize`:@@admin.publication.confirm.title:Publier les modifications enregistrées ?`,
        description: $localize`:@@admin.publication.confirm.description:Tous les changements enregistrés dans les projets, le parcours, les informations et les documents légaux seront publiés ensemble. Les champs non enregistrés ne sont pas inclus.`,
        confirmLabel: $localize`:@@admin.publication.publish:Publier le groupe`,
      });
      if (!confirmed || this.destroyRef.destroyed) return;
    }
    const previousPending: boolean = this.store.publication()?.pendingChanges ?? false;
    const result: AdminPublicationStatus | null = await this.store.change(action);
    if (result === null || this.destroyRef.destroyed) return;
    this.toasts.success(
      action === 'start'
        ? $localize`:@@admin.publication.started:Publication groupée activée.`
        : previousPending
          ? $localize`:@@admin.publication.requested:Publication demandée. Le site sera mis à jour après la reconstruction.`
          : $localize`:@@admin.publication.closed:Publication groupée terminée sans modification.`,
    );
  }
}
