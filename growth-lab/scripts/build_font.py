"""Builds the self-hosted Geist file for the Growth Lab website.

Source: Vercel's official `geist` npm package (dist/fonts/geist-sans/Geist-Variable.ttf),
licensed under the SIL Open Font License 1.1 (LICENSE.txt in the same package).

Output: one variable woff2 limited to the weights the site uses (400 to 700) and to the
Latin range Google Fonts serves as its "latin" subset, plus the OFL licence, and
(in scripts/geist-metrics.json) the metric overrides for a size-matched local fallback (reduces layout shift during swap).

Usage:
  npm pack geist && tar -xzf geist-*.tgz
  python3 build_font.py path/to/package site/assets/fonts/geist

Needs fonttools and brotli (pip install fonttools brotli).
"""
import json
import pathlib
import shutil
import sys

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

# Google Fonts "latin" subset
LATIN = ("U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,"
         "U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD")

# Relative frequency of characters in English text, as used by capsize to compare widths
FREQ = {
    " ": 0.1818, "e": 0.1033, "t": 0.0731, "a": 0.0657, "o": 0.0617, "i": 0.0568,
    "n": 0.0557, "s": 0.0518, "r": 0.0499, "h": 0.0496, "l": 0.0334, "d": 0.0320,
    "u": 0.0227, "c": 0.0223, "m": 0.0202, "f": 0.0183, "w": 0.0168, "g": 0.0164,
    "p": 0.0154, "y": 0.0145, "b": 0.0125, "v": 0.0080, "k": 0.0065, "x": 0.0014,
    "j": 0.0011, "q": 0.0009, "z": 0.0006,
}


def weighted_width(font):
    cmap = font.getBestCmap()
    hmtx = font["hmtx"]
    upm = font["head"].unitsPerEm
    total = sum(FREQ.values())
    return sum(hmtx[cmap[ord(ch)]][0] * w for ch, w in FREQ.items()) / total / upm


def text_width(font, text):
    cmap = font.getBestCmap()
    hmtx = font["hmtx"]
    return sum(hmtx[cmap[ord(ch)]][0] for ch in text) / font["head"].unitsPerEm


def main(pkg, out):
    pkg, out = pathlib.Path(pkg), pathlib.Path(out)
    out.mkdir(parents=True, exist_ok=True)
    src = pkg / "dist/fonts/geist-sans/Geist-Variable.ttf"

    font = TTFont(src)
    font = instancer.instantiateVariableFont(font, {"wght": (400, 700)})
    tmp = out / "_tmp.ttf"
    font.save(tmp)

    options = subset.Options()
    options.flavor = "woff2"
    options.layout_features = ["*"]
    options.name_IDs = ["*"]
    options.notdef_outline = True
    sub = subset.Subsetter(options)
    f = subset.load_font(str(tmp), options)
    sub.populate(unicodes=subset.parse_unicodes(LATIN))
    sub.subset(f)
    woff2 = out / "Geist-Variable-Latin.woff2"
    subset.save_font(f, str(woff2), options)
    tmp.unlink()
    shutil.copy(pkg / "LICENSE.txt", out / "OFL.txt")

    # Metric overrides for "Geist Fallback" built on local Arial (Liberation Sans shares its metrics)
    geist = TTFont(src)
    arial = TTFont("/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf")
    size_adjust = weighted_width(geist) / weighted_width(arial)
    upm = geist["head"].unitsPerEm
    hhea = geist["hhea"]
    metrics = {
        "source": "geist npm package " + json.load(open(pkg / "package.json"))["version"],
        "woff2_bytes": woff2.stat().st_size,
        "size_adjust": round(size_adjust * 100, 2),
        "ascent_override": round(hhea.ascent / (upm * size_adjust) * 100, 2),
        "descent_override": round(abs(hhea.descent) / (upm * size_adjust) * 100, 2),
        "line_gap_override": round(hhea.lineGap / (upm * size_adjust) * 100, 2),
    }
    # Headline measure used to size the H1 so it holds two lines in its column
    bold = instancer.instantiateVariableFont(TTFont(src), {"wght": 600})
    metrics["h1_line_em"] = round(text_width(bold, "Make your martech"), 3)
    metrics["label_em"] = round(text_width(bold, "more efficiently."), 3)
    (pathlib.Path(__file__).resolve().parent / "geist-metrics.json").write_text(json.dumps(metrics, indent=2) + "\n")
    print(json.dumps(metrics, indent=2))


if __name__ == "__main__":
    main(*sys.argv[1:3])
