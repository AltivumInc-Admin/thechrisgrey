#!/usr/bin/env python3
"""Extract SVG path data for a set of Material Icons glyph names from the
classic Material Icons font, emitting a JSON map {name: {path}} for an
inline-SVG <Icon> React component (24x24 viewBox).

Uses fontTools with a TransformPen that scales the font's unitsPerEm box to a
24x24 grid and flips Y from font-up to SVG-down, so arc sweep flags and
bezier controls come out correct without manual token juggling.
"""
import json
import sys
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.misc.transform import Transform

FONT_PATH = sys.argv[1]
CODEPOINTS_PATH = sys.argv[2]
NAMES_PATH = sys.argv[3]
OUT_PATH = sys.argv[4]

cp = {}
with open(CODEPOINTS_PATH) as f:
    for line in f:
        parts = line.split()
        if len(parts) == 2:
            cp[parts[0]] = int(parts[1], 16)

with open(NAMES_PATH) as f:
    names = json.load(f)

font = TTFont(FONT_PATH)
unitsPerEm = font["head"].unitsPerEm
glyphSet = font.getGlyphSet()
cmap = font.getBestCmap()

# Names that reference a glyph not present in the classic Material Icons font
# (they are Material-Symbols-era names or platform identifiers). Map them to
# the closest classic equivalent so the inline SVG actually renders something
# meaningful instead of a blank box.
ALIASES = {
    "draft": "drafts",  # ToolDraftCard draft-message icon
    "monitoring": "monitor",  # admin Site Health panel
    # Platform identifiers (spotify/apple/youtube/rss) render via the dedicated
    # PodcastPlatformIcons inline-SVG component, NOT via <Icon>, so they are
    # intentionally absent from this map.
}

out = {}
missing = []

# Font coords: 0..unitsPerEm, y-up. Target: 0..24, y-down.
s = 24.0 / unitsPerEm
transform = Transform(1, 0, 0, 1, 0, 24).transform(Transform(s, 0, 0, -s, 0, 0))


def extract_glyph(name):
    code = cp.get(name)
    if code is None:
        return None
    glyphName = cmap.get(code)
    if glyphName is None:
        return None
    pen = SVGPathPen(glyphSet)
    tpen = TransformPen(pen, transform)
    glyphSet[glyphName].draw(tpen)
    d = pen.getCommands()
    return d.strip() or None


for name in names:
    d = extract_glyph(name)
    if d is None:
        # Try an alias to a real classic Material Icons glyph.
        alias = ALIASES.get(name)
        if alias:
            d = extract_glyph(alias)
    if d is None:
        missing.append(name)
        continue
    out[name] = {"path": d}

with open(OUT_PATH, "w") as f:
    json.dump(out, f, separators=(",", ":"))

print(f"Extracted {len(out)} icons -> {OUT_PATH}")
if missing:
    print(f"Missing ({len(missing)}): {', '.join(sorted(missing))}")
