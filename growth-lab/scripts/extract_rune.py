"""Derives the rune and the mark from the verified Growth Lab logo, without redrawing anything.

The logo SVG (viewBox 0 0 297 70) holds four paths: the two offset chevrons that make the
rune, the rounded container, and the wordmark. This script copies the path data unchanged
and only computes tight viewBoxes, so the rune keeps its exact geometry and proportions.

Usage: python3 extract_rune.py site/assets/brand
Writes growthlab-rune.svg (paths 1 and 2) and growthlab-mark.svg (paths 1 to 3).
"""
import json
import pathlib
import re
import sys

NUM = re.compile(r"[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?")


def path_points(d, steps=24):
    """Samples an SVG path made of absolute or relative M L H V C Z commands."""
    tokens = re.findall(r"[MLHVCZmlhvcz]|" + NUM.pattern, d)
    pts, i, cmd = [], 0, None
    x = y = sx = sy = 0.0
    while i < len(tokens):
        t = tokens[i]
        if re.match(r"[A-Za-z]", t):
            cmd = t
            i += 1
            if cmd in "Zz":
                x, y = sx, sy
                continue
        rel = cmd.islower()
        c = cmd.upper()
        if c in "ML":
            nx, ny = float(tokens[i]), float(tokens[i + 1])
            i += 2
            if rel:
                nx, ny = x + nx, y + ny
            x, y = nx, ny
            if c == "M":
                sx, sy = x, y
                cmd = "l" if rel else "L"
            pts.append((x, y))
        elif c == "H":
            nx = float(tokens[i])
            i += 1
            x = x + nx if rel else nx
            pts.append((x, y))
        elif c == "V":
            ny = float(tokens[i])
            i += 1
            y = y + ny if rel else ny
            pts.append((x, y))
        elif c == "C":
            vals = [float(v) for v in tokens[i:i + 6]]
            i += 6
            if rel:
                vals = [v + (x if k % 2 == 0 else y) for k, v in enumerate(vals)]
            x1, y1, x2, y2, x3, y3 = vals
            for s in range(1, steps + 1):
                u = s / steps
                a, b, cc, dd = (1 - u) ** 3, 3 * u * (1 - u) ** 2, 3 * u * u * (1 - u), u ** 3
                pts.append((a * x + b * x1 + cc * x2 + dd * x3, a * y + b * y1 + cc * y2 + dd * y3))
            x, y = x3, y3
        else:
            raise ValueError("unsupported command " + cmd)
    return pts


def bbox(paths):
    pts = [p for d in paths for p in path_points(d)]
    xs, ys = [p[0] for p in pts], [p[1] for p in pts]
    return min(xs), min(ys), max(xs), max(ys)


def main(brand_dir):
    brand = pathlib.Path(brand_dir)
    logo = (brand / "growthlab-logo.svg").read_text(encoding="utf8")
    assert 'viewBox="0 0 297 70"' in logo and 'aria-label="growthlab"' in logo
    paths = re.findall(r'<path d="([^"]+)"', logo)
    assert len(paths) == 4, len(paths)

    x0, y0, x1, y1 = bbox(paths[:2])
    pad = 0.0
    rune_box = (round(x0 - pad, 3), round(y0 - pad, 3), round(x1 - x0 + 2 * pad, 3), round(y1 - y0 + 2 * pad, 3))
    rune = (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="{} {} {} {}" aria-hidden="true">\n'
        '  <!-- Growth Lab rune: paths 1 and 2 of the logo, geometry unchanged -->\n'
        '  <path d="{}"/>\n  <path d="{}"/>\n</svg>\n'
    ).format(*rune_box, paths[0], paths[1])
    (brand / "growthlab-rune.svg").write_text(rune, encoding="utf8")

    mx0, my0, mx1, my1 = bbox(paths[:3])
    mark_box = (round(mx0, 3), round(my0, 3), round(mx1 - mx0, 3), round(my1 - my0, 3))
    mark = (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="{} {} {} {}" role="img" aria-label="Growth Lab">\n'
        '  <!-- Growth Lab mark: paths 1 to 3 of the logo, geometry unchanged -->\n'
        '  <path d="{}"/>\n  <path d="{}"/>\n  <path d="{}"/>\n</svg>\n'
    ).format(*mark_box, paths[0], paths[1], paths[2])
    (brand / "growthlab-mark.svg").write_text(mark, encoding="utf8")

    info = {"rune_viewbox": rune_box, "rune_aspect_w_over_h": round(rune_box[2] / rune_box[3], 4),
            "mark_viewbox": mark_box}
    print(json.dumps(info, indent=2))
    return info


if __name__ == "__main__":
    main(sys.argv[1])
