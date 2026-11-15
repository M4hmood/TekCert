"""Builds the icon font TekCert ships: Material Symbols Outlined cut down to the icons in use.

The full font is about 4 MB for 3,000+ icons; the app uses a few dozen. Run this after adding
an icon (the check in frontend/src/lib/icons.test.ts says when):

    python -m pip install fonttools brotli
    python packages/ui/scripts/subset-icons.py        (from app/)

It writes packages/ui/src/fonts/material-symbols-subset.woff2 and icons.json next to it.

How it finds the icons: an icon is written as its ligature name in a string ("menu_book"), so
every quoted word in the source that is also an icon of the font is kept. A word that only
looks like an icon ("check", "error") costs a few hundred bytes; a missed icon would show as
text, so the net is cast wide on purpose.
"""

import json
import re
import sys
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont

APP = Path(__file__).resolve().parents[3]
SOURCE_DIRS = [
    APP / 'frontend' / 'src',
    APP / 'packages' / 'ui' / 'src',
    APP / 'packages' / 'types' / 'src',
    APP / 'backend' / 'src' / 'database' / 'seed' / 'data',
]
OUT_DIR = APP / 'packages' / 'ui' / 'src' / 'fonts'
QUOTED_WORD = re.compile(r"""['"`]([a-z][a-z0-9_]{1,40})['"`]""")
# Letters, digits and the underscore: what ligature names are typed with.
TYPED = 'abcdefghijklmnopqrstuvwxyz0123456789_'


def find_font() -> Path:
    matches = sorted((APP / 'node_modules' / '.pnpm').glob(
        'material-symbols@*/node_modules/material-symbols/material-symbols-outlined.woff2'))
    if not matches:
        sys.exit('material-symbols is not installed: run pnpm install first.')
    return matches[-1]


def ligatures(font: TTFont) -> dict[str, str]:
    """Icon name -> glyph name, read from the font's ligature table."""
    by_glyph = {glyph: chr(code) for code, glyph in font.getBestCmap().items()}
    names: dict[str, str] = {}
    for lookup in font['GSUB'].table.LookupList.Lookup:
        for table in lookup.SubTable:
            if table.LookupType == 7:  # extension
                table = table.ExtSubTable
            if table.LookupType != 4:
                continue
            for first, ligs in table.ligatures.items():
                for lig in ligs:
                    chars = [by_glyph.get(g) for g in [first, *lig.Component]]
                    if all(chars):
                        names[''.join(chars)] = lig.LigGlyph
    return names


def words_in_source() -> set[str]:
    words: set[str] = set()
    for folder in SOURCE_DIRS:
        for path in folder.rglob('*'):
            if path.suffix in {'.ts', '.tsx'} and '.test.' not in path.name:
                words.update(QUOTED_WORD.findall(path.read_text(encoding='utf-8')))
    return words


def main() -> None:
    source = find_font()
    font = TTFont(source)
    icons = ligatures(font)
    used = sorted(word for word in words_in_source() if word in icons)
    if not used:
        sys.exit('No icon found in the source: something is wrong with the scan.')

    options = subset.Options()
    options.flavor = 'woff2'
    options.layout_features = ['liga', 'rlig']
    # Keep only the ligatures whose icon is kept: without this, every icon reachable from the
    # letters would come back.
    options.layout_closure = False
    options.glyph_names = False
    options.notdef_outline = True
    options.name_IDs = [1, 2]
    subsetter = subset.Subsetter(options)
    subsetter.populate(glyphs=[icons[name] for name in used], text=TYPED)
    subsetter.subset(font)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out = OUT_DIR / 'material-symbols-subset.woff2'
    font.save(out)
    (OUT_DIR / 'icons.json').write_text(json.dumps(used, indent=2) + '\n', encoding='utf-8')
    print(f'{len(used)} icons, {out.stat().st_size / 1024:.0f} kB '
          f'(from {source.stat().st_size / 1024:.0f} kB): {out.relative_to(APP)}')


if __name__ == '__main__':
    main()
