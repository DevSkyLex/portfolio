import { DatePipe } from '@angular/common';
import {
  type InputSignal,
  type OutputEmitterRef,
  ChangeDetectionStrategy,
  Component,
  LOCALE_ID,
  inject,
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
 * Left pane of the two-pane inbox (D36): one 72 px hairline row per message on a fixed grid (initials,
 * sender and time, subject, start of the message), unread rows marked by a heavier weight and the
 * 2 px start bar of the current row in neutral `border-strong` (3:1 or more on the row in both themes;
 * the current row's accent bar wins), with a spoken unread label so the state is not shape alone; then the
 * keyboard hints and the pagination. Selection and paging go out through outputs; the page owns the
 * store.
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
  // Beside the reading pane, the inbox page's separator draws the dividing line; `min-w-0` lets the
  // rows shrink to the pane so the time stays visible and the previews truncate.
  host: {
    class: 'flex min-h-0 min-w-0 flex-col border-border @max-[1024px]:border-b',
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
   * Property label
   * @readonly
   *
   * @description
   * Accessible name of the list, after the selected filter tab ("Messages archivés", …).
   *
   * @type {InputSignal<string>}
   */
  public readonly label: InputSignal<string> = input.required<string>();

  /**
   * Property selectedId
   * @readonly
   *
   * @description
   * Identifier of the message shown in the reading pane or sheet, marked with `aria-current`; `null`
   * while none is shown.
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
   * Localized labels of the message subjects.
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
   * Property locale
   * @readonly
   *
   * @description
   * Build locale, which spells the relative reception dates.
   *
   * @type {string}
   */
  private readonly locale: string = inject<string>(LOCALE_ID);
  // #endregion

  // #region Methods
  /**
   * Method when
   * @method when
   *
   * @description
   * Relative reception date shown in a row, in the build locale ("il y a 3 h", "hier", "2 nov.";
   * "3 hr. ago", "yesterday", "Nov 2").
   *
   * @param {string} iso - ISO 8601 reception instant.
   *
   * @returns {string} The label.
   */
  protected when(iso: string): string {
    return relativeDate(iso, this.locale);
  }
  // #endregion
}
