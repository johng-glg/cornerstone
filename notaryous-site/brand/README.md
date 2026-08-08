# Notaryous — Brand Assets v2 (Bordeaux, two mode)

True vector. The mark never changes; only its colour and ground do.

## The system
Two modes, one palette. Dark for arrival and legal notice, light for working content.

| | Ground | Mark | Body text | Button |
|---|---|---|---|---|
| **Dark** | Bordeaux `#3B1116` | Gold `#E0B772` | Bone `#F1E7DA` | Gold fill, Bordeaux text |
| **Light** | Bone `#EFEAE0` | Bordeaux `#3B1116` | Ink `#241014` | Bordeaux fill, Bone text |
| **Mono** | White | Ink `#241014` | Ink | n/a |

## Palette
| Name | Hex | Use |
|---|---|---|
| Bordeaux | `#3B1116` | Dark ground, mark on light |
| Cordovan | `#2E0D12` | Deeper panels, favicon tile |
| Gold | `#E0B772` | Mark on dark, solid fills |
| Deep Gold | `#7E5C1E` | Accents and small text on light grounds |
| Bone | `#EFEAE0` | Light ground |
| Ink | `#241014` | Body text, one-colour mark |

**The one trap:** Gold `#E0B772` on Bone measures 1.57 contrast and is unreadable.
On light grounds the accent is Deep Gold `#7E5C1E` (5.10, passes AA). Bright gold is
for dark grounds and for solid fills only.

## Files
### Mark
`mark-gold-on-bordeaux.svg` · `mark-bordeaux-on-bone.svg` · `mark-gold.svg` ·
`mark-bordeaux.svg` · `mark-ink.svg` · `mark-white.svg`

### Icons
`icon-disc-dark/light.svg` · `icon-squircle-dark/light.svg` ·
`favicon.svg` (Cordovan tile, gold N) · `favicon-light.svg` · `favicon-mono.svg`

### Lockups
`lockup-stacked-dark/light/mono.svg` · `lockup-horizontal-dark/light.svg`

### Social
`og-image.svg` — 1200x630, Bordeaux ground

### PNG
`png/` holds rasterised versions. Regenerate from SVG rather than upscaling.

## Type
Archivo throughout. Wordmark: Archivo Medium, all caps, letter-spacing 0.36em.

## Rules
- Clear space equal to the width of the N stem on all sides.
- Full mark never below 64px tall. Use the favicon below that.
- Never bright gold on a light ground. Use Deep Gold.
- Never rotate, mirror, or skew. The pixel dissolve is directional.
- Never add gradients, bevels, glows, shadows, circuit traces, or scan frames.
- Never recolour the N separately from the ridges.

## Regenerating
`vectorize.py` traces the approved artwork. `build_v2.py` produces every file here.
Both are deterministic.
