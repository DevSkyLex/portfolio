import { TestBed } from '@angular/core/testing';
import { ToastService } from '@vfortin/ui';
import {
  notifySiteRebuild,
  withSiteRebuildNotice,
} from '@internal/content-web-feature-admin/lib/utils/site-rebuild/site-rebuild.utils';

describe('site rebuild utils', (): void => {
  it('makes the notice the description, or appends it to an existing one', (): void => {
    expect(withSiteRebuildNotice()).toBe(
      'Les modifications seront visibles après publication et reconstruction du site.',
    );
    expect(withSiteRebuildNotice('')).toBe(
      'Les modifications seront visibles après publication et reconstruction du site.',
    );
    expect(withSiteRebuildNotice('1 échec : La requête a échoué.')).toBe(
      '1 échec : La requête a échoué. Les modifications seront visibles après publication et reconstruction du site.',
    );
  });

  it('shows the notice once as an info toast', (): void => {
    const toasts: ToastService = TestBed.inject<ToastService>(ToastService);
    const id: string = notifySiteRebuild(toasts);
    expect(
      toasts
        .toasts()
        .map((toast): [string, string, string] => [toast.id, toast.type, toast.message]),
    ).toEqual([
      [
        id,
        'info',
        'Les modifications seront visibles après publication et reconstruction du site.',
      ],
    ]);
  });
});
