import type { EmptyLayout } from '@internal/ui/lib/empty/constants/empty.variants';

/**
 * Type DataTableEmptyLayout
 * @type DataTableEmptyLayout
 *
 * @description
 * Height rule of the table's empty and no-result states (`emptyVariants`): `fill` when the table is
 * the last thing in its page column, `inline` when something follows it.
 */
export type DataTableEmptyLayout = Extract<EmptyLayout, 'fill' | 'inline'>;
