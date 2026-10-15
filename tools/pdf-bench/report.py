#!/usr/bin/env python3
"""
report.py - pool results from every device into the app comparison.

Reads any number of results CSVs (settle.py, drive.py; engines.py and the
PDFKit bench too) and prints Markdown: per test file, per device, one row per
app with its page-load times, then each app as a multiple of the fastest app
on that device. Apps are only ranked against apps on the same hardware.

  open         first sheet fully sharp after opening the file (`first open`
               is recording/rep 1, when the app has never seen the file)
  next sheet   one sheet forward, pooled over every flip
  jump         a far-off sheet not yet seen: raw page load
  revisit      back to a sheet seen a moment ago
  zoom, fit    re-render after a zoom change; pan: sharp after the drag stops

Cells: median (90th percentile, number of samples). A dagger marks a cell
that includes a lower bound (still changing at the next input, or timed out).
Engine rows, if any, follow in their own section: they time a library, not
an app, so they are never ranked with the apps.

Usage:
  python3 report.py results.csv ipad-*.csv --md report.md
"""

import argparse
import csv
import sys
from collections import OrderedDict, defaultdict

APP_COLUMNS = [
    ('first open', 'first open'), ('open', 'open'), ('flip', 'next sheet'), ('jump', 'jump'),
    ('revisit', 'revisit'), ('fit', 'fit'), ('zoom', 'zoom'), ('pan', 'pan'), ('search', 'search'),
]
ENGINE_ORDER = ['open', 'fit', 'zoom', 'flip', 'thumbs', 'search']
LOWER_BOUND = ('lower bound', 'timed out')


def load(paths):
    rows = []
    for path in paths:
        with open(path, newline='') as fh:
            for row in csv.DictReader(fh):
                if row.get('run_id') == 'run_id':        # a header from an appended file
                    continue
                rows.append(row)
    return rows


def percentile(values, p):
    values = sorted(values)
    k = (len(values) - 1) * p
    lo, hi = int(k), min(int(k) + 1, len(values) - 1)
    return values[lo] + (values[hi] - values[lo]) * (k - lo)


def fmt(ms):
    if ms < 10:
        return '%.1f ms' % ms
    return '%.0f ms' % ms if ms < 1000 else '%.2f s' % (ms / 1000.0)


def cell(values, flagged):
    text = fmt(percentile(values, 0.5))
    if len(values) >= 3:
        text += ' (p90 %s, n=%d)' % (fmt(percentile(values, 0.9)), len(values))
    elif len(values) > 1:
        text += ' (n=%d)' % len(values)
    return text + (' †' if flagged else '')


def file_key(r):
    return (r['file'] or '(file not recorded)') + (' (%s)' % r['fingerprint'] if r.get('fingerprint') else '')


# =============================================================================
# APPS
# =============================================================================

def app_samples(rows):
    """{column: [values]}, {column: flagged} for one app on one device."""
    have = {(r['step'], r['metric']) for r in rows if r['value'] not in ('', None)}
    opens = [r for r in rows if r['step'] == 'open' and r['metric'] == 'settle' and r['value']]
    split_first = any(r['rep'] == '1' for r in opens) and any(r['rep'] != '1' for r in opens)
    values, flagged = defaultdict(list), set()
    for r in rows:
        step = r['step']
        wanted = 'settle'
        if step == 'pan' and ('pan', 'sharp_after_stop') in have:
            wanted = 'sharp_after_stop'
        if r['metric'] != wanted or r['value'] in ('', None):
            continue
        column = 'first open' if (step == 'open' and split_first and r['rep'] == '1') else step
        values[column].append(float(r['value']))
        if any(s in r.get('notes', '') for s in LOWER_BOUND):
            flagged.add(column)
    return values, flagged


def app_sections(rows):
    out = []
    by_file = OrderedDict()
    for r in rows:
        by_file.setdefault(file_key(r), []).append(r)
    for key, frows in by_file.items():
        out.append('## %s\n' % key)
        by_device = OrderedDict()
        for r in frows:
            by_device.setdefault((r['device'] or '(device not recorded)', r['platform']), []).append(r)
        for (device, plat), drows in by_device.items():
            apps = OrderedDict()
            for r in drows:
                name = r['tool'] + (' ' + r['tool_version'] if r.get('tool_version') else '')
                if r['method'] == 'live':
                    name += ' (live)'
                apps.setdefault(name, []).append(r)
            data = OrderedDict((name, app_samples(arows)) for name, arows in apps.items())
            columns = [(c, title) for c, title in APP_COLUMNS if any(c in v for v, _ in data.values())]
            out.append('### %s%s\n' % (device, ' · ' + plat if plat else ''))
            out.append('| app | ' + ' | '.join(t for _, t in columns) + ' |')
            out.append('|---|' + '---|' * len(columns))
            for name, (values, flagged) in data.items():
                out.append('| %s | ' % name + ' | '.join(cell(values[c], c in flagged) if c in values else ''
                                                        for c, _ in columns) + ' |')
            if len(data) >= 2:
                out.append('\nEach app\'s median as a multiple of the fastest app on this device:\n')
                out.append('| app | ' + ' | '.join(t for _, t in columns) + ' |')
                out.append('|---|' + '---|' * len(columns))
                best = {}
                for c, _ in columns:
                    meds = [percentile(v[c], 0.5) for v, _ in data.values() if c in v]
                    best[c] = min(meds) if meds else None
                for name, (values, _) in data.items():
                    parts = []
                    for c, _ in columns:
                        if c in values and best[c]:
                            ratio = percentile(values[c], 0.5) / best[c]
                            parts.append('**fastest**' if ratio < 1.005 else '%.1f×' % ratio)
                        else:
                            parts.append('')
                    out.append('| %s | ' % name + ' | '.join(parts) + ' |')
            out.append('')
    return out


# =============================================================================
# ENGINES (optional diagnostics)
# =============================================================================

def engine_section(rows):
    if not rows:
        return []
    out = ['## Engines (optional: a library\'s render time, not an app\'s page load)\n']
    by_file = OrderedDict()
    for r in rows:
        by_file.setdefault(file_key(r), []).append(r)
    for key, frows in by_file.items():
        groups = OrderedDict()
        for r in frows:
            groups.setdefault('%s · %s' % (r['tool'], r['device'] or r['platform']), []).append(r)
        steps = [s for s in ENGINE_ORDER if any(r['step'] == s for r in frows)]
        out.append('### %s\n' % key)
        out.append('| engine · device | ' + ' | '.join(steps) + ' |')
        out.append('|---|' + '---|' * len(steps))
        for label, grows in groups.items():
            cells = []
            for s in steps:
                metric = 'total' if s in ('thumbs', 'search') else 'time'
                vals = [float(r['value']) for r in grows if r['step'] == s and r['metric'] == metric and r['value']]
                cells.append(cell(vals, False) if vals else '')
            out.append('| %s | ' % label + ' | '.join(cells) + ' |')
        out.append('')
    return out


def markdown(rows):
    apps = [r for r in rows if r['method'] in ('live', 'video')]
    engines = [r for r in rows if r['method'] == 'engine']
    out = app_sections(apps) + engine_section(engines)
    out.append('Cells: median (90th percentile, samples). App times run from the input to the sheet being fully '
               'sharp, read off the screen. † includes a lower bound (still changing at the next input, or timed out).')
    return '\n'.join(out)


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split('\n\n')[0], formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('csv', nargs='+')
    ap.add_argument('--md', help='also write the Markdown here')
    args = ap.parse_args(argv)
    text = markdown(load(args.csv))
    print(text)
    if args.md:
        with open(args.md, 'w') as fh:
            fh.write(text + '\n')
    return 0


if __name__ == '__main__':
    sys.exit(main())
