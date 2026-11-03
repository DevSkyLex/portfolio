import type { Mock } from 'vitest';
import type { Toast } from '@internal/ui/lib/sonner/models/toast/toast.interface';

import { Component } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { ToastService } from '@internal/ui/lib/sonner/services/toast/toast.service';
import { ToasterComponent } from '@internal/ui/lib/sonner/components/toaster/toaster.component';

/**
 * Component HostComponent
 * @class HostComponent
 *
 * @description
 * Renders a toaster limited to two visible notifications for queue-order assertions.
 */
@Component({
  imports: [ToasterComponent],
  template: `<ui-toaster [visibleToasts]="2" />`,
})
class HostComponent {}

/**
 * Function wait
 *
 * @description
 * Resolves after the requested delay so toast countdown behavior can elapse in real time.
 *
 * @param {number} ms - Delay in milliseconds.
 * @returns {Promise<void>} Resolves after the delay.
 */
const wait = (ms: number): Promise<unknown> =>
  new Promise((resolve: (value: unknown) => void): NodeJS.Timeout => setTimeout(resolve, ms));

/**
 * Function setup
 *
 * @description
 * Creates and stabilizes the toaster fixture, returning its host and singleton toast service.
 *
 * @returns Fixture, toaster element and toast service.
 */
async function setup(): Promise<{
  fixture: ComponentFixture<HostComponent>;
  toaster: HTMLElement;
  service: ToastService;
}> {
  const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
  await fixture.whenStable();
  const toaster: HTMLElement = fixture.nativeElement.querySelector('ui-toaster');
  return { fixture, toaster, service: TestBed.inject<ToastService>(ToastService) };
}

/**
 * Function toasts
 *
 * @description
 * Returns toast elements currently rendered inside the toaster host.
 *
 * @param {HTMLElement} toaster - Host element containing rendered notifications.
 * @returns {HTMLElement[]} Rendered toast entry elements in DOM order.
 */
function toasts(toaster: HTMLElement): HTMLElement[] {
  return [...toaster.querySelectorAll<HTMLElement>('[data-slot="toast"]')];
}

describe('ToasterComponent', (): void => {
  afterEach((): void => TestBed.inject<ToastService>(ToastService).dismiss());

  it('renders a labelled region, polite toasts for success and assertive ones for errors', async (): Promise<void> => {
    const { fixture, toaster, service } = await setup();
    expect(toaster.getAttribute('role')).toBe('region');
    expect(toaster.getAttribute('aria-label')).toBe('Notifications');
    expect(toaster.className).toContain('bottom-4');

    service.success('Message sent', { description: 'Reply within 48 hours.' });
    service.error('Sending failed');
    await fixture.whenStable();

    const [sent, failed] = toasts(toaster) as [HTMLElement, HTMLElement];
    expect(sent.getAttribute('role')).toBe('status');
    expect(sent.textContent).toContain('Reply within 48 hours.');
    expect(failed.getAttribute('role')).toBe('alert');
    expect(failed.textContent).toContain('Sending failed');
  });

  it('keeps only the newest toasts visible and dismisses with the close button', async (): Promise<void> => {
    const { fixture, toaster, service } = await setup();
    service.show('One');
    service.show('Two');
    service.show('Three');
    await fixture.whenStable();
    expect(
      toasts(toaster).map(
        (toast: HTMLElement): string | undefined => toast.querySelector('p')?.textContent,
      ),
    ).toEqual(['Two', 'Three']);

    const close: HTMLButtonElement | null | undefined =
      toasts(toaster)[1]?.querySelector<HTMLButtonElement>('button[aria-label]');
    expect(close?.getAttribute('aria-label')).toBe('Fermer la notification');
    close?.click();
    await fixture.whenStable();
    expect(service.toasts().map((toast: Toast): string => toast.message)).toEqual(['One', 'Two']);
  });

  it('runs the action then dismisses the toast', async (): Promise<void> => {
    const { fixture, toaster, service } = await setup();
    const undo: Mock<() => void> = vi.fn<() => void>();
    service.show('Project deleted', { action: { label: 'Undo', onClick: undo } });
    await fixture.whenStable();
    toasts(toaster)[0]?.querySelector<HTMLButtonElement>('button')?.click();
    await fixture.whenStable();
    expect(undo).toHaveBeenCalledOnce();
    expect(toasts(toaster)).toHaveLength(0);
  });

  it('dismisses after the duration, paused while the toaster is hovered', async (): Promise<void> => {
    const { fixture, toaster, service } = await setup();
    service.show('Saved', { duration: 40 });
    toaster.dispatchEvent(new MouseEvent('pointerenter'));
    await wait(60);
    expect(service.toasts()).toHaveLength(1);

    toaster.dispatchEvent(new MouseEvent('pointerleave'));
    await wait(60);
    await fixture.whenStable();
    expect(service.toasts()).toHaveLength(0);
    expect(toasts(toaster)).toHaveLength(0);
  });

  it('stays paused while the focus moves between toasts, and resumes once it leaves', async (): Promise<void> => {
    const { fixture, toaster, service } = await setup();
    service.show('Saved', {
      duration: 40,
      action: { label: 'Undo', onClick: (): undefined => undefined },
    });
    await fixture.whenStable();
    const [action, close] = [
      ...(toasts(toaster)[0]?.querySelectorAll<HTMLButtonElement>('button') ?? []),
    ];
    if (!action || !close) throw new Error('toast buttons missing');
    const outside: HTMLButtonElement = document.createElement('button');
    document.body.append(outside);
    try {
      toaster.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      toaster.dispatchEvent(new FocusEvent('focusout', { relatedTarget: close }));
      await wait(60);
      expect(service.toasts()).toHaveLength(1);

      toaster.dispatchEvent(new FocusEvent('focusout', { relatedTarget: outside }));
      await wait(60);
      expect(service.toasts()).toHaveLength(0);

      service.show('Again', { duration: 40 });
      toaster.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));

      // Focus leaving the window: no related target.
      toaster.dispatchEvent(new FocusEvent('focusout'));
      await wait(60);
      expect(service.toasts()).toHaveLength(0);
    } finally {
      outside.remove();
    }
  });

  it('replaces a toast shown again with the same id', async (): Promise<void> => {
    const { service } = await setup();
    service.show('Uploading…', { id: 'upload', duration: Infinity });
    service.success('Uploaded', { id: 'upload' });
    expect(service.toasts()).toEqual([
      expect.objectContaining({ id: 'upload', type: 'success', message: 'Uploaded' }),
    ]);
  });
});
