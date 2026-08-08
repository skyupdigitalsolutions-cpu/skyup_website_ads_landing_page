# Backend setup — lead capture (Cloudflare Worker + D1)

The form now POSTs to `/api/lead`. A Worker (`src/worker.js`) validates it, saves it to a
Cloudflare **D1** database, and can optionally forward it to your CRM and ping you on Telegram.
Everything deploys with the site — no separate server.

## One-time setup

```bash
# 1. Log in (once)
npx wrangler login

# 2. Create the leads database
npx wrangler d1 create skyup-leads
#    -> copy the "database_id" it prints into wrangler.jsonc (replace REPLACE_WITH_YOUR_D1_ID)

# 3. Create the table (remote = production DB)
npx wrangler d1 execute skyup-leads --remote --file=./schema.sql

# 4. Set a key so only you can read the leads export
npx wrangler secret put ADMIN_KEY
#    -> type any long random string; you'll use it in the URL below
```

That's the minimum. Deploy:

```bash
npm run deploy        # = npm run build && wrangler deploy
```

## View your leads (no dashboard needed)

```
https://<your-domain>/api/leads?key=YOUR_ADMIN_KEY               # JSON
https://<your-domain>/api/leads?key=YOUR_ADMIN_KEY&format=csv    # CSV download
```

## Optional add-ons (each is just a secret — leave unset to skip)

**Forward every lead into your Skyup CRM:**
```bash
npx wrangler secret put CRM_WEBHOOK_URL       # your CRM endpoint that accepts a JSON lead
npx wrangler secret put CRM_WEBHOOK_TOKEN     # optional; sent as: Authorization: Bearer <token>
```
The Worker POSTs `{ name, business, phone, budget, timeline, source, created_at }` to that URL.
The lead is already saved in D1 first, so a CRM hiccup never loses it.

**Instant Telegram alert on each lead:**
```bash
npx wrangler secret put TELEGRAM_BOT_TOKEN    # from @BotFather
npx wrangler secret put TELEGRAM_CHAT_ID      # your chat/group id
```

## Deploying via GitHub → Cloudflare (instead of local)

If Cloudflare builds from your repo:
- Keep the D1 binding in `wrangler.jsonc` (with the real `database_id`) — it's committed, so the
  build picks it up.
- Set the secrets (`ADMIN_KEY`, and any optional ones) in the Cloudflare dashboard:
  **Workers & Pages → your Worker → Settings → Variables and Secrets**. Secrets are never committed.

## Local testing

- `npm run dev` runs the **front-end only** (Vite). The `/api/lead` call will 404 there — that's fine,
  the form still shows the thank-you screen (the WhatsApp link is the fallback).
- To test the **backend** locally, use `npm run cf:dev` (builds + `wrangler dev`), and create a local
  table first: `npx wrangler d1 execute skyup-leads --local --file=./schema.sql`.

## Spam protection

A hidden honeypot field already blocks basic bots. If ad traffic brings junk leads, add
Cloudflare **Turnstile** (free) — say the word and I'll wire the widget + server-side check.
