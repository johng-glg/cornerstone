# Notaryous — booking site

Public booking site for Notaryous, a remote online notarization service and a
registered trade name of Guardian Litigation Group, LLP. Static single page, no
framework, no build step.

**This site is deployed from [`johng-glg/notaryous`](https://github.com/johng-glg/notaryous),
where these files sit at the repo root.** The copy here under
`cornerstone/notaryous-site/` is the working copy this was built in. If you edit
one, mirror it to the other, or retire this copy once `notaryous` is the
established source of truth.

Whichever copy you edit, the files must stay at the deploy root — do not nest
them in a `site/` folder, or the absolute asset paths in `index.html`
(`/mark-gold.svg`, `/fonts/...`) will 404.

---

## Deploy

The repo is imported to Vercel already. Confirm these settings are what the
import picked up — Vercel guesses, and a wrong guess here fails the build rather
than serving the page:

1. Project → Settings → Build & Deployment:
   - Framework preset: **Other**
   - Build command: **none** (override toggled on, field empty)
   - Output directory: **none / root** (override toggled on, field empty)
   - Install command: **none**
   - Root directory: **blank** — the files are at the repo root
2. Turn on **Web Analytics** in the Vercel project (Analytics tab → Enable).
   The page already loads `/_vercel/insights/script.js`; until analytics is
   enabled that path 404s and the browser console logs one error.
3. Domains. **`www.notaryous.com` is the production host** — see "The domain"
   below for how it is wired and where the origin is written. Before that the
   site was served only from `notaryous.vercel.app`.

   **`notary.guardianlit.com` is not ours and never was.** It is BlueNotary's
   whitelabelled signer portal, Guardian-branded, serving a real login page at
   `/sign-in`. Do not add it to this Vercel project and do not redirect it.

`brand/` is excluded from the deployment by `.vercelignore` — it is source
artwork and the regeneration scripts, not part of the site.

### The domain

**Live on `www.notaryous.com` since 2026-08-11.** Before that the site was
served only from `notaryous.vercel.app`, which stays as the deployment URL.

**Correction, and it matters.** Until this swap, the canonical, `og:url`,
`og:image` and `twitter:image` on every page pointed at
`https://notary.guardianlit.com/`. That host is **BlueNotary's whitelabelled
signer portal**, not this site — it serves a Guardian-branded login page. The
original build's deploy notes proposed pointing that subdomain here and it never
happened; BlueNotary took it instead, and the URLs were never corrected. So the
site spent its whole pre-launch life telling crawlers and social scrapers that
its canonical home was somebody else's login screen. There was no traffic on it,
so nothing was lost, and there is no redirect to add: no request for that host
ever reaches Vercel.

**`www` is canonical, not the apex.** Vercel's "Redirect apex domains to www"
was left on, so `notaryous.com` 301s to `www.notaryous.com`. Typing either works.
Everything that names an origin uses the `www` form.

**Where the origin is written — eleven places, and that is all of them:**

| File | Count | What |
|---|---|---|
| `index.html` | 4 | canonical, `og:url`, `og:image`, `twitter:image` |
| `book.html` | 4 | the same four |
| `sitemap.xml` | 2 | both `<loc>` |
| `robots.txt` | 1 | the `Sitemap:` line |

Everything else on the site is root-relative, and the booking API is same-origin
with no allowlist, so nothing under `api/` or `lib/` names a host.

**Nameservers are Vercel's.** The domain was bought through the Undeveloped /
Dan marketplace, so it arrived with DNS still parked there and GoDaddy's DNS tab
inert. It had no records worth keeping — no MX, no traffic, four days old — so
the nameservers point at Vercel and Vercel manages the zone. **Consequence: if
email is ever set up on this domain, the MX records go in Vercel's DNS, not
GoDaddy's.**

#### If a future move is needed

Change the eleven URLs above and the `destination` in `vercel.json`, add the new
host in Vercel, and leave every previous host attached so the redirect chain
never breaks.

---

## Files

| Path | What it is |
|---|---|
| `index.html` | The home page: markup, styles, analytics, and the booking panel. |
| `book.html` | `/book` — the booking panel on its own page, for email, SMS and QR links. Same panel, no hero and no fee schedule. |
| `book-beta.html` | `/book-beta` — the staging copy of the same panel. `noindex` for its entire life. |
| `lib/calendar.css` | The booking panel's styles. One file, three pages. Everything in it is scoped to `#bookpanel`. |
| `lib/calendar.mjs` | The booking panel's behaviour. Also one file, three pages. |
| `lib/`, `api/`, `db/` | The booking back end. See `docs/booking-calendar.md`. |
| `mark-gold.svg` | The approved mark, unmodified. Used by the masthead, the hero (desktop only) and the footer. |
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
- **Booking panel** — the markup inside `#bookpanel`, which is byte-identical on
  `/`, `/book` and `/book-beta`. Change one and change all three, or the shared
  stylesheet and module stop matching the page. Styles live in
  `lib/calendar.css`, behaviour in `lib/calendar.mjs`; neither belongs in a page.
- **The no-JavaScript fallback** — the `<noscript>` line below the panel on `/`
  and `/book`. Phone number only, deliberately: see "No Zoho-hosted page is
  reachable" below before adding a link there.
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

## Cutover: the Zoho iframe is gone

**2026-08-09.** `#book` on the home page was a 770px Zoho `portal-embed` iframe.
It is now the bespoke booking panel — availability from Zoho Bookings, payment
through Zoho Payments, the appointment written back to Zoho, and the existing
Zoho Flow → BlueNotary chain untouched behind it. The full chain was proven live
before this landed (`#NO-00126`, `#NO-00127`, both booked, both cancelled end to
end). `docs/booking-calendar.md` is the build log.

Three pages now carry the panel, from one stylesheet and one module:

| | Who it is for | Indexed |
|---|---|---|
| `/` | Everyone arriving at the site | yes |
| `/book` | Email, SMS and QR links — the panel with no hero above it | yes |
| `/book-beta` | Staging, against the same live API | **no**, for its entire life |

The markup inside `#bookpanel` is identical on all three. If you change it on
one page, change it on all three.

### No Zoho-hosted page is reachable from this site

**2026-08-09, second pass.** The cutover initially kept a "Calendar not loading?"
link to Zoho's hosted scheduling page under the panel on `/`, plus the same link
inside the `<noscript>` on `/` and `/book`. All three are gone.

The reasoning that kept them — a booking route that does not depend on
`/api/availability` being up — was outweighed by where they sent people: an
unbranded third-party page. The panel's own error state already shows
**(714) 694-2423**, which is a better fallback than a page that does not look
like Notaryous, and the `<noscript>` lines now say the same thing.

**No page on this site links to `zohobookings.com` in any form.** If you are
about to add one, that is the decision you are reversing. Everything below in
this README about theming that hosted page, its iframe height, its 16px inputs
and its `?source=` parameter describes a page the site no longer points at; it
is kept as history and because the page still exists inside Zoho, reachable by
direct URL and from Zoho's own confirmation emails.

**What breaks the panel.** It needs `/api/availability` and `/api/checkout`,
which need the Zoho and Supabase environment variables set on the Vercel project.
Without them the page shows "We couldn't load available times just now" and the
phone number — it does not silently invent availability. The variables are listed
in `docs/booking-calendar.md`.

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

**Re-verified after the booking panel replaced the iframe** (2026-08-09), same
harness:

| | Perf | A11y | Best practices | SEO | LCP | CLS |
|---|---|---|---|---|---|---|
| `/` mobile | **100** | **100** | 96 | **100** | 0.9 s | 0 |
| `/book` mobile | 98 | **100** | 96 | **100** | 2.0 s | 0 |
| `/book-beta` mobile | 98 | **100** | 96 | 66 | 1.8 s | 0 |

Desktop is 100 / 100 / 96 / (100, 100, 66) with LCP 0.3–0.4 s and CLS 0.

`/book` and `/book-beta` sit at 98 because `lib/calendar.css` is render-blocking
there, which costs about 1.1 s of simulated mobile LCP. That is deliberate: on
those pages the panel *is* the fold, and a flash of unstyled calendar is worse
than a slower LCP on a 1.6 Mbps emulated link. `/` loads the same file
non-blocking — the panel is three screens down, so nothing it styles is painted
before it arrives — which is why the home page keeps its 100. Making `/book`
match is one attribute; it trades the flash for the two points.

`/book-beta` scores 66 on SEO for the same reason it always has: the only
failing audit is `is-crawlable`, which fails *because* of the `noindex` that
page carries for its entire life.

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

### Mobile

Measured on 320 / 375 / 390 / 412 portrait, both landscape orientations, and
iPad. No horizontal overflow at any width down to 320px, before or after.

**The top bar was spilling out of itself.** `.top .w` set `height:46px` with
`flex-wrap:wrap`. On every phone width the two spans wrap to separate rows, which
needs 51px — so the phone number rendered 4.8px *below* the bar's dark ground,
sitting on the hero. At 320px the overflow was 21.6px and the number landed
squarely on the Bordeaux. Now `min-height:46px` with 7px of vertical padding:
identical 46px on one row, grows to 55px when it wraps.

**Tap targets: three under the 44px minimum, now none.** Both `(714) 694-2423`
links were 89×14 hit areas — the primary contact route on a phone at under a
third of the minimum height — and the scheduler fallback link was 37px tall.
Fixed with padding plus a cancelling negative margin, so the hit area grows and
nothing moves. Scoped to `@media (pointer:coarse)`, so it keys off the input
device rather than viewport width and a touch laptop gets it too, while mouse
hover targets are untouched.

**Less scrolling to the scheduler.** The hero mark is decorative and sits below
the CTA, but at `74vw` it was 335px tall on a 375px phone. It is now `56vw`,
with the hero's vertical padding and the stat blocks trimmed. The booking section
moved up 233px on an iPhone SE (4.6 → 4.3 screens down) and the page is 256px
shorter. Mobile LCP improved 1.8s → 1.5s as a side effect.

Page gutters go 26px → 20px below 560px, which also widens the scheduler iframe
by 12px on a 375px screen.

**iOS specifics.** `text-size-adjust:100%` stops Safari inflating body copy on
rotation to landscape. `.shell` gets `overflow:auto` on mobile because iOS Safari
sizes iframes to their content and ignores the declared height — a no-op where
the height is honoured, a container where it is not. Re-check that once the real
embed has been loaded on a device.

`theme-color` is now Night `#1A080B` rather than Bordeaux. It colours the mobile
browser chrome, which sits directly above the `.top` bar, and `.top` is Night —
so the chrome and the top strip now meet without a seam. The manifest keeps
Bordeaux `#3B1116` for the standalone app surface. Revert by changing the one
`<meta name="theme-color">` value.

**Sticky booking bar.** The scheduler sits three-plus screens down, so below
901px a fixed bar carries `$25 flat / Paid when you book` and a Book a session
button. It comes on once the hero has scrolled away, goes off as the booking
section comes up, and **stays off past it** — so it never covers the `.notice`
compliance text or the footer. `env(safe-area-inset-bottom)` aware.

Its price wording is the hero's verbatim, so no new fee characterisation enters
the page. It is hidden with `visibility:hidden`, which also keeps the duplicate
link out of the tab order while it is off — verified by tabbing the page in both
states. Clicks report as `booking_click` with `placement: sticky_book`, so its
contribution is separable from the hero button in analytics. `display:none`
above 900px. Transition drops to `0s` under `prefers-reduced-motion`.

**The masthead, and where the brand name lives.** As delivered, "Notaryous"
appeared nowhere on screen until the footer. The fingerprint mark carries no
lettering, so the `<title>` and the image `alt` held the name but nobody reading
the hero ever saw it.

A `.mast` bar now sits between the top strip and the hero: the mark, `NOTARYOUS`
in Archivo Medium at `letter-spacing:.36em` — the wordmark spec from
`brand/README.md` — with `ONLINE NOTARIZATION` beneath it, and a Book a session
link on the right.

Numbers behind the choices:

| | Value | Why |
|---|---|---|
| Brand mark | 54px wide = **65px tall** | 54px is the narrowest width that keeps the full mark at the 64px brand minimum. Nothing to shave, including on mobile |
| `NOTARYOUS` | Gold on Bordeaux, **8.75** | Dark-ground mode |
| `ONLINE NOTARIZATION` | 10.5px, rgba(bone,.72), **7.59** | AA with room |
| Nav link | Gold on Bordeaux, **8.75** | Hidden below 901px — the hero CTA and the sticky bar already cover mobile |

`text-indent` matching the tracking is on both wordmark lines. Letter-spacing
adds a trailing space after the final letter, so without it a tracked word sits
half a letter-space left of true centre.

**Two bars on desktop, one on mobile.** Below 901px `.top` is hidden entirely
and its phone number moves into `.mast` as a right-aligned link, taking the slot
the Book a session link vacates at that width. Desktop keeps both bars.

`.mast` is `position:sticky; top:0` **on desktop only**. Mobile does not get it —
the sticky bottom CTA already carries persistence there, and a second fixed band
would spend the fold twice.

Three things that had to come with that:

- **`scroll-padding-top:112px` on desktop.** Without it an in-page jump to
  `#book` or `#main` lands the target under the 97px sticky bar. Verified by
  clicking the masthead CTA: the "Book your session" heading sits 93px clear.
- **The root background is now Bordeaux below 900px.** It stays Night on
  desktop, where `.top` is the first band. On mobile the first band is `.mast`,
  which is Bordeaux, so the overscroll strip has to match that instead.
  `theme-color` moved to `#3B1116` for the same reason — it colours the mobile
  browser chrome, and what sits under that chrome is now `.mast`.
- **The tap-target rule sets padding only for `.mastphone`, not `display`.** The
  rest of that block sets `display:inline-block`, but `.mastphone` is hidden
  above 900px and a touch laptop is a coarse pointer at that width — setting
  display there would have shown the phone number next to the nav link on
  desktop. Verified at 1024px with touch emulation: nav link shown, phone hidden.

**A 320px overflow that was hiding as a zoom-out.** The brand lockup plus the
phone number did not fit one row at 320px, and rather than overflowing visibly
the browser shrink-to-fit the layout — `innerWidth` reported 356 on a 320px
viewport, quietly scaling every other element down. Below 380px the wordmark
drops to 14px, its `ONLINE NOTARIZATION` subline is hidden (the h1 directly
underneath now reads "Notarized online.", so nothing is lost), and
the gutters tighten. `flex-wrap` on the row is the backstop if it ever stops
fitting again. Re-measured at 320 / 360 / 375 / 390 / 412: no zoom at any width.

Hiding `.top` on mobile also removed `Commissioned · Bonded · Nationwide`, so
that line moved into the hero — first as a third row in `.price`, and since the
2026-08-09 headline change as the eyebrow itself. See "The headline" below.

### The headline

**2026-08-09.** `Get it notarized. / Don't get up.` → `Notarized online. /
Notoriously easy.` Two lines, same colour split: first line Bone, second line
Gold on the dark grounds and Deep Gold on the light specimen in
`brand/brand-sheet.html`, which is the only place the headline is set on Bone.

The eyebrow changed with it. `REMOTE ONLINE NOTARIZATION` became redundant the
moment the first line said "Notarized online.", so it now reads
`COMMISSIONED · BONDED · NATIONWIDE`.

**That line already existed twice on the page, and both copies are gone.**

- `.top .tag` — the desktop utility bar. It sat ~120px above the eyebrow and was
  visible at the same time on every desktop viewport. The bar keeps the phone
  number, which is the thing it exists for, and `.top .w` moved from
  `space-between` to `flex-end` so the number stays right-aligned on its own.
- `.price .trust` — the third row under the hero CTA. It was only ever there
  because `.top` is hidden below 900px and that was the last place the line
  survived above the fold. The eyebrow is present at every breakpoint, so the
  row is no longer carrying anything.

Net: the words appear once, in gold on Bordeaux rather than muted bone, at every
breakpoint. Putting either copy back is one line; both are marked in the source.

**Not regenerated: `og-image.png`.** The headline is not baked into it. The card
reads `NOTARYOUS` over `ONLINE NOTARIZATION · $25 FLAT` — checked in
`brand/og-image.svg`, which has exactly two `<text>` nodes and neither is the
headline.

### The hero

Three changes, all desktop-facing except the trust line:

**The radial gradient is gone.** It was
`radial-gradient(120% 90% at 78% 12%, …)` — a 90%-tall ellipse centred at 12%,
which puts its edge at **57% of the hero height**. That edge was the horizontal
seam visible about halfway down. It could have been resized to fall outside the
box, but `brand/README.md` bars gradients and glows outright, so removing it
fixes the seam and a standing brand-rule conflict in the same move. Flat
Bordeaux.

**The mark is 260px and centred on the headline, not the column.** The hero is
now an explicit three-row grid on desktop — headline, sub, CTA — with
`.markwrap` placed in row 1 and `align-self:center`. It is given `height:0` and
the image is absolutely centred on the row's midpoint, so a 314px-tall mark does
not stretch a 175px headline row and push the rest of the column down. Measured
at 0px offset from the headline's centre at every width from 901px up.

`width:clamp(200px,22vw,260px)`, not a flat 260px. Centring on the headline
pushes the mark's top toward the hero's top edge, and `.hero` is
`overflow:hidden`. At a flat 260px the clearance at 901px was **1px** — any
font-metric difference on a real machine would have clipped the mark. The clamp
holds ~37px clear there and reaches the full 260px from 1182px up, which is
every real desktop.

Mobile is untouched by all of this: the mark is still hidden below 901px, and
the grid placement rules live inside a `min-width:901px` block so they never
apply there.

**On mobile the hero's mark is hidden entirely** (`display:none` below 901px).
The masthead is a few inches above it carrying the same artwork; showing both
would put one mark twice inside a single screen of scroll. **The desktop hero
keeps its 300px mark** and has no wordmark under it — the masthead names the
brand a short distance above, so repeating it there just doubles the word.

That trade paid for itself. With the hero mark gone on mobile, ~196px of fold
budget came back against the masthead's ~93px, so the hero padding returned to
comfortable values instead of the tightened ones the earlier layout needed:

| | CTA bottom | Fold | Margin | Price line |
|---|---|---|---|---|
| iPhone SE 375×667 | 539 | 667 | +128px | **above** |
| iPhone 14 390×844 | 511 | 844 | +333px | above |
| Pixel 412×915 | 511 | 915 | +404px | above |
| Fold 320×653 | 539 | 653 | +114px | **above** |

Both the CTA and the `$25 flat / Unlimited signatures` line now clear the fold on
every reference device, including the two shortest — which the previous
hero-mark-on-top layout could not manage. The page is also ~110px shorter.

The masthead's Book a session link reports as `booking_click` with
`placement: mast_book`, so its pull is separable from the hero button and the
sticky bar.

**Not adopted from the version this came from**, with the measurements:

- Its masthead mark was 34px wide (41px tall), and 28px (34px) on mobile —
  below the 64px brand minimum, the same violation already fixed in the footer.
- Its `ONLINE NOTARIZATION` subline was 8.5px at rgba(bone,.5), which measures
  **4.27** and fails AA. 7.5px on mobile.
- 8.5px and 7.5px are smaller than anything else on this page; the smallest
  type here is 10.5px.

**Performance.** Mobile Lighthouse is 100 at a median LCP of 953ms and Speed
Index 729ms, taken as the median of three runs — a single cold run showed 98 /
1.9s, which is run-to-run variance rather than a regression. Desktop 100, LCP
0.5s. Verify against medians, not one run.

The 10.5px tracked uppercase labels (`.top .tag`, `.eyebrow`, `.placard .cap`)
and the 11.5px stat labels are left alone. They are a deliberate typographic
device, they pass Lighthouse's legible-font-size audit, and changing them is a
design decision rather than an optimisation.

### Two things from the alternate mobile spec that were not adopted

**The mark is not shipped as a WebP raster to mobile.** The proposal was a 280px
WebP at 32 KB in a `<picture>`, against the vector for desktop. Measured, at the
210 CSS px the mark occupies on a phone:

| | Bytes | On a 3x phone |
|---|---|---|
| Vector (what ships) | **58 KB** brotli, cached immutable | exact |
| 280px WebP | 32 KB | 3x upscale of hairlines |
| 420px WebP (2x) | 47 KB | still soft on 3x |
| 630px WebP (3x) | **75 KB** | exact — and *worse* than the vector |

The saving only exists at a resolution that does not hold up. This artwork is
dense concentric hairlines, the worst case for downsampling: rendered at 280px
and scaled to a 3x display it shows chroma fringing and ragged ridges. At a
resolution that actually looks right it is 17 KB *heavier* than the vector, which
is also cached forever after first paint. It would additionally contradict the
brief's own rule that the mark is never replaced with a raster.

**The hero reorder was declined, adopted, then superseded.** Originally
rejected on measurement: the mark sat below the CTA, and moving it above the
headline pushes the only conversion action down the page for no measured gain.
It was then requested as a brand call and built — mark leading the mobile hero
at 33% smaller.

The masthead has since made that moot. The mobile hero no longer shows the mark
at all; the masthead above it does, which resolves the original objection
outright — the CTA and the price line now both clear the fold on every reference
device. See "The masthead, and where the brand name lives" above.

Also noted: the "16px inputs so iOS does not auto-zoom" item does not apply here.
There are no form inputs on this page — the booking form lives inside the Zoho
iframe, whose CSS we do not control. That has to be fixed in Zoho's own theme
(see the theming item under open items).

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

### 1. Zoho: payment required — CONFIRMED, with one sub-question left

**Confirmed in the Zoho settings.** Payment is required, and the service reads
`Online Notarization — 15 mins | 25 USD` on the live booking page. The flow is:
pick a date and time → enter details → redirected to a payment page.

That clears the blocking gate. One question inside it is still worth answering,
because it is the difference between "payment is required" and the promise the
page actually makes:

**What exists if someone abandons at the payment page?** Many booking systems
create a pending or unconfirmed appointment when the details form is submitted,
then flip it to confirmed when payment settles. If Zoho does that here, an
abandoned checkout leaves an unpaid appointment on the calendar — and hard
constraint 1 says payment clears at booking or the session does not exist.

Test it in five minutes: start a booking, reach the payment page, close the tab,
then look at the Zoho calendar and the notary's calendar.

- If nothing appears — done, the model holds.
- If a pending appointment appears — it must auto-expire, and no notary may
  treat a pending row as a session to attend. Check Zoho for a hold/expiry
  setting on unpaid bookings, and make the rule explicit to whoever staffs the
  calendar.

Two things this confirmation already settles elsewhere in this document:

- **The security headers were right to stay permissive.** A redirect to a
  payment page inside the flow is exactly what a restrictive `frame-src`, or
  `Permissions-Policy: payment=()`, would have broken. See "Headers".
- **It strengthens the mobile handoff case.** A payment redirect inside a 320px
  iframe is the worst place for nested scrolling and for the sub-16px inputs
  that make iOS Safari zoom. See item 4.

Still worth confirming while you are in there:
- The payment gateway is live, not in test mode
- The confirmation email is itemised enough to serve as a fee receipt

### 2. Zoho: create the hidden `Source` field for the tracking parameter

**Superseded 2026-08-09: nothing on this site sends traffic to the Zoho hosted
page any more, so there is no `?source=` to map.** Kept because the field is
still worth having if bookings ever arrive there from Zoho's own emails.

The iframe and the fallback link used to carry `?source=notaryous-site` and
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

### 3. Zoho: theme the booking page itself

Everything inside the iframe is Zoho's markup and Zoho's CSS. **No stylesheet in
this repo can reach into it** — a cross-origin iframe is a hard boundary, and no
amount of CSS here will restyle it. It has to be done on Zoho's side.

**Modern Web theme and custom CSS are mutually exclusive.** Per Zoho's own docs,
Custom CSS requires the **Premium** plan and is supported on the **Basic theme
only**. A workspace set to Modern Web ignores an uploaded CSS file entirely. So
there are two routes, not one:

| Route | Gets you | Cost |
|---|---|---|
| Modern Web + colour palette | Approximate brand colours. The palette tool is known to miss the booking modal. | Paid tier, no CSS control |
| **Basic theme + Custom CSS** | Actual match — type, palette, buttons, 16px inputs, focus rings | **Premium** |

Only the second route matches the site. Uploaded CSS applies to the embedded
view *and* the popped-out view, so the iframe and the new-tab fallback stay
consistent.

**Where the CSS upload actually is:** not in the theme panel with the layout
tiles and Color Options. It is inside **Workspace Properties**, a separate
collapsed row further down that same sidebar. If Workspace Properties has no
upload control, the account is not on Premium or the workspace is not on the
Basic theme — those are the two gates, and no amount of looking will surface it.

**A starter file is in this repo: `brand/zoho-booking-page.css`.** Upload it at
Manage Bookings → Workspaces → Workspace Properties → Upload icon → Save.

#### Probe result: delivery works on this workspace

The diagnostic was run and came back **all four probes firing** — body border,
buttons, and the universal selector all landed. So Custom CSS is being delivered
and applied on this account. Plan and theme are not the obstacle, and anything
that fails to take effect from here is a selector problem.

Three things the probe exposed on the live booking page, worth fixing regardless
of the stylesheet:

1. **The page is headed "Guardian Litigation Group", not Notaryous.** A consumer
   who clicks Book a session on a notarization site and lands on a page headed
   with a litigation firm's name is going to hesitate. The trade name disclosure
   belongs in the footer, the way it does on the site — not as the page title.
   Change the business/workspace name in Zoho, and put it in front of Kimberly
   with the rest of the trade name questions.
2. **Zoho's theme colour is bright gold on a light ground.** The "Welcome!"
   heading, the step labels and the selected-day fill are all gold on Bone,
   measuring roughly **1.87**. That is the exact trap `brand/README.md` warns
   about, live in the booking flow. The stylesheet replaces it; the Color
   Options palette should be set to Bordeaux too, so the popped-out view is
   right even if the CSS is ever dropped.
3. **The embed scrolls internally at desktop width, and now it is measurable.**
   With the real stylesheet applied (not the inflated probe), the scrollbar
   thumb occupies about 76% of its track, which puts the content near
   **1010px** against a 770px frame. See item 5 — this is the answer to the
   open height question, with one caveat about variable day length.

#### If the upload succeeds and nothing changes

This is the expected failure, not a surprise, and it is almost never the
stylesheet. Zoho accepts the upload, reports success, and then ignores it if
the workspace is on any theme other than **Basic**. No error, no warning.

Work it in this order:

1. **Set the workspace theme to Basic.** Compact and Modern Web silently
   discard custom CSS. This is the single most likely cause.
2. **Re-test in a private window.** Zoho caches the stylesheet, and the site
   embeds the page in an iframe that caches separately, so an ordinary reload
   will show you a stale page and you will conclude the wrong thing. Test the
   popped-out booking URL directly first — one fewer cache layer.
3. **Confirm the plan is Premium.** Some tiers show the upload control and no-op
   on it.
4. **Run the probe.** `brand/zoho-diagnostic.css` in this repo is a deliberately
   garish file — lime background, magenta border, orange buttons. Upload it
   *instead* of the real stylesheet and look at the page. It distinguishes the
   two cases that matter:
   - **Nothing changes** → the CSS is not being delivered at all. Theme or plan.
     No amount of selector work will help.
   - **Background changes but buttons do not** → Zoho renders the widget in a
     shadow root or a nested iframe, which external CSS cannot pierce. Stop;
     the styling has to come from Zoho's own controls.
   - **Everything goes garish** → delivery works and the real file lost on
     specificity. That is fixable, and the selectors get tightened from there.

   Delete the probe once you have the answer.

The real stylesheet's selectors are prefixed `html body` so they win against
Zoho rules that also use `!important` — with `!important` on both sides,
specificity decides.

#### Manual configuration, if Custom CSS is not available

The theme panel gets most of the way there. Exact values, in the order they
appear in the sidebar:

**Color Options** — click the `+` swatch to enter a custom colour.

| Field | Value | Why |
|---|---|---|
| Primary / accent | `#3B1116` Bordeaux | The booking page is a light surface, so the primary is Bordeaux, giving Bone-on-Bordeaux buttons at 13.71 contrast |
| Secondary, if offered | `#7E5C1E` Deep Gold | 5.10 on Bone, passes AA |
| Never | `#E0B772` bright Gold | 1.57 on a light ground. Unreadable. This is the one trap in the palette |

If the picker only takes one colour, use Bordeaux. Bright gold as a primary on
this page would put gold text and gold-on-white buttons through the whole
booking flow, which fails contrast everywhere it lands.

**Background Image** — leave empty. The brand rules bar gradients and imagery
behind the mark, and a background behind a booking form costs legibility on
exactly the screens where it matters. The flat Bone ground is correct.

**Layout** — Compact is a reasonable pick. It puts fewer rows in the iframe,
which is the constraint on mobile.

**Header / Footer** — add the wordmark. Match the file to the header's ground:

- Light header → `brand/png/lockup-horizontal-light-2000.png`
- Dark header → `brand/png/lockup-horizontal-dark-2000.png`

Keep it to the lockup. Do not place the bare mark below 64px tall; use the
favicon artwork under that size.

**SEO Properties** — the standalone booking page is publicly indexable and will
compete with the real site for "Notaryous" searches. Either point its title and
description at the same copy the site uses, or suppress indexing if the panel
allows it. A Zoho-hosted page outranking `www.notaryous.com` is a bad
outcome for a page whose whole job is to be the destination.

**What manual configuration cannot fix:** form input font size. Zoho's inputs
are under 16px, and below 16px iOS Safari zooms the page when a field takes
focus — mid-booking, on the payment screen. There is no palette setting for
this; it needs the Custom CSS route. Until then it is a real argument for
handing mobile visitors to a new tab rather than the iframe (open item 4), where
the zoom is merely awkward instead of trapping them inside a nested scroll.

The palette, typography, button treatment and input sizing in it are complete
and use generic selectors that hold regardless of Zoho's markup. The block at
the bottom marked `ZOHO-SPECIFIC HOOKS` — selected day, time slots, the modal —
is commented out and needs real class names pulled from DevTools on the live
page, because Zoho's class names change between releases and guessing them
produces a file that silently does nothing.

Two things in that file matter more than the colours:

- **16px form inputs.** Below 16px, iOS Safari zooms the page when a field takes
  focus and throws the form off-screen mid-booking. This is only fixable in
  Zoho's CSS, which is why the item cannot be closed on our side.
- **The booking modal.** Style and test it explicitly. It is the last screen
  before payment and it is exactly what Zoho's palette tool misses.

The booking page is a **light** surface, so it takes the light mode of the
system: Bone ground, Ink body text, and buttons are **Bordeaux fill with Bone
text — not gold**. Bright gold `#E0B772` on Bone measures 1.57 and is
unreadable; accent text on that ground is Deep Gold `#7E5C1E` (5.10, AA).

### 4. Should mobile drop the iframe entirely? — decide with a device in hand

There is a live proposal to replace the embed below 900px with a full-width
button that opens the booking page in its own tab, on the grounds that nested
scrolling inside an iframe on a phone breaks date selection and payment.

That is a plausible and fairly common call, and if it is true it matters more
than embed elegance — hard constraint 1 says payment clears at booking or the
session does not exist, so payment reliability outranks staying in-page.

It is not implemented here, because it is a conversion-affecting product decision
resting on a claim nobody has verified on this specific Zoho service, and this
environment cannot load `zohobookings.com` to check. Handing every mobile visitor
off to a new tab costs context and adds a step; doing it for no reason is a real
cost too.

Decide it with five minutes on a real phone against the preview deployment:

1. Can you pick a date and a time without fighting a nested scroll?
2. Does the payment step complete?
3. Does the keyboard obscure fields you cannot then scroll to?

**Superseded 2026-08-09: there is no embed to swap.** `/`, `/book` and
`/book-beta` all run the bespoke panel, and no page links to the hosted one.
Kept for the mobile-usability findings, which informed the panel's own layout.

### 5. Iframe height — 770px is too short on desktop

Still at the delivered values in code: **770px desktop, 830px under 900px wide.**
Not yet changed, but there is now evidence for the desktop figure.

**Desktop wants roughly 1020px.** With the branded stylesheet applied, the
embed shows an internal scrollbar whose thumb is about 76% of its track, putting
the content near 1010px. That is a real measurement rather than a guess, but it
carries one caveat worth respecting before hard-coding it:

**Content height varies by day.** A date with a full slate of 15-minute slots is
much taller than a lightly booked one — the screenshot showing this had four
rows of morning slots plus an afternoon block. Any fixed height is a compromise
between a scrollbar on busy days and dead space on quiet ones. Size it against a
*typical fully-open weekday*, not today's calendar, or it will look wrong within
a week.

Once you have that number, change both `.shell iframe{height:...}` rules in
`index.html` — the base one and the one inside the `max-width:900px` media
query.

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

- [x] **Zoho service set to $25 with payment required at booking** — confirmed
- [ ] **Abandoned checkout leaves no attendable appointment** — see item 1
- [ ] **Payment gateway live, not in test mode**
- [ ] **Hidden `Source` field created in Zoho** — see above
- [ ] **Booking smoke test on the preview deployment** — one real $25 session
- [x] **Mobile embed usability decided** — the iframe is gone. `/`, `/book` and
      `/book-beta` all run the bespoke panel, and no page on this site links to a
      Zoho-hosted page.
- [x] **Iframe height checked on mobile Safari and Chrome** — moot, no iframe.
- [x] Zoho booking page themed to the brand palette — moot for this site; the
      hosted page is no longer reachable from it
- [ ] Zoho SEO Properties set so the hosted booking page does not outrank the
      site — **still worth doing.** The page still exists inside Zoho and is
      indexable on its own, even though we no longer link to it.
- [x] Zoho form inputs set to 16px so iOS does not zoom on focus — moot; our own
      inputs are 16px and always were
- [ ] Kimberly Uptain: disclaimer language, trade name disclosure, fee characterisation
- [ ] DBA filed and trade name cleared under attorney advertising rules
- [ ] Notarial E&O policy bound
- [ ] Booking confirmation email doubles as an itemised receipt (state fee record requirement)
- [ ] Web Analytics enabled on the Vercel project
- [ ] Print proof of Bordeaux `#3B1116` before any physical collateral — deep reds
      shift in CMYK and can go brown or purple depending on stock
