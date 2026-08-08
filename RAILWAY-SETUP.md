# Deploy on Railway (Express + MongoDB Atlas)

This runs the **whole thing on Railway**: one Express service (`server.js`) serves the built
site *and* the `/api/lead` API. Leads are stored in **MongoDB Atlas** (your existing stack).

## 1. Push the code
```bash
git add .
git commit -m "Add Railway backend (Express + MongoDB)"
git push
```

## 2. Create the Railway service
1. Railway → **New Project → Deploy from GitHub repo** → pick `skyup_website_ads_landing_page`.
2. Railway reads `railway.json` and will: `npm install` → `npm run build` → `npm start`.

## 3. Set Variables (Railway → your service → Variables)
| Variable | Value |
|---|---|
| `MONGODB_URI` | your Atlas connection string (`mongodb+srv://user:pass@cluster.../`) |
| `MONGODB_DB` | `skyup` (or any db name) |
| `LEADS_COLLECTION` | `website_leads` |
| `ADMIN_KEY` | any long random string (to view leads) |

Optional:
| `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` | instant alert on each lead |
| `CRM_WEBHOOK_URL` (+ `CRM_WEBHOOK_TOKEN`) | forward each lead into your CRM |

> You do **not** set `PORT` — Railway provides it and the server reads `process.env.PORT`.

## 4. IMPORTANT — let Atlas accept Railway
Railway IPs are dynamic, so in **MongoDB Atlas → Network Access**, add `0.0.0.0/0`
(allow from anywhere). Without this, the server can't reach your database and every
lead POST returns a 500.

## 5. Get a public URL
Railway → service → **Settings → Networking → Generate Domain**. That's your live site.

## 6. Test
- Open the URL, complete the form (budget → timeline → name + phone → submit).
- View leads: `https://<your-railway-domain>/api/leads?key=YOUR_ADMIN_KEY`
  (add `&format=csv` to download).

---

### Notes
- `server.js` (Railway) and `src/worker.js` + `wrangler.jsonc` (Cloudflare) both live in this repo.
  Railway uses `server.js`; Cloudflare uses the worker. Deploying to Railway ignores the Cloudflare
  files, so they're harmless — delete them if you want Railway to be the only target.
- The front-end posts to a **relative** `/api/lead`, so it works the same whether served by Railway
  or Cloudflare — no code change needed.
- To feed leads into your existing CRM `leads` collection with its own schema/nurture triggers,
  prefer `CRM_WEBHOOK_URL` (hit the CRM's intake endpoint) rather than pointing `LEADS_COLLECTION`
  straight at it.
