import { lucideArchive, lucideCheck, lucideInbox, lucideMail } from '@ng-icons/lucide';
import type { InboxFilter } from '@internal/contact-web-feature-admin/lib/models/inbox-filter/inbox-filter.interface';

/**
 * Constant INBOX_FILTERS
 *
 * @description
 * Status filters of the inbox page header, every message first: the store starts on them and the
 * first entry is the default tab, on a bare URL. Each carries the title and description of its empty
 * state and the accessible name of its list, localized (French source, English targets).
 *
 * @type {readonly InboxFilter[]}
 */
export const INBOX_FILTERS: readonly InboxFilter[] = [
  {
    key: 'all',
    label: $localize`:@@admin.inbox.filter.all.label:Tous`,
    status: null,
    empty: $localize`:@@admin.inbox.filter.all.empty:Aucun message`,
    emptyHint: $localize`:@@admin.inbox.filter.all.emptyHint:Les messages envoyés depuis le formulaire de contact du site arrivent ici. Ils sont supprimés automatiquement trois ans après leur réception.`,
    listLabel: $localize`:@@admin.inbox.filter.all.list:Tous les messages`,
    icon: lucideInbox,
  },
  {
    key: 'received',
    label: $localize`:@@admin.inbox.filter.received.label:Non lus`,
    status: 'received',
    empty: $localize`:@@admin.inbox.filter.received.empty:Aucun message non lu`,
    emptyHint: $localize`:@@admin.inbox.filter.received.emptyHint:Les nouveaux messages restent dans cet onglet jusqu’à leur lecture.`,
    listLabel: $localize`:@@admin.inbox.filter.received.list:Messages non lus`,
    icon: lucideMail,
  },
  {
    key: 'read',
    label: $localize`:@@admin.inbox.filter.read.label:Lus`,
    status: 'read',
    empty: $localize`:@@admin.inbox.filter.read.empty:Aucun message lu`,
    emptyHint: $localize`:@@admin.inbox.filter.read.emptyHint:Un message affiché pendant une seconde passe dans cet onglet.`,
    listLabel: $localize`:@@admin.inbox.filter.read.list:Messages lus`,
    icon: lucideCheck,
  },
  {
    key: 'archived',
    label: $localize`:@@admin.inbox.filter.archived.label:Archivés`,
    status: 'archived',
    empty: $localize`:@@admin.inbox.filter.archived.empty:Aucun message archivé`,
    emptyHint: $localize`:@@admin.inbox.filter.archived.emptyHint:Archivez un message avec E ou son bouton «\u00a0Archiver\u00a0» pour le ranger ici.`,
    listLabel: $localize`:@@admin.inbox.filter.archived.list:Messages archivés`,
    icon: lucideArchive,
  },
];

/**
 * Constant INBOX_FILTER_PARAM
 *
 * @description
 * Query parameter holding the selected filter tab (`?status=archived`), so that a reload, a link or
 * Back restores it, as the project list keeps its table state; the default "Tous" tab is left out.
 *
 * @type {string}
 */
export const INBOX_FILTER_PARAM = 'status' as const;
