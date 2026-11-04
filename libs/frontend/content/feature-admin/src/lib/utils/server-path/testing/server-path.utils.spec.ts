import { serverPath } from '@internal/content-web-feature-admin/lib/utils/server-path/server-path.utils';

describe('serverPath', (): void => {
  it('gives a violation inside an article to its editor and keeps the cover paths', (): void => {
    expect(
      [
        'article.fr.content.3.content.0.text',
        'article.en',
        'article',
        'cover',
        'cover.media',
        'cover.alt.en',
        'techs.0',
        'title.fr',
        'period',
        'period.end',
        'period.start.month',
        'periods',
      ].map(serverPath),
    ).toEqual([
      'article.fr',
      'article.en',
      'article',
      'cover.media',
      'cover.media',
      'cover.alt.en',
      'techs',
      'title.fr',
      'period',
      'period',
      'period',
      'periods',
    ]);
  });
});
