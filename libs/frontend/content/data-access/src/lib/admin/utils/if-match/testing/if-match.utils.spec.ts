import { ifMatch } from '@internal/content-web-data-access/lib/admin/utils/if-match/if-match.utils';

describe('ifMatch', (): void => {
  it('quotes the loaded version as the If-Match entity tag', (): void => {
    expect(ifMatch(7).get('if-match')).toBe('"7"');
  });
});
