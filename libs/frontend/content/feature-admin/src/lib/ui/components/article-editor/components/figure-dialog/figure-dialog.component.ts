import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  type WritableSignal,
} from '@angular/core';
import { FormField, form, validate, type FieldTree } from '@angular/forms/signals';
import {
  ButtonDirective,
  DIALOG_DATA,
  DialogCloseDirective,
  DialogDescriptionDirective,
  DialogFooterDirective,
  DialogHeaderDirective,
  DialogRef,
  DialogTitleDirective,
  FieldComponent,
  InputDirective,
  KbdHintComponent,
} from '@vfortin/ui';
import type { FigureDialogData } from '@internal/content-web-feature-admin/lib/ui/components/article-editor/models/figure-dialog-data.interface';
import type { FigureTexts } from '@internal/content-web-feature-admin/lib/ui/components/article-editor/models/figure-texts.interface';

/**
 * Component FigureDialogComponent
 * @class FigureDialogComponent
 *
 * @description
 * Dialog editing the alternative text and the caption of an article figure, opened from the editor
 * toolbar or by double-clicking the figure; it closes with the trimmed texts, or with nothing when
 * cancelled. The alternative text may stay empty in a draft, which the form then reports.
 */
@Component({
  selector: 'content-figure-dialog',
  imports: [
    ButtonDirective,
    DialogCloseDirective,
    DialogDescriptionDirective,
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
  templateUrl: './figure-dialog.component.html',
})
export class FigureDialogComponent {
  // #region Properties
  /**
   * Property data
   * @readonly
   *
   * @description
   * Figure opened in the dialog.
   *
   * @type {FigureDialogData}
   */
  protected readonly data: FigureDialogData = inject<FigureDialogData>(DIALOG_DATA);

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
   * Reference closed with the edited texts.
   *
   * @type {DialogRef<FigureTexts>}
   */
  private readonly dialogRef: DialogRef<FigureTexts> = inject<DialogRef<FigureTexts>>(DialogRef);

  /**
   * Property model
   * @readonly
   *
   * @description
   * Texts being edited.
   *
   * @type {WritableSignal<FigureTexts>}
   */
  private readonly model: WritableSignal<FigureTexts> = signal<FigureTexts>({
    alt: this.data.alt,
    caption: this.data.caption,
  });

  /**
   * Property texts
   * @readonly
   *
   * @description
   * Signal Form bounding both texts like the contract (300 and 500 characters).
   *
   * @type {FieldTree<FigureTexts>}
   */
  protected readonly texts: FieldTree<FigureTexts, string | number, 'writable'> = form(
    this.model,
    (path): void => {
      validate(path.alt, ({ value }): { kind: string; message: string } | null =>
        value().trim().length > 300 ? this.tooLong(300) : null,
      );
      validate(path.caption, ({ value }): { kind: string; message: string } | null =>
        value().trim().length > 500 ? this.tooLong(500) : null,
      );
    },
  );
  // #endregion

  // #region Methods
  /**
   * Method error
   *
   * @description
   * First message of a field, shown once it is invalid.
   *
   * @param {'alt' | 'caption'} key - Field inspected.
   *
   * @returns {string | null} The message, or `null` while valid.
   */
  protected error(key: 'alt' | 'caption'): string | null {
    return this.texts[key]().errors()[0]?.message ?? null;
  }

  /**
   * Method onSubmit
   *
   * @description
   * Closes with the trimmed texts when they are valid.
   *
   * @param {Event} event - Submit event of the dialog form.
   */
  protected onSubmit(event: Event): void {
    event.preventDefault();
    if (this.texts().invalid()) return;
    const { alt, caption } = this.model();
    this.dialogRef.close({ alt: alt.trim(), caption: caption.trim() });
  }

  /**
   * Method tooLong
   *
   * @description
   * Error of a text longer than the contract allows.
   *
   * @param {number} max - Longest trimmed text.
   *
   * @returns {{ kind: string; message: string }} The error.
   */
  private tooLong(max: number): { kind: string; message: string } {
    return {
      kind: 'maxLength',
      message: $localize`:@@admin.article.figureDialog.maxLength:${max}:max: caractères maximum.`,
    };
  }
  // #endregion
}
