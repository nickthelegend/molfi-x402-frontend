# Molfi Frontend Application

Next.js App Router-based application featuring a 3-column chat shell, model picker, local ad viewer (credits claim), payment inspector, and Agent Mode toggle.

## Quickstart

1. **Install dependencies**:
   ```bash
   pnpm install
   ```
2. **Setup environment variables**:
   ```bash
   cp .env.example .env.local
   # Set the API URL and any necessary keys
   ```
3. **Run development server**:
   ```bash
   pnpm run dev
   ```

## Acceptance Checklist

- [ ] Connects to Avalanche Fuji and displays AVAX and USDC balances.
- [ ] Lets user watch ads in `<AdViewer>` and claim credits.
- [ ] Displays appropriate credit/USDC cost indicators next to models.
- [ ] Streams responses with visual indicators showing how the message was paid (💸 USDC / 🎬 Credits).
- [ ] Displays live headers and EIP-3009 signatures in the Payment Inspector rail.
- [ ] Handles silent EIP-3009 signing when Agent Mode is enabled and allowance is pre-approved.
