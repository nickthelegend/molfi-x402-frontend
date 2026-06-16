import { test, expect } from '@playwright/test';

test.describe('Molfi Frontend E2E - Chat Credits Flow', () => {
  test('should view ad, claim credits, and send a message using credits', async ({ page }) => {
    // Open main frontend page
    await page.goto('/');

    // 1. Initial credit count should be 0 or check wallet
    const walletPill = page.locator('[data-testid="wallet-pill"]');
    await expect(walletPill).toBeVisible();

    // 2. Open Ad modal
    const watchAdButton = page.locator('button:has-text("Watch Ad"), button:has-text("Earn Credits")');
    await watchAdButton.click();

    // 3. Ad modal appears
    const adModal = page.locator('[data-testid="ad-viewer-modal"]');
    await expect(adModal).toBeVisible();

    // Fast-forward hook (FFwd hook ON)
    await page.evaluate(() => {
      (window as any).__molfi_test_skip_ad = true;
    });

    // Wait for claim button to be enabled
    const claimButton = page.locator('button:has-text("Claim 5 Credits")');
    await expect(claimButton).toBeEnabled({ timeout: 10000 });

    // Click claim button
    await claimButton.click();

    // Verify modal is closed and credit count updated
    await expect(adModal).not.toBeVisible();
    
    const creditsIndicator = page.locator('[data-testid="credits-balance"]');
    await expect(creditsIndicator).toContainText('5');

    // 4. Send a message using credits
    const composerInput = page.locator('textarea[placeholder*="Ask Molfi"]');
    await composerInput.fill('Verify credit spending logic.');

    const sendButton = page.locator('[data-testid="send-message-button"]');
    await sendButton.click();

    // Verify message bubble appears and response is received
    const assistantBubble = page.locator('[data-testid="assistant-message"]').last();
    await expect(assistantBubble).toBeVisible({ timeout: 15000 });

    // Verify paid-via badge is "Ad-credited"
    const paidBadge = page.locator('[data-testid="paid-via-badge"]').last();
    await expect(paidBadge).toContainText('Ad-credited');
  });
});
