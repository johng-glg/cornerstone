#!/usr/bin/env python3
"""Produce the web icon set at the deploy root from brand/ sources.

Deterministic, same as build_v2.py: every raster is rendered from an approved
SVG, never upscaled from a smaller raster. Run from the repo root:

    python3 brand/build_web_icons.py

Requires cairosvg and pillow.
"""
import os
import cairosvg
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
BRAND = HERE
ROOT = os.path.dirname(HERE)


def render(src, out, px):
    cairosvg.svg2png(url=os.path.join(BRAND, src),
                     write_to=os.path.join(ROOT, out),
                     output_width=px, output_height=px)
    return out


def main():
    # Multi-size .ico from the Cordovan tile favicon. 16/32/48 are the sizes
    # Windows and the browser tab actually ask for.
    tmp = []
    for px in (16, 32, 48):
        p = os.path.join(ROOT, f".ico-{px}.png")
        cairosvg.svg2png(url=os.path.join(BRAND, "favicon.svg"),
                         write_to=p, output_width=px, output_height=px)
        tmp.append(p)
    frames = [Image.open(p).convert("RGBA") for p in tmp]
    frames[-1].save(os.path.join(ROOT, "favicon.ico"), format="ICO",
                    sizes=[(16, 16), (32, 32), (48, 48)],
                    append_images=frames[:-1])
    for p in tmp:
        os.remove(p)
    print("favicon.ico (16/32/48)")

    # Home screen icon. Disc, dark mode, gold mark.
    print(render("icon-disc-dark.svg", "apple-touch-icon.png", 180))

    # Manifest icons. Squircle, dark mode.
    print(render("icon-squircle-dark.svg", "icon-192.png", 192))
    print(render("icon-squircle-dark.svg", "icon-512.png", 512))

    # Open Graph card. 1200x630, not square, so render explicitly.
    cairosvg.svg2png(url=os.path.join(BRAND, "og-image.svg"),
                     write_to=os.path.join(ROOT, "og-image.png"),
                     output_width=1200, output_height=630)
    print("og-image.png 1200x630")

    # Vector favicons served directly.
    for name in ("favicon.svg", "favicon-light.svg"):
        with open(os.path.join(BRAND, name)) as f:
            src = f.read()
        with open(os.path.join(ROOT, name), "w") as f:
            f.write(src)
        print(name)

    # The mark itself, served as one cacheable external file instead of
    # ~197KB of inline path data in every HTML response.
    with open(os.path.join(BRAND, "mark-gold.svg")) as f:
        src = f.read()
    with open(os.path.join(ROOT, "mark-gold.svg"), "w") as f:
        f.write(src)
    print("mark-gold.svg")


if __name__ == "__main__":
    main()
