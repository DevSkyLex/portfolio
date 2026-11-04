import { TIMELINE_KIND_TEXTS } from '@internal/content-web-feature-admin/lib/constants/timeline-kind-texts.constants';
import {
  timelineCount,
  timelineDeleted,
  timelineFailures,
  timelineSelected,
  timelineSingular,
} from '@internal/content-web-feature-admin/lib/utils/timeline-bulk/timeline-bulk.utils';

describe('timeline bulk utils', (): void => {
  it('counts entries with a real plural', (): void => {
    expect(timelineCount(TIMELINE_KIND_TEXTS.education, 1, 'fr')).toBe('1 formation');
    expect(timelineCount(TIMELINE_KIND_TEXTS.experience, 2, 'fr')).toBe('2 expériences');
    expect(timelineCount(TIMELINE_KIND_TEXTS.experience, 0, 'fr')).toBe('0 expérience');
  });

  it('chooses the singular by the plural rules of the build locale', (): void => {
    expect(timelineSingular(0, 'fr')).toBe(true);
    expect(timelineSingular(1, 'fr')).toBe(true);
    expect(timelineSingular(2, 'fr')).toBe(false);
    expect(timelineSingular(0, 'en')).toBe(false);
    expect(timelineSingular(1, 'en-US')).toBe(true);
    // The source messages stand in for the English targets here: only the branch changes.
    expect(timelineCount(TIMELINE_KIND_TEXTS.experience, 0, 'en')).toBe('0 expériences');
  });

  it('agrees the participle with the count and the feminine nouns', (): void => {
    expect(timelineDeleted(TIMELINE_KIND_TEXTS.education, 1, 'fr')).toBe('1 formation supprimée');
    expect(timelineDeleted(TIMELINE_KIND_TEXTS.experience, 2, 'fr')).toBe(
      '2 expériences supprimées',
    );
  });

  it('counts the failures and the selection', (): void => {
    expect(timelineFailures(1, 'fr')).toBe('1 échec');
    expect(timelineFailures(3, 'fr')).toBe('3 échecs');
    expect(timelineSelected(1, 'fr')).toBe('1 sélectionnée');
    expect(timelineSelected(2, 'fr')).toBe('2 sélectionnées');
  });
});
