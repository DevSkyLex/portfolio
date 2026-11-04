/**
 * Constant TIMELINE_MONTHS
 *
 * @description
 * Short month names by number (index 0 is January), in the admin's language, that write the periods
 * of the list and the editor header (« janv. 2022 – aujourd’hui »).
 *
 * @type {readonly { readonly value: number; readonly short: string }[]}
 */
export const TIMELINE_MONTHS: readonly { readonly value: number; readonly short: string }[] = [
  { value: 1, short: $localize`:@@admin.timeline.month.jan:janv.` },
  { value: 2, short: $localize`:@@admin.timeline.month.feb:févr.` },
  { value: 3, short: $localize`:@@admin.timeline.month.mar:mars` },
  { value: 4, short: $localize`:@@admin.timeline.month.apr:avr.` },
  { value: 5, short: $localize`:@@admin.timeline.month.may:mai` },
  { value: 6, short: $localize`:@@admin.timeline.month.jun:juin` },
  { value: 7, short: $localize`:@@admin.timeline.month.jul:juil.` },
  { value: 8, short: $localize`:@@admin.timeline.month.aug:août` },
  { value: 9, short: $localize`:@@admin.timeline.month.sep:sept.` },
  { value: 10, short: $localize`:@@admin.timeline.month.oct:oct.` },
  { value: 11, short: $localize`:@@admin.timeline.month.nov:nov.` },
  { value: 12, short: $localize`:@@admin.timeline.month.dec:déc.` },
];
