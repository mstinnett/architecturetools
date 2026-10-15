#!/usr/bin/env python3
"""
settle.py - time any PDF app from a screen recording: Windows, macOS, iPadOS.

Closed apps (Bluebeam, PolyPDF, Drawboard, Acrobat...) can't be scripted from
outside on every platform, but all of them can be recorded. A recording holds
both halves of a timing: when the input happened, and when the screen stopped
changing. This reads both.

  input   the audio track: record with the microphone on, and every tap on
          the glass (a fingernail is plenty) or click or key press is a
          sharp transient. Or pass --marks with times you logged yourself.
  output  the pixels inside --roi (the drawing canvas, not the status bar or
          a spinner). For each input: `response` = first frame that changed,
          `settle` = the last frame that changed before the screen went still
          - the moment the sheet is fully sharp, the number users feel.

Recordings:  iPadOS  Control Center > Screen Recording, long-press > Microphone On
             macOS   QuickTime > New Screen Recording, Options > internal mic
             Windows OBS (display capture + mic), or Win+Alt+R with mic enabled
Variable-frame-rate recordings (the iPad's) are fine: frame times come from
the file, not from an assumed frame rate.

Usage (runcard.py prints the exact command for a test file):
  python3 settle.py polypdf-1.mov --steps open,flip*10,jump*5,revisit*3 --rep 1 \\
      --tool PolyPDF --tool-version 2.1 --device "iPad Pro 13 M4" --platform iPadOS \\
      --file drawing-set.pdf --roi 0,0.06,1,0.94 --plot polypdf-1.png
  python3 settle.py win.mp4 --marks win.marks.csv ...     # fixed or logged marks

Run it once, look at the --plot timeline (marks, response, settle), and if a
mark is wrong, edit <video>.marks.csv (written every run) and rerun with
--marks. Leave 3+ seconds of stillness after each step finishes.

Needs ffmpeg/ffprobe on PATH, and numpy. Pillow for --plot and --frames.
"""

import argparse
import json
import os
import re
import subprocess
import sys
import threading

import numpy as np

_HERE = os.path.dirname(os.path.abspath(__file__))
if _HERE not in sys.path:
    sys.path.insert(0, _HERE)
import common

ANALYSIS_WIDTH = 1280      # frames are compared at this width (area-averaged)
BLOCK = 16                 # ...in blocks this size (at ANALYSIS_WIDTH; scaled below it)
BLOCK_DELTA = 10.0         # mean grey-level change that marks a block as changed
MIN_CHANGE = 0.0005        # fraction of blocks that makes a frame "changed"
MOTION_PEAK = 0.15         # phase-correlation peak that means the view moved


# =============================================================================
# THE CORE - shared with drive.py's live mode
# =============================================================================

def change_fraction(prev, cur, block_delta=BLOCK_DELTA):
    """Fraction of blocks whose mean absolute change exceeds block_delta.

    Blocks, not pixels: video encoders re-quantise a still screen now and
    then (keyframes, quality top-ups after a big change), which flips scattered
    pixels along every line of a dense drawing by up to ~45 grey levels, but
    leaves block means within a few levels. Real changes - a tile arriving, a
    blurry tile turning sharp - move whole blocks by tens of levels."""
    k = max(4, int(round(BLOCK * cur.shape[1] / float(ANALYSIS_WIDTH))))
    h, w = cur.shape[0] // k * k, cur.shape[1] // k * k
    d = np.abs(cur[:h, :w].astype(np.int16) - prev[:h, :w].astype(np.int16))
    means = d.reshape(h // k, k, w // k, k).mean(axis=(1, 3))
    return float(np.count_nonzero(means > block_delta)) / means.size


_windows = {}


def global_shift(prev, cur):
    """Phase correlation: (dx, dy, peak). A pan or scroll gives a clear peak
    at the offset; sharpening in place peaks at (0, 0); a new sheet gives no
    real peak at all."""
    shape = cur.shape
    if shape not in _windows:
        _windows[shape] = np.outer(np.hanning(shape[0]), np.hanning(shape[1])).astype(np.float32)
    win = _windows[shape]
    a, b = prev.astype(np.float32), cur.astype(np.float32)
    fa, fb = np.fft.rfft2((a - a.mean()) * win), np.fft.rfft2((b - b.mean()) * win)
    r = fa * np.conj(fb)
    r = np.fft.irfft2(r / (np.abs(r) + 1e-9), s=shape)
    dy, dx = np.unravel_index(int(np.argmax(r)), shape)
    dy = dy - shape[0] if dy > shape[0] // 2 else dy
    dx = dx - shape[1] if dx > shape[1] // 2 else dx
    return int(dx), int(dy), float(r.max())


def is_motion(shift, peak=MOTION_PEAK):
    return shift is not None and (shift[0] or shift[1]) and shift[2] >= peak


def measure(times, fracs, shifts, mark, end, quiet, threshold):
    """One step: frames in [mark, end). `shifts` holds global_shift() for
    changed frames (None elsewhere). Returns a dict of timings in ms
    (response, settle; when the view moved, also fps and sharp_after_stop)
    and `settled`, False when the screen was still changing within `quiet`
    seconds of the next input (the number is then a lower bound)."""
    idx = [i for i, t in enumerate(times) if mark <= t < end]
    active = [i for i in idx if fracs[i] > threshold]
    if not active:
        return {'response': None, 'settle': None, 'settled': True, 'changed_frames': 0}
    first, last = active[0], active[-1]
    out = {
        'response': (times[first] - mark) * 1000.0,
        'settle': (times[last] - mark) * 1000.0,
        'settled': (end - times[last]) >= quiet,
        'changed_frames': len(active),
    }
    moving = [i for i in active if is_motion(shifts[i])]
    if len(moving) >= 5:
        span = times[moving[-1]] - times[moving[0]]
        if span > 0.25:
            out['fps'] = (len(moving) - 1) / span
            out['sharp_after_stop'] = (times[last] - times[moving[-1]]) * 1000.0
    return out


def activity_marks(times, fracs, threshold, gap):
    """No input marks: each burst of change after `gap` seconds of stillness
    starts a step (response is then 0 by definition; a frozen app that shows
    nothing until done looks instant - use audio or logged marks if you can)."""
    marks, last_change = [], None
    for t, f in zip(times, fracs):
        if f > threshold:
            if last_change is None or t - last_change >= gap:
                marks.append(t)
            last_change = t
    return marks


# =============================================================================
# READING THE RECORDING
# =============================================================================

def probe(path):
    out = subprocess.run(['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', path],
                         capture_output=True, text=True, check=True).stdout
    info = json.loads(out)
    video = next(s for s in info['streams'] if s['codec_type'] == 'video')
    audio = any(s['codec_type'] == 'audio' for s in info['streams'])
    w, h = int(video['width']), int(video['height'])
    rotation = 0
    for side in video.get('side_data_list', []):
        if 'rotation' in side:
            rotation = int(side['rotation'])
    rotation = rotation or int(video.get('tags', {}).get('rotate', 0))
    if abs(rotation) % 180 == 90:            # ffmpeg autorotates on decode
        w, h = h, w
    return {'width': w, 'height': h, 'audio': audio, 'duration': float(info['format'].get('duration', 0))}


def roi_pixels(roi, w, h):
    x, y, rw, rh = roi
    px, py = int(x * w) // 2 * 2, int(y * h) // 2 * 2
    pw, ph = max(2, int(rw * w) // 2 * 2), max(2, int(rh * h) // 2 * 2)
    return px, py, min(pw, w - px), min(ph, h - py)


def read_frames(path, info, roi, width=ANALYSIS_WIDTH):
    """Yields (pts_seconds, grey ndarray) for every decoded frame in the ROI."""
    px, py, pw, ph = roi_pixels(roi, info['width'], info['height'])
    aw = min(width, pw) // 2 * 2
    ah = max(2, int(round(aw * ph / float(pw))) // 2 * 2)
    vf = 'crop=%d:%d:%d:%d,scale=%d:%d:flags=area,format=gray,showinfo' % (pw, ph, px, py, aw, ah)
    cmd = ['ffmpeg', '-v', 'info', '-nostats', '-i', path, '-an', '-vf', vf,
           '-fps_mode', 'passthrough', '-f', 'rawvideo', 'pipe:1']
    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    stamps = []
    pts = re.compile(rb'pts_time:\s*([-0-9.eE+]+)')

    def read_stderr():
        for line in proc.stderr:
            m = pts.search(line)
            if m and b'Parsed_showinfo' in line:
                stamps.append(float(m.group(1)))
    reader = threading.Thread(target=read_stderr, daemon=True)
    reader.start()
    size = aw * ah
    n = 0
    while True:
        buf = proc.stdout.read(size)
        if len(buf) < size:
            break
        # showinfo logs a frame before it is written, but give it a moment.
        while len(stamps) <= n and reader.is_alive():
            reader.join(0.01)
        t = stamps[n] if n < len(stamps) else (stamps[-1] if stamps else 0.0)
        yield t, np.frombuffer(buf, dtype=np.uint8).reshape(ah, aw)
        n += 1
    proc.wait()
    reader.join(1)


def audio_marks(path, group, sensitivity):
    """Times (s) of taps/clicks: sharp transients in the audio track. Taps
    closer than `group` seconds merge into one input marked at the last one
    (a double-tap, or a modifier then a key)."""
    rate, hop = 16000, 80                              # 5 ms hops
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-vn', '-ac', '1', '-ar', str(rate),
                          '-f', 's16le', 'pipe:1'], capture_output=True, check=True).stdout
    x = np.frombuffer(raw, dtype=np.int16).astype(np.float32)
    if len(x) < hop * 4:
        return []
    x = np.diff(x)                                     # high-pass: taps are clicks, hum is not
    n = len(x) // hop
    env = np.sqrt(np.mean(x[:n * hop].reshape(n, hop) ** 2, axis=1))
    floor = float(np.median(env)) + 1e-6
    level = floor * sensitivity
    onsets, below = [], True
    for i, e in enumerate(env):
        if e > level and below:
            t = i * hop / float(rate)
            if not onsets or t - onsets[-1] > 0.08:
                onsets.append(t)
            below = False
        elif e < level * 0.5:
            below = True
    marks = []
    for t in onsets:
        if marks and t - marks[-1] < group:
            marks[-1] = t
        else:
            marks.append(t)
    return marks


def read_marks(path):
    """One mark per line: seconds[,step]. '#' starts a comment."""
    marks, names = [], []
    with open(path) as fh:
        for line in fh:
            line = line.split('#', 1)[0].strip()
            if not line or line.lower().startswith('time'):
                continue
            parts = [p.strip() for p in line.split(',')]
            marks.append(float(parts[0]))
            names.append(parts[1] if len(parts) > 1 and parts[1] else None)
    return marks, names


def expand_steps(text):
    """'open,fit,flip*3' -> ['open', 'fit', 'flip', 'flip', 'flip']"""
    out = []
    for part in [p.strip() for p in text.split(',') if p.strip()]:
        name, _, count = part.partition('*')
        out.extend([name] * (int(count) if count else 1))
    return out


# =============================================================================
# EVIDENCE - a timeline plot and the frames each verdict rests on
# =============================================================================

def plot_timeline(path, times, fracs, threshold, results, duration):
    from PIL import Image, ImageDraw
    W, H, pad = 1800, 360, 40
    img = Image.new('RGB', (W, H), 'white')
    d = ImageDraw.Draw(img)
    span = max(duration, times[-1] if times else 1.0, 1.0)

    def X(t):
        return pad + (W - 2 * pad) * t / span

    def Y(f):                                       # log scale, 1e-5 .. 1
        f = max(f, 1e-5)
        return H - pad - (H - 2 * pad) * (np.log10(f) + 5) / 5.0
    d.line([(pad, Y(threshold)), (W - pad, Y(threshold))], fill=(200, 200, 200))
    for t, f in zip(times, fracs):
        d.line([(X(t), H - pad), (X(t), Y(f))], fill=(90, 90, 90) if f > threshold else (215, 215, 215))
    for r in results:
        d.line([(X(r['mark']), pad), (X(r['mark']), H - pad)], fill=(30, 90, 220), width=2)
        d.text((X(r['mark']) + 3, pad - 30 + 12 * (r['n'] % 2)), '%d %s' % (r['n'] + 1, r['step']), fill=(30, 90, 220))
        if r.get('settle') is not None:
            ts = r['mark'] + r['settle'] / 1000.0
            colour = (20, 150, 60) if r['settled'] else (220, 120, 0)
            d.line([(X(ts), pad), (X(ts), H - pad)], fill=colour, width=2)
    for s in range(0, int(span) + 1, max(1, int(span / 20))):
        d.text((X(s), H - pad + 6), '%ds' % s, fill=(80, 80, 80))
    d.text((pad, H - 16), 'blue: input   green: settled   orange: still changing at next input   '
           'bars: share of blocks changed per frame (log)   grey line: change threshold', fill=(80, 80, 80))
    img.save(path)


def save_frames(video, results, out_dir):
    os.makedirs(out_dir, exist_ok=True)
    for r in results:
        for tag, ms in (('response', r.get('response')), ('settle', r.get('settle'))):
            if ms is None:
                continue
            t = r['mark'] + ms / 1000.0
            name = os.path.join(out_dir, '%02d-%s-%s.png' % (r['n'] + 1, r['step'], tag))
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', '%.3f' % t, '-i', video,
                            '-frames:v', '1', name], check=False)


# =============================================================================
# MAIN
# =============================================================================

def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split('\n\n')[0], formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('video')
    ap.add_argument('--steps', default='', help="what was done, in order (runcard.py prints it), e.g. %s" % common.PAGELOAD)
    ap.add_argument('--rep', default='', help='which repetition this recording is (1 = first-ever open of the file)')
    ap.add_argument('--marks', default='audio', help="'audio' (default), 'change', or a CSV of seconds[,step]")
    ap.add_argument('--roi', default='0,0,1,1', help='canvas region as fractions x,y,w,h from top-left')
    ap.add_argument('--quiet', type=float, default=1.5, help='seconds of stillness that count as settled')
    ap.add_argument('--gap', type=float, default=2.5, help="with --marks change: stillness that separates steps")
    ap.add_argument('--group', type=float, default=0.5, help='taps closer than this are one input')
    ap.add_argument('--sensitivity', type=float, default=8.0, help='tap detection: multiple of the noise floor')
    ap.add_argument('--min-change', type=float, default=MIN_CHANGE, help='fraction of blocks that counts as a change')
    ap.add_argument('--block-delta', type=float, default=BLOCK_DELTA, help='raise if encoder noise reads as change')
    ap.add_argument('--tool', default='app')
    ap.add_argument('--tool-version', default='')
    ap.add_argument('--device', help='the device that was recorded (not this computer)')
    ap.add_argument('--platform', help='Windows / macOS / iPadOS')
    ap.add_argument('--file', default='', help='the PDF that was open (manifest beside it adds the fingerprint)')
    ap.add_argument('--out', default='results.csv')
    ap.add_argument('--plot', help='write a timeline PNG here')
    ap.add_argument('--frames', help='write the response/settle frames for each step to this folder')
    args = ap.parse_args(argv)

    info = probe(args.video)
    roi = tuple(float(v) for v in args.roi.split(','))
    times, fracs, shifts, prev = [], [], [], None
    for t, frame in read_frames(args.video, info, roi):
        if prev is not None:
            times.append(t)
            fracs.append(change_fraction(prev, frame, args.block_delta))
            shifts.append(global_shift(prev, frame) if fracs[-1] > args.min_change else None)
        prev = frame
    if not times:
        print('settle.py: no frames decoded from %s' % args.video)
        return 1
    threshold = args.min_change

    names = []
    if args.marks == 'audio':
        if not info['audio']:
            print('settle.py: the recording has no audio track; use --marks change or a marks file')
            return 1
        marks = audio_marks(args.video, args.group, args.sensitivity)
    elif args.marks == 'change':
        marks = activity_marks(times, fracs, threshold, args.gap)
    else:
        marks, names = read_marks(args.marks)
    steps = expand_steps(args.steps)
    if steps and len(steps) != len(marks):
        print('settle.py: %d input marks but %d steps - check the plot / marks file; extras are labelled "step"'
              % (len(marks), len(steps)))
    marks_path = os.path.splitext(args.video)[0] + '.marks.csv'

    results = []
    end_of_video = max(info['duration'], times[-1])
    for n, mark in enumerate(marks):
        end = marks[n + 1] if n + 1 < len(marks) else end_of_video + 1e-3
        step = (names[n] if n < len(names) and names[n] else None) or (steps[n] if n < len(steps) else 'step')
        r = measure(times, fracs, shifts, mark, end, args.quiet, threshold)
        r.update({'n': n, 'mark': mark, 'step': step})
        if n + 1 == len(marks):
            r['settled'] = r['settled'] or r['settle'] is None
        results.append(r)
    with open(marks_path, 'w') as fh:
        fh.write('time,step\n')
        for r in results:
            fh.write('%.3f,%s\n' % (r['mark'], r['step']))

    pdf_manifest = common.load_manifest(args.file) if args.file else None
    name, fingerprint = common.file_identity(args.file, pdf_manifest) if args.file else ('', '')
    base = {'platform': args.platform or '', 'os_version': '', 'device': args.device or '', 'cpu': '', 'ram_gb': '',
            'method': 'video', 'tool': args.tool, 'tool_version': args.tool_version,
            'file': name, 'fingerprint': fingerprint}
    out = common.Results(args.out, base)
    targets = common.step_targets(pdf_manifest, [r['step'] for r in results])
    print('settle.py: %s  %d frames, %d inputs (%s), change threshold %.4f'
          % (os.path.basename(args.video), len(times) + 1, len(marks), args.marks if args.marks in ('audio', 'change') else 'file', threshold))
    print('  %-3s %-8s %-6s %8s %10s %10s  %s' % ('#', 'step', 'sheet', 'at', 'response', 'settle', 'notes'))
    for r in results:
        notes = []
        if not r['settled']:
            notes.append('still changing at next input: lower bound')
        if r['settle'] is None:
            notes.append('no change seen')
        if args.marks == 'change':
            notes.append('marks from first change')
        page = common.page_label(pdf_manifest, targets[r['n']])
        note = '; '.join(notes)
        if r['response'] is not None:
            out.add(r['step'], 'response', r['response'], page=page, rep=args.rep, notes=note)
            out.add(r['step'], 'settle', r['settle'], page=page, rep=args.rep, notes=note)
        if 'fps' in r:
            out.add(r['step'], 'fps', r['fps'], unit='fps', page=page, rep=args.rep, notes='frames that changed while moving')
            out.add(r['step'], 'sharp_after_stop', r['sharp_after_stop'], page=page, rep=args.rep, notes=note)
        extra = ('  %.0f fps moving, sharp %.0f ms after stop' % (r['fps'], r['sharp_after_stop'])) if 'fps' in r else ''
        print('  %-3d %-8s %-6s %7.2fs %10s %10s  %s%s' % (
            r['n'] + 1, r['step'], page, r['mark'],
            '-' if r['response'] is None else '%.0f ms' % r['response'],
            '-' if r['settle'] is None else '%.0f ms' % r['settle'], note, extra))
    out.close()
    print('marks written to %s (edit and rerun with --marks to correct)' % marks_path)
    if args.plot:
        plot_timeline(args.plot, times, fracs, threshold, results, end_of_video)
        print('timeline written to %s' % args.plot)
    if args.frames:
        save_frames(args.video, results, args.frames)
        print('frames written to %s' % args.frames)
    print('rows appended to %s' % args.out)
    return 0


if __name__ == '__main__':
    sys.exit(main())
