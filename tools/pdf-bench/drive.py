#!/usr/bin/env python3
"""
drive.py - drive a desktop PDF app and time it live (Windows and macOS).

Sends each step's input to the app in front (keys, clicks, a drag, a scroll),
then watches the canvas with screen captures until it has been still for
--quiet seconds. Same detector and same metrics as settle.py, so live runs
and recordings line up; this one just does the reps for you.

  pip install mss numpy pyautogui
  macOS: allow your terminal under Privacy & Security > Accessibility and
         > Screen Recording, then restart the terminal.

Usage:
  python3 drive.py --profile acrobat-win --file drawing-set.pdf          # the page-load run, 5 reps
  python3 drive.py --profile preview-mac --file complex-sheet.pdf --steps open,zoom,pan,fit --fit-pct 24
  python3 drive.py --list                          # profiles in apps.json

Before a run: open the file in the app (unless the steps start with `open`,
which launches it), maximise the window, make sure the app's zoom shortcut
lands on ~400% (calibrate the profile once and note it), and set the view to
single page. The countdown gives you time to click into the app window; don't
touch the mouse or keyboard after that.

Capture runs at whatever rate the OS gives (typically 15-40 fps for a full
4K canvas), so `settle` resolves to about one capture interval and `fps`
for pan is capped by it: use a 60 fps recording + settle.py for smoothness.
"""

import argparse
import json
import os
import string
import subprocess
import sys
import threading
import time

import numpy as np

_HERE = os.path.dirname(os.path.abspath(__file__))
if _HERE not in sys.path:
    sys.path.insert(0, _HERE)
import common
import settle

TARGET_WIDTH = settle.ANALYSIS_WIDTH   # same scale the recording analysis uses


# =============================================================================
# SCREEN
# =============================================================================

class Screen(object):
    """Grabs the ROI of the primary monitor as small grey frames."""

    def __init__(self, roi):
        import mss
        self.sct = (getattr(mss, 'MSS', None) or mss.mss)()
        mon = self.sct.monitors[1]
        self.mon = mon
        x, y, w, h = roi
        self.region = {'left': mon['left'] + int(x * mon['width']), 'top': mon['top'] + int(y * mon['height']),
                       'width': max(16, int(w * mon['width'])), 'height': max(16, int(h * mon['height']))}

    def grab(self):
        shot = self.sct.grab(self.region)
        a = np.frombuffer(shot.bgra, dtype=np.uint8).reshape(shot.height, shot.width, 4)[:, :, 1]
        k = max(1, shot.width // TARGET_WIDTH)
        h, w = a.shape[0] // k * k, a.shape[1] // k * k
        return a[:h, :w].reshape(h // k, k, w // k, k).mean(axis=(1, 3)).astype(np.uint8)

    def point(self, fx, fy):
        """Fractions of the ROI -> screen coordinates for the mouse."""
        r = self.region
        return int(r['left'] + fx * r['width']), int(r['top'] + fy * r['height'])

    def save(self, path):
        import mss.tools
        shot = self.sct.grab(self.region)
        mss.tools.to_png(shot.rgb, shot.size, output=path)

    def screen_point(self, fx, fy):
        """Fractions of the whole monitor (for toolbars outside the ROI)."""
        m = self.mon
        return int(m['left'] + fx * m['width']), int(m['top'] + fy * m['height'])


# =============================================================================
# ACTIONS - the little language in apps.json
# =============================================================================
#   key:ctrl+0            a hotkey (pyautogui key names, '+' between keys)
#   type:400              type text
#   click:0.5,0.5         click at fractions of the ROI
#   sclick:0.4,0.1        click at fractions of the screen (toolbars)
#   dclick:0.5,0.5        double-click
#   drag:0.7,0.5>0.3,0.5@1.5[,button=middle][,hold=space]
#   scroll:+5@0.5,0.5[,hold=ctrl]      wheel notches at a point
#   sleep:0.3             wait (not timed)
#   run:open -a Preview {file}         a shell command
#   focus                 put the mouse on the canvas centre (no click)
# In type: and run:, {file} is the PDF, {jump_number}/{jump_label} the sheet
# the jump step goes to, {search} the search text (all from the manifest),
# {fit_pct}/{zoom_pct} the app's zoom-box values for fit and 4 x fit.
# The step's clock starts at its last action (at the start of a drag).

def parse_opts(text):
    main, opts = text, {}
    if ',' in text and '=' in text:
        bits = text.split(',')
        main = ','.join(b for b in bits if '=' not in b)
        opts = dict(b.split('=', 1) for b in bits if '=' in b)
    return main, opts


def perform(action, screen, fields, gui, background=None):
    kind, _, arg = action.partition(':')
    if kind == 'key':
        gui.hotkey(*arg.split('+'))
    elif kind == 'type':
        gui.write(arg.format(**fields), interval=0.02)
    elif kind in ('click', 'dclick', 'sclick'):
        where = screen.screen_point if kind == 'sclick' else screen.point
        x, y = where(*[float(v) for v in arg.split(',')])
        (gui.doubleClick if kind == 'dclick' else gui.click)(x, y)
    elif kind == 'focus':
        gui.moveTo(*screen.point(0.5, 0.5))
    elif kind == 'sleep':
        time.sleep(float(arg))
    elif kind == 'run':
        quoted = dict(fields, file='"%s"' % fields['file'])
        # Detached: the app must not hold this terminal's output or die with it.
        subprocess.Popen(arg.format(**quoted), shell=True, stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL,
                         stderr=subprocess.DEVNULL, start_new_session=True)
    elif kind == 'scroll':
        main, opts = parse_opts(arg)
        clicks, _, at = main.partition('@')
        x, y = screen.point(*[float(v) for v in at.split(',')]) if at else screen.point(0.5, 0.5)
        hold = opts.get('hold')

        def do_scroll():
            gui.moveTo(x, y)
            if hold:
                gui.keyDown(hold)
            for _ in range(abs(int(clicks))):
                gui.scroll(1 if int(clicks) > 0 else -1, x=x, y=y)
                time.sleep(0.05)
            if hold:
                gui.keyUp(hold)
        run_maybe_in_background(do_scroll, background)
    elif kind == 'drag':
        main, opts = parse_opts(arg)
        path, _, dur = main.partition('@')
        a, b = path.split('>')
        x0, y0 = screen.point(*[float(v) for v in a.split(',')])
        x1, y1 = screen.point(*[float(v) for v in b.split(',')])
        button, hold, duration = opts.get('button', 'left'), opts.get('hold'), float(dur or 1.5)

        def do_drag():
            gui.moveTo(x0, y0)
            if hold:
                gui.keyDown(hold)
            gui.mouseDown(button=button)
            gui.moveTo(x1, y1, duration=duration)
            gui.mouseUp(button=button)
            if hold:
                gui.keyUp(hold)
        run_maybe_in_background(do_drag, background)
    else:
        raise ValueError('unknown action %r' % action)


def run_maybe_in_background(fn, background):
    """Moving input (a drag, a scroll) runs beside the capture loop when it
    is the timed action, so frames are captured while the view moves."""
    if background is None:
        fn()
        return
    th = threading.Thread(target=fn, daemon=True)
    th.start()
    background.append(th)


# =============================================================================
# ONE TIMED STEP
# =============================================================================

def timed_step(actions, screen, fields, gui, quiet, threshold, timeout, first_wait):
    """Run the actions; watch until still. A frozen app shows nothing for a
    while, so stillness only ends the step once something has changed (or
    after `first_wait` seconds of nothing). Returns settle.measure()'s dict
    plus the capture rate."""
    if isinstance(actions, str):
        actions = [actions]
    *setup, last = actions
    for a in setup:
        perform(a, screen, fields, gui)
    prev = screen.grab()
    background = []
    t0 = time.perf_counter()
    perform(last, screen, fields, gui, background)
    times, fracs, frames = [], [], []
    last_change = None
    while True:
        frame = screen.grab()
        t = time.perf_counter()
        f = settle.change_fraction(prev, frame)
        frames.append((prev, frame) if f > threshold else None)
        prev = frame
        times.append(t)
        fracs.append(f)
        if f > threshold:
            last_change = t
        moving = any(th.is_alive() for th in background)
        if not moving and last_change is not None and t - last_change >= quiet:
            break
        if last_change is None and t - t0 > first_wait:
            break
        if t - t0 > timeout:
            break
    for th in background:
        th.join()
    # Motion is worked out afterwards so it doesn't slow the capture loop.
    shifts = [settle.global_shift(*pair) if pair else None for pair in frames]
    r = settle.measure(times, fracs, shifts, t0, times[-1] + 1e-6, quiet, threshold)
    r['capture_fps'] = len(times) / max(times[-1] - t0, 1e-6)
    r['timed_out'] = times[-1] - t0 > timeout
    return r


MAX_FLICKER = 0.02         # a "still" screen may flicker this share of blocks, no more


def baseline_threshold(screen, seconds=1.0, tries=5):
    """Watch the still screen first: small things that flicker on their own
    (a caret, an animated cursor) raise the bar for 'changed'. A screen that
    is still busy (an app launching or closing) is waited out, never taken
    as the noise floor. Returns (threshold, capture fps), or None."""
    for _ in range(tries):
        fracs, prev, end = [], screen.grab(), time.perf_counter() + seconds
        while time.perf_counter() < end:
            cur = screen.grab()
            fracs.append(settle.change_fraction(prev, cur))
            prev = cur
        flicker = max(fracs) if fracs else 0.0
        if flicker <= MAX_FLICKER:
            return max(settle.MIN_CHANGE, flicker * 1.5), len(fracs) / seconds
        time.sleep(1.0)
    return None


# =============================================================================
# MAIN
# =============================================================================

def import_pyautogui():
    try:
        import tkinter  # noqa: F401
    except ImportError:
        # pyautogui imports mouseinfo, which exits the process when tkinter is
        # missing (common on Linux). drive.py never uses it, so stand it in.
        import types
        sys.modules.setdefault('mouseinfo', types.ModuleType('mouseinfo'))
    import pyautogui
    return pyautogui


def load_profiles(path):
    with open(path) as fh:
        data = json.load(fh)
    return {k: v for k, v in data.items() if not k.startswith('_')}


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split('\n\n')[0], formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--profile', help='an entry in apps.json')
    ap.add_argument('--apps', default=os.path.join(_HERE, 'apps.json'))
    ap.add_argument('--list', action='store_true')
    ap.add_argument('--file', help='the PDF under test (its manifest adds the fingerprint)')
    ap.add_argument('--steps', default=common.PAGELOAD, help='default: the page-load run, %s' % common.PAGELOAD)
    ap.add_argument('--reps', type=int, default=5)
    ap.add_argument('--roi', help='canvas as fractions x,y,w,h of the screen (default: the profile\'s)')
    ap.add_argument('--quiet', type=float, default=1.5)
    ap.add_argument('--timeout', type=float, default=90.0, help='longest a step may keep changing')
    ap.add_argument('--first-wait', type=float, default=15.0,
                    help='how long to wait for any response before calling a step a no-op')
    ap.add_argument('--countdown', type=int, default=5)
    ap.add_argument('--fit-pct', type=float, help="the app's zoom %% when the sheet fits (read it off the app)")
    ap.add_argument('--zoom-pct', type=float, help='zoom %% for the zoom step (default 4 x --fit-pct)')
    ap.add_argument('--shots', metavar='DIR', help='save the canvas as each step settles, to check the steps did the right thing')
    ap.add_argument('--tool-version', default='')
    ap.add_argument('--device')
    ap.add_argument('--out', default='results.csv')
    args = ap.parse_args(argv)

    profiles = load_profiles(args.apps)
    if args.list or not args.profile:
        for name, p in sorted(profiles.items()):
            print('%-18s %-28s %-8s %s' % (name, p.get('app', ''), p.get('platform', ''),
                                           'verified' if p.get('verified') else 'UNVERIFIED - check keys first'))
        return 0
    profile = profiles[args.profile]
    if not profile.get('verified'):
        print('note: profile %r is unverified - watch the first rep and fix apps.json if a step misfires' % args.profile)
    steps = settle.expand_steps(args.steps)

    def actions_for(step):
        """A revisit is a jump to a sheet already seen: same recipe."""
        recipes = profile.get('steps', {})
        return recipes.get(step) or (recipes.get('jump') if step == 'revisit' else None)
    missing = [s for s in set(steps) if not actions_for(s)]
    if missing:
        print('drive.py: profile %r has no actions for: %s' % (args.profile, ', '.join(sorted(missing))))
        return 2

    pyautogui = import_pyautogui()
    pyautogui.PAUSE = 0.02
    pyautogui.FAILSAFE = True                   # slam the mouse into a corner to abort
    roi = tuple(float(v) for v in (args.roi or profile.get('roi', '0,0.08,1,0.9')).split(','))
    screen = Screen(roi)

    manifest = common.load_manifest(args.file) if args.file else None
    name, fingerprint = common.file_identity(args.file, manifest) if args.file else ('', '')
    targets = common.step_targets(manifest, steps)
    fields = {'file': os.path.abspath(args.file) if args.file else '',
              'jump_number': '1', 'jump_label': '1',          # set per step below
              'search': manifest['search']['text'] if manifest else ''}
    fit_pct = args.fit_pct or profile.get('fit_pct')
    zoom_pct = args.zoom_pct or profile.get('zoom_pct') or (fit_pct and fit_pct * common.ZOOM)
    if fit_pct:
        fields['fit_pct'] = '%g' % round(fit_pct)
    if zoom_pct:
        fields['zoom_pct'] = '%g' % round(zoom_pct)
    needed = set()
    for step in set(steps):
        acts = actions_for(step)
        for a in ([acts] if isinstance(acts, str) else acts):
            needed.update(f for _, f, _, _ in string.Formatter().parse(a.partition(':')[2]) if f)
    unknown = sorted(needed - set(fields))
    if unknown:
        print('drive.py: this profile needs %s - fit the sheet in the app, read its zoom %%, '
              'and pass --fit-pct (zoom defaults to 4x that)' % ', '.join('{%s}' % f for f in unknown))
        return 2
    if args.shots:
        os.makedirs(args.shots, exist_ok=True)
    info = common.device_info(args.device)
    out = common.Results(args.out, dict(info, method='live', tool=profile.get('app', args.profile),
                                        tool_version=args.tool_version, file=name, fingerprint=fingerprint))
    print('drive.py: %s on %s - %d step(s) x %d rep(s)' % (profile.get('app'), info['device'], len(steps), args.reps))
    for n in range(args.countdown, 0, -1):
        print('  starting in %d - click into the app window, then hands off' % n)
        time.sleep(1)
    baseline = baseline_threshold(screen)
    if baseline is None:
        print('drive.py: the canvas never sat still for a second - close whatever is animating, '
              'or narrow --roi to the drawing area')
        return 2
    threshold, cap = baseline
    print('  capture %.0f fps, change threshold %.4f' % (cap, threshold))

    for rep in range(args.reps):
        steps_done = 1
        for step, target in zip(steps, targets):
            if step == 'open' and profile.get('quit'):
                subprocess.run(profile['quit'], shell=True)
                time.sleep(2.0)
            page = common.page_label(manifest, target)
            if target is not None:
                fields['jump_number'], fields['jump_label'] = str(target + 1), page
            r = timed_step(actions_for(step), screen, fields, pyautogui, args.quiet, threshold, args.timeout,
                           args.first_wait)
            if args.shots:
                screen.save(os.path.join(args.shots, 'rep%d-%02d-%s.png' % (rep + 1, steps_done, step)))
            steps_done += 1
            notes = ['capture %.0f fps' % r['capture_fps']]
            if r['timed_out']:
                notes.append('timed out: still changing after %.0fs' % args.timeout)
            note = '; '.join(notes)
            if r['settle'] is None:
                print('  rep %d %-7s no change within %.0fs - a no-op, or a misfired key (see --shots)'
                      % (rep + 1, step, args.first_wait))
                out.add(step, 'settle', '', page=page, rep=rep + 1, notes='no change seen; ' + note)
                continue
            out.add(step, 'response', r['response'], page=page, rep=rep + 1, notes=note)
            out.add(step, 'settle', r['settle'], page=page, rep=rep + 1, notes=note)
            extra = ''
            if 'sharp_after_stop' in r:
                out.add(step, 'sharp_after_stop', r['sharp_after_stop'], page=page, rep=rep + 1, notes=note)
                extra = '  sharp %.0f ms after the drag' % r['sharp_after_stop']
            print('  rep %d %-7s %-6s response %6.0f ms  settle %7.0f ms%s'
                  % (rep + 1, step, page, r['response'], r['settle'], extra))
            time.sleep(0.5)
    out.close()
    print('rows appended to %s' % args.out)
    return 0


if __name__ == '__main__':
    sys.exit(main())
