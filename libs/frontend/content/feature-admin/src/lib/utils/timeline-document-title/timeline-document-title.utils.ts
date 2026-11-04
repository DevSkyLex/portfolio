/**
 * Function timelineDocumentTitle
 *
 * @description
 * Document title of a timeline screen: the section (« Expériences — Administration »), preceded by
 * the entry or the creation when an editor is open (« Nouvelle formation — Formations —
 * Administration »). The route titles and the pages' `Title.setTitle` share it.
 *
 * @param {string} section - Section name of the kind.
 * @param {string} [name] - Entry title, creation label or missing-entry label.
 *
 * @returns {string} Document title.
 */
export function timelineDocumentTitle(section: string, name?: string): string {
  return name === undefined
    ? $localize`:@@admin.timeline.title.section:${section}:section: — Administration`
    : $localize`:@@admin.timeline.title.entry:${name}:name: — ${section}:section: — Administration`;
}
