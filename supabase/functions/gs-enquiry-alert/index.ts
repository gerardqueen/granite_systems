// Granite Systems — email alert for new quote requests from the landing pages.
// Supabase Edge Function "gs-enquiry-alert" (Verify JWT on; the public anon key is enough).
// Shares the RESEND_API_KEY / ALERT_TO / ALERT_FROM secrets already set for Second Cut Stone.
// Optional: GS_ALERT_TO to send these somewhere different, GS_SITE_URL for the admin link.
//
// It ignores what it is sent and only emails enquiries that haven't been emailed yet, so
// calling it can never send anything other than a real, unsent enquiry.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const REGION: Record<string, string> = {
  fife: 'Fife', edinburgh: 'Edinburgh & Lothians', tayside: 'Dundee, Perth & Tayside', central: 'Stirling & Falkirk',
};

Deno.serve(async () => {
  const key = Deno.env.get('RESEND_API_KEY');
  const to = (Deno.env.get('GS_ALERT_TO') ?? Deno.env.get('ALERT_TO') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!key || !to.length) return json({ ok: false, reason: 'RESEND_API_KEY or ALERT_TO not set yet' });

  const from = Deno.env.get('ALERT_FROM') ?? 'Granite Systems website <onboarding@resend.dev>';
  const site = Deno.env.get('GS_SITE_URL') ?? 'https://gerardqueen.github.io/granite_systems/';
  const db = createClient(Deno.env.get('SUPABASE_URL')!, (Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SECRET_KEY'))!);

  const since = new Date(Date.now() - 14 * 864e5).toISOString();
  const { data: rows, error } = await db.from('gs_enquiries').select('*')
    .is('notified_at', null).gte('created_at', since).order('created_at').limit(20);
  if (error) return json({ ok: false, error: error.message }, 500);

  const sent: string[] = [], failed: string[] = [];
  for (const e of rows ?? []) {
    const { data: claimed } = await db.from('gs_enquiries').update({ notified_at: new Date().toISOString() })
      .eq('id', e.id).is('notified_at', null).select('id');
    if (!claimed?.length) continue;

    const area = REGION[e.region] ?? e.region ?? '';
    const subject = `Quote request: ${e.project_type ?? 'worktops'} – ${e.name} (${e.postcode ?? area})`;
    const rowsHtml = [
      ['Name', esc(e.name)],
      ['Phone', e.phone ? `<a href="tel:${esc(e.phone)}">${esc(e.phone)}</a>` : '—'],
      ['Email', `<a href="mailto:${esc(e.email)}">${esc(e.email)}</a>`],
      ['Postcode', esc(e.postcode ?? '—')],
      ['For', esc(e.project_type ?? '—')],
      ['Page', esc(area)],
      ['Message', e.message ? esc(e.message).replace(/\n/g, '<br>') : '—'],
    ].map(([k, v]) => `<tr><td style="padding:6px 12px 6px 0;color:#666;vertical-align:top;white-space:nowrap">${k}</td><td style="padding:6px 0">${v}</td></tr>`).join('');
    const html = `<div style="font-family:Arial,sans-serif;font-size:15px;color:#222;max-width:560px">
      <h2 style="color:#1e2843;margin:0 0 12px">New quote request</h2>
      <table style="border-collapse:collapse">${rowsHtml}</table>
      <p style="margin-top:18px">Reply to this email to answer the customer directly, or
      <a href="${esc(site)}admin.html">open the staff page</a> to mark it done.</p></div>`;
    const text = `New quote request\n\nName: ${e.name}\nPhone: ${e.phone ?? '-'}\nEmail: ${e.email}\nPostcode: ${e.postcode ?? '-'}\n` +
      `For: ${e.project_type ?? '-'}\nPage: ${area}\nMessage: ${e.message ?? '-'}\n\nStaff page: ${site}admin.html`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to, reply_to: e.email, subject, html, text }),
    });
    if (res.ok) sent.push(e.id);
    else {
      failed.push(`${e.id}: ${res.status} ${await res.text()}`);
      await db.from('gs_enquiries').update({ notified_at: null }).eq('id', e.id);
    }
  }
  return json({ ok: failed.length === 0, sent: sent.length, failed });
});
