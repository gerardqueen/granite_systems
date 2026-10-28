// Public landing pages: live jobs + reviews, material pop-ups, and the quote form.
// Plain fetch() to Supabase's REST API so the public pages stay light (no client library).
import { SUPABASE_URL, SUPABASE_ANON_KEY, SETTINGS } from './config.js';
import { REGIONS, MATERIALS } from './regions.js';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const REGION = document.body.dataset.region;
const H = { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` };
const stars = (n) => (n ? '★'.repeat(n) + '☆'.repeat(5 - n) : '');

$$('[data-year]').forEach((e) => (e.textContent = new Date().getFullYear()));

// ---------------- Jobs ----------------
let ALL = [];
function materialOf(j) {
  if (j.material_type) return j.material_type;
  const t = (j.material || '').toLowerCase();
  return MATERIALS.find((m) => m.keywords.some((k) => t.includes(k)))?.key || null;
}
const jobTitle = (j) => j.title || [j.material, (j.job_type || 'worktops').toLowerCase()].filter(Boolean).join(' ');

async function loadJobs() {
  try {
    const q = 'select=*&published=is.true&order=featured.desc,job_date.desc.nullslast,created_at.desc&limit=200';
    const r = await fetch(`${SUPABASE_URL}/rest/v1/gs_jobs?${q}`, { headers: H });
    if (!r.ok) throw new Error(r.status);
    ALL = (await r.json()).filter((j) => j.photos?.length).map((j) => ({ ...j, mat: materialOf(j) }));
  } catch (e) { console.warn('Jobs not loaded', e); ALL = []; }
  renderWork();
  renderReviews();
  renderMaterialJobs();
}

// Every card that opens the lightbox registers its job here.
const SHOWN = [];
function card(j) {
  const i = SHOWN.push(j) - 1;
  const n = j.photos.length;
  const where = [j.town, j.region !== REGION ? REGIONS[j.region] : null].filter(Boolean).join(', ');
  return `<article class="job">
    <button class="job-photo" type="button" data-job="${i}" aria-label="View ${n} photo${n > 1 ? 's' : ''}: ${esc(jobTitle(j))}">
      <img src="${esc(j.photos[0])}" alt="${esc(jobTitle(j))}${j.town ? ' in ' + esc(j.town) : ''}" loading="lazy">
      ${n > 1 ? `<span class="count">${n} photos</span>` : ''}
    </button>
    <div class="job-body">
      <div class="job-meta">${esc(where || 'Recent job')}${j.material ? ' · ' + esc(j.material) : ''}</div>
      <h3>${esc(jobTitle(j))}</h3>
      ${j.description ? `<p>${esc(j.description)}</p>` : ''}
      ${j.review_text ? `<blockquote class="quote-line">${j.rating ? `<span class="stars" aria-label="${j.rating} out of 5">${stars(j.rating)}</span><br>` : ''}“${esc(j.review_text)}”${j.reviewer_name ? `<cite>${esc(j.reviewer_name)}</cite>` : ''}</blockquote>` : ''}
    </div>
  </article>`;
}

// The "Recent jobs" section only appears once there are real jobs to show, so a region
// page never claims work it doesn't have.
function renderWork() {
  if (!ALL.length) return;
  const here = ALL.filter((j) => j.region === REGION);
  const more = here.length < SETTINGS.minJobsPerRegion ? ALL.filter((j) => j.region !== REGION).slice(0, 6 - here.length) : [];
  const name = REGIONS[REGION];
  $('[data-work-title]').textContent = here.length ? `Recent jobs in ${name.replace(/^The /, 'the ')}` : 'Recent jobs across Scotland';
  $('[data-work-sub]').textContent = here.length
    ? 'Worktops we\'ve templated, made and fitted nearby, with what the customer said about them.'
    : `No ${name.replace(/^The /, 'the ')} jobs on here yet, so here's some of our recent work elsewhere.`;
  $('#jobs').innerHTML = (here.length ? here : more).map(card).join('');
  if (here.length && more.length) { $('#more-head').hidden = false; $('#jobs-more').innerHTML = more.map(card).join(''); }
  $('#work').hidden = false;
  $$('[data-work-link]').forEach((a) => (a.hidden = false));
}

// Customer reviews attached to jobs go first (this region's, then elsewhere), then the
// long-standing testimonials already in the page. At most 6.
function renderReviews() {
  const withReview = [...ALL.filter((j) => j.region === REGION), ...ALL.filter((j) => j.region !== REGION)].filter((j) => j.review_text);
  if (!withReview.length) return;
  const list = $('#review-list');
  list.insertAdjacentHTML('afterbegin', withReview.slice(0, 6).map((j) => `<blockquote class="review">
    ${j.rating ? `<div class="stars" aria-label="${j.rating} out of 5">${stars(j.rating)}</div>` : ''}
    <p>“${esc(j.review_text)}”</p>
    <cite>${esc(j.reviewer_name || 'Customer')}<span class="where">${esc([jobTitle(j), j.town].filter(Boolean).join(', '))}</span></cite>
  </blockquote>`).join(''));
  [...list.children].slice(6).forEach((el) => el.remove());
}

// ---------------- Material pop-ups ----------------
function renderMaterialJobs() {
  for (const box of $$('[data-mat-jobs]')) {
    const key = box.dataset.matJobs;
    const jobs = [...ALL.filter((j) => j.mat === key && j.region === REGION), ...ALL.filter((j) => j.mat === key && j.region !== REGION)].slice(0, 12);
    if (!jobs.length) continue;
    box.innerHTML = jobs.map((j) => {
      const i = SHOWN.push(j) - 1;
      return `<button class="md-job" type="button" data-job="${i}"><img src="${esc(j.photos[0])}" alt="${esc(jobTitle(j))}" loading="lazy"><span>${esc([j.material, j.town].filter(Boolean).join(' · '))}</span></button>`;
    }).join('');
    const inspo = $(`[data-mat-inspo="${key}"]`); if (inspo) inspo.hidden = true;
  }
}
document.addEventListener('click', (e) => {
  const open = e.target.closest('[data-open-mat]');
  if (open) { const d = $(`#mat-${open.dataset.openMat}`); d.showModal(); d.querySelector('.md-inner').scrollTop = 0; return; }
  const close = e.target.closest('.mat-dialog [data-close]');
  if (close) { close.closest('dialog').close(); return; }
  const quote = e.target.closest('[data-quote-mat]');
  if (quote) {
    $('#q-mat').value = quote.dataset.quoteMat;
    quote.closest('dialog').close();
  }
});
$$('.mat-dialog').forEach((d) => d.addEventListener('click', (e) => { if (e.target === d) d.close(); }));

// ---------------- Lightbox ----------------
const lb = $('#lightbox');
let cur = { job: null, i: 0 };
function show() {
  const j = cur.job; const n = j.photos.length;
  $('img', lb).src = j.photos[cur.i];
  $('img', lb).alt = jobTitle(j);
  $('.lb-cap', lb).textContent = `${jobTitle(j)}${j.town ? ' · ' + j.town : ''}${n > 1 ? ` · ${cur.i + 1}/${n}` : ''}`;
  $('.lb-prev', lb).hidden = $('.lb-next', lb).hidden = n < 2;
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-job]');
  if (!b) return;
  cur = { job: SHOWN[+b.dataset.job], i: 0 }; show(); lb.showModal();
});
$('.lb-close', lb).onclick = () => lb.close();
$('.lb-prev', lb).onclick = () => { cur.i = (cur.i - 1 + cur.job.photos.length) % cur.job.photos.length; show(); };
$('.lb-next', lb).onclick = () => { cur.i = (cur.i + 1) % cur.job.photos.length; show(); };
lb.addEventListener('click', (e) => { if (e.target === lb) lb.close(); });
lb.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft') $('.lb-prev', lb).click();
  if (e.key === 'ArrowRight') $('.lb-next', lb).click();
});
let tx = 0;
lb.addEventListener('touchstart', (e) => { tx = e.touches[0].clientX; }, { passive: true });
lb.addEventListener('touchend', (e) => { const d = e.changedTouches[0].clientX - tx; if (Math.abs(d) > 50) (d > 0 ? $('.lb-prev', lb) : $('.lb-next', lb)).click(); });

// ---------------- Quote form ----------------
const form = $('#quote');
const msg = $('.form-msg', form);
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  msg.className = 'form-msg'; msg.textContent = '';
  const f = Object.fromEntries(new FormData(form));
  if (f.company) return; // bot filled the hidden field
  let bad = null;
  for (const k of ['name', 'phone', 'postcode', 'email']) {
    const el = form.elements[k];
    const ok = el.value.trim() && (k !== 'email' || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(el.value.trim()));
    el.setAttribute('aria-invalid', ok ? 'false' : 'true');
    if (!ok && !bad) bad = el;
  }
  if (bad) { msg.className = 'form-msg err'; msg.textContent = 'Please fill in your name, phone, postcode and a valid email.'; bad.focus(); return; }

  const btn = $('button[type=submit]', form); btn.disabled = true; btn.textContent = 'Sending…';
  const matName = MATERIALS.find((m) => m.key === f.material)?.name;
  const message = [matName ? `Material: ${matName}` : null, f.message?.trim() || null].filter(Boolean).join('\n\n') || null;
  const row = {
    name: f.name.trim(), phone: f.phone.trim(), email: f.email.trim(), postcode: f.postcode.trim().toUpperCase(),
    project_type: f.project_type, message, region: REGION, page: location.pathname,
  };
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/gs_enquiries`, {
      method: 'POST', headers: { ...H, 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify(row),
    });
    if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
    // Email alert to the office. Never blocks the customer; a daily job retries anything unsent.
    fetch(`${SUPABASE_URL}/functions/v1/gs-enquiry-alert`, { method: 'POST', headers: { ...H, 'Content-Type': 'application/json' }, body: '{}' }).catch(() => {});
    form.classList.add('sent');
    msg.className = 'form-msg ok';
    msg.innerHTML = `<strong>Thanks ${esc(row.name.split(' ')[0])}, that's with us.</strong><br>We'll be in touch soon. If it's urgent, call <a href="tel:${SETTINGS.phone.replace(/\s/g, '')}">${SETTINGS.phone}</a>.`;
    $('h2', form).textContent = 'Request sent';
    form.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } catch (err) {
    console.error(err);
    const body = encodeURIComponent(`Name: ${row.name}\nPhone: ${row.phone}\nPostcode: ${row.postcode}\nFor: ${row.project_type}\n\n${row.message || ''}`);
    msg.className = 'form-msg err';
    msg.innerHTML = `Sorry, that didn't send. Please call <a href="tel:${SETTINGS.phone.replace(/\s/g, '')}">${SETTINGS.phone}</a> or <a href="mailto:${SETTINGS.email}?subject=${encodeURIComponent('Worktop quote request')}&body=${body}">email us your details</a>.`;
  } finally {
    btn.disabled = false; btn.textContent = 'Request my quote';
  }
});

loadJobs();
