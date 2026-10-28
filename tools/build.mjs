// Builds one landing page per region from data/regions.json.
//   node tools/build.mjs
// Re-run after editing regions.json (new region, new wording, new domain), then commit.
// Jobs, photos and reviews are NOT baked in: they load live from Supabase, so adding a job
// never needs a rebuild.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { site, regions } = JSON.parse(readFileSync(join(root, 'data/regions.json'), 'utf8'));
const C = {
  phone: '01592 654386', tel: '+441592654386', email: 'sales@granitesystems.co.uk',
  street: 'Unit 6 Randolph Court, Randolph Industrial Estate', town: 'Kirkcaldy', county: 'Fife', postcode: 'KY1 2YY',
  youtube: 'YFNAMImGvX0',
};
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const ICON = {
  phone: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z"/></svg>',
  mail: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zm9 7.2L20 7H4zm0 2.3L4 9.3V17h16V9.3z"/></svg>',
  pin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a7 7 0 0 1 7 7c0 5-7 13-7 13S5 14 5 9a7 7 0 0 1 7-7zm0 4.5A2.5 2.5 0 1 0 12 11.5 2.5 2.5 0 0 0 12 6.5z"/></svg>',
  ig: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3zm5 3.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9zm0 2a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM17.5 5.5a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/></svg>',
  fb: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.5 22v-8h2.7l.4-3.2h-3.1V8.8c0-.9.3-1.6 1.6-1.6h1.7V4.4a22 22 0 0 0-2.5-.1c-2.4 0-4.1 1.5-4.1 4.2v2.3H7.5V14h2.7v8z"/></svg>',
  yt: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8zM10 15V9l5.2 3z"/></svg>',
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/></svg>',
};

function page(r) {
  const up = r.path ? '../'.repeat(r.path.split('/').filter(Boolean).length) : '';
  const url = site.url + r.path;
  const others = regions.filter((x) => x.slug !== r.slug);
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'HomeAndConstructionBusiness',
    name: 'Granite Systems Ltd',
    url,
    image: site.url + 'img/' + r.hero,
    logo: site.url + 'img/logo.svg',
    telephone: C.tel,
    email: C.email,
    address: { '@type': 'PostalAddress', streetAddress: C.street, addressLocality: C.town, addressRegion: C.county, postalCode: C.postcode, addressCountry: 'GB' },
    areaServed: r.towns.map((t) => ({ '@type': 'City', name: t })),
    sameAs: ['https://www.facebook.com/granitesystems/', 'https://www.instagram.com/granitesystems/', 'https://www.youtube.com/channel/UCbbdjDJXxDYwZLXULOBAnxA'],
  };

  return `<!doctype html>
<html lang="en-GB">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(r.title)}</title>
  <meta name="description" content="${esc(r.description)}">
  ${site.noindex ? '<meta name="robots" content="noindex">' : ''}
  <link rel="canonical" href="${url}">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${esc(r.title)}">
  <meta property="og:description" content="${esc(r.description)}">
  <meta property="og:image" content="${site.url}img/${r.hero}">
  <meta property="og:url" content="${url}">
  <meta name="theme-color" content="#1e2843">
  <link rel="icon" href="${up}img/favicon.svg" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Jost:wght@300;400;500;700&display=swap">
  <link rel="preload" as="image" href="${up}img/${r.hero}">
  <link rel="stylesheet" href="${up}css/style.css">
  <script type="application/ld+json">${JSON.stringify(ld)}</script>
</head>
<body data-region="${r.slug}" data-root="${up}">
  <a class="skip" href="#quote">Skip to the quote form</a>
  <header class="top">
    <div class="wrap">
      <a class="brand" href="${up || './'}" aria-label="Granite Systems home"><img src="${up}img/logo.svg" alt="Granite Systems" width="182" height="26"></a>
      <nav class="top-nav" aria-label="Page">
        <a href="#work">Our work</a>
        <a href="#video">Watch</a>
        <a href="#reviews">Reviews</a>
        <a href="#areas">Areas</a>
      </nav>
      <div class="top-cta">
        <a class="top-phone" href="tel:${C.tel}">${ICON.phone}<span>${C.phone}</span></a>
        <a class="btn small" href="#quote">Free quote</a>
      </div>
    </div>
  </header>

  <main>
    <section class="hero" style="background-image:url('${up}img/${r.hero}')">
      <div class="wrap hero-grid">
        <div class="hero-copy">
          <p class="eyebrow">Granite Systems · ${esc(r.name)}</p>
          <h1>${esc(r.h1)}</h1>
          <p class="lede">${esc(r.lede)}</p>
          <ul class="ticks">
            <li>${ICON.check}Digital templating: no mess, accurate fit</li>
            <li>${ICON.check}Cut on CNC, finished by hand in Kirkcaldy</li>
            <li>${ICON.check}Fitted by our own team, start to finish</li>
          </ul>
          <div class="hero-actions">
            <a class="btn light" href="tel:${C.tel}">${ICON.phone}Call ${C.phone}</a>
            <a class="btn ghost-light" href="#work">See recent jobs</a>
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
          <div class="field"><label for="q-type">What's it for?</label>
            <select id="q-type" name="project_type">
              <option>Kitchen worktops</option><option>Bathroom / vanity</option><option>Bar or commercial</option><option>Table, hearth or other piece</option><option>Not sure yet</option>
            </select>
          </div>
          <div class="field"><label for="q-msg">Anything else? <span class="opt">(optional)</span></label><textarea id="q-msg" name="message" rows="3" placeholder="Rough sizes, material you like, when the kitchen goes in…"></textarea></div>
          <div class="hp" aria-hidden="true"><label>Leave blank <input name="company" tabindex="-1" autocomplete="off"></label></div>
          <button class="btn block" type="submit">Request my quote</button>
          <p class="fine">By sending this you agree we can contact you about your enquiry. <a href="${up}privacy.html">Privacy</a></p>
          <div class="form-msg" role="status" aria-live="polite"></div>
        </form>
      </div>
    </section>

    <section class="strip" aria-label="Why Granite Systems">
      <div class="wrap strip-grid">
        <div><strong>~60 years</strong><span>in the stone trade</span></div>
        <div><strong>Template → fit</strong><span>one team, start to finish</span></div>
        <div><strong>CNC + hand finish</strong><span>in our Kirkcaldy factory</span></div>
        <div><strong>Homes &amp; commercial</strong><span>one worktop to whole hotels</span></div>
      </div>
    </section>

    <section id="work">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow">Recent jobs</p>
          <h2>Our work in ${esc(r.short)}</h2>
          <p>Photos from jobs we've templated, made and fitted, with what the customer said about it.</p>
        </div>
        <div class="jobs" id="jobs" aria-live="polite"></div>
        <div class="more-head" id="more-head" hidden><h3>More of our work</h3></div>
        <div class="jobs" id="jobs-more"></div>
        <div class="showcase" id="showcase">
          <figure><img src="${up}img/kitchen-white-marble.jpg" alt="White marble-effect island with waterfall end" loading="lazy" width="1600" height="800"><figcaption>Kitchen islands</figcaption></figure>
          <figure><img src="${up}img/granite-black-kitchen.jpg" alt="Black granite worktop with gas hob" loading="lazy" width="1600" height="800"><figcaption>Granite worktops</figcaption></figure>
          <figure><img src="${up}img/marble-black-vanity.jpg" alt="Black marble double vanity with undermount basins" loading="lazy" width="1600" height="800"><figcaption>Bathroom vanities</figcaption></figure>
          <figure><img src="${up}img/commercial-restaurant.jpg" alt="Restaurant with stone-topped tables" loading="lazy" width="1600" height="800"><figcaption>Bars &amp; restaurants</figcaption></figure>
          <figure><img src="${up}img/corian-grey-kitchen.jpg" alt="Grey Corian worktop with curved end" loading="lazy" width="1600" height="800"><figcaption>Corian</figcaption></figure>
          <figure><img src="${up}img/kitchen-grey-hob.jpg" alt="Grey quartz worktop with hob and sink" loading="lazy" width="1600" height="800"><figcaption>Quartz worktops</figcaption></figure>
        </div>
      </div>
    </section>

    <section id="video" class="dark">
      <div class="wrap video-grid">
        <div class="video-copy">
          <p class="eyebrow">Watch</p>
          <h2>See a worktop go in</h2>
          <p>A Corian worktop fitted on a Howdens kitchen by our team. Every job is measured digitally, cut on our CNC machines and finished by hand before it leaves the factory.</p>
          <a class="btn light" href="#quote">Get a quote</a>
        </div>
        <div class="video">
          <iframe src="https://www.youtube-nocookie.com/embed/${C.youtube}?rel=0&amp;modestbranding=1" title="Corian worktop on a Howdens kitchen by Granite Systems" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
        </div>
      </div>
    </section>

    <section id="make">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow">What we make</p>
          <h2>Anything in sheet stone</h2>
        </div>
        <div class="tiles">
          <article class="tile"><img src="${up}img/kitchen-island-grey.jpg" alt="" loading="lazy" width="1600" height="800"><h3>Kitchen worktops</h3><p>Islands, waterfall ends, upstands, splashbacks, undermount and drainer grooves.</p></article>
          <article class="tile"><img src="${up}img/bathroom-basin.jpg" alt="" loading="lazy" width="1600" height="800"><h3>Bathrooms</h3><p>Vanity tops, wall cladding and shower enclosures.</p></article>
          <article class="tile"><img src="${up}img/commercial-tearoom.jpg" alt="" loading="lazy" width="1600" height="800"><h3>Commercial</h3><p>Bar tops, reception desks and vanity tops for hotels, from one to several hundred.</p></article>
          <article class="tile"><img src="${up}img/marble-edge.jpg" alt="" loading="lazy" width="1600" height="800"><h3>Tables &amp; hearths</h3><p>Dining and coffee tables, hearths and thresholds, often from offcuts at great prices.</p></article>
        </div>
        <ul class="chips" aria-label="Materials">
          <li>Silestone</li><li>Sensa granite</li><li>Dekton</li><li>Granite</li><li>Marble</li><li>Limestone</li><li>Corian</li>
        </ul>
      </div>
    </section>

    <section class="alt" id="how">
      <div class="wrap">
        <div class="section-head"><p class="eyebrow">How it works</p><h2>Four steps, one team</h2></div>
        <ol class="steps">
          <li><span>1</span><h3>Enquire</h3><p>Send the form or call. Rough sizes or a kitchen plan are plenty for a quote.</p></li>
          <li><span>2</span><h3>Digital template</h3><p>Once your units are in, we measure on site digitally. No board templates, no mess.</p></li>
          <li><span>3</span><h3>Made in Kirkcaldy</h3><p>Cut on our computerised machinery, then hand finished by skilled stonemasons.</p></li>
          <li><span>4</span><h3>Fitted</h3><p>Our own fitters install it, cut-outs and all, and leave it clean.</p></li>
        </ol>
        <div class="factory">
          <img src="${up}img/factory-floor.jpg" alt="The Granite Systems factory floor" loading="lazy" width="1600" height="800">
          <img src="${up}img/craft-polishing.jpg" alt="Stonemason hand finishing a worktop edge" loading="lazy" width="1600" height="800">
        </div>
      </div>
    </section>

    <section id="reviews">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow">Reviews</p>
          <h2>What customers say</h2>
        </div>
        <div class="reviews" id="review-list">
          <blockquote class="review"><p>“Thanks for the continued help and the professional manner that your team carried out their work. Please pass on our regards to all your staff involved, for the beautiful end result they produced. Well done.”</p><cite>Forgan Smithy House, Newport-on-Tay</cite></blockquote>
          <blockquote class="review"><p>“We are very pleased with your service. Worktop arrived and fitted without delays. After discovering a mark on the worktop, this was dealt with efficiently and we are very satisfied. We will recommend your company to relatives and friends.”</p><cite>Mr &amp; Mrs Grant</cite></blockquote>
          <blockquote class="review"><p>“I am pleased to confirm that we successfully opened Grosvenor Arms and Tea Rooms to the public today, on programme as planned. This was a result of some great work from the team.”</p><cite>Chris Jones, London Grosvenor</cite></blockquote>
        </div>
        <p class="center"><a class="btn ghost" href="https://www.google.com/maps/search/?api=1&amp;query=Granite+Systems+Kirkcaldy" target="_blank" rel="noopener">Read our Google reviews</a></p>
      </div>
    </section>

    <section class="alt" id="areas">
      <div class="wrap areas">
        <div>
          <p class="eyebrow">Areas we cover</p>
          <h2>${esc(r.name)}</h2>
          <p>${esc(r.local)}</p>
          <ul class="towns">${r.towns.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
        </div>
        <div class="card other-areas">
          <h3>Also covering</h3>
          <ul>${others.map((o) => `<li><a href="${up}${o.path}">${esc(o.name)}</a></li>`).join('')}</ul>
          <p class="muted">Commercial projects anywhere in the UK.</p>
        </div>
      </div>
    </section>

    <section class="cta-band">
      <div class="wrap">
        <h2>Ready to price your worktops?</h2>
        <p>Rough measurements are fine. We'll take it from there.</p>
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
        <h3>Contact</h3>
        <p><a href="tel:${C.tel}">${ICON.phone}${C.phone}</a><br><a href="mailto:${C.email}">${ICON.mail}${C.email}</a></p>
        <p class="social">
          <a href="https://www.instagram.com/granitesystems/" aria-label="Instagram" rel="noopener" target="_blank">${ICON.ig}</a>
          <a href="https://www.facebook.com/granitesystems/" aria-label="Facebook" rel="noopener" target="_blank">${ICON.fb}</a>
          <a href="https://www.youtube.com/channel/UCbbdjDJXxDYwZLXULOBAnxA" aria-label="YouTube" rel="noopener" target="_blank">${ICON.yt}</a>
        </p>
      </div>
      <div>
        <h3>Areas</h3>
        <ul>${regions.map((o) => `<li><a href="${up}${o.path}">${esc(o.name)}</a></li>`).join('')}</ul>
      </div>
    </div>
    <div class="wrap foot-base"><span>© <span data-year></span> Granite Systems Ltd</span><a href="${up}privacy.html">Privacy</a><a href="${up}admin.html" rel="nofollow">Staff</a></div>
  </footer>

  <div class="mobile-bar">
    <a href="tel:${C.tel}">${ICON.phone}Call</a>
    <a href="#quote" class="primary">Free quote</a>
  </div>

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

for (const r of regions) {
  const out = join(root, r.path, 'index.html');
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, page(r));
  console.log('wrote', r.path + 'index.html');
}

// sitemap + robots
const today = new Date().toISOString().slice(0, 10);
writeFileSync(join(root, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${regions.map((r) => `  <url><loc>${site.url}${r.path}</loc><lastmod>${today}</lastmod></url>`).join('\n')}
</urlset>
`);
writeFileSync(join(root, 'robots.txt'), site.noindex
  ? 'User-agent: *\nDisallow: /admin.html\n'
  : `User-agent: *\nDisallow: /admin.html\nSitemap: ${site.url}sitemap.xml\n`);
console.log('wrote sitemap.xml, robots.txt');
