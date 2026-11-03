/**
 * Type AdminProject
 *
 * @description
 * Administration view model: localized presentation, editor sections, revision identity and publication readiness.
 * Kept independent of transport DTO declarations; the API adapter owns incoming projection.
 */
export type AdminProject = {
  readonly id: string;
  readonly slug: string;
  readonly status: 'draft' | 'published';
  readonly version: number;
  readonly position: number;
  readonly title: { readonly fr: string; readonly en?: string };
  readonly summary: { readonly fr: string; readonly en?: string };
  readonly lead: { readonly fr: string; readonly en?: string };
  readonly periodLabel: { readonly fr: string; readonly en?: string };
  readonly client: { readonly fr: string; readonly en?: string };
  readonly role: { readonly fr: string; readonly en?: string };
  readonly place: { readonly fr: string; readonly en?: string };
  readonly siteUrl: string | null;
  readonly techs: string[];
  readonly featured: boolean;
  readonly article: Record<
    'context' | 'work' | 'workList' | 'choices' | 'result' | 'lessons' | 'captions',
    { fr: string; en?: string }[]
  >;
  readonly missing: string[];
};
