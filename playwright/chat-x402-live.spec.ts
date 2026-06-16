import { test, expect } from '@playwright/test';

test.describe('Molfi Frontend E2E - chat-x402-live', () => {
  test('should settle payment via EIP-3009 signature, show transaction modal and stream chat completions', async ({ page }) => {
    const clientPrivateKey = process.env.TEST_CLIENT_PRIVATE_KEY;
    if (!clientPrivateKey) {
      console.warn('⚠️ TEST_CLIENT_PRIVATE_KEY not configured. Skipping E2E live Fuji test.');
      return;
    }

    // Enable E2E wallet injection flag
    await page.addInitScript((key) => {
      (window as any).__molfi_test_wallet_key = key;
      (window as any).__molfi_test_mode = true;
    }, clientPrivateKey);

    await page.goto('/');

    // 1. Send query that triggers x402 payment
    const composerInput = page.locator('textarea[placeholder*="Ask Molfi"]');
    await composerInput.fill('Calculate x402 E2E workflow.');

    const sendButton = page.locator('[data-testid="send-message-button"]');
    await sendButton.click();

    // 2. Global transaction modal should display on screen
    const txModal = page.locator('[data-testid="global-tx-modal"]');
    await expect(txModal).toBeVisible({ timeout: 15000 });
    
    // Status should be pending, then transition to success
    await expect(txModal.locator('[data-testid="tx-status"]')).toContainText('pending');
    await expect(txModal.locator('[data-testid="tx-status"]')).toContainText('success', { timeout: 35000 });

    // monospaced transaction hash is visible
    const txHash = page.locator('[data-testid="tx-hash"]');
    await expect(txHash).toBeVisible();

    // click Snowtrace link
    const snowtraceLink = page.locator('a:has-text("Open in Snowtrace")');
    await expect(snowtraceLink).toHaveAttribute('href', /testnet\.snowtrace\.io/);

    // 3. Completions response stream displays
    const assistantBubble = page.locator('[data-testid="assistant-message"]').last();
    await expect(assistantBubble).toBeVisible();
    await expect(assistantBubble).not.toBeEmpty();

    const paidBadge = page.locator('[data-testid="paid-via-badge"]').last();
    await expect(paidBadge).toContainText('USDC tx');
  });
});
