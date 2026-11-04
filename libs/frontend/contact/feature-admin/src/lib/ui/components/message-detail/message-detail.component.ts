import { DatePipe } from '@angular/common';
import {
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { lucideArchive, lucideReply, lucideTrash2 } from '@ng-icons/lucide';
import type { AdminMessage } from '@vfortin/contact-web-data-access';
import {
  AvatarDirective,
  AvatarFallbackDirective,
  BadgeDirective,
  ButtonDirective,
  TooltipDirective,
} from '@vfortin/ui';
import { MESSAGE_LOCALES } from '@internal/contact-web-feature-admin/lib/constants/message-locales.constants';
import { MESSAGE_STATUS_TAGS } from '@internal/contact-web-feature-admin/lib/constants/message-status-tags.constants';
import { MESSAGE_SUBJECTS } from '@internal/contact-web-feature-admin/lib/constants/message-subjects.constants';
import { initials } from '@internal/contact-web-feature-admin/lib/utils/initials/initials.utils';

/**
 * Component MessageDetailComponent
 * @class MessageDetailComponent
 *
 * @description
 * Reading pane of the inbox (D36): a sticky action bar (reply, archive, delete), a header with the
 * subject as heading and the sender below it, the message properties with a status badge and the
 * body. The column spans the whole pane; only the body text keeps a reading measure of about 75
 * characters. Actions go out through outputs; the page runs them on the store, confirms the deletion
 * and marks a received message read once it has been shown.
 */
@Component({
  selector: 'contact-message-detail',
  imports: [
    AvatarDirective,
    AvatarFallbackDirective,
    BadgeDirective,
    ButtonDirective,
    DatePipe,
    NgIcon,
    TooltipDirective,
  ],
  templateUrl: './message-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // The host stays out of the inbox grid so the article is the grid item, as before the split.
  host: { class: 'contents' },
})
export class MessageDetailComponent {
  // #region Properties
  /**
   * Property message
   * @readonly
   *
   * @description
   * Message open in the pane.
   *
   * @type {InputSignal<AdminMessage>}
   */
  public readonly message: InputSignal<AdminMessage> = input.required<AdminMessage>();

  /**
   * Property writing
   * @readonly
   *
   * @description
   * Whether a status change or deletion is in flight; the actions are disabled meanwhile.
   *
   * @type {InputSignal<boolean>}
   */
  public readonly writing: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property surface
   * @readonly
   *
   * @description
   * Background the pane sits on, which its sticky action bar repeats so the scrolled body passes under
   * one band: the page surface beside the list, the raised surface inside the reading sheet.
   *
   * @type {InputSignal<'page' | 'raised'>}
   */
  public readonly surface: InputSignal<'page' | 'raised'> = input<'page' | 'raised'>('page');

  /**
   * Property archiveRequested
   * @readonly
   *
   * @description
   * "Archiver" was pressed.
   *
   * @type {OutputEmitterRef<AdminMessage>}
   */
  public readonly archiveRequested: OutputEmitterRef<AdminMessage> = output<AdminMessage>();

  /**
   * Property removeRequested
   * @readonly
   *
   * @description
   * "Supprimer" was pressed; the page asks for confirmation before deleting.
   *
   * @type {OutputEmitterRef<AdminMessage>}
   */
  public readonly removeRequested: OutputEmitterRef<AdminMessage> = output<AdminMessage>();

  /**
   * Property icons
   * @readonly
   *
   * @description
   * Lucide icons of the message actions.
   */
  protected readonly icons: {
    readonly archive: typeof lucideArchive;
    readonly remove: typeof lucideTrash2;
    readonly reply: typeof lucideReply;
  } = {
    archive: lucideArchive,
    remove: lucideTrash2,
    reply: lucideReply,
  } as const;

  /**
   * Property subjects
   * @readonly
   *
   * @description
   * Localized labels of the message subjects.
   *
   * @type {typeof MESSAGE_SUBJECTS}
   */
  protected readonly subjects: typeof MESSAGE_SUBJECTS = MESSAGE_SUBJECTS;

  /**
   * Property statuses
   * @readonly
   *
   * @description
   * Label and badge family of each message status.
   *
   * @type {typeof MESSAGE_STATUS_TAGS}
   */
  protected readonly statuses: typeof MESSAGE_STATUS_TAGS = MESSAGE_STATUS_TAGS;

  /**
   * Property locales
   * @readonly
   *
   * @description
   * Names of the sender's site language, in the admin's language.
   *
   * @type {typeof MESSAGE_LOCALES}
   */
  protected readonly locales: typeof MESSAGE_LOCALES = MESSAGE_LOCALES;

  /**
   * Property initials
   * @readonly
   *
   * @description
   * Avatar fallback initials of the sender.
   *
   * @type {typeof initials}
   */
  protected readonly initials: typeof initials = initials;

  /**
   * Property label
   * @readonly
   *
   * @description
   * Accessible name of the article, after its sender.
   *
   * @type {Signal<string>}
   */
  protected readonly label: Signal<string> = computed<string>(
    (): string => $localize`:@@admin.inbox.detail.label:Message de ${this.message().name}:name:`,
  );
  // #endregion
}
