# Granite Systems: regional landing pages

A single-purpose landing page for Granite Systems (Kirkcaldy), built to turn visits into quote requests. There's one version per region:

| Page | Path |
|---|---|
| Fife (home) | `/` |
| Edinburgh & the Lothians | `/edinburgh/` |
| Dundee & Angus | `/dundee-angus/` |
| Perth & Kinross | `/perth-kinross/` |
| Stirling, Falkirk & Clackmannanshire | `/stirling-falkirk/` |
| Glasgow & Dunbartonshire | `/glasgow/` |
| Lanarkshire | `/lanarkshire/` |
| Renfrewshire & Inverclyde | `/renfrewshire-inverclyde/` |
| Ayrshire & Arran | `/ayrshire/` |
| Dumfries & Galloway | `/dumfries-galloway/` |
| Scottish Borders | `/scottish-borders/` |
| Aberdeen & Aberdeenshire | `/aberdeen/` |
| Inverness, the Highlands & Moray | `/highlands/` |
| Argyll & Bute | `/argyll-bute/` |

Every page shares one layout: a hero with the quote form, recent jobs (shown only once real jobs exist, this region's first), clickable **materials** (each opens colours, care notes and that material's real jobs), what they make, the embedded YouTube video, how it works, reviews, and that region's own area text and towns.

Plain HTML/CSS/JS with no build server. GitHub Pages hosts it, and Supabase (the same project as Second Cut Stone) stores jobs, photos and enquiries.

## Adding a job (staff, about 1 minute, on a phone)

1. Open **`/admin.html`** and sign in. It's the same login as the Second Cut Stone stock page. Tip: *Add to Home Screen* makes it feel like an app.
2. Choose **Take photo** or **Choose photos**. Tap a photo to make it the cover.
3. Pick the **Area** and **Material** (colour and town are optional but help). The job then shows on that area's page *and* in that material's pop-up on every page.
4. Optionally add the customer's review and star rating. Only do this if they're happy for it to go online; the tick box is required.
5. **Save job**. It appears on that area's page straight away.

The Recent jobs section stays hidden until the first job is added. Until an area has 3 jobs of its own, its page tops up with recent jobs from elsewhere (change the number in `js/config.js`). Material pop-ups show inspiration photos until a job in that material exists.

Quote requests appear under **Enquiries** in the staff page, and are emailed to the office (see below).

## One-off setup

1. **Database**: Supabase → SQL Editor → run `supabase/001_jobs.sql`, then `supabase/002_scotland_regions.sql`. This creates `gs_jobs`, `gs_enquiries` and the `gs-job-photos` bucket, and reuses `admins` / `is_admin()` from Second Cut Stone.
2. **Email alerts**: Supabase → Edge Functions → Deploy new function → name it `gs-enquiry-alert` → paste `supabase/functions/gs-enquiry-alert/index.ts`. It uses the `RESEND_API_KEY` / `ALERT_TO` secrets that are already set. Add `GS_ALERT_TO` if these should go to a different inbox.
3. **GitHub Pages**: Settings → Pages → Deploy from branch → `main` / root.

## Changing regions, materials or wording

Region text (title, towns, area paragraph, hero photo) is in `data/regions.json`; materials (description, facts, colours, inspiration photos) are in `data/materials.json`. Edit either file straight on GitHub and the **Build region pages** action regenerates every page, `js/regions.js` and the sitemap automatically. Locally: `node tools/build.mjs`.

To add a region: add it to `regions.json` and to the `region` check in the SQL (see `supabase/002_scotland_regions.sql`).

## Going live on a domain

1. In `data/regions.json` set `site.url` to the new domain, and set `"noindex": false`. It's `true` for now so Google doesn't index the preview. Then run `node tools/build.mjs`.
2. Add a `CNAME` file containing the domain, then point DNS at GitHub Pages. Use the A records `185.199.108.153`, `.109.153`, `.110.153` and `.111.153`, plus a `www` CNAME to `gerardqueen.github.io`.
3. Settings → Pages → Custom domain → tick Enforce HTTPS.
4. Submit `sitemap.xml` in Google Search Console, and add the area pages to the Google Business Profile as service areas.

## Files

| Path | What |
|---|---|
| `tools/build.mjs` | Page template, which generates the region pages |
| `data/regions.json` | Region names, copy, towns, hero image |
| `js/site.js` | Loads live jobs and reviews; quote form |
| `js/admin.js`, `admin.html` | Staff page: add/edit jobs, enquiries, staff approvals |
| `js/config.js` | Supabase keys, region labels, thresholds |
| `css/style.css` | All styles |
| `img/` | Logo and photos taken from granitesystems.co.uk |
| `supabase/` | SQL and the email alert function |
