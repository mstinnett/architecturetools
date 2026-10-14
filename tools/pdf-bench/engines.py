#!/usr/bin/env python3
"""
engines.py - time the PDF engines themselves, headless, on any desktop OS.

An app can never be faster than the engine it draws with, so this is the
floor under every GUI number. Same steps as the GUI protocol (common.STEPS),
same results format. Each engine runs in its own process, so its peak memory
is its own.

  pdfium   pip install pypdfium2   Chrome, Edge, and many apps built on PDFium
  mupdf    pip install pymupdf     MuPDF (SumatraPDF, many mobile viewers)
  poppler  pdftoppm on PATH        Linux viewers; includes process start-up
  pdfkit   see PDFKitBench.swift   Apple's engine (Preview, Safari, most
                                   iPad PDF apps); runs on macOS and iPadOS

Usage:
  python3 engines.py complex-sheet.pdf
  python3 engines.py drawing-set.pdf --engines pdfium,mupdf --reps 5 --out results.csv
  python3 engines.py drawing-set.pdf --steps open,fit,zoom --save renders/

Steps here: open, fit, zoom (each --reps times, page re-loaded every rep so
parsing is counted, as it is when a user arrives at a sheet), flip (every
sheet once, at fit), thumbs (every sheet at 256 px) and search (whole set).
Renders are single-threaded; apps that tile across cores can beat these.
Use --save and look at the PNGs: an engine that drops content is not fast.
"""

import argparse
import json
import os
import shutil
import subprocess
import sys
import tempfile
import time

_HERE = os.path.dirname(os.path.abspath(__file__))
if _HERE not in sys.path:
    sys.path.insert(0, _HERE)
import common

ENGINE_STEPS = ('open', 'fit', 'zoom', 'flip', 'thumbs', 'search')
THUMB_WIDTH = 256


# =============================================================================
# ENGINE ADAPTERS - each: version(), open(path), count(doc), page_size(doc, i),
# render(doc, i, scale, rect_or_None, save_path_or_None), find(doc, text),
# and optionally reset(), called untimed before each render to drop caches.
# =============================================================================

class Pdfium(object):
    name = 'pdfium'

    def __init__(self):
        import pypdfium2
        self.lib = pypdfium2

    def version(self):
        v = self.lib.version
        return 'pypdfium2 %s / PDFium %s' % (v.PYPDFIUM_INFO, v.PDFIUM_INFO)

    def open(self, path):
        return self.lib.PdfDocument(path)

    def count(self, doc):
        return len(doc)

    def page_size(self, doc, i):
        page = doc[i]
        size = page.get_size()
        page.close()
        return size

    def render(self, doc, i, scale, rect, save):
        page = doc[i]
        if rect:
            w, h = page.get_size()
            x0, y0, x1, y1 = rect
            bitmap = page.render(scale=scale, crop=(x0, y0, w - x1, h - y1), draw_annots=True)
        else:
            bitmap = page.render(scale=scale, draw_annots=True)
        if save:
            bitmap.to_pil().save(save)
        bitmap.close()
        page.close()

    def find(self, doc, text):
        hits = 0
        for i in range(len(doc)):
            page = doc[i]
            textpage = page.get_textpage()
            searcher = textpage.search(text)
            while searcher.get_next():
                hits += 1
            searcher.close()
            textpage.close()
            page.close()
        return hits


class Mupdf(object):
    name = 'mupdf'

    def __init__(self):
        import pymupdf
        self.lib = pymupdf
        pymupdf.TOOLS.store_shrink(100)          # no cache carried between reps

    def version(self):
        return 'PyMuPDF %s / MuPDF %s' % (self.lib.VersionBind, self.lib.VersionFitz)

    def open(self, path):
        return self.lib.open(path)

    def count(self, doc):
        return doc.page_count

    def page_size(self, doc, i):
        r = doc[i].rect
        return r.width, r.height

    def render(self, doc, i, scale, rect, save):
        page = doc.load_page(i)
        matrix = self.lib.Matrix(scale, scale)
        if rect:
            h = page.rect.height
            x0, y0, x1, y1 = rect                 # PDF space -> MuPDF's y-down space
            pix = page.get_pixmap(matrix=matrix, clip=self.lib.Rect(x0, h - y1, x1, h - y0), annots=True)
        else:
            pix = page.get_pixmap(matrix=matrix, annots=True)
        if save:
            pix.save(save)

    def reset(self):
        self.lib.TOOLS.store_shrink(100)

    def find(self, doc, text):
        return sum(len(doc[i].search_for(text)) for i in range(doc.page_count))


class Poppler(object):
    """Through the command-line tools, so each call pays process start-up
    (tens of ms) and writes a PPM. Fine against multi-second renders."""
    name = 'poppler'

    def __init__(self):
        for tool in ('pdftoppm', 'pdfinfo', 'pdftotext'):
            if not shutil.which(tool):
                raise ImportError('%s not on PATH' % tool)
        self.tmp = tempfile.mkdtemp(prefix='pdfbench-')
        self.sizes = {}

    def version(self):
        out = subprocess.run(['pdftoppm', '-v'], capture_output=True, text=True)
        return (out.stderr or out.stdout).splitlines()[0].strip()

    def open(self, path):
        info = subprocess.run(['pdfinfo', path], capture_output=True, text=True, check=True).stdout
        pages = int([l for l in info.splitlines() if l.startswith('Pages:')][0].split()[1])
        return {'path': path, 'pages': pages}

    def count(self, doc):
        return doc['pages']

    def page_size(self, doc, i):
        if i not in self.sizes:            # cached, so renders don't pay for pdfinfo
            info = subprocess.run(['pdfinfo', '-f', str(i + 1), '-l', str(i + 1), doc['path']],
                                  capture_output=True, text=True, check=True).stdout
            line = [l for l in info.splitlines() if l.startswith('Page') and 'size:' in l][0]
            parts = line.split('size:')[1].split()
            self.sizes[i] = (float(parts[0]), float(parts[2]))
        return self.sizes[i]

    def render(self, doc, i, scale, rect, save):
        out = os.path.join(self.tmp, 'r')
        cmd = ['pdftoppm', '-f', str(i + 1), '-l', str(i + 1), '-r', '%.3f' % (scale * 72), '-singlefile']
        if rect:
            h = self.page_size(doc, i)[1]
            x0, y0, x1, y1 = rect
            cmd += ['-x', str(int(x0 * scale)), '-y', str(int((h - y1) * scale)),
                    '-W', str(int((x1 - x0) * scale)), '-H', str(int((y1 - y0) * scale))]
        if save:
            cmd += ['-png']
            out = os.path.splitext(save)[0]
        subprocess.run(cmd + [doc['path'], out], check=True)

    def find(self, doc, text):
        body = subprocess.run(['pdftotext', '-layout', doc['path'], '-'], capture_output=True, text=True).stdout
        return body.count(text)


ENGINES = {'pdfium': Pdfium, 'mupdf': Mupdf, 'poppler': Poppler}


# =============================================================================
# THE WORKER - one engine, one process
# =============================================================================

def timed(fn, *args):
    t = time.perf_counter()
    result = fn(*args)
    return (time.perf_counter() - t) * 1000.0, result


def run_worker(engine_name, pdf, steps, reps, view, page_override, save_dir):
    eng = ENGINES[engine_name]()
    manifest = common.load_manifest(pdf)
    rows = []

    def emit(step, metric, value, unit='ms', page='', rep='', notes=''):
        rows.append({'step': step, 'metric': metric, 'value': value, 'unit': unit,
                     'page': page, 'rep': rep, 'notes': notes})

    if 'open' in steps:
        for rep in range(reps):
            ms, doc = timed(eng.open, pdf)
            emit('open', 'time', ms, rep=rep, notes='parse + page count')
            del doc
    doc = eng.open(pdf)
    n = eng.count(doc)
    page = common.test_page(manifest, page_override)
    w, h = eng.page_size(doc, page)
    fit = common.fit_scale(w, h, view)
    label = manifest['pages'][page]['label'] if manifest else str(page + 1)

    def save(name):
        return os.path.join(save_dir, '%s-%s.png' % (engine_name, name)) if save_dir else None

    def timed_render(*args):
        if hasattr(eng, 'reset'):
            eng.reset()
        return timed(eng.render, *args)

    if 'fit' in steps:
        for rep in range(reps):
            ms, _ = timed_render(doc, page, fit, None, None)
            emit('fit', 'time', ms, page=label, rep=rep, notes='%dx%d px' % (round(w * fit), round(h * fit)))
        if save_dir:                                   # untimed: PNG encoding isn't rendering
            eng.render(doc, page, fit, None, save('fit'))
    if 'zoom' in steps:
        focus = manifest['pages'][page]['focus'] if manifest else (w / 2, h / 2)
        scale, rect = common.zoom_rect(w, h, view, focus)
        for rep in range(reps):
            ms, _ = timed_render(doc, page, scale, rect, None)
            emit('zoom', 'time', ms, page=label, rep=rep, notes='%dx%d px at %.0f%% of fit' % (view + (common.ZOOM * 100,)))
        if save_dir:
            eng.render(doc, page, scale, rect, save('zoom'))
    if 'flip' in steps and n > 1:
        total = 0.0
        for i in range(n):
            pw, ph = eng.page_size(doc, i)
            ms, _ = timed_render(doc, i, common.fit_scale(pw, ph, view), None, None)
            total += ms
            emit('flip', 'time', ms, page=manifest['pages'][i]['label'] if manifest else str(i + 1))
        emit('flip', 'total', total, notes='%d sheets at fit' % n)
    if 'thumbs' in steps and n > 1:
        ms, _ = timed(lambda: [eng.render(doc, i, THUMB_WIDTH / w, None, None) for i in range(n)])
        emit('thumbs', 'total', ms, notes='%d sheets at %d px wide' % (n, THUMB_WIDTH))
    if 'search' in steps:
        target = manifest['search']['text'] if manifest else 'HW-SET 47B'
        ms, hits = timed(eng.find, doc, target)
        emit('search', 'total', ms, notes='%d hit(s) for %r' % (hits, target))
    # Poppler renders in child processes; count the largest of those instead.
    rss = common.peak_rss_mb(children=isinstance(eng, Poppler))
    if rss:
        emit('all', 'peak_rss', rss, unit='MB', notes='largest pdftoppm process' if isinstance(eng, Poppler) else '')
    return eng.version(), rows


# =============================================================================
# THE DRIVER
# =============================================================================

def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split('\n\n')[0], formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('pdf')
    ap.add_argument('--engines', default='pdfium,mupdf,poppler')
    ap.add_argument('--steps', default=','.join(ENGINE_STEPS))
    ap.add_argument('--reps', type=int, default=5)
    ap.add_argument('--view', default='%dx%d' % common.DEFAULT_VIEW, help='screen pixels, e.g. 2560x1600')
    ap.add_argument('--page', type=int, help='0-based test page (default: the heaviest in the manifest)')
    ap.add_argument('--device', help='device label for the results (default: model/host name)')
    ap.add_argument('--out', default='results.csv')
    ap.add_argument('--save', metavar='DIR', help='write the fit and zoom renders as PNGs for a visual check')
    ap.add_argument('--worker', help=argparse.SUPPRESS)
    args = ap.parse_args(argv)
    steps = [s for s in args.steps.split(',') if s]
    view = common.parse_view(args.view)
    if args.save:
        os.makedirs(args.save, exist_ok=True)

    if args.worker:
        version, rows = run_worker(args.worker, args.pdf, steps, args.reps, view, args.page, args.save)
        print(json.dumps({'version': version, 'rows': rows}))
        return 0

    manifest = common.load_manifest(args.pdf)
    if not manifest:
        print('note: no %s.json manifest; using page 1 and the page centre' % args.pdf)
    name, fingerprint = common.file_identity(args.pdf, manifest)
    info = common.device_info(args.device)
    print('engines.py: %s on %s (%s)' % (name, info['device'], info['cpu']))
    for engine in [e for e in args.engines.split(',') if e]:
        cmd = [sys.executable, os.path.abspath(__file__), args.pdf, '--worker', engine, '--steps', ','.join(steps),
               '--reps', str(args.reps), '--view', args.view]
        if args.page is not None:
            cmd += ['--page', str(args.page)]
        if args.save:
            cmd += ['--save', args.save]
        proc = subprocess.run(cmd, capture_output=True, text=True)
        if proc.returncode != 0:
            last = (proc.stderr.strip().splitlines() or ['failed'])[-1]
            print('  %-8s skipped: %s' % (engine, last))
            continue
        payload = json.loads(proc.stdout.strip().splitlines()[-1])
        out = common.Results(args.out, dict(info, method='engine', tool=engine, tool_version=payload['version'],
                                            file=name, fingerprint=fingerprint))
        summary = {}
        for row in payload['rows']:
            out.add(**row)
            summary.setdefault((row['step'], row['metric']), []).append(row['value'])
        out.close()
        parts = []
        for (step, metric), values in summary.items():
            values.sort()
            if metric == 'time':
                parts.append('%s %s' % (step, fmt_ms(values[len(values) // 2]) + ('' if step != 'flip' else '/sheet')))
            elif metric == 'total':
                parts.append('%s %s' % ('flip all' if step == 'flip' else step, fmt_ms(values[0])))
            elif metric == 'peak_rss':
                parts.append('peak %.0f MB' % values[0])
        print('  %-8s %s' % (engine, ' | '.join(parts)))
    print('rows appended to %s' % args.out)
    return 0


def fmt_ms(ms):
    if ms < 10:
        return '%.1f ms' % ms
    return '%.0f ms' % ms if ms < 1000 else '%.2f s' % (ms / 1000.0)


if __name__ == '__main__':
    sys.exit(main())
