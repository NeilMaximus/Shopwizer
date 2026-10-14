"""Generates the static value cube SVG (its resting, fully grown state) and the two layout
numbers the outcome labels need. The same constants drive the build animation in
site/assets/js/site.js, so change them in both places together.

Usage: python3 gen_cube_svg.py
"""
import math

C = math.cos(math.pi / 6)
W = 520          # viewBox width
U = 132          # one cube side in viewBox units
K = 0.6          # the black core (today's results) as a share of the full cube
GAP = 14         # arrow start, measured out from the cube vertex
LEN = 44         # arrow length
CX = W / 2
CY = U + GAP + LEN + 6
H = CY + U + 4


def P(x, y, z):
    return (CX + (x - z) * C * U, CY + (x + z) * 0.5 * U - y * U)


def pts(*ps):
    return " ".join(f"{x:.2f},{y:.2f}" for x, y in ps)


def faces(s):
    return {
        "top": pts(P(0, s, 0), P(s, s, 0), P(s, s, s), P(0, s, s)),
        "left": pts(P(0, 0, s), P(s, 0, s), P(s, s, s), P(0, s, s)),
        "right": pts(P(s, 0, 0), P(s, 0, s), P(s, s, s), P(s, s, 0)),
    }


def arrow(v, d):
    (vx, vy), (dx, dy) = v, d
    sx, sy = vx + GAP * dx, vy + GAP * dy
    tx, ty = vx + (GAP + LEN) * dx, vy + (GAP + LEN) * dy
    nx, ny = -dy, dx
    bx, by = tx - 9 * dx, ty - 9 * dy
    return (
        f"M{sx:.2f} {sy:.2f}L{tx:.2f} {ty:.2f}"
        f"M{bx + 6 * nx:.2f} {by + 6 * ny:.2f}L{tx:.2f} {ty:.2f}L{bx - 6 * nx:.2f} {by - 6 * ny:.2f}"
    ), (tx, ty)


def main():
    up, _ = arrow(P(0, 1, 0), (0, -1))
    down_left, tip = arrow(P(0, 0, 1), (-C, 0.5))
    down_right, _ = arrow(P(1, 0, 0), (C, 0.5))
    outer, inner = faces(1), faces(K)
    print(f"""<svg class="cube" viewBox="0 0 {W} {H:.0f}" aria-hidden="true" focusable="false">
          <path class="arrow" d="{up}"/>
          <path class="arrow" d="{down_left}"/>
          <path class="arrow" d="{down_right}"/>
          <polygon class="f-top" points="{outer['top']}"/>
          <polygon class="f-left" points="{outer['left']}"/>
          <polygon class="f-right" points="{outer['right']}"/>
          <polygon class="c-top" points="{inner['top']}"/>
          <polygon class="c-left" points="{inner['left']}"/>
          <polygon class="c-right" points="{inner['right']}"/>
        </svg>""")
    print(f"label column {2 * tip[0] / W * 100:.2f}%  label lift {(H - (tip[1] + 12)) / W * 100:.2f}%")
    print(f"js constants C={C:.7f} U={U} K={K} CX={CX:g} CY={CY:g}")


if __name__ == "__main__":
    main()
