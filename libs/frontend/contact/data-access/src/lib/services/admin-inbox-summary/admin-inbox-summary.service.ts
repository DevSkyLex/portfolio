import type { AdminMessagePage } from '@internal/contact-web-data-access/lib/models/admin-message/admin-message-page.interface';
import { Injectable, inject, signal, type WritableSignal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  idleCallState,
  pendingCallState,
  successCallState,
  errorCallState,
  toStoreError,
  type CallState,
} from '@vfortin/web-http';
import type { AdminInboxSummaryPort } from '@internal/contact-web-data-access/lib/ports/admin-inbox-summary/admin-inbox-summary.port';
import { AdminMessagesApiService } from '@internal/contact-web-data-access/lib/services/admin-messages/admin-messages.service';

/**
 * Service AdminInboxSummaryService
 *
 * @description
 * Owns the unread-count projection and refreshes active consumers after successful inbox mutations.
 */
@Injectable({ providedIn: 'root' })
export class AdminInboxSummaryService implements AdminInboxSummaryPort {
  // #region Properties
  /**
   * Property api
   *
   * @description
   * Owner HTTP transport kept behind the published contract.
   */
  private readonly api: AdminMessagesApiService =
    inject<AdminMessagesApiService>(AdminMessagesApiService);

  /**
   * Property count
   *
   * @description
   * Unread count; null denotes unknown or failed, while zero is a successful empty result.
   */
  public readonly count: WritableSignal<number | null> = signal<number | null>(null);

  /**
   * Property callState
   *
   * @description
   * Named load lifecycle and normalized failure exposed to capability consumers.
   */
  public readonly callState: WritableSignal<CallState> = signal<CallState>(idleCallState());

  /**
   * Property generation
   *
   * @description
   * Version that fences obsolete read results.
   */
  private generation: number = 0;

  /**
   * Property active
   *
   * @description
   * Whether the shell has requested a summary and needs mutation invalidation.
   */
  private active: boolean = false;
  // #endregion

  // #region Methods
  /**
   * Method refresh
   *
   * @description
   * Reloads the latest projection and records failures without inventing a zero result.
   */
  public async refresh(): Promise<void> {
    this.active = true;
    const ticket: number = ++this.generation;
    this.callState.set(pendingCallState());
    try {
      const list: AdminMessagePage = await firstValueFrom(this.api.list('received', 1));
      if (ticket !== this.generation) return;
      this.count.set(list.totalItems);
      this.callState.set(successCallState());
    } catch (error: unknown) {
      if (ticket !== this.generation) return;
      this.count.set(null);
      this.callState.set(errorCallState(toStoreError(error)));
    }
  }
  /**
   * Method invalidate
   *
   * @description
   * Refreshes active shell consumers after a successful inbox mutation.
   */
  public invalidate(): void {
    if (this.active) void this.refresh();
  }
  // #endregion
}
