import { timelineServerPath } from '@internal/content-web-feature-admin/lib/utils/timeline-server-path/timeline-server-path.utils';

describe('timelineServerPath', (): void => {
  it.each([
    ['start', 'period'],
    ['start.month', 'period'],
    ['start.year', 'period'],
    ['end', 'period'],
    ['end.year', 'period'],
    ['techs.2', 'techs'],
    ['techs', 'techs'],
    ['title.en', 'title.en'],
    ['description.fr', 'description.fr'],
  ])('maps %s to %s', (path: string, field: string): void => {
    expect(timelineServerPath(path)).toBe(field);
  });
});
