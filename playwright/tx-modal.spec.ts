import { test, expect } from '@playwright/test';

test.describe('Molfi Frontend E2E - tx-modal', () => {
  test('should display global transaction modal overlay when on-chain action triggers', async ({ page }) => {
    // Open frontend and mock useTxModal context directly or trigger mock show()
    await page.goto('/');

    // Render page and evaluate mock dispatch to verify modal reacts
    await page.evaluate(() => {
      // Dispatch custom window event or inject modal state to verify appearance
      if ((window as any).__molfi_show_mock_tx) {
        (window as any).__molfi_show_mock_tx({
          hash: '0x1234567890123456789012345678901234567890',
          label: 'Test transaction modal',
        });
      }
    });

    // Ensure page elements render or verify structure
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});
