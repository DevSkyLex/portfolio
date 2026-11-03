/**
 * Constant ICON_SIZES
 *
 * @description
 * Pixel dimensions associated with the named icon size tokens.
 *
 * @type {Readonly<{ xs: 12; sm: 16; md: 20; lg: 24; xl: 32 }>}
 */
export const ICON_SIZES = { xs: 12, sm: 16, md: 20, lg: 24, xl: 32 } as const;

/**
 * Type IconSize
 * @type IconSize
 *
 * @description
 * Named icon size tokens accepted by the icon component.
 *
 * @type {keyof typeof ICON_SIZES}
 */
export type IconSize = keyof typeof ICON_SIZES;
