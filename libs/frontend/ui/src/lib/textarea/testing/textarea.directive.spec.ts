import { Component } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { TextareaDirective } from '@internal/ui/lib/textarea/textarea.directive';

/**
 * Component HostComponent
 * @class HostComponent
 *
 * @description
 * Renders a fixed-size textarea and an auto-resizing textarea for directive class assertions.
 */
@Component({
  imports: [TextareaDirective],
  template: `<textarea uiTextarea size="sm"></textarea><textarea uiTextarea autoResize></textarea>`,
})
class HostComponent {}

describe('TextareaDirective', (): void => {
  it('applies the mockup heights and the optional growth with the content', async (): Promise<void> => {
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const [small, growing] = fixture.nativeElement.querySelectorAll('[data-slot="textarea"]');
    expect(small.className).toContain('min-h-30');
    expect(small.className).not.toContain('min-h-36');
    expect(small.className).toContain('resize-y');
    expect(growing.className).toContain('min-h-42');
    expect(growing.className).toContain('field-sizing-content');
  });
});
