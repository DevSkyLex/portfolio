import { BadRequestException, type PipeTransform } from '@nestjs/common';

/**
 * Interface ContractSchema
 * @interface ContractSchema
 *
 * @description
 * Minimal safe-parse contract accepted by the HTTP validation pipe, independent of a particular Zod package.
 *
 * @template T - Parsed value produced when validation succeeds.
 */
export interface ContractSchema<T> {
  // #region Methods
  /**
   * Method safeParse
   * @method safeParse
   *
   * @description
   * Validates an unknown input without throwing and returns either its typed value or path-based issues.
   *
   * @param {unknown} value - Raw request value to validate.
   * @returns {{ success: true; data: T } | { success: false; error: { issues: readonly { path: readonly PropertyKey[]; message: string }[] } }} Validation result.
   */
  safeParse(value: unknown):
    | { success: true; data: T }
    | {
        success: false;
        error: { issues: readonly { path: readonly PropertyKey[]; message: string }[] };
      };
  // #endregion
}

/**
 * Class ZodValidationPipe
 * @class ZodValidationPipe
 *
 * @description
 * Converts a contract schema's safe-parse result into a typed Nest pipe value or a field-specific HTTP 400.
 * Domain invariants remain the responsibility of the domain layer.
 *
 * @template T - Parsed request type returned by the schema.
 */
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Stores the request contract used to validate values passed through this pipe.
   *
   * @param {ContractSchema<T>} schema - Schema implementation exposing safe parsing.
   */
  public constructor(private readonly schema: ContractSchema<T>) {}
  // #endregion

  // #region Methods
  /**
   * Method transform
   * @method transform
   *
   * @description
   * Parses an incoming value or throws `BadRequestException` with dot-separated field paths and messages.
   *
   * @param {unknown} value - Raw value supplied by Nest's argument pipeline.
   * @returns {T} Parsed value accepted by the controller parameter.
   * @throws {BadRequestException} When the schema reports one or more validation issues.
   */
  public transform(value: unknown): T {
    const result:
      | {
          success: false;
          error: { issues: readonly { path: readonly PropertyKey[]; message: string }[] };
        }
      | { success: true; data: T } = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        code: 'request.invalid',
        errors: result.error.issues.map(
          (issue: {
            path: readonly PropertyKey[];
            message: string;
          }): { field: string; message: string } => ({
            field: issue.path.map(String).join('.'),
            message: issue.message,
          }),
        ),
      });
    }
    return result.data;
  }
  // #endregion
}
