/**
 * Export contentSnapshot
 *
 * @description
 * Content snapshot loader of the build: the committed snapshot, so that production prerendering calls
 * no API (D7). The `development` build configuration swaps this file for
 * `content-snapshot.development.ts` through `fileReplacements` (Angular environments guide), so the
 * live loader never enters a production bundle.
 */
export { loadCommittedContentSnapshot as contentSnapshot } from '@internal/web/environments/committed-content-snapshot';
