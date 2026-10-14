"""Turns a white "knockout" logo (an opaque white box with the logo cut out of it, which disappears
on a white page) into the logo itself in ink on a transparent background, for the client logo strip.

  python3 scripts/knockout_to_black.py IN.svg OUT.svg
  python3 scripts/knockout_to_black.py IN.png OUT.png

SVG: the file must be one path with fill-rule evenodd whose first subpath is the box around the whole
viewBox. That subpath is removed and the fill set to ink; the logo's own outlines are untouched, so
its counters stay holes under evenodd.
PNG: inside the box, the transparency is inverted (logo pixels become ink, the box becomes clear),
allowing for soft box edges so no outline is left, then the empty margin is trimmed. No pixel of the logo is moved, redrawn or resampled.
Record every converted file in SOURCES.md. Needs Pillow for PNGs.
"""
import pathlib
import re
import sys

INK = "#111111"
INK_RGB = (17, 17, 17)


def svg(src, dst):
    text = src.read_text(encoding="utf8")
    paths = re.findall(r"<path\b[^>]*>", text)
    assert len(paths) == 1, f"{src.name}: expected one path, found {len(paths)}"
    assert 'fill-rule="evenodd"' in paths[0], f"{src.name}: expected fill-rule evenodd"
    vb = [float(v) for v in re.search(r'viewBox="([^"]+)"', text).group(1).replace(",", " ").split()]
    d = re.search(r'\sd="([^"]+)"', paths[0]).group(1)
    first, rest = d.split("Z", 1)
    assert re.fullmatch(r"M[\d.,L\s-]+", first), f"{src.name}: first subpath is not a plain box"
    points = [tuple(map(float, p.split(","))) for p in re.findall(r"[-\d.]+,[-\d.]+", first)]
    xs, ys = {x for x, _ in points}, {y for _, y in points}
    assert min(xs) == vb[0] and max(xs) == vb[0] + vb[2] and min(ys) == vb[1] and max(ys) == vb[1] + vb[3], \
        f"{src.name}: first subpath does not frame the viewBox, so it is not a knockout box"
    new_path = paths[0].replace(d, rest.strip())
    new_path = re.sub(r'fill="[^"]*"', f'fill="{INK}"', new_path)
    out = text.replace(paths[0], new_path)
    out = re.sub(r'\s(width|height)="[^"]*"', "", out, count=2)  # the page sets the size
    dst.write_text(out, encoding="utf8")


def png(src, dst):
    from PIL import Image
    im = Image.open(src).convert("RGBA")
    alpha = im.getchannel("A")
    box = alpha.getbbox()
    assert box, f"{src.name}: empty image"
    # The box's own edges can be soft (part coverage on its outer rows and columns). There the logo
    # holds only what the box would have covered, so the edge leaves no faint line: logo = box - alpha.
    x0, y0, x1, y1 = box
    px = alpha.load()

    def coverage(line):
        values = sorted(line)
        median = values[len(values) // 2]
        return median if median < 250 else 255
    rows = {y: 255 for y in range(y0, y1)}
    cols = {x: 255 for x in range(x0, x1)}
    for ys in (range(y0, y0 + 3), range(y1 - 1, y1 - 4, -1)):
        for y in ys:
            rows[y] = coverage([px[x, y] for x in range(x0, x1)])
            if rows[y] == 255:
                break
    for xs in (range(x0, x0 + 3), range(x1 - 1, x1 - 4, -1)):
        for x in xs:
            cols[x] = coverage([px[x, y] for y in range(y0, y1)])
            if cols[x] == 255:
                break
    logo = Image.new("L", im.size, 0)
    out_px = logo.load()
    for y in range(y0, y1):
        for x in range(x0, x1):
            out_px[x, y] = max(0, min(rows[y], cols[x]) - px[x, y])
    tight = logo.getbbox()
    out = Image.new("RGBA", im.size, INK_RGB + (0,))
    out.putalpha(logo)
    out.crop(tight).save(dst, optimize=True)


if __name__ == "__main__":
    src, dst = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
    {".svg": svg, ".png": png}[src.suffix.lower()](src, dst)
    print(f"{src.name} -> {dst}")
