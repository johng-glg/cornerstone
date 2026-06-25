# Entrust United Corporation — Website

Production-ready marketing website for **Entrust United Corporation**, a Texas
nonprofit corporation pursuing 501(c)(3) recognition. Built as a fully static,
accessible, fast-loading site you can deploy immediately.

- **Framework:** Next.js 15 (App Router) + TypeScript
- **Styling:** Tailwind CSS (no UI dependency lock-in)
- **Icons:** lucide-react
- **Output:** fully static (`output: 'export'`) — deploys to Vercel, Netlify,
  Cloudflare Pages, S3/CloudFront, or any static host. No server, no secrets.
- **Accessibility:** semantic HTML, WCAG AA contrast, keyboard nav, visible
  focus, skip-to-content, `prefers-reduced-motion`, labelled SVGs.

> ⚠️ **Before you launch:** this site contains placeholder copy and **draft
> legal language**. Search the codebase for `[CONFIRM]` and `[DRAFT` and resolve
> every item with counsel. A full checklist is at the bottom of this file.

---

## Quickstart

Requires **Node ≥ 18** (built and tested on Node 22).

```bash
cd entrust-united-website
npm install
npm run dev      # http://localhost:3100
```

| Command         | What it does                                              |
| --------------- | -------------------------------------------------------- |
| `npm run dev`   | Start the dev server on port 3100                        |
| `npm run build` | Production build + static export to `out/`               |
| `npm run start` | Serve the production build locally                       |
| `npm run lint`  | Run ESLint (next/core-web-vitals)                        |

The static site is emitted to `out/` after `npm run build`.

---

## Editing content (no component code required)

**All copy lives in typed files under [`content/`](./content).** Edit text there
and it updates everywhere — components never hardcode copy.

| File                              | Controls                                              |
| --------------------------------- | ----------------------------------------------------- |
| `content/site.ts`                 | Org name, nav, footer, **contact details**, **disclaimers**, domain |
| `content/home.ts`                 | Home page                                             |
| `content/mission.ts`              | `/mission`                                            |
| `content/consumers.ts`            | `/consumers`                                          |
| `content/settlementCompanies.ts`  | `/settlement-companies`                               |
| `content/specialNeeds.ts`         | `/special-needs`                                      |
| `content/howItWorks.ts`           | `/how-it-works`                                       |
| `content/governance.ts`           | `/governance` (incl. board roster placeholders)       |
| `content/donate.ts`               | `/donate`                                             |
| `content/contact.ts`              | `/contact` (form options, success message)            |
| `content/disclosures.ts`          | `/disclosures` (legal/privacy/terms — all DRAFT)      |

TypeScript will flag typos in `icon` names or shapes, so editing is safe.

---

## Swapping colors & fonts

**Colors** live in [`tailwind.config.ts`](./tailwind.config.ts) under
`theme.extend.colors`:

- `brand.*` — primary deep navy/teal scale (trust/finance)
- `accent.*` — warm amber/coral scale (care/CTAs)

Change those scales and the whole site re-skins. Re-run the dev server.

**Fonts** use robust system stacks (no network dependency, zero layout shift) —
a humanist sans for body and a serif for headings, set in `tailwind.config.ts`
under `fontFamily.sans` / `fontFamily.heading`. To use Google Fonts instead:

1. `import { Inter, Lexend } from 'next/font/google'` in `src/app/layout.tsx`.
2. Load them with `variable: '--font-sans'` / `'--font-heading'`.
3. Point the Tailwind `fontFamily` entries at those CSS variables.

---

## SEO & metadata

- Per-page `<title>` / meta + Open Graph + Twitter cards via
  `src/lib/metadata.ts` (`pageMetadata()`), fed from each page's `meta` block.
- `Organization` JSON-LD on the home page (`src/components/JsonLd.tsx`).
- `sitemap.xml` and `robots.txt` generated at build time
  (`src/app/sitemap.ts`, `src/app/robots.ts`).
- Favicon: `public/favicon.svg`. OG image: `public/og-image.svg`
  **(placeholder — replace with a 1200×630 PNG before launch).**
- **Set your real domain** in `content/site.ts` → `site.url` so canonical and
  OG URLs are correct.

---

## Contact form

The form (`src/components/ContactForm.tsx`) validates on the client and has **no
backend**. By default it opens the visitor's email client via `mailto:` using
`site.contact.email`. To collect submissions instead, set `form.formAction` in
`content/contact.ts` to a form-service endpoint (e.g. Formspree/Basin) and the
form will POST there.

---

## Deploy to Vercel (one command)

```bash
npm i -g vercel
vercel            # follow prompts; framework auto-detected as Next.js
vercel --prod     # promote to production
```

> **Important:** this project lives inside the larger `cornerstone` repo. When
> importing to Vercel/Netlify, set the **Root Directory** to
> `entrust-united-website`.

**Netlify:** build command `npm run build`, publish directory `out`.
**Any static host:** run `npm run build` and upload the `out/` folder.

---

## Project structure

```
entrust-united-website/
├─ content/              # ← all editable copy (typed)
├─ public/               # favicon, OG image, static assets
├─ src/
│  ├─ app/               # routes (App Router) + layout + sitemap/robots
│  ├─ components/        # Header, Footer, Hero, FAQ, Stepper, FBO diagram, …
│  └─ lib/               # icons, metadata helper, utilities
├─ next.config.mjs       # static export config
└─ tailwind.config.ts    # brand tokens (colors, fonts)
```

---

## ✅ Pre-launch checklist (`[CONFIRM]` / `[DRAFT]` items)

Resolve **all** of these — most require counsel — before going live:

### Legal / compliance (attorney review required)
- [ ] **Tax status** language (`content/site.ts → taxStatusDisclaimer`,
      `/disclosures`). Do **not** claim 501(c)(3) status until the IRS issues a
      determination letter.
- [ ] **Service availability / state licensing** language
      (`availabilityDisclaimer`). Do **not** imply nationwide availability.
- [ ] **Custodial funds** representations (safeguarding/insurance wording) on
      `/consumers`, `/how-it-works`, `/disclosures`.
- [ ] **Privacy policy** and **Terms of use** — full drafts in
      `content/disclosures.ts`, all marked `[DRAFT — attorney review required]`.
- [ ] Settlement-company **compliance posture** claims
      (`content/settlementCompanies.ts`).
- [ ] Special-needs **trust descriptions** — keep general; no legal advice
      (`content/specialNeeds.ts`).

### Organization details
- [ ] Public **contact email, phone, mailing address, EIN**
      (`content/site.ts → site.contact`).
- [ ] **Board roster** — real names, roles, independence designations
      (`content/governance.ts`).
- [ ] Governance structure specifics (no-members, independent-director majority,
      conflict-of-interest policy) — confirm with counsel.
- [ ] **Donation flow** — wire to a real, vetted provider; the current button is
      a placeholder CTA only (`content/donate.ts`).
- [ ] Real **domain** in `content/site.ts → site.url`.
- [ ] Social links (`content/site.ts → site.social`) or leave blank.

### Assets
- [ ] Replace `public/og-image.svg` with a 1200×630 **PNG**.
- [ ] Swap the inline logo (`src/components/Logo.tsx`) for the real brand logo.
- [ ] Add real photography where desired (currently icon/illustration-led).

### Statement-level disbursement / portal details
- [ ] Disbursement & authorization details (`content/howItWorks.ts`).
- [ ] Consumer statement / balance portal details (`content/consumers.ts`).
- [ ] Contact-form intake destination (`content/contact.ts → form.formAction`).
