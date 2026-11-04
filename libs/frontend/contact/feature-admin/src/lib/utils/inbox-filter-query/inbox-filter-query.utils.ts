import type { ParamMap, Params } from '@angular/router';
import type { InboxFilter } from '@internal/contact-web-feature-admin/lib/models/inbox-filter/inbox-filter.interface';
import type { InboxFilterKey } from '@internal/contact-web-feature-admin/lib/models/inbox-filter/inbox-filter-key.type';
import {
  INBOX_FILTERS,
  INBOX_FILTER_PARAM,
} from '@internal/contact-web-feature-admin/lib/constants/inbox-filters.constants';

/**
 * Function inboxFilterOf
 *
 * @description
 * Filter tab named by the query parameters; a missing or unknown value is the default "Tous" tab.
 *
 * @param {ParamMap} params - Query parameters of the inbox route.
 *
 * @returns {InboxFilter} Filter to select.
 */
export function inboxFilterOf(params: ParamMap): InboxFilter {
  const key: string | null = params.get(INBOX_FILTER_PARAM);
  // INBOX_FILTERS is a non-empty constant: its first entry is the default tab.
  const fallback: InboxFilter = INBOX_FILTERS[0] as InboxFilter;
  return INBOX_FILTERS.find((filter) => filter.key === key) ?? fallback;
}

/**
 * Function inboxFilterQuery
 *
 * @description
 * Query parameters of a filter tab, `null` (removed) for the default one so its URL stays bare.
 *
 * @param {InboxFilterKey} key - Selected filter tab.
 *
 * @returns {Params} Query parameters to merge into the inbox URL.
 */
export function inboxFilterQuery(key: InboxFilterKey): Params {
  return { [INBOX_FILTER_PARAM]: key === INBOX_FILTERS[0]?.key ? null : key };
}
