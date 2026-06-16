# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: agent-mode-live.spec.ts >> Molfi Frontend E2E - agent-mode-live >> should trigger 3 autonomous agent payments with distinct tx hashes
- Location: playwright\agent-mode-live.spec.ts:4:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('[data-testid="agent-mode-toggle"]')

```

# Page snapshot

```yaml
- generic:
  - generic [active]:
    - generic [ref=e3]:
      - generic [ref=e4]:
        - generic [ref=e5]:
          - navigation [ref=e6]:
            - button "previous" [disabled] [ref=e7]:
              - img "previous" [ref=e8]
            - generic [ref=e10]:
              - generic [ref=e11]: 1/
              - text: "1"
            - button "next" [disabled] [ref=e12]:
              - img "next" [ref=e13]
          - img
        - generic [ref=e15]:
          - link "Next.js 15.5.19 (outdated) Webpack" [ref=e16] [cursor=pointer]:
            - /url: https://nextjs.org/docs/messages/version-staleness
            - img [ref=e17]
            - generic "An outdated version detected (latest is 16.2.9), upgrade is highly recommended!" [ref=e19]: Next.js 15.5.19 (outdated)
            - generic [ref=e20]: Webpack
          - img
      - generic [ref=e21]:
        - dialog "Runtime TypeError" [ref=e22]:
          - generic [ref=e25]:
            - generic [ref=e26]:
              - generic [ref=e27]:
                - generic [ref=e29]: Runtime TypeError
                - generic [ref=e30]:
                  - button "Copy Error Info" [ref=e31] [cursor=pointer]:
                    - img [ref=e32]
                  - button "No related documentation found" [disabled] [ref=e34]:
                    - img [ref=e35]
                  - link "Learn more about enabling Node.js inspector for server code with Chrome DevTools" [ref=e37] [cursor=pointer]:
                    - /url: https://nextjs.org/docs/app/building-your-application/configuring/debugging#server-side-code
                    - img [ref=e38]
              - paragraph [ref=e47]: Cannot read properties of undefined (reading 'call')
            - generic [ref=e50]:
              - paragraph [ref=e51]:
                - text: Call Stack
                - generic [ref=e52]: "15"
              - button "Show 15 ignore-listed frame(s)" [ref=e53] [cursor=pointer]:
                - text: Show 15 ignore-listed frame(s)
                - img [ref=e54]
          - generic [ref=e56]:
            - generic [ref=e57]: "1"
            - generic [ref=e58]: "2"
        - contentinfo [ref=e59]:
          - region "Error feedback" [ref=e60]:
            - paragraph [ref=e61]:
              - link "Was this helpful?" [ref=e62] [cursor=pointer]:
                - /url: https://nextjs.org/telemetry#error-feedback
            - button "Mark as helpful" [ref=e63] [cursor=pointer]:
              - img [ref=e64]
            - button "Mark as not helpful" [ref=e67] [cursor=pointer]:
              - img [ref=e68]
    - generic [ref=e74] [cursor=pointer]:
      - button "Open Next.js Dev Tools" [ref=e75]:
        - img [ref=e76]
      - generic [ref=e79]:
        - button "Open issues overlay" [ref=e80]:
          - generic [ref=e81]:
            - generic [ref=e82]: "0"
            - generic [ref=e83]: "1"
          - generic [ref=e84]: Issue
        - button "Collapse issues badge" [ref=e85]:
          - img [ref=e86]
  - alert [ref=e88]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Molfi Frontend E2E - agent-mode-live', () => {
  4  |   test('should trigger 3 autonomous agent payments with distinct tx hashes', async ({ page }) => {
  5  |     const clientPrivateKey = process.env.TEST_CLIENT_PRIVATE_KEY;
  6  |     if (!clientPrivateKey) {
  7  |       console.warn('⚠️ TEST_CLIENT_PRIVATE_KEY not configured. Skipping E2E live agent mode test.');
  8  |       return;
  9  |     }
  10 | 
  11 |     // Inject wallet key
  12 |     await page.addInitScript((key) => {
  13 |       (window as any).__molfi_test_wallet_key = key;
  14 |       (window as any).__molfi_test_mode = true;
  15 |     }, clientPrivateKey);
  16 | 
  17 |     await page.goto('/');
  18 | 
  19 |     // Turn on Agent Mode toggle
  20 |     const agentToggle = page.locator('[data-testid="agent-mode-toggle"]');
> 21 |     await agentToggle.click();
     |                       ^ Error: locator.click: Test timeout of 30000ms exceeded.
  22 | 
  23 |     // Verify agent address display
  24 |     const agentAddress = page.locator('[data-testid="agent-address-display"]');
  25 |     await expect(agentAddress).toBeVisible();
  26 | 
  27 |     const composerInput = page.locator('textarea[placeholder*="Ask Molfi"]');
  28 |     const sendButton = page.locator('[data-testid="send-message-button"]');
  29 | 
  30 |     const txHashes = new Set<string>();
  31 | 
  32 |     for (let i = 1; i <= 3; i++) {
  33 |       await composerInput.fill(`Autonomous query #${i}`);
  34 |       await sendButton.click();
  35 | 
  36 |       // Wait for the completion stream to start and capture payment tx
  37 |       const lastMessage = page.locator('[data-testid="assistant-message"]').last();
  38 |       await expect(lastMessage).toBeVisible({ timeout: 15000 });
  39 | 
  40 |       // Retrieve the tx hash from inspector or logs
  41 |       const txHashEl = page.locator('[data-testid="tx-hash"]').last();
  42 |       const text = await txHashEl.innerText();
  43 |       expect(text).not.toBe('');
  44 |       txHashes.add(text);
  45 |       
  46 |       // Clear input and wait a bit
  47 |       await page.waitForTimeout(2000);
  48 |     }
  49 | 
  50 |     // Verify we have 3 distinct transaction hashes
  51 |     expect(txHashes.size).toBe(3);
  52 |   });
  53 | });
  54 | 
```