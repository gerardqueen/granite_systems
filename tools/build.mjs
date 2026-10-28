// Builds the Scotland hub page (/) and one page per region from data/regions.json + data/materials.json.
//   node tools/build.mjs
// Runs automatically on GitHub (see .github/workflows/build-pages.yml): whenever the data files
// change, and every couple of hours to pick up newly added jobs.
//
// A region page only goes "live" (indexable, in the Areas menu and sitemap) once it has at least
// site.activateAt published jobs. Until then it still exists (handy for ads or links) but is
// noindex and not linked, so Google never sees thin, near-identical "doorway" pages. Live pages
// get their jobs written into the HTML, so search engines see real local content.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { site, hub: HUB, regions, redirects = {} } = JSON.parse(readFileSync(join(root, 'data/regions.json'), 'utf8'));
const MATERIALS = JSON.parse(readFileSync(join(root, 'data/materials.json'), 'utf8'));
const C = {
  phone: '01592 654386', tel: '+441592654386', email: 'sales@granitesystems.co.uk',
  street: 'Unit 6 Randolph Court, Randolph Industrial Estate', town: 'Kirkcaldy', county: 'Fife', postcode: 'KY1 2YY',
  youtube: 'YFNAMImGvX0',
};
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
// H1 wording where the full region name is too long for a headline.
const H1NAME = { central: 'Stirling & Falkirk', highlands: 'Inverness & the Highlands', glasgow: 'Glasgow', ayrshire: 'Ayrshire' };

// ---------- Published jobs from Supabase ----------
const cfg = readFileSync(join(root, 'js/config.js'), 'utf8');
const SB_URL = cfg.match(/SUPABASE_URL = '([^']+)'/)[1];
const SB_KEY = cfg.match(/SUPABASE_ANON_KEY = '([^']+)'/)[1];
let JOBS = [];
if (process.env.MOCK_JOBS) JOBS = JSON.parse(readFileSync(process.env.MOCK_JOBS, 'utf8')); // local preview only
else try {
  const r = await fetch(`${SB_URL}/rest/v1/gs_jobs?select=*&published=is.true&order=featured.desc,job_date.desc.nullslast,created_at.desc&limit=500`,
    { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  JOBS = (await r.json()).filter((j) => j.photos?.length);
} catch (e) {
  // On GitHub a failed fetch must stop the build, or every region would be switched off.
  if (process.env.CI) { console.error('Could not load jobs:', e.message); process.exit(1); }
  console.warn('Jobs not loaded (offline?) — building as if there are none:', e.message);
}
const COUNTS = Object.fromEntries(regions.map((r) => [r.slug, JOBS.filter((j) => j.region === r.slug).length]));
const activateAt = site.activateAt ?? 1;
const isLive = (r) => r.slug === 'scotland' || COUNTS[r.slug] >= activateAt;
const LIVE = regions.filter(isLive);
const REGION_NAME = Object.fromEntries(regions.map((r) => [r.slug, cap(r.name)]));

const jobTitle = (j) => j.title || [j.material, (j.job_type || 'worktops').toLowerCase()].filter(Boolean).join(' ');
function workFor(slug) {
  if (!JOBS.length) return { main: [], more: [], title: 'Recent jobs', sub: '' };
  if (slug === 'scotland') return { main: JOBS.slice(0, 9), more: [], title: 'Recent jobs across Scotland', sub: 'Worktops we\'ve templated, made and fitted, with what the customer said about them.' };
  const here = JOBS.filter((j) => j.region === slug);
  const others = JOBS.filter((j) => j.region !== slug);
  const name = REGION_NAME[slug].replace(/^The /, 'the ');
  if (!here.length) return { main: others.slice(0, 6), more: [], title: 'Recent jobs across Scotland', sub: `No ${name} jobs on here yet, so here's some of our recent work elsewhere.` };
  return { main: here, more: here.length < 3 ? others.slice(0, 6 - here.length) : [], title: `Recent jobs in ${name}`, sub: 'Worktops we\'ve templated, made and fitted nearby, with what the customer said about them.' };
}
const stars = (n) => (n ? '★'.repeat(n) + '☆'.repeat(5 - n) : '');
function jobCard(j) {
  const n = j.photos.length;
  return `<article class="job">
    <button class="job-photo" type="button" data-job="${esc(j.id)}" aria-label="View ${n} photo${n > 1 ? 's' : ''}: ${esc(jobTitle(j))}">
      <img src="${esc(j.photos[0])}" alt="${esc(jobTitle(j))}${j.town ? ' in ' + esc(j.town) : ''}" loading="lazy">
      ${n > 1 ? `<span class="count">${n} photos</span>` : ''}
    </button>
    <div class="job-body">
      <div class="job-meta">${esc([j.town, REGION_NAME[j.region]].filter(Boolean).join(', '))}${j.material ? ' · ' + esc(j.material) : ''}</div>
      <h3>${esc(jobTitle(j))}</h3>
      ${j.description ? `<p>${esc(j.description)}</p>` : ''}
      ${j.review_text ? `<blockquote class="quote-line">${j.rating ? `<span class="stars" aria-label="${j.rating} out of 5">${stars(j.rating)}</span><br>` : ''}“${esc(j.review_text)}”${j.reviewer_name ? `<cite>${esc(j.reviewer_name)}</cite>` : ''}</blockquote>` : ''}
    </div>
  </article>`;
}

const ICON = {
  phone: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z"/></svg>',
  mail: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zm9 7.2L20 7H4zm0 2.3L4 9.3V17h16V9.3z"/></svg>',
  pin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a7 7 0 0 1 7 7c0 5-7 13-7 13S5 14 5 9a7 7 0 0 1 7-7zm0 4.5A2.5 2.5 0 1 0 12 11.5 2.5 2.5 0 0 0 12 6.5z"/></svg>',
  ig: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3zm5 3.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9zm0 2a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM17.5 5.5a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/></svg>',
  fb: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.5 22v-8h2.7l.4-3.2h-3.1V8.8c0-.9.3-1.6 1.6-1.6h1.7V4.4a22 22 0 0 0-2.5-.1c-2.4 0-4.1 1.5-4.1 4.2v2.3H7.5V14h2.7v8z"/></svg>',
  yt: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8zM10 15V9l5.2 3z"/></svg>',
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/></svg>',
};

function materialCard(m, up) {
  return `<button class="mat-card" type="button" data-open-mat="${m.key}" aria-haspopup="dialog">
            <img src="${up}${m.card}" alt="" loading="lazy" width="1600" height="800">
            <span class="mat-body">
              <span class="mat-kind">${esc(m.kind)}</span>
              <span class="mat-name">${esc(m.name)}</span>
              <span class="mat-line">${esc(m.line)}</span>
              <span class="mat-more">Colours &amp; examples →</span>
            </span>
          </button>`;
}

function materialDialog(m, up) {
  return `<dialog class="mat-dialog" id="mat-${m.key}" aria-labelledby="mat-${m.key}-title">
    <div class="md-inner">
      <button class="md-close" type="button" data-close aria-label="Close">×</button>
      <div class="md-head" style="background-image:url('${up}${m.texture}')">
        <p class="eyebrow">${esc(m.kind)}</p>
        <h2 id="mat-${m.key}-title">${esc(m.name)}</h2>
      </div>
      <div class="md-body">
        <p>${esc(m.desc)}</p>
        <ul class="md-facts">${m.facts.map((f) => `<li>${ICON.check}${esc(f)}</li>`).join('')}</ul>
        <h3>Popular colours</h3>
        <ul class="swatches">${m.swatches.map(([n, f]) => `<li><img src="${up}img/materials/${f}.jpg" alt="${esc(m.name)} ${esc(n)}" loading="lazy" width="480" height="320"><span>${esc(n)}</span></li>`).join('')}</ul>
        <p class="muted small">A selection of the range. Ask us about any colour you've seen elsewhere.</p>
        <h3>Examples</h3>
        <div class="md-jobs" data-mat-jobs="${m.key}"></div>
        <div class="md-inspo" data-mat-inspo="${m.key}">
          ${m.inspiration.map((src) => `<img src="${up}${src}" alt="${esc(m.name)} worktop" loading="lazy" width="1600" height="800">`).join('')}
          <p class="muted small">Inspiration images. Photos of our own ${esc(m.name)} jobs will appear here as they're added.</p>
        </div>
        <a class="btn" href="#quote" data-quote-mat="${m.key}">Get a price in ${esc(m.name)}</a>
      </div>
    </div>
  </dialog>`;
}

function page(r) {
  const up = r.path ? '../'.repeat(r.path.split('/').filter(Boolean).length) : '';
  const url = site.url + r.path;
  const hub = r.slug === 'scotland';
  const h1 = r.h1 || `Granite &amp; Quartz Worktops in ${esc(H1NAME[r.slug] || r.name)}`;
  const lede = r.lede ? esc(r.lede) : `Kitchen worktops, islands, vanity tops and bar tops for homes and businesses in ${r.towns.slice(0, 3).map(esc).join(', ')} and the rest of ${esc(r.name)}.`;
  const work = workFor(r.slug);
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'HomeAndConstructionBusiness',
    name: 'Granite Systems Ltd', url,
    image: site.url + r.hero, logo: site.url + 'img/logo.svg',
    telephone: C.tel, email: C.email,
    address: { '@type': 'PostalAddress', streetAddress: C.street, addressLocality: C.town, addressRegion: C.county, postalCode: C.postcode, addressCountry: 'GB' },
    areaServed: hub ? { '@type': 'AdministrativeArea', name: 'Scotland' } : r.towns.map((t) => ({ '@type': 'City', name: t })),
    sameAs: ['https://www.facebook.com/granitesystems/', 'https://www.instagram.com/granitesystems/', 'https://www.youtube.com/channel/UCbbdjDJXxDYwZLXULOBAnxA'],
  };

  return `<!doctype html>
<html lang="en-GB">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(r.title)}</title>
  <meta name="description" content="${esc(r.description)}">
  ${site.noindex || !isLive(r) ? '<meta name="robots" content="noindex">' : ''}
  <link rel="canonical" href="${url}">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${esc(r.title)}">
  <meta property="og:description" content="${esc(r.description)}">
  <meta property="og:image" content="${site.url}${r.hero}">
  <meta property="og:url" content="${url}">
  <meta name="theme-color" content="#1e2843">
  <link rel="icon" href="${up}img/favicon.svg" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Jost:wght@300;400;500;700&display=swap">
  <link rel="preload" as="image" href="${up}${r.hero}">
  <link rel="stylesheet" href="${up}css/style.css">
  <script type="application/ld+json">${JSON.stringify(ld)}</script>
</head>
<body data-region="${r.slug}" data-root="${up}">
  <a class="skip" href="#quote">Skip to the quote form</a>
  <header class="top">
    <div class="wrap">
      <a class="brand" href="${up || './'}" aria-label="Granite Systems home"><img src="${up}img/logo.svg" alt="Granite Systems" width="182" height="26"></a>
      <nav class="top-nav" aria-label="Page">
        <a href="#materials">Materials</a>
        <a href="#work" data-work-link${work.main.length ? '' : ' hidden'}>Our work</a>
        <a href="#how">How it works</a>
        <a href="#reviews">Reviews</a>
        <details class="nav-areas">
          <summary>Areas</summary>
          <ul>
            <li><a href="${up || './'}"${hub ? ' aria-current="page"' : ''}>All of Scotland</a></li>
            ${LIVE.map((o) => `<li><a href="${up}${o.path}"${o.slug === r.slug ? ' aria-current="page"' : ''}>${esc(cap(o.name))}</a></li>`).join('\n            ')}
          </ul>
        </details>
      </nav>
      <div class="top-cta">
        <a class="top-phone" href="tel:${C.tel}">${ICON.phone}<span>${C.phone}</span></a>
        <a class="btn small" href="#quote">Free quote</a>
      </div>
    </div>
  </header>

  <main>
    <section class="hero" style="background-image:url('${up}${r.hero}')">
      <div class="wrap hero-grid">
        <div class="hero-copy">
          <p class="eyebrow">Made in Fife · Fitted across Scotland</p>
          <h1>${h1}</h1>
          <p class="lede">${lede}</p>
          <div class="hero-actions">
            <a class="btn light" href="tel:${C.tel}">${ICON.phone}Call ${C.phone}</a>
            <a class="btn ghost-light" href="#materials">Browse materials</a>
          </div>
        </div>

        <form class="quote card" id="quote" novalidate>
          <h2>Get a free quote</h2>
          <p class="muted">Tell us a little about the job and we'll get back to you with a price.</p>
          <div class="field"><label for="q-name">Name</label><input id="q-name" name="name" autocomplete="name" required></div>
          <div class="row2">
            <div class="field"><label for="q-phone">Phone</label><input id="q-phone" name="phone" type="tel" autocomplete="tel" required></div>
            <div class="field"><label for="q-postcode">Postcode</label><input id="q-postcode" name="postcode" autocomplete="postal-code" required></div>
          </div>
          <div class="field"><label for="q-email">Email</label><input id="q-email" name="email" type="email" autocomplete="email" required></div>
          <div class="row2">
            <div class="field"><label for="q-type">What's it for?</label>
              <select id="q-type" name="project_type">
                <option>Kitchen worktops</option><option>Bathroom / vanity</option><option>Bar or commercial</option><option>Table, hearth or other</option><option>Not sure yet</option>
              </select>
            </div>
            <div class="field"><label for="q-mat">Material</label>
              <select id="q-mat" name="material"><option value="">Not sure yet</option>${MATERIALS.map((m) => `<option value="${m.key}">${esc(m.name)}</option>`).join('')}</select>
            </div>
          </div>
          <div class="field"><label for="q-msg">Anything else? <span class="opt">(optional)</span></label><textarea id="q-msg" name="message" rows="3" placeholder="Rough sizes, colour you like, when the kitchen goes in…"></textarea></div>
          <div class="hp" aria-hidden="true"><label>Leave blank <input name="company" tabindex="-1" autocomplete="off"></label></div>
          <button class="btn block" type="submit">Request my quote</button>
          <p class="fine">By sending this you agree we can contact you about your enquiry. <a href="${up}privacy.html">Privacy</a></p>
          <div class="form-msg" role="status" aria-live="polite"></div>
        </form>
      </div>
    </section>

    <section class="strip" aria-label="About Granite Systems">
      <div class="wrap strip-grid">
        <div><strong>Almost 60 years in stone</strong><span>Family roots in J. G. Brown &amp; Son</span></div>
        <div><strong>Trusted by kitchen studios</strong><span>across Scotland</span></div>
        <div><strong>Commercial UK-wide</strong><span>Hotels, bars and restaurants</span></div>
        <div><strong>One piece or hundreds</strong><span>A single worktop to a full hotel refit</span></div>
      </div>
    </section>

    <section id="work"${work.main.length ? '' : ' hidden'}>
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow">Recent jobs</p>
          <h2 data-work-title>${esc(work.title)}</h2>
          <p data-work-sub>${esc(work.sub)}</p>
        </div>
        <div class="jobs" id="jobs" aria-live="polite">${work.main.map(jobCard).join('')}</div>
        <div class="more-head" id="more-head"${work.more.length ? '' : ' hidden'}><h3>Elsewhere in Scotland</h3></div>
        <div class="jobs" id="jobs-more">${work.more.map(jobCard).join('')}</div>
      </div>
    </section>

    <section id="materials" class="alt">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow">Materials</p>
          <h2>Choose your surface</h2>
          <p>Tap a material to see its colours, how it wears and examples of finished worktops.</p>
        </div>
        <div class="mat-grid">
          ${MATERIALS.map((m) => materialCard(m, up)).join('\n          ')}
        </div>
      </div>
    </section>

    <section id="make">
      <div class="wrap">
        <div class="section-head"><p class="eyebrow">What we make</p><h2>Anything in sheet stone</h2></div>
        <div class="tiles">
          <article class="tile"><img src="${up}img/kitchen-island-grey.jpg" alt="" loading="lazy" width="1600" height="800"><h3>Kitchens</h3><p>Worktops, islands, waterfall ends, upstands, splashbacks and sink cut-outs.</p></article>
          <article class="tile"><img src="${up}img/bathroom-basin.jpg" alt="" loading="lazy" width="1600" height="800"><h3>Bathrooms</h3><p>Vanity tops, wall cladding and shower enclosures.</p></article>
          <article class="tile"><img src="${up}img/commercial-tearoom.jpg" alt="" loading="lazy" width="1600" height="800"><h3>Commercial</h3><p>Bar tops, reception desks, table tops and hotel vanities.</p></article>
          <article class="tile"><img src="${up}img/commercial-restaurant.jpg" alt="" loading="lazy" width="1600" height="800"><h3>Tables &amp; hearths</h3><p>Dining and coffee tables, hearths and thresholds, often from offcuts.</p></article>
        </div>
      </div>
    </section>

    <section id="video" class="dark">
      <div class="wrap video-grid">
        <div class="video-copy">
          <p class="eyebrow">Watch</p>
          <h2>A Corian worktop on a Howdens kitchen</h2>
          <p>One of our fits, filmed from start to finish.</p>
          <a class="btn light" href="#quote">Get a quote</a>
        </div>
        <div class="video">
          <iframe src="https://www.youtube-nocookie.com/embed/${C.youtube}?rel=0&amp;modestbranding=1" title="Corian worktop on a Howdens kitchen by Granite Systems" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
        </div>
      </div>
    </section>

    <section class="alt" id="how">
      <div class="wrap">
        <div class="section-head"><p class="eyebrow">How it works</p><h2>From enquiry to fitted</h2></div>
        <ol class="steps">
          <li><span>1</span><h3>Enquire</h3><p>Use the form or call ${C.phone}. We'll talk through material, edges and cut-outs and send a price.</p></li>
          <li><span>2</span><h3>Template</h3><p>Once your units are in, we measure on site with a digital templating system: no board templates, no mess.</p></li>
          <li><span>3</span><h3>Make</h3><p>Your worktops are cut on computerised machinery in our Kirkcaldy workshop, then finished by hand.</p></li>
          <li><span>4</span><h3>Fit</h3><p>Our own fitters install them, cut-outs and all.</p></li>
        </ol>
        <div class="factory">
          <img src="${up}img/factory-floor.jpg" alt="The Granite Systems workshop" loading="lazy" width="1600" height="800">
          <img src="${up}img/craft-polishing.jpg" alt="A stonemason hand finishing a worktop edge" loading="lazy" width="1600" height="800">
        </div>
      </div>
    </section>

    <section id="reviews">
      <div class="wrap">
        <div class="section-head"><p class="eyebrow">Reviews</p><h2>What customers say</h2></div>
        <div class="reviews" id="review-list">
          <blockquote class="review"><p>“Thanks for the continued help and the professional manner that your team carried out their work. Please pass on our regards to all your staff involved, for the beautiful end result they produced. Well done.”</p><cite>Forgan Smithy House, Newport-on-Tay</cite></blockquote>
          <blockquote class="review"><p>“We are very pleased with your service. Worktop arrived and fitted without delays. After discovering a mark on the worktop, this was dealt with efficiently and we are very satisfied. We will recommend your company to relatives and friends.”</p><cite>Mr &amp; Mrs Grant</cite></blockquote>
          <blockquote class="review"><p>“I am pleased to confirm that we successfully opened Grosvenor Arms and Tea Rooms to the public today, on programme as planned. This was a result of some great work from the team.”</p><cite>Chris Jones, London Grosvenor</cite></blockquote>
        </div>
        <p class="center"><a class="btn ghost" href="https://www.google.com/maps/search/?api=1&amp;query=Granite+Systems+Kirkcaldy" target="_blank" rel="noopener">Read our Google reviews</a></p>
      </div>
    </section>

    <section class="alt" id="areas">
      <div class="wrap">
        <div class="areas">
          <div>
            <p class="eyebrow">Areas we cover</p>
            <h2>${esc(cap(r.name))}</h2>
            <p>${esc(r.local)}</p>
            ${hub ? '' : `<ul class="towns">${r.towns.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>`}
          </div>
          ${hub ? `<div class="card all-areas">
            <h3>Across Scotland</h3>
            <ul>${regions.map((o) => isLive(o)
              ? `<li><a href="${o.path}">${esc(cap(o.name))}</a> <small>${COUNTS[o.slug]} job${COUNTS[o.slug] === 1 ? '' : 's'}</small></li>`
              : `<li><span>${esc(cap(o.name))}</span></li>`).join('')}</ul>
          </div>` : `<div class="card all-areas">
            <h3>Elsewhere</h3>
            <ul><li><a href="${up}">All of Scotland</a></li>${LIVE.filter((o) => o.slug !== r.slug).map((o) => `<li><a href="${up}${o.path}">${esc(cap(o.name))}</a></li>`).join('')}</ul>
          </div>`}
        </div>
      </div>
    </section>

    <section class="cta-band">
      <div class="wrap">
        <h2>Ready for a price?</h2>
        <p>Rough measurements or a kitchen plan are enough to get started.</p>
        <div class="hero-actions center">
          <a class="btn light" href="#quote">Get a free quote</a>
          <a class="btn ghost-light" href="tel:${C.tel}">${ICON.phone}${C.phone}</a>
        </div>
      </div>
    </section>
  </main>

  <footer class="foot">
    <div class="wrap foot-grid">
      <div>
        <img class="foot-logo" src="${up}img/logo.svg" alt="Granite Systems" width="182" height="26">
        <p>Granite Systems Ltd<br>${C.street}<br>${C.town}, ${C.county} ${C.postcode}</p>
      </div>
      <div>
        <p><a href="tel:${C.tel}">${ICON.phone}${C.phone}</a><br><a href="mailto:${C.email}">${ICON.mail}${C.email}</a></p>
        <p class="social">
          <a href="https://www.instagram.com/granitesystems/" aria-label="Instagram" rel="noopener" target="_blank">${ICON.ig}</a>
          <a href="https://www.facebook.com/granitesystems/" aria-label="Facebook" rel="noopener" target="_blank">${ICON.fb}</a>
          <a href="https://www.youtube.com/channel/UCbbdjDJXxDYwZLXULOBAnxA" aria-label="YouTube" rel="noopener" target="_blank">${ICON.yt}</a>
        </p>
      </div>
    </div>
    <div class="wrap foot-base"><span>© <span data-year></span> Granite Systems Ltd</span><a href="${up}privacy.html">Privacy</a><a href="${up}admin.html" rel="nofollow">Staff</a></div>
  </footer>

  <div class="mobile-bar">
    <a href="tel:${C.tel}">${ICON.phone}Call</a>
    <a href="#quote" class="primary">Free quote</a>
  </div>

  ${MATERIALS.map((m) => materialDialog(m, up)).join('\n  ')}

  <dialog class="lightbox" id="lightbox">
    <button class="lb-close" type="button" aria-label="Close">×</button>
    <button class="lb-prev" type="button" aria-label="Previous photo">‹</button>
    <img alt="">
    <button class="lb-next" type="button" aria-label="Next photo">›</button>
    <p class="lb-cap"></p>
  </dialog>

  <script type="module" src="${up}js/site.js"></script>
</body>
</html>
`;
}

const all = [HUB, ...regions];
for (const r of all) {
  const out = join(root, r.path, 'index.html');
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, page(r));
}
console.log(`wrote hub + ${regions.length} region pages; live: ${LIVE.map((r) => `${r.slug} (${COUNTS[r.slug]})`).join(', ') || 'none yet'}`);

// Old addresses → new ones
for (const [from, to] of Object.entries(redirects)) {
  const out = join(root, from, 'index.html');
  mkdirSync(dirname(out), { recursive: true });
  const depth = from.split('/').filter(Boolean).length;
  const rel = '../'.repeat(depth) + to;
  writeFileSync(out, `<!doctype html><meta charset="utf-8"><meta name="robots" content="noindex"><link rel="canonical" href="${site.url}${to}"><meta http-equiv="refresh" content="0; url=${rel}"><title>Moved</title><a href="${rel}">This page has moved</a>\n`);
}

// Region + material lists for the staff page and site (single source of truth)
writeFileSync(join(root, 'js/regions.js'), `// Generated by tools/build.mjs from data/regions.json. Don't edit by hand.\nexport const REGIONS = ${JSON.stringify(Object.fromEntries([['scotland', 'Scotland'], ...regions.map((r) => [r.slug, cap(r.name)]), ['elsewhere', 'Elsewhere in the UK']]), null, 2)};\nexport const TOWNS = ${JSON.stringify(Object.fromEntries(regions.map((r) => [r.slug, r.towns])))};\nexport const MATERIALS = ${JSON.stringify(MATERIALS.map(({ key, name, keywords }) => ({ key, name, keywords })))};\n`);

// Sitemap: the hub and live regions only
const today = new Date().toISOString().slice(0, 10);
writeFileSync(join(root, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[HUB, ...LIVE].map((r) => `  <url><loc>${site.url}${r.path}</loc></url>`).join('\n')}
</urlset>
`);
writeFileSync(join(root, 'robots.txt'), site.noindex
  ? 'User-agent: *\nDisallow: /admin.html\n'
  : `User-agent: *\nDisallow: /admin.html\nSitemap: ${site.url}sitemap.xml\n`);
console.log('wrote js/regions.js, sitemap.xml, robots.txt');
