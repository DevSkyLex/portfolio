import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ConfirmDialogService } from '@internal/ui/lib/confirm-dialog/confirm-dialog.service';

const flush = (): Promise<unknown> => new Promise((resolve) => setTimeout(resolve));

/**
 * Function open
 *
 * @description
 * Asks a confirmation and renders the dialog, returning the pending answer and its buttons.
 *
 * @param {Parameters<ConfirmDialogService['confirm']>[0]} options - Confirmation content.
 */
async function open(options: Parameters<ConfirmDialogService['confirm']>[0]): Promise<{
  answer: Promise<boolean>;
  dialog: Element | null;
  button: (label: string) => HTMLButtonElement | undefined;
}> {
  const answer: Promise<boolean> =
    TestBed.inject<ConfirmDialogService>(ConfirmDialogService).confirm(options);
  TestBed.inject<ApplicationRef>(ApplicationRef).tick();
  await flush();
  const dialog: Element | null = document.querySelector('[data-slot="alert-dialog-content"]');
  const button = (label: string): HTMLButtonElement | undefined =>
    [...(dialog?.querySelectorAll('button') ?? [])].find((b) => b.textContent?.trim() === label);
  return { answer, dialog, button };
}

describe('ConfirmDialogService', () => {
  it('answers true with the confirming button, styled red for a destructive action', async () => {
    const { answer, dialog, button } = await open({
      title: 'Supprimer ce message ?',
      description: 'Cette action ne peut pas être annulée.',
      confirmLabel: 'Supprimer',
      tone: 'danger',
    });
    expect(dialog?.getAttribute('role')).toBe('alertdialog');
    expect(dialog?.textContent).toContain('Cette action ne peut pas être annulée.');
    expect(document.activeElement?.textContent?.trim()).toBe('Annuler');
    expect(button('Supprimer')?.className).toContain('bg-danger');
    const footer: Element | null | undefined = dialog?.querySelector(
      '[data-slot="alert-dialog-footer"]',
    );
    expect(footer?.getAttribute('data-variant')).toBe('bar');
    expect(footer?.classList).toContain('border-t');
    expect(footer?.querySelector('[data-slot="kbd-hint"] .sr-only')?.textContent).toBe(
      'Échap : Annuler',
    );
    const header: Element | null | undefined = dialog?.querySelector(
      ':scope > [data-slot="confirm-dialog"] > [data-slot="alert-dialog-header"]',
    );
    expect(header?.getAttribute('data-variant')).toBe('bar');
    expect(header?.textContent?.trim()).toBe('Supprimer ce message ?');
    expect(dialog?.getAttribute('aria-describedby')).toBe(
      dialog?.querySelector('[data-slot="alert-dialog-description"]')?.id,
    );
    expect(dialog?.classList).toContain('gap-0');
    // The small catalogue width, and the h-8 buttons on the small-control radius (D43).
    expect(dialog?.classList).toContain('max-w-xl');
    expect(button('Supprimer')?.classList).toContain('rounded-sm');
    expect(button('Annuler')?.classList).toContain('rounded-sm');
    expect(dialog?.classList).toContain('[--dialog-inset:--spacing(6)]');
    expect(dialog?.classList).not.toContain('sm:[--dialog-inset:--spacing(8)]');
    button('Supprimer')?.click();
    await expect(answer).resolves.toBe(true);
  });

  it('answers false when cancelled, with the given labels and no description', async () => {
    const { answer, dialog, button } = await open({
      title: 'Dépublier ?',
      confirmLabel: 'Dépublier',
      cancelLabel: 'Garder',
    });
    expect(dialog?.querySelector('[data-slot="alert-dialog-description"]')).toBeNull();
    // The bars touch without a body: only the header's hairline remains.
    const footer: Element | null | undefined = dialog?.querySelector(
      '[data-slot="alert-dialog-footer"]',
    );
    expect(footer?.classList).toContain('border-t-0');
    expect(footer?.classList).not.toContain('border-t');
    expect(button('Dépublier')?.className).toContain('bg-fill');
    expect(dialog?.querySelector('[data-slot="kbd-hint"] .sr-only')?.textContent).toBe(
      'Échap : Garder',
    );
    button('Garder')?.click();
    await expect(answer).resolves.toBe(false);
  });
});

describe('ConfirmDialogService focus return', () => {
  const added: HTMLElement[] = [];
  afterEach(() => added.splice(0).forEach((element: HTMLElement): void => element.remove()));

  /**
   * Function append
   *
   * @description
   * Adds a button to the document body.
   *
   * @param {string} label - Button text.
   * @returns {HTMLButtonElement} Appended button.
   */
  const append = (label: string): HTMLButtonElement => {
    const button: HTMLButtonElement = document.createElement('button');
    button.textContent = label;
    document.body.append(button);
    added.push(button);
    return button;
  };

  it('returns the focus to the element focused at opening', async () => {
    const opener: HTMLButtonElement = append('Supprimer le message');
    opener.focus();
    const { answer, button } = await open({ title: 'Supprimer ?', confirmLabel: 'Supprimer' });
    button('Annuler')?.click();
    await expect(answer).resolves.toBe(false);
    expect(document.activeElement).toBe(opener);
  });

  it('prefers the given restoreFocus target', async () => {
    append('Ouvrir').focus();
    const target: HTMLButtonElement = append('Actions pour « Orbite »');
    const { answer, button } = await open({
      title: 'Dépublier ?',
      confirmLabel: 'Dépublier',
      restoreFocus: target,
    });
    button('Annuler')?.click();
    await answer;
    expect(document.activeElement).toBe(target);
  });

  it('falls back on the trigger of the menu whose item had the focus, then on the opener', async () => {
    const trigger: HTMLButtonElement = append('Actions');
    trigger.setAttribute('aria-controls', 'cdk-menu-7');
    const menu: HTMLDivElement = document.createElement('div');
    menu.setAttribute('role', 'menu');
    menu.id = 'cdk-menu-7';
    const item: HTMLButtonElement = document.createElement('button');
    item.textContent = 'Dépublier';
    menu.append(item);
    document.body.append(menu);
    added.push(menu);
    item.focus();
    const first: Awaited<ReturnType<typeof open>> = await open({
      title: 'Dépublier ?',
      confirmLabel: 'Dépublier',
    });
    menu.remove();
    first.button('Annuler')?.click();
    await first.answer;
    expect(document.activeElement).toBe(trigger);

    const opener: HTMLButtonElement = append('Ligne');
    const removed: HTMLButtonElement = append('Supprimer');
    removed.focus();
    const second: Awaited<ReturnType<typeof open>> = await open({
      title: 'Supprimer ?',
      confirmLabel: 'Supprimer',
      opener,
    });
    removed.remove();
    second.button('Annuler')?.click();
    await second.answer;
    expect(document.activeElement).toBe(opener);
  });
});
