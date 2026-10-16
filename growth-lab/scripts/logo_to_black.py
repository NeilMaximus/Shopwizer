"""Turns a genuine colour logo on a white or transparent background into the same logo in ink on a
transparent background, for the small research brand logos under MartechTribe's figures.

  python3 scripts/logo_to_black.py IN OUT.png [max_height_px] [solid]

Every pixel's opacity comes from how far it is from white (255 minus its lowest channel), so a solid
logo colour becomes solid ink, white details inside the logo become clear, and anti aliased edges keep
their softness. Pale noise below 12 is dropped and anything darker than 200 (or the optional solid
value) is fully opaque, which evens out gradients. A lower solid value turns a pale logo colour, such
as a pink crest, into solid ink so the white detail inside it stays legible. The empty margin is
trimmed and the result scaled down to max_height_px (120 by default). The artwork is never redrawn, retyped or reshaped. Record every converted file in
SOURCES.md. Needs Pillow and NumPy.
"""
import pathlib
import sys

import numpy as np
from PIL import Image

INK_RGB = (17, 17, 17)
FLOOR, SOLID = 12, 200


def convert(src, dst, max_height=120, solid=SOLID):
    im = Image.open(src).convert("RGBA")
    flat = Image.new("RGBA", im.size, (255, 255, 255, 255))
    flat.alpha_composite(im)
    rgb = np.asarray(flat.convert("RGB")).astype(float)
    dark = 255 - rgb.min(axis=2)
    alpha = np.clip((dark - FLOOR) / (solid - FLOOR), 0, 1)
    ys, xs = np.where(alpha > 0)
    assert len(xs), f"{src}: no logo found"
    alpha = alpha[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    out = np.zeros(alpha.shape + (4,), dtype=np.uint8)
    out[..., :3] = INK_RGB
    out[..., 3] = np.round(alpha * 255).astype(np.uint8)
    logo = Image.fromarray(out, "RGBA")
    if logo.height > max_height:
        logo = logo.resize((round(logo.width * max_height / logo.height), max_height), Image.LANCZOS)
    logo.save(dst, optimize=True)
    return logo.size


if __name__ == "__main__":
    size = convert(pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2]), int(sys.argv[3]) if len(sys.argv) > 3 else 120,
                   int(sys.argv[4]) if len(sys.argv) > 4 else SOLID)
    print(sys.argv[2], f"{size[0]} x {size[1]} px")
