/**
 * Type FormPath
 * @type FormPath
 *
 * @description
 * Minimal canvas path operations required to add planet marks.
 */
export type FormPath = Pick<CanvasRenderingContext2D, 'moveTo' | 'arc' | 'rect'>;
