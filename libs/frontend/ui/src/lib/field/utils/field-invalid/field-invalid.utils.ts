import { ElementRef, Renderer2, effect, inject } from '@angular/core';
import type { FieldHost } from '@internal/ui/lib/field/models/field/field-host.interface';
import { FIELD_HOST } from '@internal/ui/lib/field/tokens/field/field.token';

/**
 * Function reflectFieldInvalid
 *
 * @description
 * Mirrors the error state of the enclosing `ui-field` on the host control as `aria-invalid="true"`,
 * so that the control's `aria-invalid:` styles and assistive technology follow the message the field
 * shows, whatever decides it (validators after a touch or a submit, server field errors). Outside a
 * field it does nothing, leaving any `[attr.aria-invalid]` binding of the template alone. Call it in
 * the injection context of a directive placed on the native control.
 */
export function reflectFieldInvalid(): void {
  const field: FieldHost | null = inject<FieldHost>(FIELD_HOST, { optional: true });
  if (!field) return;
  const element: HTMLElement = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  const renderer: Renderer2 = inject<Renderer2>(Renderer2);
  effect((): void => {
    if (field.invalid()) {
      renderer.setAttribute(element, 'aria-invalid', 'true');
    } else {
      renderer.removeAttribute(element, 'aria-invalid');
    }
  });
}
