#!/usr/bin/env python3
"""
runcard.py - the step-by-step card a tester follows, and the command that
times the recording afterwards.

Every app does page navigation its own way, so what is held constant is the
sequence: the same sheets, in the same order, with one deliberate input per
step. Print the card, follow it while the screen records, then run the
settle.py command at the bottom.

Usage:
  python3 runcard.py drawing-set.pdf                    # the page-load run, iPad wording
  python3 runcard.py drawing-set.pdf --desktop          # click/key wording
  python3 runcard.py complex-sheet.pdf                  # single sheet: open, zoom, pan, fit
  python3 runcard.py drawing-set.pdf --steps open,flip*20,jump*5,revisit*5
"""

import argparse
import os
import sys

_HERE = os.path.dirname(os.path.abspath(__file__))
if _HERE not in sys.path:
    sys.path.insert(0, _HERE)
import common
import settle

TOUCH = {
    'open':    'tap {file} in the app\'s file list - lands on {label}',
    'flip':    'next sheet -> {label}   (tap the next-page control, or a keyboard arrow)',
    'jump':    'go to {label} (sheet {number}): find it in thumbnails or bookmarks using the pad\n'
               '              of your finger (quiet), then open it with ONE fingernail tap',
    'revisit': 'go back to {label} (sheet {number}), the same way',
    'fit':     'fit the whole sheet (double-tap or the app\'s fit control)',
    'zoom':    'zoom to about 4x the fit view on the plan (double-tap or the zoom control)',
    'pan':     'tap the bezel with a fingernail, then swipe once across the sheet',
    'search':  'search for "{search}" - type it; the last keystroke is the timed input',
}
# Second and later occurrences of a step get the short form.
AGAIN = {
    'flip':    'next sheet -> {label}',
    'jump':    'go to {label} (sheet {number}), the same way',
}
DESKTOP = {
    'open':    'double-click {file} (app closed) - lands on {label}',
    'flip':    'Page Down -> {label}',
    'jump':    'go to {label} (sheet {number}): type it in the page box, the Enter is timed',
    'revisit': 'go back to {label} (sheet {number}) the same way',
    'fit':     'fit page (the app\'s shortcut)',
    'zoom':    'zoom to 4x the fit percentage (type it in the zoom box; Enter is timed)',
    'pan':     'drag (or scroll) once across the sheet',
    'search':  'search for "{search}"; the last keystroke is timed',
}


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split('\n\n')[0], formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('pdf')
    ap.add_argument('--steps', help='default: %s (a set) or %s (one sheet)' % (common.PAGELOAD, common.SHEET_ONLY))
    ap.add_argument('--desktop', action='store_true', help='clicks and keys instead of taps')
    args = ap.parse_args(argv)
    manifest = common.load_manifest(args.pdf)
    if not manifest:
        print('runcard.py: no %s.json beside the PDF - build the file with make_set.py' % args.pdf)
        return 2
    single = len(manifest['pages']) == 1
    steps_text = args.steps or (common.SHEET_ONLY if single else common.PAGELOAD)
    steps = settle.expand_steps(steps_text)
    targets = common.step_targets(manifest, steps)
    words = DESKTOP if args.desktop else TOUCH
    name = os.path.basename(args.pdf)

    print('pdf-bench run card - %s  (fingerprint %s, %d sheets)'
          % (name, manifest['content_fingerprint'][:16], len(manifest['pages'])))
    print('')
    print('Before each recording')
    if args.desktop:
        print('  - quit the app; maximise its window once open; single-page view; all layers and markups on')
        print('  - record the screen with the microphone on (OBS, QuickTime, Win+Alt+R) - key clicks mark the inputs')
    else:
        print('  - force-quit the app (swipe it away); Do Not Disturb; plugged in; Low Power Mode off')
        print('  - Settings > Sounds > Keyboard Clicks on; landscape; single-page view if the app has one')
        print('  - Control Center > long-press Screen Recording > Microphone On > start')
    print('  - if the app reopens on the last sheet viewed, close the file and reset it to sheet 1 first')
    print('')
    print('Each step: ONE firm input (a fingernail tap on the glass, or a click/key) - anything else')
    print('you touch on the way, do quietly with the pad of a finger. Then wait until')
    print('the sheet is fully sharp, then count three more seconds. No talking.')
    print('')
    seen = set()
    for i, (step, target) in enumerate(zip(steps, targets)):
        template = AGAIN.get(step, words.get(step, step)) if step in seen else words.get(step, step)
        seen.add(step)
        line = template.format(file=name, label=common.page_label(manifest, target),
                                            number=(target + 1) if target is not None else '',
                                            search=manifest['search']['text'])
        print('  %2d  %-8s %s' % (i + 1, step, line))
    print('')
    print('Stop recording. Repeat for 5 recordings per app (recording 1 is the first-ever open).')
    print('Then, on any computer with ffmpeg:')
    print('')
    print('  python3 settle.py <video> --steps %s --rep <1-5> \\' % steps_text)
    print('      --tool "<app>" --tool-version "<version>" --device "<device>" --platform %s \\'
          % ('<Windows|macOS>' if args.desktop else 'iPadOS'))
    print('      --file %s --roi <x,y,w,h of the canvas> --plot <video>.png' % name)
    print('')
    print('Check the plot: one blue line per step above, each followed by a green "sharp" line.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
