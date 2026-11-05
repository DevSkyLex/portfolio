import { expect, test, type Locator, type Page } from '@playwright/test';
import { chooseFooterOption, endlessAnimations } from '@internal/web-e2e/support/site';

test.describe('theme', (): void => {
  test('is dark by default, switches to light and keeps the choice on the next visit', async ({
    page,
  }: {
    page: Page;
  }): Promise<void> => {
    await page.goto('/');
    const html: Locator = page.locator('html');
    await expect(html).toHaveAttribute('data-theme', 'dark');
    await chooseFooterOption(page, 'Thème', 'Clair');
    await expect(html).toHaveAttribute('data-theme', 'light');
    await page.reload();

    // Applied before the first paint by public/theme.js, from localStorage.
    await expect(html).toHaveAttribute('data-theme', 'light');
  });

  test.describe('with a light device', (): void => {
    test.use({ colorScheme: 'light' });

    test('"system" follows the device', async ({ page }: { page: Page }): Promise<void> => {
      await page.addInitScript((): void => localStorage.setItem('theme', 'system'));
      await page.goto('/');
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    });

    test('without a saved choice the site stays dark (mockup default)', async ({
      page,
    }: {
      page: Page;
    }): Promise<void> => {
      await page.goto('/');
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    });
  });
});

test.describe('language', (): void => {
  test('switches to English on the same page, then back to French', async ({
    page,
  }: {
    page: Page;
  }): Promise<void> => {
    await page.goto('/privacy');
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
    await chooseFooterOption(page, 'Langue', 'English');
    await expect(page).toHaveURL(/\/en\/privacy$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');

    await chooseFooterOption(page, 'Language', 'Français');
    await expect(page).toHaveURL(/\/fr\/privacy$/);
    await expect(page).not.toHaveURL(/\/en\//);
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  });
});

test.describe('reduced motion', (): void => {
  test.use({ reducedMotion: 'reduce' });

  test('no endless animation runs on the home page', async ({
    page,
  }: {
    page: Page;
  }): Promise<void> => {
    await page.goto('/', { waitUntil: 'load' });
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(await endlessAnimations(page)).toEqual([]);
  });

  test('the theme changes without a view transition', async ({
    page,
  }: {
    page: Page;
  }): Promise<void> => {
    await page.addInitScript((): void => {
      new MutationObserver((): void => {
        if (document.documentElement.hasAttribute('data-theme-vt')) {
          document.documentElement.dataset['sawViewTransition'] = 'true';
        }
      }).observe(document.documentElement, { attributes: true });
    });
    await page.goto('/');
    await chooseFooterOption(page, 'Thème', 'Clair');
    const html: Locator = page.locator('html');
    await expect(html).toHaveAttribute('data-theme', 'light');
    await expect(html).not.toHaveAttribute('data-saw-view-transition', 'true');
  });
});
