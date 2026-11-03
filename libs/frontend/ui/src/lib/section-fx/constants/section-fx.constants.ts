/**
 * Constant SECTION_FX_CONTENT
 * @constant
 *
 * @description
 * Tailwind classes that bind content opacity, vertical translation and blur to `uiSectionFx` progress variables,
 * with motion-reduction fallbacks.
 *
 * @type {string}
 */
export const SECTION_FX_CONTENT =
  'in-data-secfx:opacity-[calc(var(--in)*(1-var(--out)*0.75))] in-data-secfx:[transform:translateY(calc((1-var(--in))*48px-var(--out)*40px))] in-data-secfx:[filter:blur(calc((1-var(--in))*6px+var(--out)*3px))] motion-reduce:in-data-secfx:[transform:none] motion-reduce:in-data-secfx:[filter:none]' as const;
