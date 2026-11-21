/**
 * Function faqDocumentTitle
 *
 * @description
 * Document title of a FAQ screen: the section (« FAQ — Administration »), preceded by the question or
 * the creation when an editor is open (« Nouvelle question — FAQ — Administration »). The route titles
 * and the pages' `Title.setTitle` share it.
 *
 * @param {string} [name] - Question, creation label or missing-entry label.
 *
 * @returns {string} Document title.
 */
export function faqDocumentTitle(name?: string): string {
  return name === undefined
    ? $localize`:@@admin.faq.title.section:FAQ — Administration`
    : $localize`:@@admin.faq.title.entry:${name}:name: — FAQ — Administration`;
}
