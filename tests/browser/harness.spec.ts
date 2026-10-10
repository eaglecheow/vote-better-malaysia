import { expect, test, type Page } from '@playwright/test';

/**
 * Checks the production application shell at the repository base; feature journeys are separate.
 * @param context - Browser page fixture; navigation changes its document.
 * @returns Resolves when the shell checks pass; rejects on assertion failure.
 */
async function checksShell({ page }: { page: Page }): Promise<void> {
  await page.goto('./');
  await expect(page).toHaveTitle('Vote Better Malaysia');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ms');
  await expect(page.locator('main#app')).toBeVisible();
}

test('harness: opens the production application shell', checksShell);
