import { test, expect } from '@playwright/test';

test.describe('Molfi Frontend E2E - agent-mode-live', () => {
  test('should trigger 3 autonomous agent payments with distinct tx hashes', async ({ page }) => {
    const clientPrivateKey = process.env.TEST_CLIENT_PRIVATE_KEY;
    if (!clientPrivateKey) {
      console.warn('⚠️ TEST_CLIENT_PRIVATE_KEY not configured. Skipping E2E live agent mode test.');
      return;
    }

    // Inject wallet key
    await page.addInitScript((key) => {
      (window as any).__molfi_test_wallet_key = key;
      (window as any).__molfi_test_mode = true;
    }, clientPrivateKey);

    await page.goto('/');

    // Turn on Agent Mode toggle
    const agentToggle = page.locator('[data-testid="agent-mode-toggle"]');
    await agentToggle.click();

    // Verify agent address display
    const agentAddress = page.locator('[data-testid="agent-address-display"]');
    await expect(agentAddress).toBeVisible();

    const composerInput = page.locator('textarea[placeholder*="Ask Molfi"]');
    const sendButton = page.locator('[data-testid="send-message-button"]');

    const txHashes = new Set<string>();

    for (let i = 1; i <= 3; i++) {
      await composerInput.fill(`Autonomous query #${i}`);
      await sendButton.click();

      // Wait for the completion stream to start and capture payment tx
      const lastMessage = page.locator('[data-testid="assistant-message"]').last();
      await expect(lastMessage).toBeVisible({ timeout: 15000 });

      // Retrieve the tx hash from inspector or logs
      const txHashEl = page.locator('[data-testid="tx-hash"]').last();
      const text = await txHashEl.innerText();
      expect(text).not.toBe('');
      txHashes.add(text);
      
      // Clear input and wait a bit
      await page.waitForTimeout(2000);
    }

    // Verify we have 3 distinct transaction hashes
    expect(txHashes.size).toBe(3);
  });
});
