import type { DataTableLabels } from '@internal/ui/lib/data-table/models/data-table/data-table-labels.interface';

/**
 * Constant DATA_TABLE_LABELS
 *
 * @description
 * French source texts of the data table (`@@ui.data-table.*`), merged under the `labels` input.
 *
 * @type {DataTableLabels}
 */
export const DATA_TABLE_LABELS: DataTableLabels = {
  searchPlaceholder: $localize`:@@ui.data-table.search-placeholder:Rechercher…`,
  searchLabel: $localize`:@@ui.data-table.search-label:Rechercher dans le tableau`,
  reset: $localize`:@@ui.data-table.reset:Réinitialiser`,
  resetFilters: $localize`:@@ui.data-table.reset-filters:Réinitialiser les filtres`,
  removeFilter: (facet: string, value: string): string =>
    $localize`:@@ui.data-table.remove-filter:Retirer le filtre ${facet}:FACET: : ${value}:VALUE:`,
  columns: $localize`:@@ui.data-table.columns:Colonnes`,
  columnsMenu: $localize`:@@ui.data-table.columns-menu:Colonnes affichées`,
  empty: $localize`:@@ui.data-table.empty:Aucune donnée.`,
  noResults: $localize`:@@ui.data-table.no-results:Aucun résultat.`,
  noResultsHint: $localize`:@@ui.data-table.no-results-hint:Modifiez la recherche ou retirez des filtres.`,
  loading: $localize`:@@ui.data-table.loading:Chargement…`,
  rowsPerPage: $localize`:@@ui.data-table.rows-per-page:Lignes par page`,
  range: (from: number, to: number, total: number): string =>
    $localize`:@@ui.data-table.range:${from}:FROM:–${to}:TO: sur ${total}:TOTAL:`,
  pageStatus: (page: number, total: number): string =>
    $localize`:@@ui.data-table.page-status:Page ${page}:PAGE: sur ${total}:TOTAL:`,
  firstPage: $localize`:@@ui.data-table.first-page:Première page`,
  previousPage: $localize`:@@ui.data-table.previous-page:Page précédente`,
  nextPage: $localize`:@@ui.data-table.next-page:Page suivante`,
  lastPage: $localize`:@@ui.data-table.last-page:Dernière page`,
  selectAll: $localize`:@@ui.data-table.select-all:Sélectionner toutes les lignes de la page`,
  selectRow: (name: string | number): string =>
    typeof name === 'number'
      ? $localize`:@@ui.data-table.select-row:Sélectionner la ligne ${name}:INDEX:`
      : $localize`:@@ui.data-table.select-named-row:Sélectionner ${name}:NAME:`,
  facetClear: $localize`:@@ui.data-table.facet-clear:Effacer`,
  facetPanel: (facet: string): string =>
    $localize`:@@ui.data-table.facet-panel:Filtrer par ${facet}:FACET:`,
  resizeColumn: (column: string): string =>
    $localize`:@@ui.data-table.resize-column:Redimensionner la colonne ${column}:COLUMN:`,
};
