import type { ComponentType } from '@angular/cdk/portal';
import type { TemplateRef } from '@angular/core';

/**
 * Type DialogContentType
 * @type DialogContentType
 *
 * @description
 * Component or template content accepted by the CDK dialog service.
 *
 * @type {ComponentType<C> | TemplateRef<C>}
 *
 * @template C - Content context or component type.
 */
export type DialogContentType<C> = ComponentType<C> | TemplateRef<C>;
