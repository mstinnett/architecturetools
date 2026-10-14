#!/usr/bin/env python3
"""
test_bench.py - checks the harness itself. Run: python3 test_bench.py

  - make_set.py is deterministic and its manifest matches the PDF
  - engines.py runs whichever engines are installed and writes rows
  - settle.py recovers known timings from a synthetic recording: taps in
    the audio, a progressive blur-to-sharp render, a pan, a frozen app that
    paints nothing for two seconds, and a step cut short by the next input.
    Both a constant-frame-rate video (OBS, QuickTime) and a variable-frame-
    rate one (the iPad's own screen recorder) are checked.
  - report.py pools the lot

Needs ffmpeg, numpy and Pillow; engines are tested when installed.
Works in a temporary folder and leaves nothing behind.
"""

import csv
import math
import os
import shutil
import subprocess
import sys
import tempfile
import wave

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
PY = sys.executable
checks = 0


def check(name, ok, detail=''):
    global checks
    if not ok:
        print('FAIL %s %s' % (name, detail))
        sys.exit(1)
    checks += 1
    print('PASS %s %s' % (name, detail))


def run(*args, **kw):
    return subprocess.run([PY] + [os.path.join(HERE, args[0])] + list(args[1:]),
                          capture_output=True, text=True, **kw)


def rows(path):
    with open(path, newline='') as fh:
        return list(csv.DictReader(fh))


# ---------------------------------------------------------------------------
# make_set.py
# ---------------------------------------------------------------------------

def test_make_set(tmp):
    a, b = os.path.join(tmp, 'a.pdf'), os.path.join(tmp, 'b.pdf')
    for path in (a, b):
        r = run('make_set.py', '--preset', 'smoke', '--out', path)
        check('make_set runs', r.returncode == 0, r.stderr[-300:])
    with open(a, 'rb') as fa, open(b, 'rb') as fb:
        check('make_set is deterministic', fa.read() == fb.read())
    import json
    m = json.load(open(a + '.json'))
    check('manifest lists every sheet', len(m['pages']) == 4, str([p['label'] for p in m['pages']]))
    check('manifest has a test page with geometry', all(len(p['focus']) == 2 for p in m['pages']))
    data = open(a, 'rb').read()
    check('PDF is well formed at the end', data.rstrip().endswith(b'%%EOF') and b'startxref' in data[-64:])
    try:
        import pypdfium2
    except ImportError:
        print('skip  PDFium cross-check (pip install pypdfium2)')
        return a
    doc = pypdfium2.PdfDocument(a)
    check('PDFium opens it', len(doc) == 4)
    hits = 0
    for i in range(len(doc)):
        tp = doc[i].get_textpage()
        s = tp.search(m['search']['text'])
        while s.get_next():
            hits += 1
            check('search target on the manifest page', i == m['search']['page_index'], 'page %d' % i)
    check('search target appears once', hits == 1, '%d hit(s)' % hits)
    return a


# ---------------------------------------------------------------------------
# engines.py
# ---------------------------------------------------------------------------

def test_engines(tmp, pdf):
    out = os.path.join(tmp, 'engines.csv')
    r = run('engines.py', pdf, '--reps', '2', '--out', out)
    check('engines.py runs', r.returncode == 0, r.stderr[-300:])
    print('      ' + '\n      '.join(r.stdout.strip().splitlines()))
    if not os.path.exists(out):
        print('skip  engine rows (no engine installed)')
        return None
    got = rows(out)
    tools = {g['tool'] for g in got}
    check('engine rows written', len(got) > 0 and tools, ','.join(sorted(tools)))
    for tool in tools:
        steps = {g['step'] for g in got if g['tool'] == tool}
        check('%s covers the steps' % tool, {'open', 'fit', 'zoom', 'flip', 'thumbs', 'search'} <= steps, ','.join(sorted(steps)))
        found = [g for g in got if g['tool'] == tool and g['step'] == 'search']
        check('%s finds the search target' % tool, '1 hit' in found[0]['notes'], found[0]['notes'])
    return out


# ---------------------------------------------------------------------------
# settle.py on a synthetic recording
# ---------------------------------------------------------------------------

W, H = 960, 600

# (time of tap or None, what the screen does). Expected values in ms.
SCRIPT = [
    # step     tap    events: (t, frame-name)            response  settle  settled
    ('open',   1.00, [(1.25, 'sheet-blur'), (2.90, 'sheet')],          250, 1900, True),
    ('zoom',   5.00, [(5.10, 'zoom-blur'), (5.60, 'zoom-half'), (6.40, 'zoom')], 100, 1400, True),
    ('pan',    9.00, 'pan',                                             50, 2200, True),
    ('flip',  14.00, [(16.00, 'page2')],                              2000, 2000, True),   # frozen, then done
    ('flip',  19.00, [(19.10, 'p3-a'), (19.50, 'p3-b'), (19.90, 'p3-c'), (20.30, 'p3-d')], 100, 1300, False),
    ('flip',  20.50, [(21.00, 'page4')],                               500,  500, True),
]
END = 24.0
PAN_START, PAN_END, PAN_FPS, PAN_SHARP = 9.05, 10.55, 30, 11.20


def line_art(seed, w, h, n):
    rng = np.random.default_rng(seed)
    img = Image.new('L', (w, h), 255)
    d = ImageDraw.Draw(img)
    for _ in range(n):
        x, y = rng.uniform(0, w), rng.uniform(0, h)
        a, length = rng.uniform(0, math.pi), rng.uniform(10, 120)
        d.line([(x, y), (x + length * math.cos(a), y + length * math.sin(a))], fill=0, width=1)
    return img


def frames_for_script(tmp):
    """Writes the PNGs and returns [(start_time, png)] - each frame holds
    until the next one starts."""
    big = line_art(1, W * 3, H * 3, 30000)
    sheet = big.resize((W, H), Image.LANCZOS)
    zoom = big.crop((W, H, 2 * W, 2 * H))
    named = {
        'home': Image.new('L', (W, H), 90),
        'sheet-blur': sheet.filter(ImageFilter.GaussianBlur(4)), 'sheet': sheet,
        'zoom-blur': zoom.filter(ImageFilter.GaussianBlur(4)), 'zoom': zoom,
        'page2': line_art(2, W, H, 3000), 'page4': line_art(4, W, H, 3000),
    }
    half = zoom.filter(ImageFilter.GaussianBlur(4))
    half.paste(zoom.crop((0, 0, W // 2, H)), (0, 0))
    named['zoom-half'] = half
    p3 = line_art(3, W, H, 3000)
    for k, tag in enumerate('abcd'):                        # tiles arriving one at a time
        img = Image.new('L', (W, H), 255)
        img.paste(p3.crop((0, 0, W * (k + 1) // 4, H)), (0, 0))
        named['p3-' + tag] = img
    timeline = [(0.0, 'home')]
    for step, tap, events, *_ in SCRIPT:
        if events == 'pan':
            n = int((PAN_END - PAN_START) * PAN_FPS)
            for i in range(n + 1):
                name = 'pan-%03d' % i
                named[name] = big.crop((W + 8 * i, H, 2 * W + 8 * i, 2 * H)).filter(ImageFilter.GaussianBlur(2))
                timeline.append((PAN_START + i / float(PAN_FPS), name))
            named['pan-sharp'] = big.crop((W + 8 * n, H, 2 * W + 8 * n, 2 * H))
            timeline.append((PAN_SHARP, 'pan-sharp'))
        else:
            timeline.extend(events)
    paths = {}
    for name, img in named.items():
        paths[name] = os.path.join(tmp, name + '.png')
        img.convert('RGB').save(paths[name])
    return [(t, paths[name]) for t, name in timeline]


def audio_with_taps(path, taps, rate=48000):
    rng = np.random.default_rng(7)
    x = rng.normal(0, 40, int(END * rate))                  # room tone
    for t in taps:
        i = int(t * rate)
        burst = rng.normal(0, 9000, int(0.004 * rate)) * np.exp(-np.linspace(0, 6, int(0.004 * rate)))
        x[i:i + len(burst)] += burst
    with wave.open(path, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(np.clip(x, -32000, 32000).astype(np.int16).tobytes())


def encode(tmp, timeline, wav, out, vfr):
    listing = os.path.join(tmp, 'frames.txt')
    with open(listing, 'w') as fh:
        for i, (t, png) in enumerate(timeline):
            nxt = timeline[i + 1][0] if i + 1 < len(timeline) else END
            fh.write("file '%s'\nduration %.4f\n" % (png, nxt - t))
        fh.write("file '%s'\n" % timeline[-1][1])
    # VFR like the iPad's recorder: frames only when the screen changes, on a
    # fine time base (left alone, ffmpeg would quantise to 25 fps and drop some).
    rate = ['-fps_mode', 'vfr', '-enc_time_base', '1/600'] if vfr else ['-r', '60', '-fps_mode', 'cfr']
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', listing, '-i', wav]
                   + rate + ['-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-c:a', 'aac',
                             '-t', str(END), out], check=True)


def test_settle(tmp):
    timeline = frames_for_script(tmp)
    wav = os.path.join(tmp, 'taps.wav')
    # A double-tap to zoom: two taps 0.15 s apart should count as one input.
    taps = [tap for _, tap, *_ in SCRIPT] + [4.85]
    audio_with_taps(wav, taps)
    steps = 'open,zoom,pan,flip*3'
    results = []
    for vfr in (False, True):
        kind = 'VFR' if vfr else 'CFR 60'
        video = os.path.join(tmp, 'rec-%s.mov' % ('vfr' if vfr else 'cfr'))
        encode(tmp, timeline, wav, video, vfr)
        out = os.path.join(tmp, 'video-%s.csv' % ('vfr' if vfr else 'cfr'))
        r = run('settle.py', video, '--steps', steps, '--tool', 'Synthetic %s' % kind, '--device', 'test',
                '--platform', 'iPadOS', '--file', 'synthetic.pdf', '--out', out, '--plot', os.path.join(tmp, 'timeline.png'))
        check('settle.py runs (%s)' % kind, r.returncode == 0, r.stderr[-400:])
        print('      ' + '\n      '.join(r.stdout.strip().splitlines()))
        got = rows(out) if os.path.exists(out) else []
        by_rep = {}
        for g in got:
            by_rep.setdefault(int(g['rep']), {})[g['metric']] = g
        check('one input per tap, double-tap merged (%s)' % kind, len(by_rep) == len(SCRIPT), '%d inputs' % len(by_rep))
        tol = 45.0                                          # a frame at 60 fps + audio/video alignment
        for n, (step, tap, events, resp, settle_ms, settled) in enumerate(SCRIPT):
            m = by_rep[n]
            got_r, got_s = float(m['response']['value']), float(m['settle']['value'])
            check('%s %d response (%s)' % (step, n + 1, kind), abs(got_r - resp) <= tol, '%.0f ms, expected %d' % (got_r, resp))
            check('%s %d settle (%s)' % (step, n + 1, kind), abs(got_s - settle_ms) <= tol, '%.0f ms, expected %d' % (got_s, settle_ms))
            flagged = 'lower bound' in m['settle']['notes']
            check('%s %d settled flag (%s)' % (step, n + 1, kind), flagged == (not settled), m['settle']['notes'] or 'settled')
        pan = by_rep[2]
        fps = float(pan['fps']['value'])
        check('pan frame rate (%s)' % kind, abs(fps - PAN_FPS) < 3, '%.1f fps' % fps)
        sharp = float(pan['sharp_after_stop']['value'])
        check('pan sharp after stop (%s)' % kind, abs(sharp - (PAN_SHARP - PAN_END) * 1000) <= tol, '%.0f ms' % sharp)
        results.append(out)
    check('timeline plot written', os.path.getsize(os.path.join(tmp, 'timeline.png')) > 1000)
    return results


def test_report(paths):
    r = run('report.py', *[p for p in paths if p])
    check('report.py runs', r.returncode == 0, r.stderr[-300:])
    check('report has a table per file', r.stdout.count('### ') >= 1 and '| tool' in r.stdout)
    check('report flags lower bounds', '†' in r.stdout)
    print(r.stdout)


def main():
    for tool in ('ffmpeg', 'ffprobe'):
        if not shutil.which(tool):
            print('test_bench.py needs %s on PATH' % tool)
            return 2
    tmp = tempfile.mkdtemp(prefix='pdf-bench-test-')
    try:
        pdf = test_make_set(tmp)
        engine_csv = test_engines(tmp, pdf)
        video_csvs = test_settle(tmp)
        test_report([engine_csv] + video_csvs)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    print('%d checks passed' % checks)
    return 0


if __name__ == '__main__':
    sys.exit(main())
