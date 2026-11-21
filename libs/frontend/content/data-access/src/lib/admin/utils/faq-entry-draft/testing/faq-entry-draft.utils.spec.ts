import type { AdminFaqEntry } from '@internal/content-web-data-access/lib/admin/models/admin-faq-entry/admin-faq-entry.interface';
import {
  emptyFaqEntryDraft,
  toFaqEntryDraft,
  toFaqEntryRequest,
} from '@internal/content-web-data-access/lib/admin/utils/faq-entry-draft/faq-entry-draft.utils';

describe('emptyFaqEntryDraft', (): void => {
  it('has no text in either language', (): void => {
    expect(emptyFaqEntryDraft()).toEqual({
      question: { fr: '', en: '' },
      answer: { fr: '', en: '' },
    });
  });
});

describe('toFaqEntryDraft', (): void => {
  it('turns an absent English text into an empty one', (): void => {
    const entry: AdminFaqEntry = {
      id: 'a',
      position: 0,
      version: 1,
      question: { fr: 'Disponible ?' },
      answer: { fr: 'Oui.', en: 'Yes.' },
    };
    expect(toFaqEntryDraft(entry)).toEqual({
      question: { fr: 'Disponible ?', en: '' },
      answer: { fr: 'Oui.', en: 'Yes.' },
    });
  });
});

describe('toFaqEntryRequest', (): void => {
  it('trims the texts, keeps the line breaks inside and leaves out an empty English text', (): void => {
    expect(
      toFaqEntryRequest({
        question: { fr: '  Disponible ?  ', en: '   ' },
        answer: { fr: ' Oui.\nDès janvier. ', en: 'Yes.\nFrom January.' },
      }),
    ).toEqual({
      question: { fr: 'Disponible ?' },
      answer: { fr: 'Oui.\nDès janvier.', en: 'Yes.\nFrom January.' },
    });
  });
});
