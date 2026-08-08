# Notaryous — booking site

Public booking site for Notaryous, a remote online notarization service and a
registered trade name of Guardian Litigation Group, LLP. Static single page, no
framework, no build step.

**The contents of this directory are the repo root of the deployed site.** When
this moves to its own repo (`johng-glg/notaryous-site`), copy everything here to
that repo's root — do not nest it in a `site/` folder, or the asset paths in
`index.html` (`/mark-gold.svg`, `/fonts/...`) will 404.

---

## Deploy

1. Push this directory's contents to the repo root.
2. Import to Vercel.
   - Framework preset: **Other**
   - Build command: **none**
   - Output directory: **root**
   - Install command: **none**
3. Turn on **Web Analytics** in the Vercel project (Analytics tab → Enable).
   The page already loads `/_vercel/insights/script.js`; until analytics is
   enabled that path 404s and the browser console logs one error.
4. Add the domain `notary.guardianlit.com`, then create a CNAME at the DNS host
   for `guardianlit.com`:

   | Type  | Name     | Value                   |
   |-------|----------|-------------------------|
   | CNAME | `notary` | `cname.vercel-dns.com.` |

`brand/` is excluded from the deployment by `.vercelignore` — it is source
artwork and the regeneration scripts, not part of the site.

### Swapping to notaryous.com

When the domain transfer completes:

1. Add `notaryous.com` and `www.notaryous.com` to the same Vercel project and
   set `notaryous.com` as the production domain.
2. Update the five absolute URLs in `index.html`. They are grouped under the
   comment marked `ORIGIN:` near the top of `<head>` — canonical, `og:url`,
   `og:image`, `twitter:image`. Also update the `Sitemap:` line in `robots.txt`
   and the `<loc>` in `sitemap.xml`.
3. Keep `notary.guardianlit.com` attached to the project and add this to
   `vercel.json` so the old host issues a real 301 rather than dropping traffic:

   ```json
   "redirects": [
     {
       "source": "/(.*)",
       "has": [{ "type": "host", "value": "notary.guardianlit.com" }],
       "destination": "https://notaryous.com/$1",
       "statusCode": 301
     }
   ]
   ```

   Use `statusCode: 301` rather than `permanent: true` — `permanent` emits a 308.

---

## Files

| Path | What it is |
|---|---|
| `index.html` | The entire page: markup, styles, analytics. |
| `mark-gold.svg` | The approved mark, unmodified. Used by the hero and the footer. |
| `fonts/` | Archivo, self-hosted. One variable file covers weights 400–700. |
| `favicon.ico` | 16 / 32 / 48 multi-size. |
| `favicon.svg` | Vector favicon, Cordovan tile. |
| `favicon-light.svg` | Bone-tile variant. Shipped but **not wired** — see "Favicon" below. |
| `apple-touch-icon.png` | 180×180, disc, dark mode. |
| `icon-192.png`, `icon-512.png` | Manifest icons, squircle, dark mode. |
| `og-image.png` | 1200×630 social card. |
| `site.webmanifest` | Name, theme colour, icons. |
| `vercel.json` | Security headers and immutable caching for fonts and the mark. |
| `robots.txt`, `sitemap.xml` | Single-URL site. |
| `brand/` | Source artwork and the deterministic generators. Not deployed. |

### Editing

- **Fees** — the `.placard` block, plus the `.lede` above it and the `.stat`
  strip. All three state the $25 flat rate; keep them consistent.
- **Booking embed** — the iframe `src` in `#book`, plus the fallback link below it.
- **Disclaimers** — the `.notice` section. Do not edit without GC review.
- **Trade name disclosure** — footer `.legal`. Required while Notaryous is a DBA
  of Guardian Litigation Group, LLP.

### Regenerating icons

```
python3 brand/build_web_icons.py     # needs cairosvg + pillow
```

Every raster is rendered from an approved SVG at its final size, never upscaled.
The script's output for `apple-touch-icon.png`, `icon-512.png` and `og-image.png`
is byte-identical to the corresponding files in `brand/png/`, so it is safe to
re-run.

`brand/build_v2.py` regenerates the whole brand set and needs `traced.json`.

---

## What changed from the delivered `site/`, and why

Design, layout, colour and copy are unchanged. Everything below is either a
measured performance fix, an accessibility fix, or a defect.

### The mark is now an external file

`index.html` was 214 KB because the ~197 KB mark path was inlined in `<defs>`
and referenced twice with `<use>`. That is 62 KB over the wire after brotli, in
the render-blocking document, on every single page view.

It now lives in `mark-gold.svg` and is referenced by `<img>` in both the hero and
the footer. The path data is byte-identical to the original `<defs>` path —
verified, not assumed. Same vector, never rasterised, never re-traced. The file
is served `immutable` so repeat visits do not re-fetch it.

The document went from 62 KB to 5.2 KB over the wire.

### Archivo is self-hosted

The page was pulling Archivo from Google Fonts: two `preconnect`s, a
render-blocking stylesheet, then four static weights from a third host. One
self-hosted variable woff2 (35 KB, latin) covers 400–700, preloaded, with a
latin-ext file behind a `unicode-range` so it only downloads if needed. Archivo
is OFL-1.1; self-hosting is permitted.

### Measured result

Lighthouse, mobile emulation, served with brotli and production cache headers,
Zoho iframe stubbed identically in both runs so the third party is not the
variable:

| | Perf | A11y | Best practices | SEO | FCP | Speed Index |
|---|---|---|---|---|---|---|
| As delivered | 89 | 94 | 96 | 100 | 1.7 s | 19.1 s |
| Now | **100** | **100** | 96 | **100** | **0.7 s** | **0.7 s** |

Desktop: 100 / 100 / 96 / 100, FCP 0.2 s, LCP 0.4 s, CLS 0.

Best practices is 96 rather than 100 only because `/_vercel/insights/script.js`
404s when served locally. That is the sole console error; it resolves once Web
Analytics is enabled on the Vercel project.

### Contrast: `--muted` was failing AA

The brief flagged bright gold on light grounds as the failure mode. That rule is
being followed correctly everywhere — the actual failure was `--muted`.

`#7A6A62` measures **4.31** on Bone and **3.79** on Bone-2, against a 4.5
requirement for body text. It was used in seven places, including `.lede`,
`.step p`, `.fallback`, `.placard .cite` and `.fr .l small` — a large share of
the body copy on the page. Lighthouse failed the `color-contrast` audit on it.

It is now `#6B5C55`: identical hue (20°) and saturation, 0.05 darker in value.
**5.33** on Bone, **4.69** on Bone-2. Both clear AA.

Every other pair on the page was re-checked and passes — most at AAA. Deep Gold
`#7E5C1E` on Bone measures 5.10 and bright gold on Bone measures 1.57, matching
the figures in `brand/README.md` exactly, which is a good sign the method agrees
with whoever wrote them.

### Focus, landmarks, skip link

Only `.btn` had a focus ring. Every interactive element now gets one, coloured
for its ground — Bordeaux on the light sections (13.71), Bone on the dark ones
(13.71–16.17). Verified by tabbing through the live page and reading the computed
outline on each stop.

Added a skip link and a `<main>` landmark. The missing main landmark was a
Lighthouse accessibility failure. Neither changes how the page looks.

`prefers-reduced-motion` still holds: `scroll-behavior` drops to `auto` and the
button transition to `0s`. Verified under emulation.

### Footer mark was under the brand minimum

`brand/README.md`: *"Full mark never below 64px tall. Use the favicon below
that."* The footer mark was rendering at 43px tall. It is now 54px wide / 65px
tall, which is the smallest size that satisfies the rule while keeping the full
mark. This is the one change with a visible effect — the footer brand line is
about 22px taller. Revert by setting `footer .brandline img` back to `width:36px`
if the original size was deliberate, but note that conflicts with the brand rule.

### The OG card was clipped — fixed

**`brand/png/og-image-1200.png` as delivered had `"$25 FLAT"` cut off the right
edge of the card.** The subline was set at 24px with 13px letter-spacing, which
runs 52px past the 1200px canvas. Every Slack, iMessage, LinkedIn and Facebook
unfurl would have shown `ONLINE NOTARIZATION · $25 FL`.

Tracking is now 9.4px, which ends the line flush with the wordmark above it.
Nothing else moved — same size, colour, position and copy. Fixed in
`brand/og-image.svg` and in `brand/build_v2.py` so it does not regress on the
next regeneration.

The delivered PNG was also rendered without Archivo installed, so the card was
set in a fallback face. It is now rendered in real Archivo.

### Favicon: the light variant is not wired, and that is deliberate

The brief suggested adding
`<link rel="icon" href="/favicon-light.svg" media="(prefers-color-scheme: light)">`
if it improved tab legibility, and said to test first.

Tested by rendering both variants at 16px and 32px and compositing them onto
Chrome's light (`#F1F3F4`) and dark (`#292A2D`) tab strips. The result is the
opposite of the intent: the Bone tile on light chrome is nearly invisible — a
near-white tile on a near-white strip, leaving only the thin Bordeaux strokes.
The Cordovan tile reads well on *both* light and dark chrome.

So `favicon.svg` is served unconditionally and `favicon-light.svg` ships in the
repo as a brand asset without being referenced. If tab legibility on dark chrome
is ever a concern, the fix is a `prefers-color-scheme` media query *inside*
`favicon.svg` — the `media` attribute on `<link rel="icon">` is unreliable in
Chrome.

### Headers

Added HSTS (`max-age=63072000; includeSubDomains; preload`) and immutable caching
for `/fonts/*` and `/mark-gold.svg`. The `preload` directive is inert until the
domain is submitted to hstspreload.org; it is there to satisfy the Lighthouse
HSTS audit.

**No Content-Security-Policy, on purpose.** A `frame-src` restrictive enough to
be worth having would also govern navigations *inside* the booking iframe, and if
Zoho hands off to a payment domain mid-checkout, a wrong policy silently kills
the money path. Same reasoning for `Permissions-Policy` — `payment=()` propagates
into cross-origin iframes and would block the Payment Request API. Adding either
is reasonable, but only after someone completes a real $25 booking against a
preview deployment with the header on.

---

## Open items — these need account access I do not have

### 1. Zoho: confirm payment is required before the appointment is confirmed — BLOCKING

**Not verified.** This needs a Zoho Bookings login. The entire model depends on
it: if the service is set to "payment optional" or "collect later", sessions get
confirmed without money and the "nothing billed afterward" promise on the page
becomes false.

In Zoho Bookings → Services → the RON service:
- Price is **$25.00**
- Payment is **mandatory**, collected at booking, not "optional" or "pay later"
- A payment gateway is connected and live (not test mode)
- The confirmation email is itemised enough to serve as a fee receipt

### 2. Zoho: create the hidden `Source` field for the tracking parameter

The iframe and the fallback link now carry `?source=notaryous-site` and
`?source=notaryous-site-fallback`. Zoho maps a `source` query parameter onto a
hidden single-line field on the service booking form — but **only if that field
exists**. Create it: Services → the service → Service Booking Form → add a
single-line field labelled `Source`, then click the eye icon to hide it. The
value then shows under Additional Info on each appointment, which is what makes
bookings from this site distinguishable from bookings originating in client
emails.

Until the field exists the parameter is simply ignored — harmless, but it also
does nothing.

**Smoke-test this before go-live.** The embed could not be loaded from this
environment (the network policy blocks `zohobookings.com`), so the parameter is
based on Zoho's documented behaviour, not on a live check. Load the page, confirm
the scheduler renders, and complete one booking. If anything looks wrong, delete
`?source=notaryous-site` from the iframe `src` — that is the whole revert.

### 3. Iframe height — needs a real device pass

Left at the delivered values: **770px desktop, 830px under 900px wide.** Not
changed, because the embed could not be loaded here and guessing at a height is
how you get an internal scrollbar or a slab of dead space.

The frame's actual rendered width, measured on the live page, is:

| Viewport | Iframe width |
|---|---|
| 1440px desktop | 1050px |
| iPhone 390px | 320px |
| iPhone SE 375px | 305px |

To finish: open the deployed page on mobile Safari and Chrome, and check the
booking section for an inner scrollbar (height too small) or empty space below
the scheduler (height too large). Adjust `.shell iframe{height:...}` and the same
rule inside the `max-width:900px` media query.

---

## Before launch

- [ ] **Zoho service set to $25 with payment required at booking** — see above
- [ ] **Hidden `Source` field created in Zoho** — see above
- [ ] **Booking smoke test on the preview deployment** — one real $25 session
- [ ] **Iframe height checked on mobile Safari and Chrome**
- [ ] Kimberly Uptain: disclaimer language, trade name disclosure, fee characterisation
- [ ] DBA filed and trade name cleared under attorney advertising rules
- [ ] Notarial E&O policy bound
- [ ] Booking confirmation email doubles as an itemised receipt (state fee record requirement)
- [ ] Web Analytics enabled on the Vercel project
- [ ] Print proof of Bordeaux `#3B1116` before any physical collateral — deep reds
      shift in CMYK and can go brown or purple depending on stock
