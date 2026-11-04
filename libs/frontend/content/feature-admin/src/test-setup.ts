import '@angular/localize/init';
import '@angular/compiler';
import '@analogjs/vitest-angular/setup-snapshots';
import { setupTestBed } from '@analogjs/vitest-angular/setup-testbed';

setupTestBed({ zoneless: true });

// jsdom has no layout: ProseMirror (the article editor, D40) measures ranges and scrolls the
// selection into view, so these return empty boxes instead of throwing.
Range.prototype.getClientRects = (): DOMRectList =>
  ({ length: 0, item: (): null => null, [Symbol.iterator]: [][Symbol.iterator] }) as DOMRectList;
Range.prototype.getBoundingClientRect = (): DOMRect => new DOMRect();
Element.prototype.scrollIntoView = (): void => undefined;
document.elementFromPoint = (): Element | null => null;
