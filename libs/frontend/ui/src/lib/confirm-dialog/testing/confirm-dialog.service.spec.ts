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
    expect(button('Dépublier')?.className).toContain('bg-star');
    button('Garder')?.click();
    await expect(answer).resolves.toBe(false);
  });
});
