#!/usr/bin/env python3
"""
make_set.py - a reproducible, deliberately heavy construction-drawing PDF.

The speed test needs one input every app on every platform opens: the same
bytes, built from a seed, with the things that make real drawing sets slow.
Standard library only, so it runs unchanged on Windows, macOS and Linux.

What a sheet carries, and why each is here:
  - ARCH E1 sheets (42 x 30 in), the size most CD sets plot at.
  - Hatch exported as loose line segments (wall poche, brick, earth, stipple),
    the way Revit and AutoCAD write fill patterns. Tens of thousands per sheet.
  - Fill patterns drawn through clip paths, including even-odd holes.
  - CAD "SHX" text both ways: exploded to strokes (not searchable) and as a
    Type 3 stroke font (searchable, and uncached in some engines).
  - Real Helvetica text for schedules, so text search has work to do.
  - Optional-content layers (AutoCAD-style names) wrapping every element.
  - Reused blocks as Form XObjects (title block, furniture, light fixtures).
  - A large raster underlay (an aerial) and an indexed-colour rendering.
  - Transparency (constant alpha shadows) and an axial shading.
  - Dashed linetypes and hairlines.
  - Markups as annotations with appearance streams (clouds, callouts, lines,
    ink), plus sheet-to-sheet hyperlinks, bookmarks and page labels.

Usage:
  python3 make_set.py --preset sheet            # one complex sheet
  python3 make_set.py --preset set              # a 120-sheet drawing set
  python3 make_set.py --preset smoke            # 4 light sheets, for tests
  python3 make_set.py --preset set --sheets 300 --density 1.5 --out big.pdf

Each run also writes <out>.json: the manifest the timing tools read (page
labels, per-page element counts, the zoom focus point, the search target)
plus the file's SHA-256 and a content fingerprint. The fingerprint hashes the
uncompressed content, so it matches across machines even where zlib builds
compress differently. Generate once and copy the PDF to every device.
"""

import argparse
import hashlib
import json
import math
import os
import random
import sys
import time
import zlib

GENERATOR_VERSION = 1

PT = 72.0
SHEET_W, SHEET_H = 42 * PT, 30 * PT           # ARCH E1, landscape
MARGIN = 0.75 * PT
TITLE_W = 3.75 * PT                            # title strip on the right edge
DRAW_BOX = (MARGIN, MARGIN, SHEET_W - MARGIN - TITLE_W - 18, SHEET_H - MARGIN)

PRESETS = {
    # One sheet, everything on it, dense: the "complex sheet".
    'sheet': {'sheets': 1, 'density': 4.0, 'out': 'complex-sheet.pdf'},
    # A mid-size CD set: mostly ordinary sheets, a few heavy ones.
    'set': {'sheets': 120, 'density': 1.0, 'out': 'drawing-set.pdf'},
    # Small and quick, for self-tests.
    'smoke': {'sheets': 4, 'density': 0.25, 'out': 'smoke.pdf'},
}

# AutoCAD-style layer names; each becomes an optional-content group.
LAYERS = [
    'G-ANNO-TTLB', 'G-GRID', 'A-WALL', 'A-WALL-PATT', 'A-DOOR', 'A-GLAZ',
    'A-FURN', 'A-FLOR-PATT', 'A-CLNG', 'A-CLNG-LITE', 'A-ANNO-DIMS',
    'A-ANNO-TEXT', 'A-ANNO-SYMB', 'A-ELEV', 'A-ELEV-PATT', 'A-SECT',
    'A-DETL', 'A-DETL-PATT', 'A-SCHD', 'C-TOPO', 'C-PROP', 'C-PKNG',
    'L-PLNT', 'X-AERIAL', 'X-RNDR',
]

# The string the search test looks for. It is placed exactly once, in
# Helvetica, on the last schedule sheet (or on the complex sheet).
SEARCH_TARGET = 'HW-SET 47B'


# =============================================================================
# DETERMINISTIC RANDOMNESS
# =============================================================================

class Rng(object):
    """random.Random, used only through random(), whose sequence is stable
    across Python versions and platforms (randint/choice have changed)."""

    def __init__(self, seed):
        self._r = random.Random(seed)

    def u(self, a=0.0, b=1.0):
        return a + (b - a) * self._r.random()

    def i(self, a, b):
        """Integer in [a, b] inclusive."""
        return a + int(self._r.random() * (b - a + 1))

    def pick(self, seq):
        return seq[int(self._r.random() * len(seq))]

    def chance(self, p):
        return self._r.random() < p


# =============================================================================
# THE PDF WRITER - objects stream straight to disk
# =============================================================================

class PdfFile(object):
    def __init__(self, path):
        self.path = path
        self.f = open(path, 'wb')
        self.f.write(b'%PDF-1.7\n%\xe2\xe3\xcf\xd3\n')
        self.count = 0
        self.offsets = {}
        self.digests = {}

    def reserve(self):
        self.count += 1
        return self.count

    def put(self, num, head, data=None, compress=True):
        """Write object `num`. With data it is a stream and `head` holds the
        dictionary entries (no << >>); without, `head` is the whole object."""
        raw = head.encode('latin-1')
        h = hashlib.sha256(raw)
        if data is not None:
            h.update(data)
        self.digests[num] = h.digest()
        self.offsets[num] = self.f.tell()
        if data is None:
            self.f.write(b'%d 0 obj\n%s\nendobj\n' % (num, raw))
            return num
        if compress:
            data = zlib.compress(data, 6)
            raw += b' /Filter /FlateDecode'
        self.f.write(b'%d 0 obj\n<< %s /Length %d >>\nstream\n' % (num, raw, len(data)))
        self.f.write(data)
        self.f.write(b'\nendstream\nendobj\n')
        return num

    def add(self, head, data=None, compress=True):
        return self.put(self.reserve(), head, data, compress)

    def close(self, root, info):
        fp = hashlib.sha256()
        for num in range(1, self.count + 1):
            if num not in self.offsets:
                raise RuntimeError('object %d reserved but never written' % num)
            fp.update(self.digests[num])
        fingerprint = fp.hexdigest()
        xref = self.f.tell()
        out = [b'xref\n0 %d\n' % (self.count + 1), b'0000000000 65535 f \n']
        for num in range(1, self.count + 1):
            out.append(b'%010d 00000 n \n' % self.offsets[num])
        file_id = fingerprint[:32].upper().encode('ascii')
        out.append(b'trailer\n<< /Size %d /Root %d 0 R /Info %d 0 R /ID [<%s> <%s>] >>\n'
                   % (self.count + 1, root, info, file_id, file_id))
        out.append(b'startxref\n%d\n%%%%EOF\n' % xref)
        self.f.write(b''.join(out))
        self.f.close()
        return fingerprint


def pdf_string(text):
    return '(' + text.replace('\\', '\\\\').replace('(', '\\(').replace(')', '\\)') + ')'


# =============================================================================
# CONTENT-STREAM BUILDER
# =============================================================================

class Ink(object):
    """Accumulates content-stream operators and counts what it drew."""

    def __init__(self):
        self.p = []
        self.segs = 0       # straight path segments
        self.curves = 0     # Bezier segments
        self.texts = 0      # text-showing operators
        self.dos = 0        # XObject placements

    def raw(self, s):
        self.p.append(s)

    def data(self):
        return ''.join(self.p).encode('latin-1')

    # -- state --
    def q(self):
        self.p.append('q\n')

    def Q(self):
        self.p.append('Q\n')

    def width(self, w):
        self.p.append('%.2f w\n' % w)

    def gray(self, g, fill=False):
        self.p.append('%.2f %s\n' % (g, 'g' if fill else 'G'))

    def rgb(self, r, g, b, fill=False):
        self.p.append('%.2f %.2f %.2f %s\n' % (r, g, b, 'rg' if fill else 'RG'))

    def dash(self, on=None, off=None):
        self.p.append('[%.1f %.1f] 0 d\n' % (on, off) if on else '[] 0 d\n')

    def caps(self, cap):
        self.p.append('%d J\n' % cap)

    def gs(self, name):
        self.p.append('/%s gs\n' % name)

    def layer(self, name):
        self.p.append('/OC /L%d BDC\n' % LAYERS.index(name))

    def end_layer(self):
        self.p.append('EMC\n')

    # -- paths --
    def seg(self, x1, y1, x2, y2):
        self.p.append('%.1f %.1f m %.1f %.1f l\n' % (x1, y1, x2, y2))
        self.segs += 1

    def seg_stroked(self, x1, y1, x2, y2):
        """One segment as its own path - how exploded CAD hatch arrives."""
        self.p.append('%.1f %.1f m %.1f %.1f l S\n' % (x1, y1, x2, y2))
        self.segs += 1

    def poly(self, pts, close=False):
        out = ['%.1f %.1f m' % pts[0]]
        out.extend('%.1f %.1f l' % p for p in pts[1:])
        if close:
            out.append('h')
        self.p.append(' '.join(out) + '\n')
        self.segs += len(pts) - 1 + (1 if close else 0)

    def rect(self, x, y, w, h):
        self.p.append('%.1f %.1f %.1f %.1f re\n' % (x, y, w, h))
        self.segs += 4

    def circle(self, cx, cy, r):
        k = 0.5523 * r
        self.p.append('%.1f %.1f m %.1f %.1f %.1f %.1f %.1f %.1f c %.1f %.1f %.1f %.1f %.1f %.1f c '
                      '%.1f %.1f %.1f %.1f %.1f %.1f c %.1f %.1f %.1f %.1f %.1f %.1f c h\n' % (
                          cx + r, cy, cx + r, cy + k, cx + k, cy + r, cx, cy + r,
                          cx - k, cy + r, cx - r, cy + k, cx - r, cy,
                          cx - r, cy - k, cx - k, cy - r, cx, cy - r,
                          cx + k, cy - r, cx + r, cy - k, cx + r, cy))
        self.curves += 4

    def arc(self, cx, cy, r, a0, a1):
        """Quarter-or-less arc as one Bezier, starting a new subpath."""
        x0, y0 = cx + r * math.cos(a0), cy + r * math.sin(a0)
        x3, y3 = cx + r * math.cos(a1), cy + r * math.sin(a1)
        k = 4.0 / 3.0 * math.tan((a1 - a0) / 4.0) * r
        x1, y1 = x0 - k * math.sin(a0), y0 + k * math.cos(a0)
        x2, y2 = x3 + k * math.sin(a1), y3 - k * math.cos(a1)
        self.p.append('%.1f %.1f m %.1f %.1f %.1f %.1f %.1f %.1f c\n' % (x0, y0, x1, y1, x2, y2, x3, y3))
        self.curves += 1

    def stroke(self):
        self.p.append('S\n')

    def fill(self, evenodd=False):
        self.p.append('f*\n' if evenodd else 'f\n')

    def clip(self, evenodd=False):
        self.p.append('W* n\n' if evenodd else 'W n\n')

    # -- placement --
    def place(self, name, x, y, sx=1.0, sy=None, rot=0.0):
        sy = sx if sy is None else sy
        c, s = math.cos(rot), math.sin(rot)
        self.p.append('q %.3f %.3f %.3f %.3f %.1f %.1f cm /%s Do Q\n' % (sx * c, sx * s, -sy * s, sy * c, x, y, name))
        self.dos += 1

    # -- text --
    def text(self, font, size, x, y, s):
        self.p.append('BT /%s %.1f Tf %.1f %.1f Td %s Tj ET\n' % (font, size, x, y, pdf_string(s)))
        self.texts += 1

    def shx(self, x, y, size, s):
        """CAD text exploded to strokes: geometry only, not searchable."""
        k = size / 6.0
        for ch in s.upper():
            for stroke in STROKE_FONT.get(ch, ()):
                self.poly([(x + px * k, y + py * k) for px, py in stroke])
            x += 6.0 * k
        self.stroke()


# A 4 x 6 single-stroke font, in the spirit of AutoCAD's txt.shx. Used both
# for exploded text and as the glyph procedures of the Type 3 font.
_STROKES = {
    'A': '0,0 0,4 2,6 4,4 4,0|0,3 4,3', 'B': '0,0 0,6 3,6 4,5 4,4 3,3 0,3|3,3 4,2 4,1 3,0 0,0',
    'C': '4,1 3,0 1,0 0,1 0,5 1,6 3,6 4,5', 'D': '0,0 0,6 3,6 4,5 4,1 3,0 0,0',
    'E': '4,0 0,0 0,6 4,6|0,3 3,3', 'F': '0,0 0,6 4,6|0,3 3,3',
    'G': '4,5 3,6 1,6 0,5 0,1 1,0 3,0 4,1 4,3 2,3', 'H': '0,0 0,6|4,0 4,6|0,3 4,3',
    'I': '1,0 3,0|2,0 2,6|1,6 3,6', 'J': '0,1 1,0 3,0 4,1 4,6', 'K': '0,0 0,6|4,6 0,2|1,3 4,0',
    'L': '0,6 0,0 4,0', 'M': '0,0 0,6 2,3 4,6 4,0', 'N': '0,0 0,6 4,0 4,6',
    'O': '1,0 0,1 0,5 1,6 3,6 4,5 4,1 3,0 1,0', 'P': '0,0 0,6 3,6 4,5 4,4 3,3 0,3',
    'Q': '1,0 0,1 0,5 1,6 3,6 4,5 4,1 3,0 1,0|2,2 4,0', 'R': '0,0 0,6 3,6 4,5 4,4 3,3 0,3|2,3 4,0',
    'S': '0,1 1,0 3,0 4,1 4,2 3,3 1,3 0,4 0,5 1,6 3,6 4,5', 'T': '0,6 4,6|2,6 2,0',
    'U': '0,6 0,1 1,0 3,0 4,1 4,6', 'V': '0,6 2,0 4,6', 'W': '0,6 1,0 2,3 3,0 4,6',
    'X': '0,0 4,6|0,6 4,0', 'Y': '0,6 2,3 4,6|2,3 2,0', 'Z': '0,6 4,6 0,0 4,0',
    '0': '1,0 0,1 0,5 1,6 3,6 4,5 4,1 3,0 1,0|0,1 4,5', '1': '1,5 2,6 2,0|1,0 3,0',
    '2': '0,5 1,6 3,6 4,5 4,4 0,0 4,0', '3': '0,5 1,6 3,6 4,5 4,4 3,3 4,2 4,1 3,0 1,0 0,1|1,3 3,3',
    '4': '3,0 3,6 0,2 4,2', '5': '4,6 0,6 0,3 3,3 4,2 4,1 3,0 0,0',
    '6': '4,5 3,6 1,6 0,5 0,1 1,0 3,0 4,1 4,2 3,3 0,3', '7': '0,6 4,6 1,0',
    '8': '1,3 0,4 0,5 1,6 3,6 4,5 4,4 3,3 1,3 0,2 0,1 1,0 3,0 4,1 4,2 3,3',
    '9': '0,1 1,0 3,0 4,1 4,5 3,6 1,6 0,5 0,4 1,3 4,3',
    '-': '1,3 3,3', '.': '2,0 2,0.4', '/': '0,0 4,6', ':': '2,1 2,1.4|2,4 2,4.4',
    '#': '1,0 1,6|3,0 3,6|0,2 4,2|0,4 4,4', "'": '2,6 2,4.5', '"': '1,6 1,4.5|3,6 3,4.5',
    ',': '2,0.5 1.5,-1', '(': '3,6 2,5 2,1 3,0', ')': '1,6 2,5 2,1 1,0',
    '+': '2,1 2,5|0,3 4,3', '=': '0,2 4,2|0,4 4,4', '&': '4,0 1,4 1,5 2,6 3,5 0,2 0,1 1,0 2,0 4,2',
}
STROKE_FONT = {
    ch: [[tuple(float(v) for v in pt.split(',')) for pt in stroke.split()] for stroke in spec.split('|')]
    for ch, spec in _STROKES.items()
}
STROKE_FONT[' '] = []

# Adobe glyph names for the Type 3 font's encoding, so text extracts.
_GLYPH_NAMES = {
    ' ': 'space', '"': 'quotedbl', '#': 'numbersign', '&': 'ampersand', "'": 'quotesingle',
    '(': 'parenleft', ')': 'parenright', '+': 'plus', ',': 'comma', '-': 'hyphen',
    '.': 'period', '/': 'slash', ':': 'colon', '=': 'equal',
    '0': 'zero', '1': 'one', '2': 'two', '3': 'three', '4': 'four', '5': 'five',
    '6': 'six', '7': 'seven', '8': 'eight', '9': 'nine',
}


# =============================================================================
# WORDS - deterministic note text
# =============================================================================

NOTE_WORDS = ('PROVIDE VERIFY EXISTING NEW GYP BD PTD MTL STUD FRAMING SEALANT JOINT CONT '
              'FLASHING RIGID INSUL VAPOR RETARDER ANCHOR BOLT EMBED PLATE CONC SLAB ON GRADE '
              'TYP SIM ALIGN FACE OF FINISH CMU BRICK VENEER TIE AT 16 OC MAX SEE STRUCT DWGS '
              'FIRE RATED ASSEMBLY UL DESIGN U419 SHIM AS REQD BLKG ACOUSTIC SEALANT BOTH SIDES').split()
ROOMS = ('OFFICE CONF STOR CORR LOBBY TOILET JAN MECH ELEC IT BREAK OPEN OFFICE COPY '
         'WORKROOM LAB CLASSROOM RECEPTION WAITING EXAM STAIR ELEV').split()


def note_line(rng, n):
    return ' '.join(rng.pick(NOTE_WORDS) for _ in range(n))


# =============================================================================
# REUSED BLOCKS (Form XObjects) AND IMAGES
# =============================================================================

def form_xobject(pdf, bbox, ink, resources=None):
    head = '/Type /XObject /Subtype /Form /BBox [%.1f %.1f %.1f %.1f]' % bbox
    if resources:
        head += ' /Resources %s' % resources
    return pdf.add(head, ink.data())


def block_chair():
    k = Ink()
    k.width(0.3)
    k.rect(-4, -4, 8, 8)
    k.arc(0, 0, 4.5, math.pi * 0.15, math.pi * 0.5)
    k.arc(0, 0, 4.5, math.pi * 0.5, math.pi * 0.85)
    k.stroke()
    return k, (-6, -6, 6, 6)


def block_desk():
    k = Ink()
    k.width(0.4)
    k.rect(-15, -7.5, 30, 15)
    k.rect(-13, -6, 8, 12)
    k.stroke()
    k.width(0.2)
    for x in range(-12, 13, 3):
        k.seg(x, 4, x, 6)
    k.stroke()
    return k, (-16, -9, 16, 9)


def block_table():
    k = Ink()
    k.width(0.4)
    k.circle(0, 0, 10)
    k.stroke()
    k.width(0.3)
    for a in range(6):
        t = a * math.pi / 3
        k.rect(14 * math.cos(t) - 3, 14 * math.sin(t) - 3, 6, 6)
    k.stroke()
    return k, (-18, -18, 18, 18)


def block_light():
    k = Ink()
    k.width(0.25)
    k.rect(-6, -3, 12, 6)
    k.seg(-6, -3, 6, 3)
    k.seg(-6, 3, 6, -3)
    k.stroke()
    return k, (-7, -4, 7, 4)


def block_tree(rng):
    k = Ink()
    k.width(0.3)
    pts = []
    for a in range(48):
        t = a * 2 * math.pi / 48
        r = 18 + (3 if a % 2 else -1) + rng.u(-1, 1)
        pts.append((r * math.cos(t), r * math.sin(t)))
    k.poly(pts, close=True)
    for a in range(12):
        t = a * 2 * math.pi / 12
        k.seg(0, 0, 14 * math.cos(t), 14 * math.sin(t))
    k.stroke()
    return k, (-24, -24, 24, 24)


def block_logo():
    """A firm logo as vector art - a spirograph, heavier than it looks."""
    k = Ink()
    k.width(0.35)
    pts = []
    R, r, d = 22.0, 7.0, 11.0
    for i in range(1400):
        t = i * 2 * math.pi * 7 / 1400
        pts.append(((R - r) * math.cos(t) + d * math.cos((R - r) / r * t),
                    (R - r) * math.sin(t) - d * math.sin((R - r) / r * t)))
    k.poly(pts, close=True)
    k.stroke()
    return k, (-36, -36, 36, 36)


def gray_image(rng, w, h, cell, amp):
    """An aerial-like 8-bit image: smoothed blocks with grain XOR'd in.
    Built a row at a time with big-int XOR so pure Python stays quick."""
    gw, gh = w // cell + 2, h // cell + 2
    grid = [[rng.u(40, 200) for _ in range(gw)] for _ in range(gh)]
    for _ in range(2):                                   # soften the blocks
        grid = [[(grid[y][x] * 2 + grid[y][max(x - 1, 0)] + grid[y][min(x + 1, gw - 1)]
                  + grid[max(y - 1, 0)][x] + grid[min(y + 1, gh - 1)][x]) / 6.0
                 for x in range(gw)] for y in range(gh)]
    grain = bytes(int(rng.u(0, amp)) for _ in range(w * 3))
    rows = []
    for gy in range(gh):
        base = bytes(int(v) for v in grid[gy] for _ in range(cell))[:w]
        bint = int.from_bytes(base, 'big')
        for _ in range(cell):
            if len(rows) == h:
                break
            off = int(rng.u(0, w * 2))
            g = int.from_bytes(grain[off:off + w], 'big')
            rows.append((bint ^ g).to_bytes(w, 'big'))
    return b''.join(rows)


# =============================================================================
# SHEET CONTENT
# =============================================================================

def title_block(pdf, rng, fonts):
    """The shared title block: static parts as one Form XObject."""
    k = Ink()
    x0 = SHEET_W - MARGIN - TITLE_W
    k.layer('G-ANNO-TTLB')
    k.width(1.6)
    k.rect(MARGIN * 0.5, MARGIN * 0.5, SHEET_W - MARGIN, SHEET_H - MARGIN)
    k.stroke()
    k.width(0.8)
    k.rect(x0, MARGIN, TITLE_W, SHEET_H - 2 * MARGIN)
    k.stroke()
    k.width(0.4)
    ys = [MARGIN + 4.2 * PT, MARGIN + 6.0 * PT, MARGIN + 9.5 * PT, MARGIN + 15.5 * PT, SHEET_H - MARGIN - 3.2 * PT]
    for y in ys:
        k.seg(x0, y, x0 + TITLE_W, y)
    k.stroke()
    k.text('F2', 15, x0 + 14, SHEET_H - MARGIN - 40, 'ADEQUATE DESIGN')
    k.text('F1', 8, x0 + 14, SHEET_H - MARGIN - 56, 'ARCHITECTURE  INTERIORS  PLANNING')
    k.text('F1', 7, x0 + 14, SHEET_H - MARGIN - 70, '1200 EXAMPLE AVENUE, SUITE 400')
    k.place('Logo', x0 + TITLE_W - 48, SHEET_H - MARGIN - 52, 0.9)
    cy = ys[-1] - 20
    for role in ('STRUCTURAL', 'MECHANICAL', 'ELECTRICAL', 'PLUMBING', 'CIVIL', 'LANDSCAPE',
                 'FIRE PROTECTION', 'LIGHTING', 'ACOUSTICS', 'VERTICAL TRANSPORT', 'CODE', 'COST'):
        k.text('F2', 6.5, x0 + 14, cy, role)
        k.text('F1', 6.5, x0 + 14, cy - 9, note_line(rng, 3) + ' ENGINEERS')
        cy -= 26
    # Revision table.
    ry = ys[3] - 14
    k.width(0.3)
    for row in range(12):
        k.seg(x0 + 8, ry - row * 14, x0 + TITLE_W - 8, ry - row * 14)
    for cx in (x0 + 8, x0 + 40, x0 + TITLE_W - 70, x0 + TITLE_W - 8):
        k.seg(cx, ry, cx, ry - 11 * 14)
    k.stroke()
    for row in range(1, 8):
        k.text('F1', 6, x0 + 14, ry - row * 14 + 4, '%d' % row)
        k.text('F1', 6, x0 + 46, ry - row * 14 + 4, 'ISSUE FOR ' + rng.pick(('BID', 'PERMIT', 'REVIEW', 'ADDENDUM')))
    # Key plan.
    k.width(0.5)
    k.poly([(x0 + 40, ys[1] + 20), (x0 + 200, ys[1] + 20), (x0 + 200, ys[1] + 80),
            (x0 + 120, ys[1] + 80), (x0 + 120, ys[1] + 110), (x0 + 40, ys[1] + 110)], close=True)
    k.stroke()
    k.end_layer()
    return form_xobject(pdf, (0, 0, SHEET_W, SHEET_H), k, fonts)


def sheet_text(ink, sheet):
    """Per-sheet title-block fields (searchable)."""
    x0 = SHEET_W - MARGIN - TITLE_W
    ink.layer('G-ANNO-TTLB')
    ink.gray(0, fill=True)
    ink.text('F2', 30, x0 + 16, MARGIN + 1.4 * PT, sheet['label'])
    ink.text('F2', 9, x0 + 16, MARGIN + 4.9 * PT, sheet['title'])
    ink.text('F1', 7, x0 + 16, MARGIN + 3.6 * PT, 'PROJECT NO. 2026-118   SHEET %d OF %d' % (sheet['index'] + 1, sheet['of']))
    ink.end_layer()


def hatch_rect(ink, x, y, w, h, spacing, angle45=True):
    """45-degree hatch pre-clipped to a rectangle, one path per segment."""
    n = int((w + h) / spacing)
    for i in range(1, n):
        c = i * spacing                    # line x' + y' = c in local coords
        ax, ay = (c, 0.0) if c <= w else (w, c - w)
        bx, by = (0.0, c) if c <= h else (c - h, h)
        if angle45:
            ink.seg_stroked(x + ax, y + ay, x + bx, y + by)
        else:
            ink.seg_stroked(x + w - ax, y + ay, x + w - bx, y + by)


def stipple(ink, rng, x, y, w, h, count):
    """Concrete/carpet stipple: zero-length round-capped dots."""
    for _ in range(count):
        px, py = x + rng.u(0, w), y + rng.u(0, h)
        ink.seg(px, py, px, py)
    ink.stroke()


def bsp(rng, rect, min_size, out, depth=0):
    x, y, w, h = rect
    if (w < 2 * min_size and h < 2 * min_size) or depth > 12:
        out.append(rect)
        return []
    walls = []
    if w >= h:
        cut = x + w * rng.u(0.3, 0.7)
        walls.append((cut, y, cut, y + h))
        walls += bsp(rng, (x, y, cut - x, h), min_size, out, depth + 1)
        walls += bsp(rng, (cut, y, x + w - cut, h), min_size, out, depth + 1)
    else:
        cut = y + h * rng.u(0.3, 0.7)
        walls.append((x, cut, x + w, cut))
        walls += bsp(rng, (x, y, w, cut - y), min_size, out, depth + 1)
        walls += bsp(rng, (x, cut, w, y + h - cut), min_size, out, depth + 1)
    return walls


def draw_grid(ink, x0, y0, x1, y1, spacing):
    ink.layer('G-GRID')
    ink.width(0.35)
    ink.dash(18, 4)
    xs = [x0 + i * spacing for i in range(int((x1 - x0) / spacing) + 1)]
    ys = [y0 + i * spacing for i in range(int((y1 - y0) / spacing) + 1)]
    for gx in xs:
        ink.seg(gx, y0 - 40, gx, y1 + 40)
    for gy in ys:
        ink.seg(x0 - 40, gy, x1 + 40, gy)
    ink.stroke()
    ink.dash()
    for i, gx in enumerate(xs):
        ink.circle(gx, y1 + 52, 12)
    for gy in ys:
        ink.circle(x0 - 52, gy, 12)
    ink.stroke()
    for i, gx in enumerate(xs):
        ink.text('F1', 11, gx - 4, y1 + 48, str(i + 1))
    for i, gy in enumerate(ys):
        ink.text('F1', 11, x0 - 56, gy - 4, chr(65 + i % 26))
    ink.end_layer()
    return xs, ys


def draw_plan(ink, rng, box, d, variant='plan'):
    """A floor plan: grid, BSP rooms, hatched walls, doors, furniture,
    floor patterns, dimensions, tags and notes. `variant` 'rcp' swaps the
    furniture and floor patterns for a ceiling grid and light fixtures."""
    bx0, by0, bx1, by1 = box
    fx0, fy0, fx1, fy1 = bx0 + 110, by0 + 120, bx1 - 160, by1 - 110
    xs, ys = draw_grid(ink, fx0, fy0, fx1, fy1, 270)
    rooms = []
    walls = bsp(rng, (fx0, fy0, fx1 - fx0, fy1 - fy0), 150 / math.sqrt(max(d, 0.25)), rooms)
    t = 4.5

    # Walls: outlines, then poche hatch pre-clipped to each wall.
    ink.layer('A-WALL')
    ink.width(0.7)
    ink.rect(fx0 - 2 * t, fy0 - 2 * t, fx1 - fx0 + 4 * t, fy1 - fy0 + 4 * t)
    ink.rect(fx0, fy0, fx1 - fx0, fy1 - fy0)
    for x1, y1, x2, y2 in walls:
        if x1 == x2:
            ink.rect(x1 - t / 2, y1, t, y2 - y1)
        else:
            ink.rect(x1, y1 - t / 2, x2 - x1, t)
    ink.stroke()
    ink.end_layer()
    ink.layer('A-WALL-PATT')
    ink.width(0.12)
    spacing = 1.6 / max(d, 0.25) ** 0.5
    for x1, y1, x2, y2 in walls:
        if x1 == x2:
            hatch_rect(ink, x1 - t / 2, y1, t, y2 - y1, spacing)
        else:
            hatch_rect(ink, x1, y1 - t / 2, x2 - x1, t, spacing)
    for wx, wy, ww, wh in ((fx0 - 2 * t, fy0 - 2 * t, fx1 - fx0 + 4 * t, 2 * t),
                           (fx0 - 2 * t, fy1, fx1 - fx0 + 4 * t, 2 * t),
                           (fx0 - 2 * t, fy0, 2 * t, fy1 - fy0),
                           (fx1, fy0, 2 * t, fy1 - fy0)):
        hatch_rect(ink, wx, wy, ww, wh, spacing, angle45=False)
    ink.end_layer()

    # Doors on interior walls.
    ink.layer('A-DOOR')
    ink.width(0.35)
    for x1, y1, x2, y2 in walls:
        length = abs(x2 - x1) + abs(y2 - y1)
        if length < 60:
            continue
        r = 22.0
        if x1 == x2:
            dy = y1 + rng.u(10, length - r - 10)
            ink.seg(x1, dy, x1 + r, dy)
            ink.arc(x1, dy, r, 0, math.pi / 2)
        else:
            dx = x1 + rng.u(10, length - r - 10)
            ink.seg(dx, y1, dx, y1 + r)
            ink.arc(dx, y1, r, math.pi / 2, math.pi)
    ink.stroke()
    ink.end_layer()

    # Glazing along the exterior.
    ink.layer('A-GLAZ')
    ink.width(0.25)
    x = fx0 + 20
    while x < fx1 - 60:
        for off in (-t * 1.5, -t * 0.5):
            ink.seg(x, fy0 + off, x + 48, fy0 + off)
            ink.seg(x, fy1 - off, x + 48, fy1 - off)
        x += 64
    ink.stroke()
    ink.end_layer()

    # Rooms: furniture and floor patterns, or ceiling grid and lights.
    for idx, (rx, ry, rw, rh) in enumerate(rooms):
        cx, cy = rx + rw / 2, ry + rh / 2
        if variant == 'rcp':
            ink.layer('A-CLNG')
            ink.width(0.15)
            step = 9.0 / max(d, 0.25) ** 0.25
            gx = rx + step
            while gx < rx + rw - 1:
                ink.seg(gx, ry + 2, gx, ry + rh - 2)
                gx += step
            gy = ry + step
            while gy < ry + rh - 1:
                ink.seg(rx + 2, gy, rx + rw - 2, gy)
                gy += step
            ink.stroke()
            ink.end_layer()
            ink.layer('A-CLNG-LITE')
            lx = rx + 18
            while lx < rx + rw - 18:
                ly = ry + 18
                while ly < ry + rh - 18:
                    ink.place('Light', lx, ly)
                    ly += 27
                lx += 36
            ink.end_layer()
        else:
            ink.layer('A-FLOR-PATT')
            ink.width(0.1)
            if idx % 3 == 0:
                ink.width(0.8)
                ink.caps(1)
                stipple(ink, rng, rx + 4, ry + 4, rw - 8, rh - 8, int(rw * rh * 0.035 * d))
                ink.caps(0)
            elif idx % 3 == 1:
                step = 6.0
                gx = rx + step
                while gx < rx + rw - 1:
                    ink.seg(gx, ry + 2, gx, ry + rh - 2)
                    gx += step
                gy = ry + step
                while gy < ry + rh - 1:
                    ink.seg(rx + 2, gy, rx + rw - 2, gy)
                    gy += step
                ink.stroke()
            ink.end_layer()
            ink.layer('A-FURN')
            n = int(rw * rh / 2600 * min(d, 3))
            for _ in range(n):
                fx, fy = rx + rng.u(20, max(21, rw - 20)), ry + rng.u(20, max(21, rh - 20))
                ink.place(rng.pick(('Desk', 'Chair', 'Chair', 'Table')), fx, fy, 1.0, rot=rng.pick((0, math.pi / 2)))
            # A few exploded chairs: blocks that arrived as loose geometry.
            ink.width(0.3)
            for _ in range(n // 2):
                fx, fy = rx + rng.u(10, max(11, rw - 10)), ry + rng.u(10, max(11, rh - 10))
                ink.rect(fx - 4, fy - 4, 8, 8)
                ink.arc(fx, fy, 4.5, math.pi * 0.15, math.pi * 0.85)
            ink.stroke()
            ink.end_layer()
        # Room tag: name in Helvetica, number in the Type 3 stroke font.
        ink.layer('A-ANNO-TEXT')
        ink.text('F1', 7, cx - 20, cy + 3, rng.pick(ROOMS))
        ink.text('F3', 7, cx - 10, cy - 8, '%d%02d' % (1 + idx // 100, idx % 100))
        ink.end_layer()

    # Dimensions along every wall run.
    ink.layer('A-ANNO-DIMS')
    ink.width(0.2)
    for x1, y1, x2, y2 in walls[: int(len(walls) * min(1.0, 0.4 + d / 3))]:
        if x1 == x2:
            ox = x1 + 14
            ink.seg(ox, y1, ox, y2)
            for yy in (y1, y2):
                ink.seg(ox - 3, yy - 3, ox + 3, yy + 3)
        else:
            oy = y1 + 14
            ink.seg(x1, oy, x2, oy)
            for xx in (x1, x2):
                ink.seg(xx - 3, oy - 3, xx + 3, oy + 3)
    ink.stroke()
    for x1, y1, x2, y2 in walls[: int(len(walls) * min(1.0, 0.4 + d / 3))]:
        length = (abs(x2 - x1) + abs(y2 - y1)) / 9.0     # 1/8" = 1'-0" -> 9 pt/ft
        label = "%d'-%d\"" % (int(length), int((length % 1) * 12))
        ink.text('F3', 5.5, (x1 + x2) / 2 + 16, (y1 + y2) / 2 + 16, label)
    ink.end_layer()

    # Keynotes and general notes as exploded SHX text.
    ink.layer('A-ANNO-SYMB')
    ink.width(0.3)
    for _ in range(int(12 * d)):
        kx, ky = rng.u(fx0, fx1), rng.u(fy0, fy1)
        ink.poly([(kx + 7 * math.cos(a * math.pi / 3), ky + 7 * math.sin(a * math.pi / 3)) for a in range(6)], close=True)
        ink.seg(kx + 7, ky, kx + 40, ky + 30)
    ink.stroke()
    ink.end_layer()
    ink.layer('A-ANNO-TEXT')
    ink.width(0.25)
    nx, ny = bx1 - 150, by1 - 30
    for _ in range(int(14 * d)):
        ink.shx(nx, ny, 4.5, note_line(rng, 4))
        ny -= 8
        if ny < by0 + 30:
            break
    ink.end_layer()
    return (fx0 + fx1) / 2, (fy0 + fy1) / 2


def draw_elevation(ink, rng, box, d, section=False):
    """Two stacked facades: brick coursing clipped (even-odd) around the
    windows, mullions, level lines, alpha shadows and a sky shading."""
    bx0, by0, bx1, by1 = box
    focus = None
    band_h = (by1 - by0) / 2.0
    for band in range(2):
        x0, y0 = bx0 + 80, by0 + 60 + band * band_h
        w, h = bx1 - bx0 - 240, band_h - 130
        if band == 0:
            ink.q()
            ink.rect(x0, y0 + h, w, 40)
            ink.clip()
            ink.raw('/Sky sh\n')
            ink.Q()
        windows = []
        floors = 4
        for f in range(floors):
            for c in range(int(w / 90)):
                windows.append((x0 + 20 + c * 90, y0 + 20 + f * (h / floors), 50, h / floors - 40))
        ink.layer('A-ELEV')
        ink.width(0.8)
        ink.rect(x0, y0, w, h)
        ink.stroke()
        ink.width(0.35)
        for wx, wy, ww, wh in windows:
            ink.rect(wx, wy, ww, wh)
            ink.seg(wx + ww / 2, wy, wx + ww / 2, wy + wh)
            ink.seg(wx, wy + wh * 0.6, wx + ww, wy + wh * 0.6)
        ink.stroke()
        ink.end_layer()
        # Brick: clip to facade minus windows (even-odd), then courses + joints.
        ink.layer('A-ELEV-PATT')
        ink.q()
        ink.rect(x0, y0, w, h)
        for wx, wy, ww, wh in windows:
            ink.rect(wx, wy, ww, wh)
        ink.clip(evenodd=True)
        ink.width(0.1)
        course = 2.0 / max(d, 0.25) ** 0.5
        y, row = y0, 0
        while y < y0 + h:
            ink.seg(x0, y, x0 + w, y)
            jx = x0 + (3.0 if row % 2 else 0.0)
            while jx < x0 + w:
                ink.seg(jx, y, jx, y + course)
                jx += 6.0
            if row % 40 == 0:
                ink.stroke()
            y += course
            row += 1
        ink.stroke()
        ink.Q()
        ink.end_layer()
        # Shadows with constant alpha.
        ink.q()
        ink.gs('Shade')
        ink.gray(0.2, fill=True)
        for wx, wy, ww, wh in windows:
            ink.poly([(wx, wy + wh), (wx + ww, wy + wh), (wx + ww + 6, wy + wh - 8), (wx + 6, wy + wh - 8)], close=True)
        ink.fill()
        ink.Q()
        # Levels.
        ink.layer('A-ANNO-DIMS')
        ink.width(0.3)
        ink.dash(12, 3)
        for f in range(floors + 1):
            ly = y0 + f * h / floors
            ink.seg(x0 - 40, ly, x0 + w + 60, ly)
        ink.stroke()
        ink.dash()
        for f in range(floors + 1):
            ly = y0 + f * h / floors
            ink.text('F3', 6, x0 + w + 64, ly + 2, 'LEVEL %d  EL %d\'-0"' % (f + 1, 100 + f * 14))
        ink.end_layer()
        if section:
            # Earth below grade: diagonal hatch plus random ticks.
            ink.layer('A-SECT')
            ink.width(0.12)
            hatch_rect(ink, x0 - 40, y0 - 50, w + 80, 46, 4.0)
            for _ in range(int(400 * d)):
                ex, ey = rng.u(x0 - 40, x0 + w + 40), rng.u(y0 - 48, y0 - 6)
                ink.seg(ex, ey, ex + 3, ey + 1.5)
            ink.stroke()
            ink.gray(0.15, fill=True)
            for f in range(floors + 1):
                ink.rect(x0, y0 + f * h / floors - 3, w, 6)
            ink.fill()
            ink.gray(0, fill=True)
            ink.end_layer()
        if focus is None:
            focus = (x0 + w / 2, y0 + h / 2)
    return focus


def draw_details(ink, rng, box, d):
    """A 4 x 3 grid of clipped detail viewports with material hatches."""
    bx0, by0, bx1, by1 = box
    cols, rows = 4, 3
    cw, rh = (bx1 - bx0) / cols, (by1 - by0) / rows
    for r in range(rows):
        for c in range(cols):
            x0, y0 = bx0 + c * cw + 12, by0 + r * rh + 30
            w, h = cw - 24, rh - 60
            ink.q()
            ink.rect(x0, y0, w, h)
            ink.clip()
            ink.layer('A-DETL-PATT')
            # Concrete: stipple + triangles.
            ink.width(0.6)
            ink.caps(1)
            stipple(ink, rng, x0, y0, w * 0.5, h * 0.4, int(900 * d))
            ink.caps(0)
            ink.width(0.2)
            for _ in range(int(160 * d)):
                tx, ty = x0 + rng.u(0, w * 0.5), y0 + rng.u(0, h * 0.4)
                ink.poly([(tx, ty), (tx + 2.5, ty + 0.6), (tx + 1, ty + 2.2)], close=True)
            ink.stroke()
            # Earth.
            hatch_rect(ink, x0 + w * 0.5, y0, w * 0.5, h * 0.4, 3.0 / max(d, 0.25) ** 0.5)
            # Insulation batt: a long sinuous polyline.
            pts, n = [], int(500 * d)
            for i in range(n):
                tt = i / float(n)
                pts.append((x0 + w * tt, y0 + h * 0.55 + 10 * math.sin(tt * w / 3.0)))
            ink.poly(pts)
            ink.stroke()
            ink.end_layer()
            ink.layer('A-DETL')
            ink.width(0.6)
            ink.rect(x0 + w * 0.1, y0 + h * 0.4, w * 0.8, 6)
            ink.rect(x0 + w * 0.45, y0 + h * 0.4, 8, h * 0.5)
            ink.stroke()
            ink.end_layer()
            ink.Q()
            ink.layer('A-ANNO-TEXT')
            ink.width(0.25)
            for k in range(int(8 * min(d, 3))):
                ly = y0 + h - 12 - k * 11
                ink.seg(x0 + w * 0.62, ly + 2, x0 + w * 0.48, ly - 20)
                ink.text('F3', 4.5, x0 + w * 0.64, ly, note_line(rng, 3))
            ink.stroke()
            ink.text('F2', 9, x0, y0 - 20, '%d  DETAIL %s' % (r * cols + c + 1, note_line(rng, 2)))
            ink.end_layer()
    return bx0 + cw / 2, by0 + rh / 2


def draw_schedule(ink, rng, box, d, target=None):
    """Door/finish schedules: grid lines and lots of real text."""
    bx0, by0, bx1, by1 = box
    ink.layer('A-SCHD')
    cols = ('MARK', 'WIDTH', 'HEIGHT', 'TYPE', 'MATL', 'FINISH', 'FRAME', 'HDWR', 'RATING', 'REMARKS')
    tw = (bx1 - bx0 - 40) / 2.0
    rows = int(70 * min(max(d, 0.4), 1.5))
    rh = (by1 - by0 - 80) / float(rows + 1)
    placed = None
    for t in range(2):
        x0 = bx0 + 20 + t * tw
        ink.width(0.25)
        for r in range(rows + 2):
            yy = by1 - 40 - r * rh
            ink.seg(x0, yy, x0 + tw - 20, yy)
        cwid = (tw - 20) / len(cols)
        for c in range(len(cols) + 1):
            ink.seg(x0 + c * cwid, by1 - 40, x0 + c * cwid, by1 - 40 - (rows + 1) * rh)
        ink.stroke()
        for c, name in enumerate(cols):
            ink.text('F2', 6, x0 + c * cwid + 3, by1 - 40 - rh + 3, name)
        for r in range(rows):
            yy = by1 - 40 - (r + 2) * rh + 3
            cells = ['%d%02d' % (t + 1, r), "3'-0\"", "7'-0\"", rng.pick('ABCDEFG'), rng.pick(('HM', 'WD', 'AL', 'GL')),
                     rng.pick(('PT-1', 'PT-2', 'ST-1', 'FF')), rng.pick(('F1', 'F2', 'F3')),
                     'HW-SET %d%s' % (rng.i(1, 46), rng.pick('AC')), rng.pick(('20 MIN', '45 MIN', '90 MIN', '-')),
                     rng.pick(('', 'CARD READER', 'CLOSER', 'SEE ELEV'))]
            if target and t == 1 and r == rows // 2:
                cells[7] = target
                placed = (x0 + 7 * cwid + 3, yy)
            for c, val in enumerate(cells):
                ink.text('F1', 5.5, x0 + c * cwid + 3, yy, val)
    ink.end_layer()
    return placed or ((bx0 + bx1) / 2, (by0 + by1) / 2)


def draw_site(ink, rng, box, d):
    """Site plan: aerial underlay, topo contours, property line, parking, trees."""
    bx0, by0, bx1, by1 = box
    ink.q()
    ink.rect(bx0, by0, bx1 - bx0, by1 - by0)          # the site viewport
    ink.clip()
    ink.layer('X-AERIAL')
    ink.q()
    ink.raw('%.1f 0 0 %.1f %.1f %.1f cm /Aerial Do\n' % (bx1 - bx0, by1 - by0, bx0, by0))
    ink.dos += 1
    ink.Q()
    ink.end_layer()
    ink.layer('C-TOPO')
    ink.width(0.25)
    hills = [(rng.u(bx0, bx1), rng.u(by0, by1)) for _ in range(5)]
    for hx, hy in hills:
        ph = [rng.u(0, 6.3) for _ in range(4)]
        for lvl in range(int(14 * min(d, 3))):
            base = 30 + lvl * 26
            pts = []
            n = 220 + lvl * 20
            for i in range(n):
                a = i * 2 * math.pi / n
                r = base * (1 + 0.18 * math.sin(3 * a + ph[0]) + 0.1 * math.sin(5 * a + ph[1])
                            + 0.05 * math.sin(11 * a + ph[2]))
                pts.append((hx + r * math.cos(a), hy + r * 0.8 * math.sin(a)))
            ink.poly(pts, close=True)
            if lvl % 5 == 4:
                ink.width(0.6)
                ink.stroke()
                ink.width(0.25)
        ink.stroke()
    ink.end_layer()
    ink.layer('C-PROP')
    ink.width(1.2)
    ink.dash(24, 4)
    ink.rect(bx0 + 60, by0 + 60, bx1 - bx0 - 120, by1 - by0 - 120)
    ink.stroke()
    ink.dash()
    ink.end_layer()
    ink.layer('C-PKNG')
    ink.width(0.4)
    px, py = bx0 + 120, by0 + 120
    for row in range(int(4 * min(d, 3))):
        for s in range(60):
            ink.seg(px + s * 8.1, py + row * 60, px + s * 8.1, py + row * 60 + 18)
    ink.stroke()
    ink.end_layer()
    ink.layer('L-PLNT')
    for _ in range(int(220 * d)):
        ink.place('Tree', rng.u(bx0 + 40, bx1 - 40), rng.u(by0 + 40, by1 - 40), rng.u(0.5, 1.3))
    ink.end_layer()
    ink.Q()
    return (bx0 + bx1) / 2, (by0 + by1) / 2


def draw_cover(ink, rng, box, sheets, links):
    bx0, by0, bx1, by1 = box
    ink.layer('X-RNDR')
    ink.q()
    ink.raw('%.1f 0 0 %.1f %.1f %.1f cm /Render Do\n' % (1500, 900, bx0 + 40, by1 - 960))
    ink.dos += 1
    ink.Q()
    ink.end_layer()
    ink.layer('A-ANNO-TEXT')
    ink.text('F2', 40, bx0 + 40, by1 - 1020, 'NORTHGATE COMMONS - CONSTRUCTION DOCUMENTS')
    col_x, y = bx0 + 1600, by1 - 30
    ink.text('F2', 12, col_x, y, 'SHEET INDEX')
    y -= 22
    for s in sheets:
        ink.text('F1', 7, col_x, y, s['label'])
        ink.text('F1', 7, col_x + 60, y, s['title'])
        links.append((s['index'], (col_x - 2, y - 2, col_x + 300, y + 8)))
        y -= 10.5
        if y < by0 + 20:
            col_x += 320
            y = by1 - 52
    ink.end_layer()
    return bx0 + 800, by1 - 500


# =============================================================================
# MARKUPS (annotations with appearance streams)
# =============================================================================

def cloud_path(ink, pts, bump=6.0):
    """A revision cloud along a closed polygon: one Bezier bump per step."""
    for i in range(len(pts)):
        x1, y1 = pts[i]
        x2, y2 = pts[(i + 1) % len(pts)]
        length = math.hypot(x2 - x1, y2 - y1)
        n = max(1, int(length / (bump * 2)))
        nx, ny = (y2 - y1) / length, -(x2 - x1) / length
        for k in range(n):
            ax, ay = x1 + (x2 - x1) * k / n, y1 + (y2 - y1) * k / n
            bx, by = x1 + (x2 - x1) * (k + 1) / n, y1 + (y2 - y1) * (k + 1) / n
            h = bump * 1.2
            ink.p.append('%.1f %.1f m %.1f %.1f %.1f %.1f %.1f %.1f c\n' % (
                ax, ay, ax + nx * h, ay + ny * h, bx + nx * h, by + ny * h, bx, by))
            ink.curves += 1


def markups(pdf, rng, count, box, ctx):
    """Bluebeam-style markups. Returns annotation object numbers."""
    bx0, by0, bx1, by1 = box
    annots = []
    for i in range(count):
        kind = ('cloud', 'callout', 'line', 'ink', 'rect')[i % 5]
        x, y = rng.u(bx0 + 40, bx1 - 160), rng.u(by0 + 40, by1 - 120)
        w, h = rng.u(40, 150), rng.u(30, 100)
        ap = Ink()
        ap.rgb(0.9, 0.1, 0.1)
        ap.width(1.2)
        common = '/F 4 /T (Reviewer %d) /NM (MK-%05d) /M (D:20261001120000Z) /C [0.9 0.1 0.1]' % (i % 7, i)
        if kind == 'cloud':
            pts = [(x, y), (x + w, y), (x + w, y + h), (x, y + h)]
            cloud_path(ap, pts)
            ap.stroke()
            rect = (x - 10, y - 10, x + w + 10, y + h + 10)
            verts = ' '.join('%.1f %.1f' % p for p in pts)
            head = ('/Type /Annot /Subtype /Polygon /Subj (Cloud+) /BE << /S /C /I 1 >> /Vertices [%s] %s'
                    % (verts, common))
        elif kind == 'callout':
            ap.rect(x, y, w, 24)
            ap.stroke()
            ap.seg(x, y, x - 30, y - 30)
            ap.stroke()
            ap.rgb(0.9, 0.1, 0.1, fill=True)
            ap.text('F1', 8, x + 4, y + 9, 'RFI %d - %s' % (100 + i, note_line(rng, 3)))
            rect = (x - 32, y - 32, x + w + 2, y + 26)
            head = ('/Type /Annot /Subtype /FreeText /IT /FreeTextCallout /Subj (Callout) /DA (/F1 8 Tf 0.9 0.1 0.1 rg) '
                    '/Contents %s /CL [%.1f %.1f %.1f %.1f %.1f %.1f] %s'
                    % (pdf_string('RFI %d' % (100 + i)), x - 30, y - 30, x - 15, y - 15, x, y, common))
        elif kind == 'line':
            ap.seg(x, y, x + w, y + h)
            ap.stroke()
            ap.poly([(x + w, y + h), (x + w - 8, y + h - 2), (x + w - 3, y + h - 7)], close=True)
            ap.fill()
            rect = (x - 4, y - 4, x + w + 4, y + h + 4)
            head = ('/Type /Annot /Subtype /Line /Subj (Arrow) /L [%.1f %.1f %.1f %.1f] /LE [/None /OpenArrow] %s'
                    % (x, y, x + w, y + h, common))
        elif kind == 'ink':
            pts = []
            px, py = x, y
            for _ in range(60):
                px += rng.u(-2, 5)
                py += rng.u(-4, 4)
                pts.append((px, py))
            ap.poly(pts)
            ap.stroke()
            xs_, ys_ = [p[0] for p in pts], [p[1] for p in pts]
            rect = (min(xs_) - 2, min(ys_) - 2, max(xs_) + 2, max(ys_) + 2)
            head = ('/Type /Annot /Subtype /Ink /Subj (Pen) /InkList [[%s]] %s'
                    % (' '.join('%.1f %.1f' % p for p in pts), common))
        else:
            ap.rect(x, y, w, h)
            ap.stroke()
            rect = (x - 1, y - 1, x + w + 1, y + h + 1)
            head = '/Type /Annot /Subtype /Square /Subj (Rectangle) %s' % common
        ap_num = pdf.add('/Type /XObject /Subtype /Form /BBox [%.1f %.1f %.1f %.1f] /Resources %s'
                         % (rect + (ctx['fonts'],)), ap.data())
        annots.append(pdf.add('<< %s /Rect [%.1f %.1f %.1f %.1f] /P %d 0 R /AP << /N %d 0 R >> >>'
                              % ((head,) + rect + (ctx['page'], ap_num))))
    return annots


# =============================================================================
# THE SET
# =============================================================================

SERIES = [
    # (prefix, start number, kind, title stem, share of the set)
    ('G', 1, 'cover', 'COVER SHEET', 0.0),
    ('C', 101, 'site', 'SITE PLAN', 0.03),
    ('A', 101, 'plan', 'FLOOR PLAN - LEVEL', 0.14),
    ('A', 201, 'elev', 'EXTERIOR ELEVATIONS', 0.08),
    ('A', 301, 'sect', 'BUILDING SECTIONS', 0.07),
    ('A', 401, 'plan', 'ENLARGED PLANS', 0.07),
    ('A', 501, 'detl', 'DETAILS', 0.22),
    ('A', 601, 'schd', 'SCHEDULES', 0.06),
    ('A', 701, 'rcp', 'REFLECTED CEILING PLAN - LEVEL', 0.08),
    ('S', 101, 'plan', 'FRAMING PLAN - LEVEL', 0.08),
    ('M', 101, 'rcp', 'MECHANICAL PLAN - LEVEL', 0.09),
    ('E', 101, 'rcp', 'LIGHTING PLAN - LEVEL', 0.08),
]


def sheet_list(n, rng):
    if n == 1:
        return [{'label': 'A-101', 'title': 'FLOOR PLAN - LEVEL 1 (COMPLEX)', 'kind': 'complex', 'weight': 1.0}]
    if n < len(SERIES):
        # Too few sheets for the full mix: one each, most telling kinds first.
        counts = [0] * len(SERIES)
        for k in (0, 2, 6, 7, 1, 3, 4, 8, 5, 9, 10)[:n]:
            counts[k] = 1
    else:
        counts = [1] + [max(1, int(round(share * (n - 1)))) for _, _, _, _, share in SERIES[1:]]
        while sum(counts) > n:
            counts[counts.index(max(counts))] -= 1
        while sum(counts) < n:
            counts[6] += 1                              # top up with details
    sheets = []
    for (prefix, start, kind, stem, _), count in zip(SERIES, counts):
        for k in range(count):
            title = stem if kind in ('cover', 'detl', 'schd', 'elev', 'sect') else '%s %d' % (stem, k + 1)
            sheets.append({'label': '%s-%03d' % (prefix, start + k), 'title': title, 'kind': kind,
                           # Mostly ordinary sheets, one in twelve heavy.
                           'weight': 2.2 if rng.chance(1 / 12.0) else rng.u(0.6, 1.2)})
    return sheets


def jump_targets(n, heaviest, count=5):
    """Sheets spread across the set, visited in an order that never lands
    next to the previous one; the heaviest sheet is one of them. In a full
    set they lie beyond the first 11 sheets, which the flip steps have seen."""
    if n < 2:
        return []
    lo = 11 if n > 20 else 1
    picks = []
    for frac in (0.9, 0.25, 0.65, 0.05, 0.45)[:count]:
        i = lo + int(round(frac * (n - 1 - lo)))
        if i not in picks:
            picks.append(i)
    if heaviest not in picks and heaviest >= lo and n > 20:
        nearest = min(range(len(picks)), key=lambda k: abs(picks[k] - heaviest))
        picks[nearest] = heaviest
    return picks


def build(out, sheets_n, density, seed):
    t_start = time.time()
    rng = Rng(seed)
    pdf = PdfFile(out)

    # ---- shared resources ----
    f1 = pdf.add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>')
    f2 = pdf.add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>')
    procs, diffs, widths = [], [], []
    for code in range(32, 91):
        ch = chr(code)
        if ch in STROKE_FONT:
            name = _GLYPH_NAMES.get(ch, ch)
            g = Ink()
            g.raw('600 0 d0 60 w 1 J 1 j\n')
            for stroke in STROKE_FONT[ch]:
                g.poly([(px * 100, py * 100) for px, py in stroke])
            if STROKE_FONT[ch]:
                g.stroke()
            procs.append('/%s %d 0 R' % (name, pdf.add('', g.data())))
            diffs.append('%d /%s' % (code, name))
            widths.append('600')
        else:
            widths.append('0')
    tounicode = (b'/CIDInit /ProcSet findresource begin 12 dict begin begincmap '
                 b'/CMapName /Adobe-Identity-UCS def /CMapType 2 def 1 begincodespacerange <00> <FF> '
                 b'endcodespacerange 1 beginbfrange <20> <5A> <0020> endbfrange endcmap '
                 b'CMapName currentdict /CMap defineresource pop end end')
    f3 = pdf.add('<< /Type /Font /Subtype /Type3 /Name /SHX /FontBBox [-100 -200 500 700] '
                 '/FontMatrix [0.001 0 0 0.001 0 0] /CharProcs << %s >> '
                 '/Encoding << /Type /Encoding /Differences [%s] >> /FirstChar 32 /LastChar 90 '
                 '/Widths [%s] /ToUnicode %d 0 R >>'
                 % (' '.join(procs), ' '.join(diffs), ' '.join(widths), pdf.add('', tounicode)))
    fonts = '<< /Font << /F1 %d 0 R /F2 %d 0 R /F3 %d 0 R >> >>' % (f1, f2, f3)

    ocgs = [pdf.add('<< /Type /OCG /Name %s >>' % pdf_string(name)) for name in LAYERS]

    blocks = {}
    for name, (ink, bbox) in (('Chair', block_chair()), ('Desk', block_desk()), ('Table', block_table()),
                              ('Light', block_light()), ('Tree', block_tree(rng)), ('Logo', block_logo())):
        blocks[name] = form_xobject(pdf, bbox, ink)
    logo_res = '<< /XObject << /Logo %d 0 R >> %s >>' % (blocks['Logo'], fonts[3:-3])
    blocks['TitleBlock'] = title_block(pdf, rng, logo_res)

    scale = max(0.3, min(density, 1.5))
    aw, ah = int(3600 * scale ** 0.5), int(2400 * scale ** 0.5)
    blocks['Aerial'] = pdf.add('/Type /XObject /Subtype /Image /Width %d /Height %d /ColorSpace /DeviceGray '
                               '/BitsPerComponent 8' % (aw, ah), gray_image(rng, aw, ah, 24, 28))
    palette = ''.join('%02X%02X%02X' % (int(40 + v * 0.75), int(60 + v * 0.6), int(90 + v * 0.55)) for v in range(256))
    blocks['Render'] = pdf.add('/Type /XObject /Subtype /Image /Width 1800 /Height 1080 '
                               '/ColorSpace [/Indexed /DeviceRGB 255 <%s>] /BitsPerComponent 8' % palette,
                               gray_image(rng, 1800, 1080, 12, 20))
    shade = pdf.add('<< /Type /ExtGState /ca 0.35 /CA 0.35 >>')
    sky = pdf.add('<< /ShadingType 2 /ColorSpace /DeviceRGB /Coords [0 %.1f 0 %.1f] /Extend [true true] '
                  '/Function << /FunctionType 2 /Domain [0 1] /C0 [1 1 1] /C1 [0.75 0.85 0.95] /N 1 >> >>'
                  % (MARGIN, SHEET_H - MARGIN))
    resources = pdf.add('<< /Font << /F1 %d 0 R /F2 %d 0 R /F3 %d 0 R >> /XObject << %s >> '
                        '/ExtGState << /Shade %d 0 R >> /Shading << /Sky %d 0 R >> /Properties << %s >> >>'
                        % (f1, f2, f3, ' '.join('/%s %d 0 R' % kv for kv in sorted(blocks.items())),
                           shade, sky, ' '.join('/L%d %d 0 R' % (i, n) for i, n in enumerate(ocgs))))

    # ---- pages ----
    sheets = sheet_list(sheets_n, rng)
    for i, sheet in enumerate(sheets):
        sheet['index'], sheet['of'] = i, len(sheets)
    pages_ref = pdf.reserve()
    page_refs = [pdf.reserve() for _ in sheets]
    target_index = max([i for i, s in enumerate(sheets) if s['kind'] == 'schd'] or [0])
    manifest_pages = []
    pending_links = []
    for i, sheet in enumerate(sheets):
        d = density * sheet['weight']
        prng = Rng('%s/%d' % (seed, i))
        ink = Ink()
        ink.place('TitleBlock', 0, 0)
        sheet_text(ink, sheet)
        kind = sheet['kind']
        links = []
        search = None
        if kind == 'complex':
            # A plan, an underlay strip, a detail band and the search target,
            # so one page exercises everything.
            x0, y0, x1, y1 = DRAW_BOX
            focus = draw_plan(ink, prng, (x0, y0 + 160, x1, y1 - 340), d)
            ink.layer('X-AERIAL')
            ink.q()
            ink.gs('Shade')
            ink.raw('%.1f 0 0 %.1f %.1f %.1f cm /Aerial Do\n' % (x1 - x0, 150, x0, y0 - 2))
            ink.dos += 1
            ink.Q()
            ink.end_layer()
            draw_details(ink, prng, (x0 + 40, y1 - 330, x0 + 1240, y1 - 10), d / 3.0)
            ink.layer('A-ANNO-TEXT')
            ink.text('F1', 6, x1 - 150, y0 + 26, 'DOOR 1047  ' + SEARCH_TARGET)
            ink.end_layer()
            search = (x1 - 150, y0 + 26)
        elif kind == 'cover':
            focus = draw_cover(ink, prng, DRAW_BOX, sheets, links)
        elif kind == 'site':
            focus = draw_site(ink, prng, DRAW_BOX, d)
        elif kind in ('plan', 'rcp'):
            focus = draw_plan(ink, prng, DRAW_BOX, d, 'rcp' if kind == 'rcp' else 'plan')
        elif kind in ('elev', 'sect'):
            focus = draw_elevation(ink, prng, DRAW_BOX, d, section=(kind == 'sect'))
        elif kind == 'detl':
            focus = draw_details(ink, prng, DRAW_BOX, d)
        else:
            target = SEARCH_TARGET if i == target_index else None
            focus = draw_schedule(ink, prng, DRAW_BOX, d, target)
            if target:
                search = focus
        # Sheet-reference callouts linking to other sheets (batch-link style).
        if kind not in ('cover', 'complex') and len(sheets) > 1:
            ink.layer('A-ANNO-SYMB')
            ink.width(0.5)
            for k in range(6):
                cx, cy = DRAW_BOX[2] - 40, DRAW_BOX[1] + 40 + k * 44
                ink.circle(cx, cy, 16)
                ink.seg(cx - 16, cy, cx + 16, cy)
                ink.stroke()
                dest = prng.i(0, len(sheets) - 1)
                ink.text('F1', 6, cx - 10, cy - 10, sheets[dest]['label'])
                links.append((dest, (cx - 16, cy - 16, cx + 16, cy + 16)))
            ink.end_layer()
        data = ink.data()
        content = pdf.add('', data)
        n_markups = 250 if kind == 'complex' else (40 if prng.chance(0.25) else 0)
        annots = markups(pdf, prng, n_markups, DRAW_BOX, {'fonts': fonts, 'page': page_refs[i]})
        for dest, rect in links:
            num = pdf.reserve()
            pending_links.append((num, page_refs[i], dest, rect))
            annots.append(num)
        annots_entry = (' /Annots [%s]' % ' '.join('%d 0 R' % a for a in annots)) if annots else ''
        pdf.put(page_refs[i], '<< /Type /Page /Parent %d 0 R /MediaBox [0 0 %.0f %.0f] /Resources %d 0 R '
                              '/Contents %d 0 R%s >>' % (pages_ref, SHEET_W, SHEET_H, resources, content, annots_entry))
        manifest_pages.append({
            'index': i, 'label': sheet['label'], 'title': sheet['title'], 'kind': kind,
            'weight': round(sheet['weight'], 2),
            'segments': ink.segs, 'curves': ink.curves, 'text_ops': ink.texts, 'xobject_draws': ink.dos,
            'markups': n_markups, 'links': len(links), 'content_bytes': len(data),
            'focus': [round(focus[0], 1), round(focus[1], 1)],
        })
        if search:
            manifest_pages[-1]['search_target'] = [round(search[0], 1), round(search[1], 1)]
        sys.stdout.write('\r  page %d/%d  %-6s %-5s %8d segs' % (i + 1, len(sheets), sheet['label'], kind, ink.segs))
        sys.stdout.flush()
    sys.stdout.write('\n')
    for num, page, dest, rect in pending_links:
        pdf.put(num, '<< /Type /Annot /Subtype /Link /Rect [%.1f %.1f %.1f %.1f] /Border [0 0 0] '
                     '/P %d 0 R /Dest [%d 0 R /Fit] >>' % (rect + (page, page_refs[dest])))

    pdf.put(pages_ref, '<< /Type /Pages /Count %d /Kids [%s] >>' % (len(sheets), ' '.join('%d 0 R' % p for p in page_refs)))

    # ---- navigation: page labels and bookmarks by discipline ----
    labels = ' '.join('%d << /P %s >>' % (i, pdf_string(s['label'])) for i, s in enumerate(sheets))
    outline_root = pdf.reserve()
    groups = []
    for s in sheets:
        disc = {'G': 'GENERAL', 'C': 'CIVIL', 'A': 'ARCHITECTURAL', 'S': 'STRUCTURAL',
                'M': 'MECHANICAL', 'E': 'ELECTRICAL'}[s['label'][0]]
        if not groups or groups[-1][0] != disc:
            groups.append((disc, []))
        groups[-1][1].append(s)
    group_refs = [pdf.reserve() for _ in groups]
    for g, (disc, members) in enumerate(groups):
        item_refs = [pdf.reserve() for _ in members]
        for k, s in enumerate(members):
            nav = ''
            if k > 0:
                nav += ' /Prev %d 0 R' % item_refs[k - 1]
            if k < len(members) - 1:
                nav += ' /Next %d 0 R' % item_refs[k + 1]
            pdf.put(item_refs[k], '<< /Title %s /Parent %d 0 R /Dest [%d 0 R /Fit]%s >>'
                    % (pdf_string('%s  %s' % (s['label'], s['title'])), group_refs[g], page_refs[s['index']], nav))
        nav = ''
        if g > 0:
            nav += ' /Prev %d 0 R' % group_refs[g - 1]
        if g < len(groups) - 1:
            nav += ' /Next %d 0 R' % group_refs[g + 1]
        pdf.put(group_refs[g], '<< /Title %s /Parent %d 0 R /First %d 0 R /Last %d 0 R /Count %d%s >>'
                % (pdf_string(disc), outline_root, item_refs[0], item_refs[-1], -len(members), nav))
    pdf.put(outline_root, '<< /Type /Outlines /First %d 0 R /Last %d 0 R /Count %d >>'
            % (group_refs[0], group_refs[-1], len(groups)))

    oc_refs = ' '.join('%d 0 R' % n for n in ocgs)
    root = pdf.add('<< /Type /Catalog /Pages %d 0 R /PageLabels << /Nums [%s] >> /Outlines %d 0 R '
                   '/PageMode /UseOutlines /OCProperties << /OCGs [%s] /D << /Order [%s] /ON [%s] >> >> >>'
                   % (pages_ref, labels, outline_root, oc_refs, oc_refs, oc_refs))
    info = pdf.add('<< /Title %s /Producer (architecture.tools pdf-bench make_set.py v%d) '
                   '/CreationDate (D:20261001000000Z) >>'
                   % (pdf_string('pdf-bench %d sheets, density %.2f, seed %s' % (len(sheets), density, seed)),
                      GENERATOR_VERSION))
    fingerprint = pdf.close(root, info)

    heaviest = max(manifest_pages, key=lambda p: p['segments'] + 20 * p['xobject_draws'])['index']
    sha = hashlib.sha256()
    with open(out, 'rb') as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b''):
            sha.update(chunk)
    manifest = {
        'generator': 'make_set.py', 'generator_version': GENERATOR_VERSION,
        'file': os.path.basename(out), 'bytes': os.path.getsize(out),
        'sha256': sha.hexdigest(), 'content_fingerprint': fingerprint,
        'seed': seed, 'density': density, 'page_size_pt': [SHEET_W, SHEET_H],
        'search': {'text': SEARCH_TARGET, 'page_index': target_index if sheets_n > 1 else 0},
        # The test sheet (the heaviest) for zoom/pan, and the jump step's
        # targets: far apart and away from the first sheets, so no app can
        # have prefetched them - each jump is a cold page load.
        'test_page': heaviest,
        'jumps': jump_targets(len(sheets), heaviest),
        'totals': {k: sum(p[k] for p in manifest_pages) for k in ('segments', 'curves', 'text_ops', 'xobject_draws', 'markups', 'links')},
        'pages': manifest_pages,
    }
    with open(out + '.json', 'w') as fh:
        json.dump(manifest, fh, indent=1)
    manifest['build_seconds'] = round(time.time() - t_start, 1)
    return manifest


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split('\n\n')[0], formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--preset', choices=sorted(PRESETS), default='sheet')
    ap.add_argument('--sheets', type=int, help='number of sheets (default from preset)')
    ap.add_argument('--density', type=float, help='element-count multiplier (default from preset)')
    ap.add_argument('--seed', default='pdf-bench-1', help='same seed, same file')
    ap.add_argument('--out', help='output path (default from preset)')
    args = ap.parse_args(argv)
    preset = PRESETS[args.preset]
    sheets = args.sheets or preset['sheets']
    density = args.density if args.density is not None else preset['density']
    out = args.out or preset['out']
    print('make_set: %d sheet(s), density %.2f, seed %r -> %s' % (sheets, density, args.seed, out))
    m = build(out, sheets, density, args.seed)
    t = m['totals']
    print('  %.1f MB in %.1fs  |  %s segments, %s curves, %s text ops, %s block draws, %s markups'
          % (m['bytes'] / 1e6, m['build_seconds'], format(t['segments'], ','), format(t['curves'], ','),
             format(t['text_ops'], ','), format(t['xobject_draws'], ','), format(t['markups'], ',')))
    print('  sha256 %s\n  content fingerprint %s' % (m['sha256'], m['content_fingerprint']))
    return 0


if __name__ == '__main__':
    sys.exit(main())
