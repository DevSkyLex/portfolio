import type { AdminFaqEntryDto } from '@vfortin/content-contracts';
import type { AdminFaqList } from '@internal/content-web-data-access/lib/admin/models/admin-faq-list/admin-faq-list.interface';
import {
  toAdminFaqEntry,
  toAdminFaqList,
} from '@internal/content-web-data-access/lib/admin/adapters/admin-faq/admin-faq.adapter';

/**
 * Function dto
 *
 * @description
 * Builds a FAQ entry DTO.
 *
 * @param {string} id - Identifier.
 * @param {number} position - Position.
 *
 * @returns {AdminFaqEntryDto} Entry DTO.
 */
const dto = (id: string, position: number): AdminFaqEntryDto => ({
  id,
  position,
  version: 2,
  question: { fr: `Question ${id}`, en: `Question ${id} (en)` },
  answer: { fr: 'Ligne 1\nLigne 2', en: 'Line 1\nLine 2' },
});

describe('toAdminFaqEntry', (): void => {
  it('copies the texts, leaving out an absent English text', (): void => {
    expect(toAdminFaqEntry(dto('a', 0))).toEqual({
      id: 'a',
      position: 0,
      version: 2,
      question: { fr: 'Question a', en: 'Question a (en)' },
      answer: { fr: 'Ligne 1\nLigne 2', en: 'Line 1\nLine 2' },
    });
    expect(
      toAdminFaqEntry({ ...dto('b', 1), question: { fr: 'Seule' }, answer: { fr: 'Texte' } }),
    ).toMatchObject({ question: { fr: 'Seule' }, answer: { fr: 'Texte' } });
    expect('en' in toAdminFaqEntry({ ...dto('b', 1), question: { fr: 'Seule' } }).question).toBe(
      false,
    );
  });
});

describe('toAdminFaqList', (): void => {
  it('keeps the list version and orders the entries by position', (): void => {
    const list: AdminFaqList = toAdminFaqList({
      version: 7,
      totalItems: 3,
      member: [dto('c', 2), dto('a', 0), dto('b', 1)],
    });
    expect(list.version).toBe(7);
    expect(list.entries.map((entry) => entry.id)).toEqual(['a', 'b', 'c']);
  });
});
