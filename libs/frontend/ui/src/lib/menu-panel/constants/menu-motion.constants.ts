/**
 * Constant RADIUS
 *
 * @description
 * Corner radius in pixels of the floating list (`--radius-lg`, D43).
 */
export const RADIUS: number = 10;

/**
 * Constant TRIGGER_RADIUS
 *
 * @description
 * Corner radius in pixels of the select triggers (`--radius-md`, D43), flattened on the edge facing
 * the list while they touch.
 */
export const TRIGGER_RADIUS: number = 8;

/**
 * Constant GAP
 *
 * @description
 * Pixel separation between the trigger and list after the opening animation detaches them.
 */
export const GAP: number = 4;

/**
 * Constant LIP
 *
 * @description
 * Visible edge height in pixels retained while the list is clipped closed.
 */
export const LIP: number = 8;

/**
 * Constant SHADOW
 *
 * @description
 * Clip reach in pixels required to preserve the floating shadow during reveal.
 */
export const SHADOW: number = 64;

/**
 * Constant W0
 *
 * @description
 * Undamped angular frequency for the spring calibrated to the visual opening duration.
 */
export const W0: number = (2 * Math.PI) / (0.2 * 1.2);

/**
 * Constant ZETA
 *
 * @description
 * Damping ratio derived from the configured spring bounce.
 */
export const ZETA: number = 1 - 0.12;

/**
 * Constant WD
 *
 * @description
 * Damped angular frequency used by the opening spring equation.
 */
export const WD: number = W0 * Math.sqrt(1 - ZETA * ZETA);

/**
 * Constant OPEN_SECONDS
 *
 * @description
 * Maximum elapsed seconds before opening progress is clamped to completion.
 */
export const OPEN_SECONDS: number = 0.6;

/**
 * Constant CLOSE_SECONDS
 *
 * @description
 * Duration in seconds of the closing ease-out.
 */
export const CLOSE_SECONDS: number = 0.2;

/**
 * Constant REDUCED_SECONDS
 *
 * @description
 * Duration in seconds of the reduced-motion fade.
 */
export const REDUCED_SECONDS: number = 0.12;
