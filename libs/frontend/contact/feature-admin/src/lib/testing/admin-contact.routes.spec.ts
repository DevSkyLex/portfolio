import { ADMIN_CONTACT_ROUTES } from '@internal/contact-web-feature-admin/lib/admin-contact.routes';
import { AdminInboxPageComponent } from '@internal/contact-web-feature-admin/lib/ui/pages/admin-inbox-page/admin-inbox-page.component';

describe('ADMIN_CONTACT_ROUTES', () => {
  it('shows the inbox at the root of /admin/messages', async () => {
    expect(ADMIN_CONTACT_ROUTES[0]?.path).toBe('');
    await expect(ADMIN_CONTACT_ROUTES[0]?.loadComponent?.()).resolves.toBe(AdminInboxPageComponent);
  });
});
