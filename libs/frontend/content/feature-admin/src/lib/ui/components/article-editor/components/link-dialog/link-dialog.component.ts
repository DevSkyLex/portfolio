import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  type WritableSignal,
} from '@angular/core';
import { FormField, form, validate, type FieldState, type FieldTree } from '@angular/forms/signals';
import {
  ButtonDirective,
  DIALOG_DATA,
  DialogCloseDirective,
  DialogFooterDirective,
  DialogHeaderDirective,
  DialogRef,
  DialogTitleDirective,
  FieldComponent,
  InputDirective,
  KbdHintComponent,
} from '@vfortin/ui';
import type { LinkDialogData } from '@internal/content-web-feature-admin/lib/ui/components/article-editor/models/link-dialog-data.interface';
import type { LinkDialogResult } from '@internal/content-web-feature-admin/lib/ui/components/article-editor/models/link-dialog-result.type';
import { isArticleHref } from '@internal/content-web-feature-admin/lib/ui/components/article-editor/utils/article-href/article-href.utils';

/**
 * Component LinkDialogComponent
 * @class LinkDialogComponent
 *
 * @description
 * Dialog adding or changing the link of the editor selection, limited to the `https://` and `mailto:`
 * targets of the article contract (D40); an existing link can be removed. It closes with the trimmed
 * target, with `'remove'`, or with nothing when cancelled.
 */
@Component({
  selector: 'content-link-dialog',
  imports: [
    ButtonDirective,
    DialogCloseDirective,
    DialogFooterDirective,
    DialogHeaderDirective,
    DialogTitleDirective,
    FieldComponent,
    FormField,
    InputDirective,
    KbdHintComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  templateUrl: './link-dialog.component.html',
})
export class LinkDialogComponent {
  // #region Properties
  /**
   * Property data
   * @readonly
   *
   * @description
   * Link opened in the dialog.
   *
   * @type {LinkDialogData}
   */
  protected readonly data: LinkDialogData = inject<LinkDialogData>(DIALOG_DATA);

  /**
   * Property title
   * @readonly
   *
   * @description
   * Title of the dialog: changing an existing link, or adding one.
   *
   * @type {string}
   */
  protected readonly title: string = this.data.removable
    ? $localize`:@@admin.article.linkDialog.editTitle:Modifier le lien`
    : $localize`:@@admin.article.linkDialog.addTitle:Ajouter un lien`;

  /**
   * Property escapeKey
   * @readonly
   *
   * @description
   * Key cap of Escape in the footer hint, as the admin's keyboard names it.
   *
   * @type {string}
   */
  protected readonly escapeKey: string = $localize`:@@admin.article.dialog.escapeKey:Échap`;

  /**
   * Property dialogRef
   * @readonly
   *
   * @description
   * Reference closed with the answer.
   *
   * @type {DialogRef<LinkDialogResult>}
   */
  private readonly dialogRef: DialogRef<LinkDialogResult> =
    inject<DialogRef<LinkDialogResult>>(DialogRef);

  /**
   * Property model
   * @readonly
   *
   * @description
   * Target being edited.
   *
   * @type {WritableSignal<{ href: string }>}
   */
  private readonly model: WritableSignal<{ href: string }> = signal<{ href: string }>({
    href: this.data.href,
  });

  /**
   * Property link
   * @readonly
   *
   * @description
   * Signal Form requiring an `https://` or `mailto:` target.
   *
   * @type {FieldTree<{ href: string }>}
   */
  protected readonly link: FieldTree<{ href: string }, string | number, 'writable'> = form(
    this.model,
    (path): void => {
      validate(path.href, ({ value }): { kind: string; message: string } | null =>
        isArticleHref(value().trim())
          ? null
          : {
              kind: 'href',
              message: $localize`:@@admin.article.linkDialog.hrefError:Saisissez une adresse en https:// ou mailto:.`,
            },
      );
    },
  );
  // #endregion

  // #region Methods
  /**
   * Method error
   *
   * @description
   * Message of the target once touched.
   *
   * @returns {string | null} The message, or `null` while valid or untouched.
   */
  protected error(): string | null {
    const state: FieldState<string, string | number> = this.link.href();
    return state.touched() ? (state.errors()[0]?.message ?? null) : null;
  }

  /**
   * Method remove
   *
   * @description
   * Closes with the removal of the existing link.
   */
  protected remove(): void {
    this.dialogRef.close('remove');
  }

  /**
   * Method onSubmit
   *
   * @description
   * Closes with the trimmed target when it is valid, otherwise shows its error.
   *
   * @param {Event} event - Submit event of the dialog form.
   */
  protected onSubmit(event: Event): void {
    event.preventDefault();
    if (this.link().invalid()) {
      this.link().markAsTouched();
      return;
    }
    this.dialogRef.close({ href: this.model().href.trim() });
  }
  // #endregion
}
