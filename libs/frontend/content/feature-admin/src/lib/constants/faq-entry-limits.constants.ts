/**
 * Constant FAQ_ENTRY_LIMITS
 *
 * @description
 * Browser copy of `FAQ_ENTRY_LIMITS` (`admin-faq.contract.ts`), since the browser imports no value from
 * the contracts (D10): longest trimmed question and answer per language. Change them together.
 */
export const FAQ_ENTRY_LIMITS: {
  readonly question: 200;
  readonly answer: 2000;
} = {
  question: 200,
  answer: 2000,
};
