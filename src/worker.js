// SkyUp ads landing page — backend on Cloudflare Workers + D1
// Routes: POST /api/lead (capture), GET /api/leads (protected export), else -> static assets

const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8' }

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)

    if (url.pathname === '/api/lead' && request.method === 'POST') {
      return handleLead(request, env, ctx)
    }
    if (url.pathname === '/api/leads' && request.method === 'GET') {
      return exportLeads(env, url)
    }
    // everything else is the static site
    return env.ASSETS.fetch(request)
  },
}

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: JSON_HEADERS })

const clean = (v, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

async function handleLead(request, env, ctx) {
  let body
  try {
    body = await request.json()
  } catch {
    return json({ ok: false, error: 'bad_json' }, 400)
  }

  // Honeypot: real users never fill this hidden field. Bots do — silently accept & drop.
  if (clean(body.company_website)) return json({ ok: true })

  const lead = {
    name: clean(body.name, 120),
    business: clean(body.business, 160),
    phone: clean(body.phone, 40),
    budget: clean(body.budget, 60),
    timeline: clean(body.timeline, 60),
    source: clean(body.source, 60) || 'ads-landing',
  }
  if (!lead.name || !lead.phone) return json({ ok: false, error: 'missing_fields' }, 400)

  const created_at = new Date().toISOString()
  const ip = request.headers.get('cf-connecting-ip') || ''
  const ua = clean(request.headers.get('user-agent') || '', 300)

  try {
    await env.DB.prepare(
      `INSERT INTO leads (created_at, name, business, phone, budget, timeline, source, ip, ua)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(created_at, lead.name, lead.business, lead.phone, lead.budget, lead.timeline, lead.source, ip, ua)
      .run()
  } catch (e) {
    return json({ ok: false, error: 'db_error' }, 500)
  }

  // Optional integrations — never block the visitor's response.
  ctx.waitUntil(forwardToCrm(env, { ...lead, created_at }))
  ctx.waitUntil(notifyTelegram(env, lead))

  return json({ ok: true })
}

// Forwards the lead to your Skyup CRM if CRM_WEBHOOK_URL is set (one secret away).
async function forwardToCrm(env, lead) {
  if (!env.CRM_WEBHOOK_URL) return
  try {
    await fetch(env.CRM_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(env.CRM_WEBHOOK_TOKEN ? { authorization: `Bearer ${env.CRM_WEBHOOK_TOKEN}` } : {}),
      },
      body: JSON.stringify(lead),
    })
  } catch (_) {
    /* swallow — the lead is already saved in D1 */
  }
}

// Pings your Telegram if TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID are set.
async function notifyTelegram(env, lead) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return
  const text =
    `🟠 New website lead\n` +
    `Name: ${lead.name}\n` +
    `Business: ${lead.business || '—'}\n` +
    `Phone: ${lead.phone}\n` +
    `Budget: ${lead.budget || '—'}\n` +
    `Start: ${lead.timeline || '—'}`
  try {
    await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text }),
    })
  } catch (_) {}
}

// Protected export so you can see leads without a dashboard:
//   /api/leads?key=YOUR_ADMIN_KEY           -> JSON
//   /api/leads?key=YOUR_ADMIN_KEY&format=csv -> CSV download
async function exportLeads(env, url) {
  const key = url.searchParams.get('key') || ''
  if (!env.ADMIN_KEY || key !== env.ADMIN_KEY) return json({ ok: false, error: 'unauthorized' }, 401)

  const { results } = await env.DB.prepare(
    `SELECT id, created_at, name, business, phone, budget, timeline, source, ip
       FROM leads ORDER BY id DESC LIMIT 2000`
  ).all()

  if (url.searchParams.get('format') === 'csv') {
    const cols = ['id', 'created_at', 'name', 'business', 'phone', 'budget', 'timeline', 'source', 'ip']
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const rows = [cols.join(',')].concat(results.map((r) => cols.map((c) => esc(r[c])).join(',')))
    return new Response(rows.join('\n'), {
      headers: {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': 'attachment; filename="skyup-leads.csv"',
      },
    })
  }
  return json({ ok: true, count: results.length, leads: results })
}
