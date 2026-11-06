import { expect, test, type Locator, type Page, type Response } from '@playwright/test';

test('redirects legacy French links while preserving their query and fragment', async ({
  page,
}: {
  page: Page;
}): Promise<void> => {
  await page.goto('/projects/library-trails?source=link#contexte');
  await expect(page).toHaveURL(/\/fr\/projects\/library-trails\?source=link#contexte$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
});

test.describe('mobile menu', (): void => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('opens as a modal, closes with Escape and gives focus back', async ({
    page,
  }: {
    page: Page;
  }): Promise<void> => {
    await page.goto('/');
    const trigger: Locator = page.getByRole('banner').getByRole('button', { name: 'Menu' });
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await trigger.click();

    const menu: Locator = page.getByRole('dialog', { name: 'Menu' });
    await expect(menu).toBeVisible();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(menu.getByRole('navigation', { name: 'Navigation principale' })).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(trigger).toBeFocused();
  });

  test('closes with its close button', async ({ page }: { page: Page }): Promise<void> => {
    await page.goto('/');
    await page.getByRole('banner').getByRole('button', { name: 'Menu' }).click();
    const menu: Locator = page.getByRole('dialog', { name: 'Menu' });
    await expect(menu).toBeVisible();
    await menu.getByRole('button', { name: 'Fermer' }).click();
    await expect(menu).toBeHidden();
  });
});

test.describe('unknown addresses (built site, Nginx routing)', (): void => {
  test('answer 404 with the French error page', async ({ page }: { page: Page }): Promise<void> => {
    const response: Response | null = await page.goto('/this-page-does-not-exist');
    expect(response?.status()).toBe(404);
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Page introuvable');
  });

  test('answer 404 with the English error page under /en/', async ({
    page,
  }: {
    page: Page;
  }): Promise<void> => {
    const response: Response | null = await page.goto('/en/this-page-does-not-exist');
    expect(response?.status()).toBe(404);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });
});

test.describe('keyboard', (): void => {
  test('the first Tab reaches the skip link to the content', async ({
    page,
  }: {
    page: Page;
  }): Promise<void> => {
    await page.goto('/');
    // The bundle marks <html> with data-app once it runs (D32): a Tab pressed before that can be lost
    // while the application starts.
    await page.locator('html[data-app]').waitFor({ state: 'attached' });

    await page.keyboard.press('Tab');
    const skip: Locator = page.getByRole('link', { name: 'Aller au contenu' });
    await expect(skip).toBeFocused();
    await skip.press('Enter');
    await expect(page).toHaveURL(/#content$/);
  });
});
