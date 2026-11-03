import { DatePipe } from '@angular/common';
import {
  type InputSignal,
  type OutputEmitterRef,
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { lucideArchive, lucideCheck, lucideReply, lucideTrash2 } from '@ng-icons/lucide';
import type { AdminMessage } from '@vfortin/contact-web-data-access';
import {
  AvatarDirective,
  AvatarFallbackDirective,
  BadgeDirective,
  ButtonDirective,
  TooltipDirective,
} from '@vfortin/ui';
import { MESSAGE_STATUS_TAGS } from '@internal/contact-web-feature-admin/lib/constants/message-status-tags.constants';
import { MESSAGE_SUBJECTS } from '@internal/contact-web-feature-admin/lib/constants/message-subjects.constants';
import { initials } from '@internal/contact-web-feature-admin/lib/utils/initials/initials.utils';

/**
 * Component MessageDetailComponent
 * @class MessageDetailComponent
 *
 * @description
 * Reading pane of the inbox (D36): the action bar (reply, mark as read, archive, delete), the sender,
 * the message properties with a status badge and the message body. Actions go out through outputs;
 * the page runs them on the store and confirms the deletion.
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
   * Property readRequested
   * @readonly
   *
   * @description
   * "Marquer comme lu" was pressed.
   *
   * @type {OutputEmitterRef<AdminMessage>}
   */
  public readonly readRequested: OutputEmitterRef<AdminMessage> = output<AdminMessage>();

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
    readonly read: typeof lucideCheck;
    readonly remove: typeof lucideTrash2;
    readonly reply: typeof lucideReply;
  } = {
    archive: lucideArchive,
    read: lucideCheck,
    remove: lucideTrash2,
    reply: lucideReply,
  } as const;

  /**
   * Property subjects
   * @readonly
   *
   * @description
   * French labels of the message subjects.
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
   * Property initials
   * @readonly
   *
   * @description
   * Avatar fallback initials of the sender.
   *
   * @type {typeof initials}
   */
  protected readonly initials: typeof initials = initials;
  // #endregion
}
