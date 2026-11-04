import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Configuration badgeVariants
 *
 * @description
 * Compact badge on four axes. `variant` is the colour family: the neutral `default` (with its legacy
 * alias `outline`), `secondary` (always the sunk fill), the D37 statuses `info`, `success`, `warning`,
 * `danger`, and the brand `accent`. `appearance` is the treatment: `outline` (default: no fill, a
 * hairline, a muted label, the colour on the dot and a leading icon only), `ghost` (the same without
 * hairline), `soft` (an 8 % tint with the family's ink as text, the D37 guarantee of 4.5:1) and `solid`
 * (the family's fill with `on-fill` text). `shape` is the D43 `xs` radius or a `pill`; `size` is `sm`
 * (20 px, 12 px text, the admin lists of D36) or `md` (24 px, 13 px). A badge led by a dot or an icon
 * takes a smaller start padding, which balances the glyph's own inset with the space after the label.
 * Accent text on its tint stays under 4.5:1 in the light theme, so a soft accent badge keeps the `fg`
 * label and puts the accent on its dot and icon.
 */
export const badgeVariants = cva(
  [
    'inline-flex w-fit shrink-0 items-center gap-1.5 border border-transparent font-medium whitespace-nowrap',
    'transition-[background-color,border-color,color] duration-(--dur-pop) ease-orbit motion-reduce:transition-none',
    'outline-4 outline-offset-0 outline-transparent focus-visible:border-fg/55 focus-visible:outline-fg/12',
    '[&>ng-icon]:shrink-0 [&>ui-icon]:shrink-0',
  ],
  {
    // Declared before `appearance`, whose dot and icon colours (solid) must win in the merge.
    variants: {
      variant: {
        default: 'before:bg-current',
        outline: 'before:bg-current',
        secondary: 'before:bg-current',
        info: 'before:bg-info-ink [&>ng-icon]:text-info-ink',
        success: 'before:bg-success-ink [&>ng-icon]:text-success-ink',
        warning: 'before:bg-warning-ink [&>ng-icon]:text-warning-ink',
        danger: 'before:bg-danger-ink [&>ng-icon]:text-danger-ink',
        accent: 'before:bg-accent [&>ng-icon]:text-accent',
      },
      appearance: {
        outline: 'border-border text-fg-muted [a&]:hover:border-border-hover [a&]:hover:text-fg',
        ghost: 'text-fg-muted [a&]:hover:text-fg',
        soft: '',
        solid: 'text-on-fill before:bg-current [&>ng-icon]:text-current',
      },
      shape: {
        default: 'rounded-xs',
        pill: 'rounded-full',
      },
      size: {
        sm: 'h-5 px-2 text-[12px]/4 has-[>ng-icon:first-child]:ps-1.5',
        md: 'h-6 px-2.5 text-[13px]/5 has-[>ng-icon:first-child]:ps-2',
      },
      dot: {
        true: "before:size-1.5 before:shrink-0 before:rounded-full before:content-['']",
        // Any `before:` colour utility gives the pseudo-element a `content` in Tailwind v4: without the
        // dot it would still be a zero-width flex item and add one gap before a leading icon.
        false: 'before:hidden',
      },
    },
    compoundVariants: [
      {
        variant: ['default', 'outline'],
        appearance: 'soft',
        class: 'bg-surface-raised text-fg-muted [a&]:hover:text-fg',
      },
      { variant: ['default', 'outline'], appearance: 'solid', class: 'bg-fill' },
      {
        variant: 'secondary',
        class: 'border-transparent bg-surface-sunk text-fg-muted [a&]:hover:text-fg',
      },
      { variant: 'info', appearance: 'soft', class: 'bg-info/8 text-info-ink' },
      { variant: 'success', appearance: 'soft', class: 'bg-success/8 text-success-ink' },
      { variant: 'warning', appearance: 'soft', class: 'bg-warning/8 text-warning-ink' },
      { variant: 'danger', appearance: 'soft', class: 'bg-danger/8 text-danger-ink' },
      { variant: 'accent', appearance: 'soft', class: 'bg-accent/8 text-fg' },
      { variant: 'info', appearance: 'solid', class: 'bg-info' },
      { variant: 'success', appearance: 'solid', class: 'bg-success' },
      { variant: 'warning', appearance: 'solid', class: 'bg-warning' },
      { variant: 'danger', appearance: 'solid', class: 'bg-danger' },
      { variant: 'accent', appearance: 'solid', class: 'bg-accent' },
      { dot: true, size: 'sm', class: 'ps-1.5' },
      { dot: true, size: 'md', class: 'ps-2' },
    ],
    defaultVariants: {
      variant: 'default',
      appearance: 'outline',
      shape: 'default',
      size: 'sm',
      dot: false,
    },
  },
);

/**
 * Type BadgeVariant
 * @type BadgeVariant
 *
 * @description
 * Colour families accepted by the badge directive.
 *
 * @type {NonNullable<VariantProps<typeof badgeVariants>['variant']>}
 */
export type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>;

/**
 * Type BadgeAppearance
 * @type BadgeAppearance
 *
 * @description
 * Treatments accepted by the badge directive: `outline`, `ghost`, `soft`, `solid`.
 *
 * @type {NonNullable<VariantProps<typeof badgeVariants>['appearance']>}
 */
export type BadgeAppearance = NonNullable<VariantProps<typeof badgeVariants>['appearance']>;

/**
 * Type BadgeShape
 * @type BadgeShape
 *
 * @description
 * Corner shapes accepted by the badge directive: the D43 `xs` radius or a pill.
 *
 * @type {NonNullable<VariantProps<typeof badgeVariants>['shape']>}
 */
export type BadgeShape = NonNullable<VariantProps<typeof badgeVariants>['shape']>;

/**
 * Type BadgeSize
 * @type BadgeSize
 *
 * @description
 * Heights accepted by the badge directive: `sm` 20 px, `md` 24 px.
 *
 * @type {NonNullable<VariantProps<typeof badgeVariants>['size']>}
 */
export type BadgeSize = NonNullable<VariantProps<typeof badgeVariants>['size']>;
