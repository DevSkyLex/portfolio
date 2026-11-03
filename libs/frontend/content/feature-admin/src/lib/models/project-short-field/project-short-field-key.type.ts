import type { BilingualText } from '@internal/content-web-feature-admin/lib/ui/forms/project-form/models/bilingual-text.interface';
import type { ProjectFormValues } from '@internal/content-web-feature-admin/lib/ui/forms/project-form/models/project-form-values.model';

/**
 * Type ProjectShortFieldKey
 * @type ProjectShortFieldKey
 *
 * @description
 * Draft keys holding one bilingual value (title, summary, lead…), as opposed to the article sections.
 */
export type ProjectShortFieldKey = {
  [K in keyof ProjectFormValues]: ProjectFormValues[K] extends BilingualText ? K : never;
}[keyof ProjectFormValues];
