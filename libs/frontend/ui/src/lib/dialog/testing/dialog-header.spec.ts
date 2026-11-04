import { ApplicationRef, Component, type Signal, type TemplateRef, viewChild } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import {
  DialogDescriptionDirective,
  DialogFooterDirective,
  DialogHeaderDirective,
  DialogTitleDirective,
} from '@internal/ui/lib/dialog/directives/dialog-parts/dialog-parts.directive';
import { DialogService } from '@internal/ui/lib/dialog/dialog.service';

/**
 * Class HostComponent
 * @class HostComponent
 *
 * @description
 * Renders the default header and a dialog template with a header bar, a body and a footer bar.
 */
@Component({
  imports: [
    DialogDescriptionDirective,
    DialogFooterDirective,
    DialogHeaderDirective,
    DialogTitleDirective,
  ],
  template: `
    <div uiDialogHeader id="default"><h2 uiDialogTitle>Title</h2></div>
    <ng-template #content>
      <div uiDialogHeader variant="bar">
        <h2 uiDialogTitle>Edit</h2>
        <p uiDialogDescription>Change the profile.</p>
      </div>
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

describe('DialogHeaderDirective', () => {
  afterEach(() => TestBed.inject<DialogService>(DialogService).closeAll());

  it('keeps the stacked header with close-button clearance by default', async () => {
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const header: HTMLElement = fixture.nativeElement.querySelector('#default');
    expect(header.getAttribute('data-slot')).toBe('dialog-header');
    expect(header.getAttribute('data-variant')).toBe('default');
    expect(header.className).toBe('flex flex-col gap-2 pr-8 text-left');
  });

  it('draws a header bar flush with the top edges, keeping the labels and centring the close button', async () => {
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    TestBed.inject<DialogService>(DialogService).open(fixture.componentInstance.content());
    await TestBed.inject<ApplicationRef>(ApplicationRef).whenStable();

    const panel: HTMLElement | null = document.querySelector('[data-slot="dialog-content"]');
    const header: HTMLElement | null | undefined = panel?.querySelector(
      ':scope > [data-slot="dialog-header"]',
    );
    expect(header?.getAttribute('data-variant')).toBe('bar');
    for (const name of [
      '-mx-(--dialog-inset)',
      '-mt-(--dialog-inset)',
      'min-h-13',
      'border-b',
      'border-border',
      'px-[max(--spacing(4),var(--dialog-inset))]',
      'pr-14',
      'text-left',
    ]) {
      expect(header?.classList).toContain(name);
    }
    // The bar keeps the panel's own surface: no fill of its own.
    expect(header?.className).not.toMatch(/\bbg-/);
    expect(header?.classList).not.toContain('pr-8');

    const title: Element | null | undefined = header?.querySelector('[data-slot="dialog-title"]');
    expect(panel?.getAttribute('aria-labelledby')).toBe(title?.id);
    expect(panel?.getAttribute('aria-describedby')).toBe(
      header?.querySelector('[data-slot="dialog-description"]')?.id,
    );
    const close: HTMLElement | null | undefined = panel?.querySelector(
      ':scope > [data-slot="dialog-close"]',
    );
    expect(close?.className).toContain(
      '[:has([data-slot=dialog-header][data-variant=bar])>&]:top-2',
    );
  });
});
