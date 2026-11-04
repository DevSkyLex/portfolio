/**
 * Constant TIMELINE_ENTRY_LIMITS
 *
 * @description
 * Browser copy of `TIMELINE_ENTRY_LIMITS` (`admin-timeline.contract.ts`), since the browser imports no
 * value from the contracts (D10): longest trimmed text per language, largest technology list, accepted
 * years and the technology key pattern. Change them together.
 */
export const TIMELINE_ENTRY_LIMITS: {
  readonly title: 120;
  readonly place: 120;
  readonly description: 600;
  readonly techs: 12;
  readonly yearMin: 1990;
  readonly yearMax: 2100;
  readonly key: RegExp;
} = {
  title: 120,
  place: 120,
  description: 600,
  techs: 12,
  yearMin: 1990,
  yearMax: 2100,
  key: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
};
