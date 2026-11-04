import { timelineDocumentTitle } from '@internal/content-web-feature-admin/lib/utils/timeline-document-title/timeline-document-title.utils';

describe('timelineDocumentTitle', (): void => {
  it('names the section, after the open entry when there is one', (): void => {
    expect(timelineDocumentTitle('Expériences')).toBe('Expériences — Administration');
    expect(timelineDocumentTitle('Formations', 'Nouvelle formation')).toBe(
      'Nouvelle formation — Formations — Administration',
    );
  });
});
