// Public landing pages: live jobs + reviews for this region, and the quote form.
// Plain fetch() to Supabase's REST API so the public pages stay light (no client library).
import { SUPABASE_URL, SUPABASE_ANON_KEY, SETTINGS, REGIONS } from './config.js';

const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const REGION = document.body.dataset.region;
const H = { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` };
const stars = (n) => (n ? '★'.repeat(n) + '☆'.repeat(5 - n) : '');

document.querySelectorAll('[data-year]').forEach((e) => (e.textContent = new Date().getFullYear()));

// ---------------- Jobs ----------------
let ALL = [];
async function loadJobs() {
  const box = $('#jobs');
  box.innerHTML = '<div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div>';
  try {
    const q = 'select=id,region,town,title,job_type,material,description,photos,review_text,reviewer_name,rating,featured,job_date,created_at'
      + '&published=is.true&order=featured.desc,job_date.desc.nullslast,created_at.desc&limit=60';
    const r = await fetch(`${SUPABASE_URL}/rest/v1/gs_jobs?${q}`, { headers: H });
    if (!r.ok) throw new Error(r.status);
    ALL = (await r.json()).filter((j) => j.photos?.length);
  } catch (e) {
    console.warn('Jobs not loaded', e);
    ALL = [];
  }
  render();
}

function jobTitle(j) {
  return j.title || [j.material, (j.job_type || 'worktops').toLowerCase()].filter(Boolean).join(' ');
}

function card(j, i) {
  const n = j.photos.length;
  const where = [j.town, REGIONS[j.region] && j.region !== REGION ? REGIONS[j.region] : null].filter(Boolean).join(', ');
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

let SHOWN = [];
function render() {
  const here = ALL.filter((j) => j.region === REGION);
  let more = [];
  if (here.length < SETTINGS.minJobsPerRegion) more = ALL.filter((j) => j.region !== REGION).slice(0, 6 - here.length);
  SHOWN = [...here, ...more];
  $('#jobs').innerHTML = here.map((j, i) => card(j, i)).join('');
  $('#jobs-more').innerHTML = more.map((j, i) => card(j, here.length + i)).join('');
  $('#more-head').hidden = !(here.length && more.length);
  $('#showcase').hidden = SHOWN.length >= SETTINGS.hideShowcaseAt;
  renderReviews(here);
}

// Customer reviews attached to jobs go first (this region's, then elsewhere), then the
// long-standing testimonials already in the page.
function renderReviews(here) {
  const withReview = [...here, ...ALL.filter((j) => j.region !== REGION)].filter((j) => j.review_text);
  if (!withReview.length) return;
  const list = $('#review-list');
  const html = withReview.slice(0, 6).map((j) => `<blockquote class="review">
    ${j.rating ? `<div class="stars" aria-label="${j.rating} out of 5">${stars(j.rating)}</div>` : ''}
    <p>“${esc(j.review_text)}”</p>
    <cite>${esc(j.reviewer_name || 'Customer')}<span class="where">${esc([jobTitle(j), j.town].filter(Boolean).join(', '))}</span></cite>
  </blockquote>`).join('');
  list.insertAdjacentHTML('afterbegin', html);
  // keep the grid tidy: at most 6 cards
  [...list.children].slice(6).forEach((el) => el.remove());
}

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
  const row = {
    name: f.name.trim(), phone: f.phone.trim(), email: f.email.trim(), postcode: f.postcode.trim().toUpperCase(),
    project_type: f.project_type, message: f.message?.trim() || null, region: REGION, page: location.pathname,
  };
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/gs_enquiries`, {
      method: 'POST', headers: { ...H, 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify(row),
    });
    if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
    // Email alert to the office. Never blocks the customer; the alert function retries unsent ones.
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
