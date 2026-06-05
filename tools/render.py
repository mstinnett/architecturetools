#!/usr/bin/env python3
"""
render.py - the Rhino-free half of the Make2D batch.

Plain CPython + PIL. Reads the cache solve.py wrote and does everything
downstream: the placement predicate pass, uniform PNG output (one global
scale, one datum, a union-sized canvas so nothing is cropped), and a labeled
montage. It never imports Rhino, so it runs standalone (e.g. on the NUC).

Usage:
  python3 render.py --predicates              # placement checks only, no PNGs
  python3 render.py                            # predicates + uniform PNGs + montage
  python3 render.py --projection iso --no-montage
  python3 render.py --cache DIR --out DIR

Two "fits" used to fight each other (per-config ZoomBoundingBox + per-config
PNG scale + per-config bbox.Min origin). They are all gone. Instead:
  - solve.py projects through a fixed datum frustum and records the four desk
    corners as fiducials.
  - render.py fits a per-config affine from those fiducials to ONE canonical
    page frame (identity when the frame is already consistent; a correction
    when it is not), then applies a single global mm->px scale and a fixed
    datum. The canvas is the union of every config's content + margin.
That shared datum is what makes a misplaced machine read as out of place AND
gives uniform output -- the same fix serves both goals.
"""

import argparse
import json
import os
import sys

_HERE = os.path.dirname(os.path.abspath(__file__))
if _HERE not in sys.path:
    sys.path.insert(0, _HERE)
import make2d_layout as layout


# =============================================================================
# OUTPUT SETTINGS
# =============================================================================

DEFAULT_CACHE_DIR = os.path.expanduser("~/Dropbox/Architecture Tools/make2d/cache/")
DEFAULT_OUT_DIR = os.path.expanduser("~/Dropbox/Architecture Tools/make2d/render/")

# One global scale for every image. Desk is 1500 mm wide; 1.2 px/mm -> ~1800 px
# of desk across, before margin.
PX_PER_MM = 1.2
MARGIN_MM = 40.0

BACKGROUND_RGB = (255, 255, 255)
VISIBLE_RGB = (0, 0, 0)
HIDDEN_RGB = (140, 140, 140)
VISIBLE_WIDTH_PX = 2
HIDDEN_WIDTH_PX = 1
# Anti-aliasing: draw each PNG at SUPERSAMPLE x resolution, then downsample.
# 3 is a good quality/speed balance; drop to 2 if rendering feels slow.
SUPERSAMPLE = 3

# Predicate tolerances (mm).
DESK_EDGE_TOLERANCE_MM = 5.0
OVERLAP_TOLERANCE_MM = 5.0

# Montage. Tiles are downscaled to a thumbnail before tiling -- the montage is
# for eyeballing the set against a shared datum, not a full-res deliverable.
MONTAGE_TILE_MAX_PX = 520
MONTAGE_CELL_PAD_PX = 12
MONTAGE_LABEL_H_PX = 22
MONTAGE_BG_RGB = (245, 245, 245)
MONTAGE_FLAG_RGB = (200, 40, 40)


# =============================================================================
# SMALL LINEAR ALGEBRA (no numpy)
# =============================================================================

def _solve3(a, b):
    """Solve 3x3 system a x = b via Gaussian elimination. Returns x or None."""
    m = [list(row) + [b[i]] for i, row in enumerate(a)]
    n = 3
    for col in range(n):
        pivot = max(range(col, n), key=lambda r: abs(m[r][col]))
        if abs(m[pivot][col]) < 1e-12:
            return None
        m[col], m[pivot] = m[pivot], m[col]
        pv = m[col][col]
        for r in range(n):
            if r == col:
                continue
            factor = m[r][col] / pv
            for c in range(col, n + 1):
                m[r][c] -= factor * m[col][c]
    return [m[i][n] / m[i][i] for i in range(n)]


def fit_affine(src_points, dst_points):
    """Least-squares 2x3 affine mapping src -> dst.
    Returns (a, b, c, d, e, f) so that
        x' = a*x + b*y + c
        y' = d*x + e*y + f
    src/dst are lists of (x, y), same length (>= 3). Returns None if singular."""
    pairs = [(s, d) for s, d in zip(src_points, dst_points)
             if s is not None and d is not None]
    if len(pairs) < 3:
        return None
    # Normal equations for design rows [x, y, 1], shared between x' and y'.
    ata = [[0.0, 0.0, 0.0], [0.0, 0.0, 0.0], [0.0, 0.0, 0.0]]
    atx = [0.0, 0.0, 0.0]
    aty = [0.0, 0.0, 0.0]
    for (sx, sy), (dx, dy) in pairs:
        row = [sx, sy, 1.0]
        for i in range(3):
            for j in range(3):
                ata[i][j] += row[i] * row[j]
            atx[i] += row[i] * dx
            aty[i] += row[i] * dy
    cx = _solve3(ata, atx)
    cy = _solve3(ata, aty)
    if cx is None or cy is None:
        return None
    return (cx[0], cx[1], cx[2], cy[0], cy[1], cy[2])


def apply_affine(affine, x, y):
    a, b, c, d, e, f = affine
    return (a * x + b * y + c, d * x + e * y + f)


# =============================================================================
# CACHE LOADING
# =============================================================================

class Cache(object):
    def __init__(self, index, projections, footprints, cache_dir):
        self.index = index
        self.projections = projections  # name -> {config -> payload}
        self.footprints = footprints
        self.cache_dir = cache_dir

    @property
    def config_names(self):
        return [c["name"] for c in self.index.get("configs", [])]


def load_json(path):
    with open(path, "r") as handle:
        return json.load(handle)


def load_cache(cache_dir):
    index_path = os.path.join(cache_dir, "index.json")
    if not os.path.isfile(index_path):
        raise SystemExit("No index.json in cache dir: {0}\n"
                         "Run solve.py in Rhino first.".format(cache_dir))
    index = load_json(index_path)

    footprints_path = os.path.join(cache_dir, "footprints.json")
    footprints = load_json(footprints_path) if os.path.isfile(footprints_path) else {}

    projections = {}
    for proj in index.get("projections", ["iso"]):
        projections[proj] = {}
        for entry in index.get("configs", []):
            name = entry["name"]
            payload_path = os.path.join(cache_dir, "{0}__{1}.json".format(name, proj))
            if os.path.isfile(payload_path):
                projections[proj][name] = load_json(payload_path)
    return Cache(index, projections, footprints, cache_dir)


# =============================================================================
# STALE-CACHE CHECK
# =============================================================================

def stale_configs(cache):
    """Configs whose cached solve used a DIFFERENT layout than the current
    make2d_layout.py (signature mismatch). These need a re-solve in Rhino --
    render.py only re-reads the cache, it cannot re-place geometry."""
    by_name = {c["name"]: c for c in layout.CONFIGURATIONS}
    stale = set()
    for _proj, payload_map in cache.projections.items():
        for name, payload in payload_map.items():
            config = by_name.get(name)
            if config is None:
                continue
            if payload.get("signature") != layout.config_signature(config):
                stale.add(name)
    return sorted(stale)


def warn_if_stale(cache):
    stale = stale_configs(cache)
    if not stale:
        return
    print("!" * 64)
    print("STALE CACHE: {0} config(s) were solved with an OLDER layout than".format(
        len(stale)))
    print("make2d_layout.py. Re-run solve.py in Rhino to update them, or the")
    print("PNGs/montage will show the old placements. Stale:")
    print("  " + ", ".join(stale[:12]) + (" ..." if len(stale) > 12 else ""))
    print("!" * 64)


# =============================================================================
# PREDICATE PASS (no rendering; pure arithmetic over footprints + layout)
# =============================================================================

def _aabb_overlap(box_a, box_b, tol):
    """Overlap of two AABBs (minx,miny,maxx,maxy), shrunk by tol on each so a
    bare touch is not a hit. Returns (ox, oy) overlap extents or None."""
    ox = min(box_a[2], box_b[2]) - max(box_a[0], box_b[0])
    oy = min(box_a[3], box_b[3]) - max(box_a[1], box_b[1])
    if ox > tol and oy > tol:
        return (ox, oy)
    return None


def footprints_for_config(config, footprint_table):
    """List of (placement, footprint_aabb) for a config, footprint in desk mm."""
    out = []
    for placement in layout.resolve_placements(config):
        local = footprint_table.get(placement["file"])
        fp = layout.placed_footprint(placement, local)
        out.append((placement, fp))
    return out


def predicate_flags(footprint_table):
    """Run the placement predicates over the full real config set. Returns a
    list of flag dicts: {config, component, role, rule, detail}."""
    flags = []
    missing_footprints = set()

    for config in layout.CONFIGURATIONS:
        placed = footprints_for_config(config, footprint_table)

        for placement, fp in placed:
            if fp is None:
                missing_footprints.add(placement["file"])

        # R1 - inside the desk rectangle
        for placement, fp in placed:
            if fp is None:
                continue
            overhang = _desk_overhang(fp)
            if overhang:
                flags.append({
                    "config": config["name"],
                    "component": placement["file"],
                    "role": placement["role"],
                    "rule": "off_desk",
                    "detail": overhang,
                })

        # R2/R3 - the machine (and any extra) colliding with monitors or the
        # keyboard/mouse zone. Footprint/XY based, not page based: items at
        # different depths can overlap in the iso projection without being
        # misplaced, so we test the top-down footprint only.
        machines = [(p, fp) for p, fp in placed
                    if p["role"] in ("machine", "extra") and fp is not None]
        monitors = [(p, fp) for p, fp in placed
                    if p["role"] == "monitor" and fp is not None]
        inputs = [(p, fp) for p, fp in placed
                  if p["role"] == "input" and fp is not None]

        for mp, mfp in machines:
            for op, ofp in monitors:
                ov = _aabb_overlap(mfp, ofp, OVERLAP_TOLERANCE_MM)
                if ov:
                    flags.append({
                        "config": config["name"],
                        "component": mp["file"],
                        "role": mp["role"],
                        "rule": "hits_monitor",
                        "detail": "overlaps {0} by {1:.0f}x{2:.0f} mm".format(
                            op["file"], ov[0], ov[1]),
                    })
            for ip, ifp in inputs:
                ov = _aabb_overlap(mfp, ifp, OVERLAP_TOLERANCE_MM)
                if ov:
                    flags.append({
                        "config": config["name"],
                        "component": mp["file"],
                        "role": mp["role"],
                        "rule": "hits_input_zone",
                        "detail": "overlaps {0} by {1:.0f}x{2:.0f} mm".format(
                            ip["file"], ov[0], ov[1]),
                    })

    return flags, sorted(missing_footprints)


def _desk_overhang(fp):
    parts = []
    tol = DESK_EDGE_TOLERANCE_MM
    if fp[0] < layout.DESK_X_MIN - tol:
        parts.append("left {0:.0f}mm".format(layout.DESK_X_MIN - fp[0]))
    if fp[2] > layout.DESK_X_MAX + tol:
        parts.append("right {0:.0f}mm".format(fp[2] - layout.DESK_X_MAX))
    if fp[1] < layout.DESK_Y_MIN - tol:
        parts.append("back {0:.0f}mm".format(layout.DESK_Y_MIN - fp[1]))
    if fp[3] > layout.DESK_Y_MAX + tol:
        parts.append("front {0:.0f}mm".format(fp[3] - layout.DESK_Y_MAX))
    return ", ".join(parts) if parts else None


def split_flags(flags):
    """Split flags into baseline vs per-config. A (component, rule) that fires
    in EVERY config is a global calibration offset (baseline), not a misplaced
    machine; everything else is the per-config triage signal. Returns
    (baseline_keys, baseline_flags, per_config_flags)."""
    total_configs = len(layout.CONFIGURATIONS)
    configs_with = {}
    for f in flags:
        configs_with.setdefault((f["component"], f["rule"]), set()).add(f["config"])
    baseline_keys = set(k for k, cfgs in configs_with.items()
                        if len(cfgs) >= total_configs)
    baseline = [f for f in flags if (f["component"], f["rule"]) in baseline_keys]
    per_config = [f for f in flags if (f["component"], f["rule"]) not in baseline_keys]
    return baseline_keys, baseline, per_config


def per_config_flagged(flags):
    """Set of config names with at least one non-baseline flag."""
    _keys, _baseline, per_config = split_flags(flags)
    return set(f["config"] for f in per_config)


def print_predicates(flags, missing):
    total_configs = len(layout.CONFIGURATIONS)
    print("=" * 64)
    print("PLACEMENT PREDICATES  ({0} configs, 0 solves)".format(total_configs))
    print("=" * 64)
    if missing:
        print("NOTE: no footprint for: {0}".format(", ".join(missing)))
        print("      (run solve.py to refresh footprints.json)")
        print("-" * 64)
    if not flags:
        print("No placement problems found.")
        return

    baseline_keys, baseline, per_config = split_flags(flags)

    if baseline:
        print("BASELINE  (every config -- a global offset, fix once):")
        seen = set()
        for f in baseline:
            key = (f["component"], f["rule"])
            if key in seen:
                continue
            seen.add(key)
            print("  [{0:14}] {1:22} {2}".format(
                f["rule"], f["component"], f["detail"]))
        print("-" * 64)

    print("PER-CONFIG  (the triage list -- misplaced machines):")
    by_config = {}
    for f in per_config:
        by_config.setdefault(f["config"], []).append(f)
    if not by_config:
        print("  (none -- all remaining flags are baseline)")
    for name in [c["name"] for c in layout.CONFIGURATIONS]:
        items = by_config.get(name)
        if not items:
            continue
        print("  " + name)
        for f in items:
            print("    [{0:14}] {1:22} {2}".format(
                f["rule"], f["component"], f["detail"]))
    print("-" * 64)
    print("{0} per-config flag(s) across {1} config(s); {2} baseline rule(s).".format(
        len(per_config), len(by_config), len(baseline_keys)))


# =============================================================================
# DATUM NORMALIZATION + RENDER
# =============================================================================

def _camera_basis(camera):
    """Right / up vectors of the parallel iso projection, from index camera
    params. Pure math (no Rhino), mirrors solve.py's camera."""
    import math
    az = math.radians(camera["rotation_deg"])
    el = math.radians(camera["elevation_deg"])
    dist = camera.get("distance", 2000)
    tx, ty, tz = camera["target"]
    pos = (tx + dist * math.cos(el) * math.cos(az),
           ty + dist * math.cos(el) * math.sin(az),
           tz + dist * math.sin(el))

    def sub(a, b):
        return (a[0] - b[0], a[1] - b[1], a[2] - b[2])

    def cross(a, b):
        return (a[1] * b[2] - a[2] * b[1],
                a[2] * b[0] - a[0] * b[2],
                a[0] * b[1] - a[1] * b[0])

    def vnorm(a):
        m = (a[0] ** 2 + a[1] ** 2 + a[2] ** 2) ** 0.5 or 1.0
        return (a[0] / m, a[1] / m, a[2] / m)

    target = (tx, ty, tz)
    d = vnorm(sub(target, pos))
    right = vnorm(cross(d, (0.0, 0.0, 1.0)))
    trueup = cross(right, d)
    return target, right, trueup


def analytic_canonical_corners(index):
    """Project the four desk corners (world, z=0) through the camera math
    analytically. This is config-INDEPENDENT, so a single drifted config can
    never contaminate the shared frame (averaging fiducials would let it)."""
    camera = index.get("camera")
    corners_world = index.get("desk_corners_world")
    if not camera or not corners_world:
        return None
    target, right, trueup = _camera_basis(camera)
    out = []
    for cx, cy in [(c[0], c[1]) for c in corners_world]:
        v = (cx - target[0], cy - target[1], 0.0 - target[2])
        out.append([v[0] * right[0] + v[1] * right[1] + v[2] * right[2],
                    v[0] * trueup[0] + v[1] * trueup[1] + v[2] * trueup[2]])
    return out


def canonical_corners(payloads, index=None):
    """The canonical page frame. Prefer the analytic projection from index
    camera params (outlier-proof); fall back to averaging fiducials only when
    no camera is available."""
    if index is not None:
        analytic = analytic_canonical_corners(index)
        if analytic is not None:
            return analytic
    n_corners = len(layout.desk_corners())
    sums = [[0.0, 0.0, 0] for _ in range(n_corners)]
    for payload in payloads:
        corners = (payload.get("fiducials") or {}).get("desk_corners") or []
        for i in range(min(n_corners, len(corners))):
            c = corners[i]
            if c is not None:
                sums[i][0] += c[0]
                sums[i][1] += c[1]
                sums[i][2] += 1
    out = []
    for sx, sy, count in sums:
        out.append([sx / count, sy / count] if count else None)
    return out


def config_to_canonical(payload, canon):
    """Affine mapping this config's page coords -> canonical page coords,
    fitted from the desk-corner fiducials. Identity-ish when frames already
    agree; a correction otherwise. Falls back to identity if unfittable."""
    corners = (payload.get("fiducials") or {}).get("desk_corners") or []
    src = [corners[i] if i < len(corners) else None for i in range(len(canon))]
    affine = fit_affine(src, canon)
    if affine is None:
        return (1.0, 0.0, 0.0, 0.0, 1.0, 0.0)
    return affine


def canonical_units_per_mm(canon):
    """Page units per mm in canonical space, from the known desk-corner world
    distances. Averaged over the four rectangle edges for robustness."""
    world = layout.desk_corners()
    ratios = []
    for i in range(len(canon)):
        j = (i + 1) % len(canon)
        if canon[i] is None or canon[j] is None:
            continue
        page_d = _dist(canon[i], canon[j])
        world_d = _dist(world[i], world[j])
        if world_d > 1e-9:
            ratios.append(page_d / world_d)
    if not ratios:
        return 1.0
    return sum(ratios) / len(ratios)


def _dist(a, b):
    return ((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2) ** 0.5


def build_frame(payloads, index=None):
    """Compute the shared rendering frame from all payloads in one projection.
    Returns a dict with the canonical affine per config, the mm conversion,
    the datum (canonical origin), the union content bbox (mm), and canvas px."""
    canon = canonical_corners(payloads, index)
    units_per_mm = canonical_units_per_mm(canon)

    # Datum = desk center = world origin -> centroid of canonical corners.
    present = [c for c in canon if c is not None]
    datum_canon = [
        sum(c[0] for c in present) / len(present),
        sum(c[1] for c in present) / len(present),
    ]

    affines = {}
    union = [None, None, None, None]  # min_x, min_y, max_x, max_y in mm

    def to_mm(cx, cy):
        # canonical units -> mm, relative to datum
        return ((cx - datum_canon[0]) / units_per_mm,
                (cy - datum_canon[1]) / units_per_mm)

    for payload in payloads:
        name = payload["config"]
        affine = config_to_canonical(payload, canon)
        affines[name] = affine
        bbox = payload.get("content_bbox")
        if not bbox:
            continue
        corners = [(bbox[0], bbox[1]), (bbox[2], bbox[1]),
                   (bbox[2], bbox[3]), (bbox[0], bbox[3])]
        for px, py in corners:
            ccx, ccy = apply_affine(affine, px, py)
            mx, my = to_mm(ccx, ccy)
            union = _grow(union, mx, my)

    if union[0] is None:
        union = [0.0, 0.0, 1.0, 1.0]

    # Canvas: union + margin, at the global scale.
    min_x = union[0] - MARGIN_MM
    min_y = union[1] - MARGIN_MM
    max_x = union[2] + MARGIN_MM
    max_y = union[3] + MARGIN_MM
    width_px = max(1, int(round((max_x - min_x) * PX_PER_MM)))
    height_px = max(1, int(round((max_y - min_y) * PX_PER_MM)))

    return {
        "canon": canon,
        "units_per_mm": units_per_mm,
        "datum_canon": datum_canon,
        "affines": affines,
        "union_mm": [min_x, min_y, max_x, max_y],
        "canvas_px": (width_px, height_px),
    }


def _grow(box, x, y):
    if box[0] is None:
        return [x, y, x, y]
    return [min(box[0], x), min(box[1], y), max(box[2], x), max(box[3], y)]


def page_to_canvas(frame, affine, px, py):
    """One config's page point -> shared canvas pixel (y down)."""
    ccx, ccy = apply_affine(affine, px, py)
    mx = (ccx - frame["datum_canon"][0]) / frame["units_per_mm"]
    my = (ccy - frame["datum_canon"][1]) / frame["units_per_mm"]
    min_x, min_y, _max_x, max_y = frame["union_mm"]
    canvas_x = (mx - min_x) * PX_PER_MM
    canvas_y = (max_y - my) * PX_PER_MM  # flip so +y world is up
    return (canvas_x, canvas_y)


def render_png(payload, frame, out_path):
    from PIL import Image, ImageDraw
    base_w, base_h = frame["canvas_px"]
    ss = max(1, int(SUPERSAMPLE))
    # PIL's ImageDraw does not anti-alias lines, so we draw at ss x resolution
    # and downsample with LANCZOS -- standard supersampled AA.
    width_px, height_px = base_w * ss, base_h * ss
    image = Image.new("RGB", (width_px, height_px), BACKGROUND_RGB)
    draw = ImageDraw.Draw(image)
    affine = frame["affines"].get(payload["config"],
                                  (1.0, 0.0, 0.0, 0.0, 1.0, 0.0))

    # Draw hidden first, then visible on top.
    for want in ("hidden", "visible"):
        rgb = HIDDEN_RGB if want == "hidden" else VISIBLE_RGB
        width = (HIDDEN_WIDTH_PX if want == "hidden" else VISIBLE_WIDTH_PX) * ss
        width = max(1, int(round(width)))
        for seg in payload.get("segments", []):
            if seg.get("style") != want:
                continue
            pts = [page_to_canvas(frame, affine, x, y) for x, y in seg["points"]]
            if len(pts) >= 2:
                pts = [(px * ss, py * ss) for px, py in pts]
                draw.line(pts, fill=rgb, width=width, joint="curve")

    if ss != 1:
        resample = getattr(getattr(Image, "Resampling", Image), "LANCZOS")
        image = image.resize((base_w, base_h), resample)
    image.save(out_path, "PNG")
    return out_path


# =============================================================================
# PLACEMENT PREVIEW (schematic; no Rhino solve, no cache -- just footprints)
# =============================================================================
#
# Projects each component's real (rotated) footprint as a box through the same
# iso camera, straight from footprints.json + make2d_layout. It is schematic
# (bounding boxes, not real linework) but EXACT for position, so a layout edit
# can be checked in the terminal in milliseconds before paying for a Rhino
# re-solve. This is the fast inner loop for dialing in placement.

PREVIEW_HEIGHTS_MM = {
    "monitor_27in.3dm": 430, "monitor_32in.3dm": 470,
    "monitor_34in_ultrawide.3dm": 400, "keyboard.3dm": 30, "mouse.3dm": 40,
    "laptop_closed.3dm": 18, "macmini.3dm": 35, "fractal_tower.3dm": 480,
}
PREVIEW_ROLE_RGB = {
    "machine": (200, 40, 40), "monitor": (30, 30, 30),
    "input": (150, 150, 150), "extra": (40, 120, 200),
}


def _box_edges(corners, height, project):
    bot = [project((c[0], c[1], 0.0)) for c in corners]
    top = [project((c[0], c[1], height)) for c in corners]
    edges = []
    for i in range(4):
        j = (i + 1) % 4
        edges.append((bot[i], bot[j]))
        edges.append((top[i], top[j]))
        edges.append((bot[i], top[i]))
    return edges


def render_preview(config_names, footprints, index, out_dir):
    from PIL import Image, ImageDraw
    if not os.path.isdir(out_dir):
        os.makedirs(out_dir)
    camera = (index or {}).get("camera") or {
        "rotation_deg": 45, "elevation_deg": 30, "distance": 2000,
        "target": [0, 0, 200]}
    target, right, up = _camera_basis(camera)

    def project(p):
        v = (p[0] - target[0], p[1] - target[1], p[2] - target[2])
        return (v[0] * right[0] + v[1] * right[1] + v[2] * right[2],
                v[0] * up[0] + v[1] * up[1] + v[2] * up[2])

    by_name = {c["name"]: c for c in layout.CONFIGURATIONS}
    written = []
    for name in config_names:
        config = by_name.get(name)
        if config is None:
            print("  unknown config: {0}".format(name))
            continue
        placed = []
        for p in layout.resolve_placements(config):
            corners = layout.placed_corners(p, footprints.get(p["file"]))
            if corners:
                placed.append((p, corners, PREVIEW_HEIGHTS_MM.get(p["file"], 50)))
        edges = [(p, e) for p, c, h in placed for e in _box_edges(c, h, project)]
        pts = [pt for _p, e in edges for pt in e]
        if not pts:
            continue
        xs = [q[0] for q in pts]
        ys = [q[1] for q in pts]
        scale = 0.6
        pad = 30
        w = int((max(xs) - min(xs)) * scale) + pad * 2
        h = int((max(ys) - min(ys)) * scale) + pad * 2
        img = Image.new("RGB", (w, h), (255, 255, 255))
        draw = ImageDraw.Draw(img)

        def to_px(q):
            return ((q[0] - min(xs)) * scale + pad,
                    (max(ys) - q[1]) * scale + pad)

        role_by_id = {id(p): p["role"] for p, _c, _h in placed}
        for p, (a, b) in edges:
            rgb = PREVIEW_ROLE_RGB.get(role_by_id[id(p)], (0, 0, 0))
            draw.line([to_px(a), to_px(b)], fill=rgb, width=2)
        draw.text((pad, 8), name + "  (schematic placement preview)",
                  fill=(0, 0, 0))
        out_path = os.path.join(out_dir, "preview_{0}.png".format(name))
        img.save(out_path)
        written.append(out_path)
    print("Wrote {0} preview(s) to {1}".format(len(written), out_dir))
    return written


# =============================================================================
# MONTAGE
# =============================================================================

def build_montage(png_by_config, flagged_configs, out_path):
    from PIL import Image, ImageDraw
    rows = layout.MACHINE_ORDER
    cols = layout.MONITOR_ORDER

    # Map (machine_key, monitor_key) -> config name, deterministically.
    name_at = {}
    for mk in rows:
        label = layout.MACHINES[mk]["label"]
        for monitor_key in cols:
            name_at[(mk, monitor_key)] = "{0}_{1}".format(label, monitor_key)

    # Downscale every tile by ONE shared factor so the uniform datum/scale is
    # preserved in the montage (a per-tile thumbnail would let each cell pick
    # its own scale again -- the very thing we removed).
    src_w = max((img.size[0] for img in png_by_config.values()), default=1)
    src_h = max((img.size[1] for img in png_by_config.values()), default=1)
    factor = min(1.0, float(MONTAGE_TILE_MAX_PX) / max(src_w, src_h))
    resample = getattr(getattr(Image, "Resampling", Image), "LANCZOS")
    thumbs = {}
    for name, img in png_by_config.items():
        tw = max(1, int(round(img.size[0] * factor)))
        th = max(1, int(round(img.size[1] * factor)))
        thumbs[name] = img.resize((tw, th), resample)

    cell_w = max(1, int(round(src_w * factor)))
    cell_h = max(1, int(round(src_h * factor)))
    png_by_config = thumbs

    pad = MONTAGE_CELL_PAD_PX
    lab = MONTAGE_LABEL_H_PX
    tile_w = cell_w + pad * 2
    tile_h = cell_h + pad * 2 + lab
    grid_w = tile_w * len(cols)
    grid_h = tile_h * len(rows)

    montage = Image.new("RGB", (grid_w, grid_h), MONTAGE_BG_RGB)
    draw = ImageDraw.Draw(montage)

    for r, mk in enumerate(rows):
        for c, monitor_key in enumerate(cols):
            name = name_at[(mk, monitor_key)]
            x0 = c * tile_w
            y0 = r * tile_h
            img = png_by_config.get(name)
            if img is not None:
                ox = x0 + pad + (cell_w - img.size[0]) // 2
                oy = y0 + lab + pad + (cell_h - img.size[1]) // 2
                montage.paste(img, (ox, oy))
            flagged = name in flagged_configs
            border = MONTAGE_FLAG_RGB if flagged else (210, 210, 210)
            draw.rectangle([x0 + 1, y0 + 1, x0 + tile_w - 2, y0 + tile_h - 2],
                           outline=border, width=2 if flagged else 1)
            text = name + ("  [FLAGGED]" if flagged else "")
            draw.text((x0 + pad, y0 + 4), text, fill=(20, 20, 20))

    montage.save(out_path, "PNG")
    return out_path


# =============================================================================
# MAIN
# =============================================================================

def run_render(cache, out_dir, projection, do_montage):
    if not os.path.isdir(out_dir):
        os.makedirs(out_dir)

    payload_map = cache.projections.get(projection, {})
    payloads = [payload_map[n] for n in cache.config_names if n in payload_map]
    if not payloads:
        print("No cached payloads for projection '{0}'.".format(projection))
        return

    frame = build_frame(payloads, cache.index)
    print("Projection '{0}': canvas {1}px, {2} configs, scale {3} px/mm".format(
        projection, frame["canvas_px"], len(payloads), PX_PER_MM))

    flags, _missing = predicate_flags(cache.footprints)
    # Border fires only on per-config issues -- baseline flags hit every config
    # and would just paint the whole montage red.
    flagged_configs = per_config_flagged(flags)

    try:
        from PIL import Image
    except ImportError:
        raise SystemExit(
            "render.py needs Pillow and runs in your TERMINAL (plain CPython),\n"
            "not inside Rhino. In a macOS terminal:\n"
            "    python3 {0}\n"
            "If Pillow is missing there: python3 -m pip install Pillow\n"
            "(Only solve.py runs in Rhino; render.py never imports Rhino.)".format(
                os.path.abspath(__file__)))
    png_by_config = {}
    for payload in payloads:
        name = payload["config"]
        suffix = "" if projection == "iso" else "_" + projection
        out_path = os.path.join(out_dir, "{0}{1}.png".format(name, suffix))
        render_png(payload, frame, out_path)
        png_by_config[name] = Image.open(out_path).copy()
    print("Wrote {0} PNG(s) to {1}".format(len(png_by_config), out_dir))

    if do_montage and projection == "iso":
        montage_path = os.path.join(out_dir, "_montage.png")
        build_montage(png_by_config, flagged_configs, montage_path)
        print("Wrote montage: {0}".format(montage_path))


def main(argv=None):
    parser = argparse.ArgumentParser(description="Render the Make2D cache.")
    parser.add_argument("--cache", default=DEFAULT_CACHE_DIR)
    parser.add_argument("--out", default=DEFAULT_OUT_DIR)
    parser.add_argument("--projection", default="iso")
    parser.add_argument("--predicates", action="store_true",
                        help="Run placement predicates only; no rendering.")
    parser.add_argument("--preview", nargs="*", metavar="CONFIG",
                        help="Schematic placement preview (no Rhino solve). "
                             "Pass config names, or none for one per machine.")
    parser.add_argument("--no-montage", action="store_true")
    args = parser.parse_args(argv)

    cache_dir = os.path.expanduser(args.cache)

    if args.preview is not None:
        footprints_path = os.path.join(cache_dir, "footprints.json")
        footprints = load_json(footprints_path) if os.path.isfile(footprints_path) else {}
        index_path = os.path.join(cache_dir, "index.json")
        index = load_json(index_path) if os.path.isfile(index_path) else {}
        names = args.preview or ["{0}_1x27".format(layout.MACHINES[m]["label"])
                                 for m in layout.MACHINE_ORDER]
        render_preview(names, footprints, index, os.path.expanduser(args.out))
        return

    if args.predicates:
        footprints_path = os.path.join(cache_dir, "footprints.json")
        footprints = load_json(footprints_path) if os.path.isfile(footprints_path) else {}
        flags, missing = predicate_flags(footprints)
        print_predicates(flags, missing)
        return

    cache = load_cache(cache_dir)
    warn_if_stale(cache)
    flags, missing = predicate_flags(cache.footprints)
    print_predicates(flags, missing)
    print("")
    run_render(cache, os.path.expanduser(args.out), args.projection,
               not args.no_montage)
    warn_if_stale(cache)  # repeat at the end so it is the last thing you see


if __name__ == "__main__":
    main()
