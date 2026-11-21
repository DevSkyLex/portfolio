import { publicationTags } from '@internal/content-web-ui/lib/tech/utils/publication-tags/publication-tags.utils';

describe('publicationTags', (): void => {
  it('keeps explicit labels, recognizes catalogue aliases and adds the remaining legacy technologies', (): void => {
    expect(
      publicationTags(
        [
          { key: 'postgres', label: 'PostgreSQL personnalisé' },
          { key: 'architecture', label: 'Architecture' },
        ],
        ['postgresql', 'vue', 'cobol', 'constructor'],
      ),
    ).toEqual([
      { key: 'postgresql', label: 'PostgreSQL personnalisé' },
      { key: 'architecture', label: 'Architecture' },
      { key: 'vue', label: 'Vue.js' },
      { key: 'cobol', label: 'cobol' },
      { key: 'constructor', label: 'constructor' },
    ]);
  });
});
