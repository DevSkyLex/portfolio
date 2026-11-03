import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

// No services run behind the static server: the session refresh fails, as for a visitor.
test.describe('admin without a session', (): void => {
  test('the admin root redirects to the login page', async ({
    page,
  }: {
    page: Page;
  }): Promise<void> => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin\/login(\?|$)/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Administration');
  });

  test('the login form is labelled and reachable with the keyboard', async ({
    page,
  }: {
    page: Page;
  }): Promise<void> => {
    await page.goto('/admin/login');
    const email: Locator = page.getByLabel('Adresse e-mail');
    await email.focus();
    await expect(email).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByLabel('Mot de passe')).toBeFocused();
    await expect(page.getByRole('button', { name: 'Se connecter' })).toBeEnabled();
  });

  test('the login page has no serious axe violation', async ({
    page,
  }: {
    page: Page;
  }): Promise<void> => {
    await page.goto('/admin/login');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const results: Awaited<ReturnType<AxeBuilder['analyze']>> = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    const serious: string[] = results.violations
      .filter(
        (v: (typeof results.violations)[number]): boolean =>
          v.impact === 'serious' || v.impact === 'critical',
      )
      .map(
        (v: (typeof results.violations)[number]): string =>
          `${v.id} (${v.nodes.length}): ${v.help}`,
      );
    expect(serious).toEqual([]);
  });
});
