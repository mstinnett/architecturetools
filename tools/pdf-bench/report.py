#!/usr/bin/env python3
"""
report.py - pool results from every machine into one comparison table.

Reads any number of results CSVs (engines.py, drive.py, settle.py and the
PDFKit bench all write the same columns), groups them by test file, and
prints a Markdown table per file: one row per tool on a device, one column
per step, each cell the median with the 90th percentile beside it.

  engine rows   fit / zoom / open: render time; flip: per sheet;
                thumbs / search: the whole set
  app rows      settle time (input to fully sharp); pan: sharp after the
                drag stops; flip: per sheet

A dagger marks cells that include a lower bound (the screen was still
changing at the next input, or the run timed out).

Usage:
  python3 report.py results.csv ipad.csv --md report.md
"""

import argparse
import csv
import sys
from collections import OrderedDict, defaultdict

STEP_ORDER = ['open', 'fit', 'zoom', 'pan', 'flip', 'jump', 'thumbs', 'search']
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


def pick_metrics(method, step):
    """The number that represents a step for this kind of row, in order of
    preference (a pan with no measurable motion falls back to settle)."""
    if method == 'engine':
        return ('total',) if step in ('thumbs', 'search') else ('time',)
    return ('sharp_after_stop', 'settle') if step == 'pan' else ('settle',)


def percentile(values, p):
    values = sorted(values)
    k = (len(values) - 1) * p
    lo, hi = int(k), min(int(k) + 1, len(values) - 1)
    return values[lo] + (values[hi] - values[lo]) * (k - lo)


def fmt(ms):
    if ms < 10:
        return '%.1f ms' % ms
    return '%.0f ms' % ms if ms < 1000 else '%.2f s' % (ms / 1000.0)


def build_tables(rows):
    """{file label: (columns, [(row label, {step: cell})])}"""
    by_file = OrderedDict()
    for r in rows:
        key = (r['file'] or '(file not recorded)') + (' (%s)' % r['fingerprint'] if r.get('fingerprint') else '')
        by_file.setdefault(key, []).append(r)
    tables = OrderedDict()
    for key, frows in by_file.items():
        groups = OrderedDict()
        for r in frows:
            label = '%s · %s · %s' % (r['tool'], r['method'], r['device'] or r['platform'])
            if r.get('tool_version'):
                label = '%s · %s · %s · %s' % (r['tool'], r['tool_version'], r['method'], r['device'] or r['platform'])
            groups.setdefault((r['platform'], label), []).append(r)
        steps_seen = set()
        body = []
        for (plat, label), grows in groups.items():
            values, flagged = defaultdict(list), set()
            method = grows[0]['method']
            have = {(r['step'], r['metric']) for r in grows if r['value'] not in ('', None)}
            for r in grows:
                wanted = next((m for m in pick_metrics(method, r['step']) if (r['step'], m) in have), None)
                if r['metric'] != wanted or r['value'] in ('', None):
                    continue
                values[r['step']].append(float(r['value']))
                if any(s in r.get('notes', '') for s in LOWER_BOUND):
                    flagged.add(r['step'])
            cells = {}
            for step, vals in values.items():
                steps_seen.add(step)
                cell = fmt(percentile(vals, 0.5))
                if len(vals) >= 3:
                    cell += ' (p90 %s)' % fmt(percentile(vals, 0.9))
                if step in flagged:
                    cell += ' †'
                cells[step] = cell
            mem = [float(r['value']) for r in grows if r['metric'] == 'peak_rss' and r['value']]
            if mem:
                cells['peak memory'] = '%.0f MB' % max(mem)
            body.append(('%s · %s' % (plat, label), cells, values))
        columns = [s for s in STEP_ORDER if s in steps_seen] + [s for s in sorted(steps_seen) if s not in STEP_ORDER]
        if any('peak memory' in c for _, c, _ in body):
            columns.append('peak memory')
        tables[key] = (columns, body)
    return tables


def markdown(tables):
    out = []
    for key, (columns, body) in tables.items():
        out.append('### %s\n' % key)
        out.append('| tool · method · device | ' + ' | '.join(columns) + ' |')
        out.append('|---|' + '---|' * len(columns))
        for label, cells, _ in body:
            out.append('| %s | ' % label + ' | '.join(cells.get(c, '') for c in columns) + ' |')
        # Who is fastest per step, and by how much, among the app rows.
        lines = []
        for step in columns:
            meds = [(percentile(v[step], 0.5), label) for label, _, v in body if step in v and ' · engine · ' not in label]
            if len(meds) >= 2:
                meds.sort()
                lines.append('- %s: %s fastest; slowest is %.1fx (%s)' % (step, meds[0][1].split(' · ')[1], meds[-1][0] / max(meds[0][0], 1e-6),
                                                                          meds[-1][1].split(' · ')[1]))
        if lines:
            out.append('\nApps, median settle:\n' + '\n'.join(lines))
        out.append('')
    out.append('Cells: median (90th percentile). Engine rows are render times; app rows are input-to-fully-sharp. '
               '† includes a lower bound (still changing at the next input, or timed out).')
    return '\n'.join(out)


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split('\n\n')[0], formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('csv', nargs='+')
    ap.add_argument('--md', help='also write the Markdown here')
    args = ap.parse_args(argv)
    text = markdown(build_tables(load(args.csv)))
    print(text)
    if args.md:
        with open(args.md, 'w') as fh:
            fh.write(text + '\n')
    return 0


if __name__ == '__main__':
    sys.exit(main())
