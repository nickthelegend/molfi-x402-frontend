# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: chat-credits.spec.ts >> Molfi Frontend E2E - Chat Credits Flow >> should view ad, claim credits, and send a message using credits
- Location: playwright\chat-credits.spec.ts:4:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('[data-testid="wallet-pill"]')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('[data-testid="wallet-pill"]')

```

```yaml
- text: Internal Server Error
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Molfi Frontend E2E - Chat Credits Flow', () => {
  4  |   test('should view ad, claim credits, and send a message using credits', async ({ page }) => {
  5  |     // Open main frontend page
  6  |     await page.goto('/');
  7  | 
  8  |     // 1. Initial credit count should be 0 or check wallet
  9  |     const walletPill = page.locator('[data-testid="wallet-pill"]');
> 10 |     await expect(walletPill).toBeVisible();
     |                              ^ Error: expect(locator).toBeVisible() failed
  11 | 
  12 |     // 2. Open Ad modal
  13 |     const watchAdButton = page.locator('button:has-text("Watch Ad"), button:has-text("Earn Credits")');
  14 |     await watchAdButton.click();
  15 | 
  16 |     // 3. Ad modal appears
  17 |     const adModal = page.locator('[data-testid="ad-viewer-modal"]');
  18 |     await expect(adModal).toBeVisible();
  19 | 
  20 |     // Fast-forward hook (FFwd hook ON)
  21 |     await page.evaluate(() => {
  22 |       (window as any).__molfi_test_skip_ad = true;
  23 |     });
  24 | 
  25 |     // Wait for claim button to be enabled
  26 |     const claimButton = page.locator('button:has-text("Claim 5 Credits")');
  27 |     await expect(claimButton).toBeEnabled({ timeout: 10000 });
  28 | 
  29 |     // Click claim button
  30 |     await claimButton.click();
  31 | 
  32 |     // Verify modal is closed and credit count updated
  33 |     await expect(adModal).not.toBeVisible();
  34 |     
  35 |     const creditsIndicator = page.locator('[data-testid="credits-balance"]');
  36 |     await expect(creditsIndicator).toContainText('5');
  37 | 
  38 |     // 4. Send a message using credits
  39 |     const composerInput = page.locator('textarea[placeholder*="Ask Molfi"]');
  40 |     await composerInput.fill('Verify credit spending logic.');
  41 | 
  42 |     const sendButton = page.locator('[data-testid="send-message-button"]');
  43 |     await sendButton.click();
  44 | 
  45 |     // Verify message bubble appears and response is received
  46 |     const assistantBubble = page.locator('[data-testid="assistant-message"]').last();
  47 |     await expect(assistantBubble).toBeVisible({ timeout: 15000 });
  48 | 
  49 |     // Verify paid-via badge is "Ad-credited"
  50 |     const paidBadge = page.locator('[data-testid="paid-via-badge"]').last();
  51 |     await expect(paidBadge).toContainText('Ad-credited');
  52 |   });
  53 | });
  54 | 
```