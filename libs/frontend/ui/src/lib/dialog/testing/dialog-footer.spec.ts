import { ApplicationRef, Component, type Signal, type TemplateRef, viewChild } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { DialogFooterDirective } from '@internal/ui/lib/dialog/directives/dialog-parts/dialog-parts.directive';
import { DialogService } from '@internal/ui/lib/dialog/dialog.service';

/**
 * Class HostComponent
 * @class HostComponent
 *
 * @description
 * Renders the default footer, a bar footer and a bar footer with a caller padding, plus a dialog
 * template holding a bar footer.
 */
@Component({
  imports: [DialogFooterDirective],
  template: `
    <div uiDialogFooter id="actions"><button type="button">Save</button></div>
    <div uiDialogFooter variant="bar" id="bar"><button type="button">Save</button></div>
    <div uiDialogFooter variant="bar" class="px-3" id="custom"></div>
    <ng-template #content>
      <p>Body</p>
      <div uiDialogFooter variant="bar"><button type="button">Save</button></div>
    </ng-template>
  `,
})
class HostComponent {
  // #region Properties
  /**
   * Property content
   * @readonly
   *
   * @description
   * Dialog template opened through the service.
   *
   * @type {Signal<TemplateRef<unknown>>}
   */
  public readonly content: Signal<TemplateRef<unknown>> =
    viewChild.required<TemplateRef<unknown>>('content');
  // #endregion
}

describe('DialogFooterDirective', () => {
  afterEach(() => TestBed.inject<DialogService>(DialogService).closeAll());

  it('keeps the responsive action row by default', async () => {
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const footer: HTMLElement = fixture.nativeElement.querySelector('#actions');
    expect(footer.getAttribute('data-slot')).toBe('dialog-footer');
    expect(footer.getAttribute('data-variant')).toBe('actions');
    expect(footer.className).toBe(
      'flex flex-col-reverse gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end',
    );
  });

  it('draws the bar flush with the panel edges on the panel surface, wrapping its content', async () => {
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const bar: HTMLElement = fixture.nativeElement.querySelector('#bar');
    expect(bar.getAttribute('data-variant')).toBe('bar');
    for (const name of [
      '-mx-(--dialog-inset)',
      '-mb-(--dialog-inset)',
      'sticky',
      '-bottom-(--dialog-inset)',
      'flex-wrap',
      'border-t',
      'border-border',
      'bg-surface-raised',
      'px-[max(--spacing(4),var(--dialog-inset))]',
      'py-2.5',
      'min-h-13',
    ]) {
      expect(bar.classList).toContain(name);
    }
    expect(bar.classList).not.toContain('bottom-0');
    expect(bar.classList).not.toContain('flex-col-reverse');
    expect(bar.classList).not.toContain('bg-surface-sunk');

    const custom: HTMLElement = fixture.nativeElement.querySelector('#custom');
    expect(custom.classList).toContain('px-3');
    expect(custom.classList).not.toContain('px-[max(--spacing(4),var(--dialog-inset))]');
  });

  it('sits in a panel padded by the inset that the bar cancels, overridable by the caller', async () => {
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    TestBed.inject<DialogService>(DialogService).open(fixture.componentInstance.content(), {
      ariaLabel: 'Bar',
      class: 'sm:[--dialog-inset:--spacing(6)]',
    });
    await TestBed.inject<ApplicationRef>(ApplicationRef).whenStable();

    const panel: HTMLElement | null = document.querySelector('[data-slot="dialog-content"]');
    expect(panel?.classList).toContain('p-(--dialog-inset)');
    expect(panel?.classList).toContain('[--dialog-inset:--spacing(6)]');
    expect(panel?.classList).toContain('sm:[--dialog-inset:--spacing(6)]');
    expect(panel?.classList).not.toContain('sm:[--dialog-inset:--spacing(8)]');
    expect(panel?.classList).toContain('overflow-y-auto');
    expect(panel?.classList).toContain('rounded-xl');
    expect(panel?.querySelector(':scope > [data-slot="dialog-footer"]')?.className).toContain(
      'bg-surface-raised',
    );
  });
});
