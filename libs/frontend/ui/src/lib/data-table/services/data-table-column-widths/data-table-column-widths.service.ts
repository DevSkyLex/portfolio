import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { storedColumnWidths } from '@internal/ui/lib/data-table/utils/data-table-column-widths/data-table-column-widths.utils';

/**
 * Service DataTableColumnWidthsService
 * @class DataTableColumnWidthsService
 *
 * @description
 * Remembers the column widths of a data table per viewer in `localStorage`, under the table's
 * `columnWidthsKey`, like `ResizableLayoutService` for panels: storage is touched in the browser only,
 * and a refused or failing storage (private mode, quota, blocked site data) or an invalid value gives
 * the default widths.
 */
@Injectable({ providedIn: 'root' })
export class DataTableColumnWidthsService {
  // #region Properties
  /**
   * Property view
   * @readonly
   *
   * @description
   * Browser window whose storage holds the widths; `null` while prerendering.
   *
   * @type {Window | null}
   */
  private readonly view: Window | null = isPlatformBrowser(inject<object>(PLATFORM_ID))
    ? inject<Document>(DOCUMENT).defaultView
    : null;
  // #endregion

  // #region Methods
  /**
   * Method read
   * @method read
   *
   * @description
   * Widths stored under a key.
   *
   * @param {string} key - Storage key of the table.
   * @returns {ReadonlyMap<string, number>} Widths by column id; empty without a valid entry.
   */
  public read(key: string): ReadonlyMap<string, number> {
    try {
      return storedColumnWidths(this.view?.localStorage.getItem(key) ?? null);
    } catch {
      return new Map<string, number>();
    }
  }

  /**
   * Method write
   * @method write
   *
   * @description
   * Stores the widths under a key, or removes the entry when no column keeps a width of its own.
   *
   * @param {string} key - Storage key of the table.
   * @param {ReadonlyMap<string, number>} widths - Widths by column id.
   * @returns {void} Leaves the widths unsaved when storage refuses them.
   */
  public write(key: string, widths: ReadonlyMap<string, number>): void {
    try {
      if (widths.size === 0) this.view?.localStorage.removeItem(key);
      else this.view?.localStorage.setItem(key, JSON.stringify(Object.fromEntries(widths)));
    } catch {
      // Storage refused (private mode, quota): the widths last for this page only.
    }
  }
  // #endregion
}
