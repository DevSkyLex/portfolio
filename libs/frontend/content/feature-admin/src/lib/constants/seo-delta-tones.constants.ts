import { lucideArrowDownRight, lucideArrowUpRight, lucideMinus } from '@ng-icons/lucide';
import type { SeoDelta } from '@internal/content-web-feature-admin/lib/models/seo-delta/seo-delta.interface';

/**
 * Constant SEO_DELTA_TONE_CLASSES
 *
 * @description
 * Ink of a change by its meaning for the site (D37: success and danger inks for text), shared by the
 * figure strip's tiles and the side panel's figure list.
 *
 * @type {Readonly<Record<SeoDelta['tone'], string>>}
 */
export const SEO_DELTA_TONE_CLASSES: Readonly<Record<SeoDelta['tone'], string>> = {
  good: 'flex items-center gap-0.5 font-medium text-success-ink tabular-nums',
  bad: 'flex items-center gap-0.5 font-medium text-danger-ink tabular-nums',
  flat: 'flex items-center gap-0.5 font-medium text-fg-muted tabular-nums',
};

/**
 * Constant SEO_DELTA_ICONS
 *
 * @description
 * Lucide arrow of a change's direction; an unchanged figure takes a dash.
 *
 * @type {Readonly<Record<SeoDelta['direction'], string>>}
 */
export const SEO_DELTA_ICONS: Readonly<Record<SeoDelta['direction'], string>> = {
  up: lucideArrowUpRight,
  down: lucideArrowDownRight,
  flat: lucideMinus,
};
