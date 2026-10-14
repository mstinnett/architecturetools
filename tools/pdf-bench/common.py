"""
common.py - what every pdf-bench tool shares: the test steps, the view
geometry, device identification and the one results format.

Every timing tool (engines.py, drive.py, settle.py, the Swift PDFKit bench)
writes rows in RESULT_FIELDS order, one measurement per row, so report.py can
pool runs from Windows, macOS and iPadOS into one table.
"""

import csv
import datetime
import json
import os
import platform
import subprocess
import sys
import uuid

# The protocol, in order. GUI runs (drive.py, settle.py) and engine runs
# (engines.py, PDFKitBench.swift) use the same names, so their rows line up.
STEPS = {
    'open':   'open the file until the first sheet is fully drawn',
    'fit':    'fit the test sheet to the window; time to fully sharp',
    'zoom':   'zoom to 400% of fit on the dense area; time to fully sharp',
    'pan':    'drag across the zoomed sheet; frame rate while moving, sharp after release',
    'flip':   'next sheet, one step at a time through the set; time per sheet',
    'jump':   'go to a sheet by number or bookmark; time to fully sharp',
    'thumbs': 'render every sheet as a thumbnail (engines) / scroll the thumbnail panel (apps)',
    'search': 'find the search target across the whole set',
}

RESULT_FIELDS = [
    'run_id', 'date', 'platform', 'os_version', 'device', 'cpu', 'ram_gb',
    'method', 'tool', 'tool_version', 'file', 'fingerprint',
    'step', 'page', 'rep', 'metric', 'value', 'unit', 'notes',
]

ZOOM = 4.0                  # the zoom step goes to 400% of fit
DEFAULT_VIEW = (2560, 1600)  # a 13-16" laptop panel; iPad Pro 13" is 2752 x 2064


def parse_view(text):
    w, h = text.lower().split('x')
    return int(w), int(h)


def fit_scale(page_w, page_h, view):
    """Pixels per point when the whole sheet fits the view."""
    return min(view[0] / float(page_w), view[1] / float(page_h))


def zoom_rect(page_w, page_h, view, focus, zoom=ZOOM):
    """The part of the sheet (PDF points, origin bottom-left) that fills the
    view at `zoom` x fit, centred on `focus` and kept on the sheet."""
    s = fit_scale(page_w, page_h, view) * zoom
    w, h = view[0] / s, view[1] / s
    x0 = min(max(focus[0] - w / 2, 0), page_w - w)
    y0 = min(max(focus[1] - h / 2, 0), page_h - h)
    return s, (x0, y0, x0 + w, y0 + h)


def load_manifest(pdf_path):
    path = pdf_path + '.json'
    if not os.path.exists(path):
        return None
    with open(path) as fh:
        return json.load(fh)


def test_page(manifest, override=None):
    """The sheet the fit/zoom steps use: the heaviest (make_set.py records it)."""
    if override is not None:
        return override
    if not manifest:
        return 0
    if 'test_page' in manifest:
        return manifest['test_page']
    return max(manifest['pages'], key=lambda p: p['segments'] + 20 * p['xobject_draws'])['index']


def _run(cmd):
    try:
        return subprocess.run(cmd, capture_output=True, text=True, timeout=10).stdout.strip()
    except (OSError, subprocess.SubprocessError):
        return ''


def device_info(label=None):
    """Best-effort identification of the machine doing the measuring."""
    system = platform.system()
    cpu, ram = platform.processor() or platform.machine(), ''
    os_version = platform.platform()
    if system == 'Darwin':
        cpu = _run(['sysctl', '-n', 'machdep.cpu.brand_string']) or cpu
        mem = _run(['sysctl', '-n', 'hw.memsize'])
        ram = '%.0f' % (int(mem) / 2 ** 30) if mem.isdigit() else ''
        os_version = 'macOS ' + platform.mac_ver()[0]
        label = label or _run(['sysctl', '-n', 'hw.model'])
    elif system == 'Windows':
        os_version = 'Windows ' + platform.version()
        try:
            import ctypes

            class MEMORYSTATUSEX(ctypes.Structure):
                _fields_ = [('dwLength', ctypes.c_ulong), ('dwMemoryLoad', ctypes.c_ulong),
                            ('ullTotalPhys', ctypes.c_ulonglong), ('ullAvailPhys', ctypes.c_ulonglong),
                            ('ullTotalPageFile', ctypes.c_ulonglong), ('ullAvailPageFile', ctypes.c_ulonglong),
                            ('ullTotalVirtual', ctypes.c_ulonglong), ('ullAvailVirtual', ctypes.c_ulonglong),
                            ('sullAvailExtendedVirtual', ctypes.c_ulonglong)]
            stat = MEMORYSTATUSEX()
            stat.dwLength = ctypes.sizeof(stat)
            ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(stat))
            ram = '%.0f' % (stat.ullTotalPhys / 2 ** 30)
        except Exception:
            pass
        name = _run(['powershell', '-NoProfile', '-Command', '(Get-CimInstance Win32_Processor).Name'])
        cpu = name or cpu
    elif system == 'Linux':
        try:
            with open('/proc/cpuinfo') as fh:
                for line in fh:
                    if line.startswith('model name'):
                        cpu = line.split(':', 1)[1].strip()
                        break
            with open('/proc/meminfo') as fh:
                ram = '%.0f' % (int(fh.readline().split()[1]) / 2 ** 20)
        except OSError:
            pass
    return {
        'platform': {'Darwin': 'macOS'}.get(system, system),
        'os_version': os_version,
        'device': label or platform.node(),
        'cpu': cpu,
        'ram_gb': ram,
    }


def peak_rss_mb(children=False):
    """Peak resident memory of this process (or of its largest finished
    child), or None where unavailable."""
    try:
        import resource
        who = resource.RUSAGE_CHILDREN if children else resource.RUSAGE_SELF
        peak = resource.getrusage(who).ru_maxrss
        return peak / 2 ** 20 if sys.platform == 'darwin' else peak / 2 ** 10
    except ImportError:
        pass
    if children:
        return None
    try:
        import ctypes
        from ctypes import wintypes

        class PMC(ctypes.Structure):
            _fields_ = [('cb', wintypes.DWORD), ('PageFaultCount', wintypes.DWORD),
                        ('PeakWorkingSetSize', ctypes.c_size_t), ('WorkingSetSize', ctypes.c_size_t),
                        ('QuotaPeakPagedPoolUsage', ctypes.c_size_t), ('QuotaPagedPoolUsage', ctypes.c_size_t),
                        ('QuotaPeakNonPagedPoolUsage', ctypes.c_size_t), ('QuotaNonPagedPoolUsage', ctypes.c_size_t),
                        ('PagefileUsage', ctypes.c_size_t), ('PeakPagefileUsage', ctypes.c_size_t)]
        pmc = PMC()
        pmc.cb = ctypes.sizeof(pmc)
        handle = ctypes.windll.kernel32.GetCurrentProcess()
        ctypes.windll.psapi.GetProcessMemoryInfo(handle, ctypes.byref(pmc), pmc.cb)
        return pmc.PeakWorkingSetSize / 2 ** 20
    except Exception:
        return None


class Results(object):
    """Appends rows to a CSV (header written once) and echoes a summary."""

    def __init__(self, path, base):
        self.path = path
        self.base = dict(base)
        self.base.setdefault('run_id', uuid.uuid4().hex[:8])
        self.base.setdefault('date', datetime.datetime.now().strftime('%Y-%m-%d %H:%M'))
        new = not os.path.exists(path) or os.path.getsize(path) == 0
        self.fh = open(path, 'a', newline='')
        self.w = csv.DictWriter(self.fh, fieldnames=RESULT_FIELDS, extrasaction='ignore')
        if new:
            self.w.writeheader()

    def add(self, step, metric, value, unit='ms', page='', rep='', notes='', **over):
        row = dict(self.base)
        row.update(over)
        row.update({'step': step, 'metric': metric, 'value': ('%.1f' % value) if isinstance(value, float) else value,
                    'unit': unit, 'page': page, 'rep': rep, 'notes': notes})
        self.w.writerow(row)
        self.fh.flush()

    def close(self):
        self.fh.close()


def file_identity(pdf_path, manifest):
    """(file name, fingerprint) for result rows."""
    name = os.path.basename(pdf_path)
    if manifest:
        return name, manifest['content_fingerprint'][:16]
    return name, ''
