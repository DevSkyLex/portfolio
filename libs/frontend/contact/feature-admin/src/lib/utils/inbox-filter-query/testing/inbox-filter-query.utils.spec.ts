import { convertToParamMap } from '@angular/router';
import {
  inboxFilterOf,
  inboxFilterQuery,
} from '@internal/contact-web-feature-admin/lib/utils/inbox-filter-query/inbox-filter-query.utils';

describe('inboxFilterOf', () => {
  it('reads the filter tab from the status parameter', () => {
    expect(inboxFilterOf(convertToParamMap({ status: 'archived' })).label).toBe('Archivés');
    expect(inboxFilterOf(convertToParamMap({ status: 'received' })).label).toBe('Non lus');
    expect(inboxFilterOf(convertToParamMap({ status: 'all' })).status).toBeNull();
  });

  it('falls back to the "Tous" tab for a missing or unknown value', () => {
    expect(inboxFilterOf(convertToParamMap({})).key).toBe('all');
    expect(inboxFilterOf(convertToParamMap({ status: 'spam' })).key).toBe('all');
  });
});

describe('inboxFilterQuery', () => {
  it('writes the tab key and removes the parameter for the default tab', () => {
    expect(inboxFilterQuery('read')).toEqual({ status: 'read' });
    expect(inboxFilterQuery('received')).toEqual({ status: 'received' });
    expect(inboxFilterQuery('all')).toEqual({ status: null });
  });
});
