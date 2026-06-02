# Guardian Litigation Group — Brand Guidelines

> Source of truth for Cornerstone's visual identity. Derived from the official **GLG Style
> Guide** (`GLG_Style_Guide.pdf`) and the supplied logo/element/pattern assets. Brand assets
> live in `public/brand/`; the design tokens below are wired into `src/index.css` and
> `tailwind.config.ts`.

## Color palette

| Name               | Hex       | RGB           | Tailwind token      | Usage                                       |
| ------------------ | --------- | ------------- | ------------------- | ------------------------------------------- |
| **Guardian Gold**  | `#E0B772` | 224, 183, 114 | `guardian-gold`     | Accent, highlights, active states, logo     |
| **Bold Navy**      | `#1E2E3E` | 30, 46, 62    | `guardian-navy`     | Primary brand color, header, headings, CTAs |
| **Sharp Charcoal** | `#343739` | 52, 55, 57    | `guardian-charcoal` | Body text                                   |
| **Ivory**          | `#F9F9F9` | 249, 249, 249 | `guardian-ivory`    | Page background, surfaces                   |
| **Freedom Blue**   | `#669BBC` | 102, 155, 188 | `guardian-blue`     | Secondary accent, info states, charts       |

PMS references (print): Gold 7508 C · Navy 7546 C · Charcoal 447 C · Ivory 656 C · Blue 7454 C.

### Application in the app

- **Primary** (buttons, links, focus) → Bold Navy, white text.
- **Accent / highlight** (badges, active nav, key figures) → Guardian Gold.
- **Background** → Ivory / white; **cards** → white with subtle border.
- **Charts** → Navy + Gold + Freedom Blue series.

## Typography

| Role             | Font                       | Weight       |
| ---------------- | -------------------------- | ------------ |
| Headlines        | **Montserrat**             | Black (900)  |
| Sub-headlines    | Montserrat                 | Bold (700)   |
| Body             | Montserrat                 | Medium (500) |
| Secondary/system | SF Pro Display → system-ui | Bold         |

Web stack: `"Montserrat", "SF Pro Display", system-ui, sans-serif`. Montserrat is loaded from
Google Fonts in `index.html`. Headlines use tight leading (100%), metric kerning.

## Logo

Assets in `public/brand/`:

| File                 | Description                                  | Use on            |
| -------------------- | -------------------------------------------- | ----------------- |
| `glg-full-light.svg` | GG shield (gold) + wordmark (charcoal)       | Light backgrounds |
| `glg-full-dark.svg`  | GG shield (gold) + wordmark (white)          | Navy/dark headers |
| `glg-shield.svg`     | GG shield monogram (gold) — also the favicon | Compact / icon    |

- Maintain clear space ≈ the height of the shield around the logo.
- Never recolor the wordmark outside the approved one-color treatments.
- Favicon = the gold shield monogram (`public/favicon.svg`).

## Brand elements & pattern

- **Elements:** vertical pillar bars (the shield's strokes), shield/hexagon outlines, halftone
  dot fades — gold or navy. Use sparingly as section accents, never behind body text.
- **Pattern:** scattered shield/pillar motif (`public/brand/glg-pattern.svg`) — for hero/empty
  states and login decoration at low opacity only.

## Voice

Authoritative, protective, precise — "Guardian." Favor confident, plain language over jargon.
