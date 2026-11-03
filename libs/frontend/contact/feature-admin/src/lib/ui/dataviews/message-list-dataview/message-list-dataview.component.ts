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
import { lucideChevronLeft, lucideChevronRight } from '@ng-icons/lucide';
import type { AdminMessage } from '@vfortin/contact-web-data-access';
import {
  AvatarDirective,
  AvatarFallbackDirective,
  ButtonDirective,
  KbdDirective,
} from '@vfortin/ui';
import { MESSAGE_SUBJECTS } from '@internal/contact-web-feature-admin/lib/constants/message-subjects.constants';
import { initials } from '@internal/contact-web-feature-admin/lib/utils/initials/initials.utils';
import { relativeDate } from '@internal/contact-web-feature-admin/lib/utils/relative-date/relative-date.utils';

/**
 * Component MessageListDataviewComponent
 * @class MessageListDataviewComponent
 *
 * @description
 * Left pane of the two-pane inbox (D36): one hairline row per message with the sender's initials,
 * an info dot on unread rows (D37), the subject and the start of the message, the keyboard hints and
 * the pagination. Selection and paging go out through outputs; the page owns the store.
 */
@Component({
  selector: 'contact-message-list-dataview',
  imports: [
    AvatarDirective,
    AvatarFallbackDirective,
    ButtonDirective,
    DatePipe,
    KbdDirective,
    NgIcon,
  ],
  templateUrl: './message-list-dataview.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class:
      'flex min-h-0 flex-col border-r border-line @max-[1024px]:border-r-0 @max-[1024px]:border-b',
  },
})
export class MessageListDataviewComponent {
  // #region Properties
  /**
   * Property messages
   * @readonly
   *
   * @description
   * Messages of the current page, in the order of the API.
   *
   * @type {InputSignal<readonly AdminMessage[]>}
   */
  public readonly messages: InputSignal<readonly AdminMessage[]> =
    input.required<readonly AdminMessage[]>();

  /**
   * Property selectedId
   * @readonly
   *
   * @description
   * Identifier of the message open in the reading pane, marked with `aria-current`.
   *
   * @type {InputSignal<string | null>}
   */
  public readonly selectedId: InputSignal<string | null> = input<string | null>(null);

  /**
   * Property page
   * @readonly
   *
   * @description
   * One-based current page.
   *
   * @type {InputSignal<number>}
   */
  public readonly page: InputSignal<number> = input<number>(1);

  /**
   * Property pages
   * @readonly
   *
   * @description
   * Page count; the pagination shows only past one page.
   *
   * @type {InputSignal<number>}
   */
  public readonly pages: InputSignal<number> = input<number>(1);

  /**
   * Property opened
   * @readonly
   *
   * @description
   * Message picked in the list.
   *
   * @type {OutputEmitterRef<AdminMessage>}
   */
  public readonly opened: OutputEmitterRef<AdminMessage> = output<AdminMessage>();

  /**
   * Property pageChange
   * @readonly
   *
   * @description
   * Page requested by the previous or next button.
   *
   * @type {OutputEmitterRef<number>}
   */
  public readonly pageChange: OutputEmitterRef<number> = output<number>();

  /**
   * Property icons
   * @readonly
   *
   * @description
   * Lucide icons of the pagination buttons.
   */
  protected readonly icons: {
    readonly next: typeof lucideChevronRight;
    readonly previous: typeof lucideChevronLeft;
  } = { next: lucideChevronRight, previous: lucideChevronLeft } as const;

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
   * Property initials
   * @readonly
   *
   * @description
   * Avatar fallback initials of a sender.
   *
   * @type {typeof initials}
   */
  protected readonly initials: typeof initials = initials;

  /**
   * Property when
   * @readonly
   *
   * @description
   * Relative reception date shown in a row ("il y a 3 h", "hier", "2 nov.").
   *
   * @type {typeof relativeDate}
   */
  protected readonly when: typeof relativeDate = relativeDate;
  // #endregion
}
