# -*- coding: ascii -*-
"""
solve.py - the Rhino half of the Make2D batch.

Run in Rhino (EditPythonScript / _RunPythonScript). It does ONE expensive
thing -- HiddenLineDrawing.Compute -- and writes a cache to disk. Everything
downstream (scale, canvas, crop, montage, placement predicates) lives in
render.py, which is plain CPython + PIL and never imports Rhino.

What it writes, under CACHE_DIR:
  <config>__iso.json     per config, per projection: solved polylines + fiducials
  <config>__top.json     (only when EMIT_TOP_VIEW is True)
  footprints.json        component filename -> local XY bbox (read once)
  index.json             matrix + signatures + the camera/scale hints

Key properties (see the handoff brief):
  - The HLD solve is deduplicated by geometry signature, so the three
    laptop labels that resolve to identical geometry cost ONE solve.
  - The viewport uses a FIXED datum frustum (not a per-config ZoomBoundingBox),
    so the flattened page frame is config-independent. Fiducials (the four
    desk corners, projected through the SAME HLD pass) let render.py verify
    -- and, if needed, correct -- the datum alignment per config.

Constraints (do not break): ASCII-only; compatible with Rhino's older Python
runtime. File3dm.Read is memoized by filename.
"""

import json
import math
import os
import sys

import Rhino
import rhinoscriptsyntax as rs
import scriptcontext as sc
import System

SCRIPT_VERSION = "2026-06-04.solve.1"


# =============================================================================
# CONFIGURATION
# =============================================================================

COMPONENT_DIR = "~/Dropbox/Architecture Tools/make2d/objects/"
CACHE_DIR = "~/Dropbox/Architecture Tools/make2d/cache/"

# Directory holding make2d_layout.py. Normally derived from this script's
# location; set explicitly if Rhino does not expose __file__ for you.
SCRIPT_DIR = ""

# Camera (parallel projection). Config-independent on purpose.
CAMERA_DISTANCE = 2000
CAMERA_ROTATION_DEG = 45
CAMERA_ELEVATION_DEG = 30
CAMERA_TARGET = (0.0, 0.0, 200.0)
WORK_VIEW = "Perspective"

# Fixed datum frustum, identical for every config. Generous enough to hold the
# desk plus the tallest component. Because it never changes, the flattened page
# frame is the same across configs. Exact size does not matter -- render.py
# recovers millimetres from the desk-corner fiducials.
DATUM_BBOX_MIN = (-950.0, -550.0, -50.0)
DATUM_BBOX_MAX = (950.0, 750.0, 1000.0)

# Top view is pure cost in the iterate loop (it is only the visual backstop).
# Off by default; flip to True when you want the top projection cached too.
EMIT_TOP_VIEW = False

# When non-empty, only configs whose name contains one of these substrings are
# solved. This is how you "rerun only the changed config": set it to that one
# config's name, solve, done. [] solves the whole matrix.
ONLY_CONFIGS = []

# HLD / sampling settings (carried over from make2d.py).
INCLUDE_HIDDEN_LINES = False
INCLUDE_TANGENT_EDGES = False
USE_MULTITHREADED_HLD = True
CURVE_SAMPLING_TOLERANCE_MM = 0.1
POINT_ROUND_DECIMALS = 3

TEMP_LAYER_ROOT = "__SolveMake2D__"
SOURCE_LAYER_NAME = TEMP_LAYER_ROOT + "::Source"

FIDUCIAL_TAG_PREFIX = "__FIDUCIAL_CORNER_"
FIDUCIAL_MARKER_SIZE_MM = 20.0


# =============================================================================
# IMPORT SHARED LAYOUT
# =============================================================================

def _resolve_script_dir():
    if SCRIPT_DIR:
        return os.path.abspath(os.path.expanduser(SCRIPT_DIR))
    try:
        return os.path.dirname(os.path.abspath(__file__))
    except NameError:
        pass
    # Last resort: look for the module next to a known sibling on sys.path.
    for entry in sys.path:
        if entry and os.path.isfile(os.path.join(entry, "make2d_layout.py")):
            return entry
    return os.getcwd()


_here = _resolve_script_dir()
if _here not in sys.path:
    sys.path.insert(0, _here)

# Rhino's Python runtime persists across script runs within a session, so a
# plain "import make2d_layout" reuses a STALE cached module after you edit the
# layout -- the re-solve then silently composes with the old positions. Evict
# it first so every run re-reads make2d_layout.py from disk.
if "make2d_layout" in sys.modules:
    del sys.modules["make2d_layout"]
import make2d_layout as layout


COMPONENT_DIR = os.path.abspath(os.path.expanduser(COMPONENT_DIR))
CACHE_DIR = os.path.abspath(os.path.expanduser(CACHE_DIR))


# =============================================================================
# RHINO HELPERS
# =============================================================================

def ensure_script_document():
    if sc.doc is not None:
        return sc.doc
    active_doc = Rhino.RhinoDoc.ActiveDoc
    if active_doc is None:
        raise RuntimeError("No active Rhino document is available.")
    sc.doc = active_doc
    return sc.doc


def point3d(x_value, y_value, z_value):
    return Rhino.Geometry.Point3d(float(x_value), float(y_value), float(z_value))


def vector3d_between(start_point, end_point):
    return Rhino.Geometry.Vector3d(
        end_point.X - start_point.X,
        end_point.Y - start_point.Y,
        end_point.Z - start_point.Z,
    )


def get_camera_position():
    az = math.radians(CAMERA_ROTATION_DEG)
    el = math.radians(CAMERA_ELEVATION_DEG)
    cx = CAMERA_TARGET[0] + CAMERA_DISTANCE * math.cos(el) * math.cos(az)
    cy = CAMERA_TARGET[1] + CAMERA_DISTANCE * math.cos(el) * math.sin(az)
    cz = CAMERA_TARGET[2] + CAMERA_DISTANCE * math.sin(el)
    return (cx, cy, cz)


def get_work_view_name():
    view_names = rs.ViewNames() or []
    if WORK_VIEW in view_names:
        return WORK_VIEW
    current_view = rs.CurrentView()
    if current_view:
        return current_view
    if view_names:
        return view_names[0]
    raise RuntimeError("No Rhino model view is available.")


def find_view(view_name):
    view = sc.doc.Views.Find(view_name, False)
    if view:
        return view
    return sc.doc.Views.ActiveView


def datum_bbox():
    box = Rhino.Geometry.BoundingBox(
        point3d(*DATUM_BBOX_MIN), point3d(*DATUM_BBOX_MAX)
    )
    return box


def build_iso_viewport(view_name):
    base_view = find_view(view_name)
    if base_view is None:
        return None
    viewport = Rhino.Display.RhinoViewport(base_view.ActiveViewport)
    camera_location = point3d(*get_camera_position())
    camera_target = point3d(*CAMERA_TARGET)
    camera_direction = vector3d_between(camera_location, camera_target)
    viewport.ChangeToParallelProjection(True)
    viewport.CameraUp = Rhino.Geometry.Vector3d.ZAxis
    viewport.SetCameraLocation(camera_location, False)
    viewport.SetCameraDirection(camera_direction, True)
    viewport.ZoomBoundingBox(datum_bbox())
    viewport.SetClippingPlanes(datum_bbox())
    return viewport


def build_top_viewport(view_name):
    base_view = find_view(view_name)
    if base_view is None:
        return None
    box = datum_bbox()
    center = box.Center
    camera_location = point3d(center.X, center.Y, box.Max.Z + CAMERA_DISTANCE)
    camera_target = point3d(center.X, center.Y, box.Min.Z)
    camera_direction = vector3d_between(camera_location, camera_target)
    viewport = Rhino.Display.RhinoViewport(base_view.ActiveViewport)
    viewport.ChangeToParallelProjection(True)
    viewport.CameraUp = Rhino.Geometry.Vector3d.YAxis
    viewport.SetCameraLocation(camera_location, False)
    viewport.SetCameraDirection(camera_direction, True)
    viewport.ZoomBoundingBox(box)
    viewport.SetClippingPlanes(box)
    return viewport


# =============================================================================
# LAYERS / CLEANUP
# =============================================================================

def ensure_layer(layer_name):
    if rs.IsLayer(layer_name):
        return layer_name
    parts = layer_name.split("::")
    current = ""
    for part in parts:
        current = part if not current else current + "::" + part
        if not rs.IsLayer(current):
            rs.AddLayer(current)
    return layer_name


def layer_depth(layer_name):
    return layer_name.count("::")


def get_layer_full_path(layer):
    full_path = getattr(layer, "FullPath", None)
    if full_path:
        return full_path
    return layer.Name


def cleanup_temp_artifacts():
    doc = ensure_script_document()
    layer_names = []
    for layer in doc.Layers:
        if layer is None or layer.IsDeleted:
            continue
        name = get_layer_full_path(layer)
        if name == TEMP_LAYER_ROOT or name.startswith(TEMP_LAYER_ROOT + "::"):
            layer_names.append(name)
    layer_names.sort(key=layer_depth, reverse=True)
    for name in layer_names:
        object_ids = rs.ObjectsByLayer(name) or []
        if object_ids:
            rs.DeleteObjects(object_ids)
    unique = list(set(layer_names))
    unique.sort(key=layer_depth, reverse=True)
    for name in unique:
        if rs.IsLayer(name):
            try:
                rs.DeleteLayer(name)
            except Exception:
                pass


# =============================================================================
# COMPONENT LOADING (memoized File3dm.Read)
# =============================================================================

_model_cache = {}
_bbox_cache = {}


def read_model(filepath):
    """Memoized File3dm.Read by absolute path."""
    key = os.path.abspath(filepath)
    if key in _model_cache:
        return _model_cache[key]
    if not os.path.exists(filepath):
        print("WARNING: Missing file: {0}".format(filepath))
        _model_cache[key] = None
        return None
    model = Rhino.FileIO.File3dm.Read(filepath)
    if model is None:
        print("WARNING: Could not read file: {0}".format(filepath))
    _model_cache[key] = model
    return model


def local_bbox_for(filename):
    """Local-space XY bbox (min_x, min_y, max_x, max_y) of a component,
    read once and memoized. Used for footprints.json / predicates."""
    if filename in _bbox_cache:
        return _bbox_cache[filename]
    filepath = os.path.join(COMPONENT_DIR, filename)
    model = read_model(filepath)
    result = None
    if model is not None:
        box = Rhino.Geometry.BoundingBox.Empty
        for file_obj in model.Objects:
            geometry = file_obj.Geometry
            if geometry is None:
                continue
            gb = geometry.GetBoundingBox(True)
            if not gb.IsValid:
                continue
            if box.IsValid:
                box.Union(gb)
            else:
                box = gb
        if box.IsValid:
            result = (box.Min.X, box.Min.Y, box.Max.X, box.Max.Y)
    _bbox_cache[filename] = result
    return result


def add_placement_geometry(placement, tag):
    """Add one resolved placement's geometry to the doc, transformed.
    Mirrors load_3dm_component: rotate about origin, then translate. For
    place_mode 'center' we additionally shift so the bbox center lands on
    (x, y). Returns added object ids (tagged on SOURCE_LAYER)."""
    filepath = os.path.join(COMPONENT_DIR, placement["file"])
    model = read_model(filepath)
    if model is None:
        return []

    ensure_layer(SOURCE_LAYER_NAME)

    rotation_deg = placement.get("rotation", 0.0)
    transforms = []
    if rotation_deg:
        transforms.append(Rhino.Geometry.Transform.Rotation(
            math.radians(rotation_deg),
            Rhino.Geometry.Vector3d.ZAxis,
            point3d(0.0, 0.0, 0.0),
        ))

    # Build rotated duplicates first so we can measure for center placement.
    duplicates = []
    for file_obj in model.Objects:
        geometry = file_obj.Geometry
        if geometry is None:
            continue
        dup = geometry.Duplicate()
        if dup is None:
            continue
        ok = True
        for xform in transforms:
            if not dup.Transform(xform):
                ok = False
                break
        if ok:
            duplicates.append(dup)

    if not duplicates:
        return []

    if placement.get("place_mode") == "center":
        box = Rhino.Geometry.BoundingBox.Empty
        for dup in duplicates:
            gb = dup.GetBoundingBox(True)
            if not gb.IsValid:
                continue
            if box.IsValid:
                box.Union(gb)
            else:
                box = gb
        if box.IsValid:
            dx = placement["x"] - box.Center.X
            dy = placement["y"] - box.Center.Y
        else:
            dx, dy = placement["x"], placement["y"]
    else:
        dx, dy = placement["x"], placement["y"]

    translation = Rhino.Geometry.Transform.Translation(dx, dy, 0.0)

    object_ids = []
    for dup in duplicates:
        if not dup.Transform(translation):
            continue
        attrs = Rhino.DocObjects.ObjectAttributes()
        oid = sc.doc.Objects.Add(dup, attrs)
        if oid != System.Guid.Empty:
            rs.ObjectLayer(oid, SOURCE_LAYER_NAME)
            object_ids.append((oid, tag))
    return object_ids


def add_fiducial_markers():
    """Add a small solid box marker centered on each desk corner (z=0), each
    tagged with its corner index. They project through the SAME HLD pass as the
    geometry, so their flattened positions land in the segment frame, and the
    centroid of a small symmetric box projects to the corner. Corners sit well
    outside the equipment cluster, so they are not occluded.

    Boxes (not line curves) on purpose: HLD curve-input segments proved fragile
    to extract on this Rhino build, while brep/box segments extract cleanly.
    Returns list of (object_id, tag)."""
    ensure_layer(SOURCE_LAYER_NAME)
    half = FIDUCIAL_MARKER_SIZE_MM / 2.0
    span = Rhino.Geometry.Interval(-half, half)
    tagged = []
    for index, (cx, cy) in enumerate(layout.desk_corners()):
        tag = FIDUCIAL_TAG_PREFIX + str(index)
        plane = Rhino.Geometry.Plane(point3d(cx, cy, 0.0),
                                     Rhino.Geometry.Vector3d.ZAxis)
        brep = Rhino.Geometry.Box(plane, span, span, span).ToBrep()
        if brep is None:
            continue
        oid = sc.doc.Objects.AddBrep(brep)
        if oid != System.Guid.Empty:
            rs.ObjectLayer(oid, SOURCE_LAYER_NAME)
            tagged.append((oid, tag))
    return tagged


def materialize_curve(proxy):
    """Turn a HiddenLineDrawingSegment.CurveGeometry (an internal HldCurveProxy)
    into a concrete Curve. Tries the direct call first, then the public-base
    form (the IronPython/Mono workaround for members on an internal type).
    Returns a concrete Curve or None -- never raises."""
    if proxy is None:
        return None
    try:
        curve = proxy.DuplicateCurve()
        if curve is not None:
            return curve
    except Exception:
        pass
    try:
        return Rhino.Geometry.Curve.DuplicateCurve(proxy)
    except Exception:
        return None


# =============================================================================
# HLD SOLVE + SAMPLING
# =============================================================================

def get_angle_tolerance_radians():
    angle_tolerance = getattr(sc.doc, "ModelAngleToleranceRadians", None)
    if angle_tolerance:
        return angle_tolerance
    return math.radians(5.0)


def get_curve_sampling_tolerance():
    return max(float(CURVE_SAMPLING_TOLERANCE_MM),
              float(sc.doc.ModelAbsoluteTolerance))


def curve_to_points(curve):
    if curve is None or not curve.IsValid:
        return []
    tol = get_curve_sampling_tolerance()
    polyline_curve = curve.ToPolyline(
        tol, tol, get_angle_tolerance_radians(), 1000.0
    )
    if polyline_curve:
        polyline = polyline_curve.ToPolyline()
        return [pt for pt in polyline]
    length = curve.GetLength()
    segment_count = max(2, int(math.ceil(max(length, 1.0) / 10.0)))
    parameters = curve.DivideByCount(segment_count, True)
    if not parameters:
        return [curve.PointAtStart, curve.PointAtEnd]
    return [curve.PointAt(p) for p in parameters]


def _seg_tag(segment):
    try:
        parent = segment.ParentCurve
        if parent is None:
            return None
        source = parent.SourceObject
        if source is None:
            return None
        return source.Tag
    except Exception:
        return None


def solve_projection(tagged_ids, viewport):
    """Run HLD for one viewport over the tagged source objects. Returns
    (segments, fiducial_pages) where segments is a list of
    {"style", "points"} (real geometry only) and fiducial_pages maps corner
    index -> [x, y] page coordinate."""
    params = Rhino.Geometry.HiddenLineDrawingParameters()
    params.AbsoluteTolerance = sc.doc.ModelAbsoluteTolerance
    params.Flatten = True
    params.IncludeHiddenCurves = INCLUDE_HIDDEN_LINES
    params.IncludeTangentEdges = INCLUDE_TANGENT_EDGES
    params.IncludeTangentSeams = INCLUDE_TANGENT_EDGES
    params.SetViewport(viewport)

    for oid, tag in tagged_ids:
        rhino_obj = sc.doc.Objects.FindId(oid)
        if rhino_obj is None or rhino_obj.Geometry is None:
            continue
        params.AddGeometry(rhino_obj.Geometry, tag)

    drawing = Rhino.Geometry.HiddenLineDrawing.Compute(params, USE_MULTITHREADED_HLD)
    if drawing is None:
        return [], {}
    drawing.RejoinCompatibleVisible()

    visibility = Rhino.Geometry.HiddenLineDrawingSegment.Visibility
    segments = []
    fiducial_points = {}
    skipped = 0

    for segment in drawing.Segments:
        # The whole per-segment body is guarded: a single unextractable segment
        # is counted and skipped, never fatal to the batch.
        try:
            if segment is None or segment.CurveGeometry is None:
                continue

            tag = _seg_tag(segment)
            is_fiducial = isinstance(tag, str) and tag.startswith(
                FIDUCIAL_TAG_PREFIX)

            style = None
            if segment.SegmentVisibility == visibility.Visible:
                style = "visible"
            elif segment.SegmentVisibility == visibility.Duplicate:
                style = "visible"
            elif (INCLUDE_HIDDEN_LINES
                  and segment.SegmentVisibility == visibility.Hidden):
                style = "hidden"

            if style is None and not is_fiducial:
                continue

            curve = materialize_curve(segment.CurveGeometry)
            points = curve_to_points(curve)
            if len(points) < 2:
                if not (is_fiducial and len(points) >= 1):
                    if not is_fiducial:
                        skipped += 1
                    continue

            if is_fiducial:
                idx = int(tag[len(FIDUCIAL_TAG_PREFIX):])
                bucket = fiducial_points.setdefault(idx, [])
                for pt in points:
                    bucket.append((pt.X, pt.Y))
                continue

            rounded = [
                [round(pt.X, POINT_ROUND_DECIMALS),
                 round(pt.Y, POINT_ROUND_DECIMALS)]
                for pt in points
            ]
            segments.append({"style": style, "points": rounded})
        except Exception as exc:
            skipped += 1
            if skipped <= 3:
                print("  WARNING: skipped a segment: {0}".format(exc))

    # Reduce each corner's marker points to a single page coordinate (centroid).
    fiducial_pages = {}
    for idx, pts in fiducial_points.items():
        if not pts:
            continue
        sx = sum(p[0] for p in pts) / float(len(pts))
        sy = sum(p[1] for p in pts) / float(len(pts))
        fiducial_pages[idx] = [round(sx, POINT_ROUND_DECIMALS),
                               round(sy, POINT_ROUND_DECIMALS)]
    return segments, fiducial_pages, skipped


def content_bbox_of(segments):
    if not segments:
        return None
    min_x = min_y = None
    max_x = max_y = None
    for seg in segments:
        for x, y in seg["points"]:
            if min_x is None or x < min_x:
                min_x = x
            if max_x is None or x > max_x:
                max_x = x
            if min_y is None or y < min_y:
                min_y = y
            if max_y is None or y > max_y:
                max_y = y
    if min_x is None:
        return None
    return [min_x, min_y, max_x, max_y]


def fiducials_block(fiducial_pages):
    """Assemble the fiducials dict for the cache. desk_corners are ordered by
    corner index (same order as layout.desk_corners()); world_origin is the
    centroid of the corners (the desk is centered on the origin, projection is
    affine, so the centroid projects to the origin)."""
    corners = []
    for idx in range(len(layout.desk_corners())):
        corners.append(fiducial_pages.get(idx))
    present = [c for c in corners if c is not None]
    if present:
        ox = sum(c[0] for c in present) / float(len(present))
        oy = sum(c[1] for c in present) / float(len(present))
        world_origin = [round(ox, POINT_ROUND_DECIMALS),
                        round(oy, POINT_ROUND_DECIMALS)]
    else:
        world_origin = None
    return {"world_origin": world_origin, "desk_corners": corners}


# =============================================================================
# CACHE WRITING
# =============================================================================

def ensure_cache_dir():
    if not os.path.isdir(CACHE_DIR):
        os.makedirs(CACHE_DIR)


def write_json(filename, payload):
    path = os.path.join(CACHE_DIR, filename)
    with open(path, "w") as handle:
        handle.write(json.dumps(payload, ensure_ascii=True,
                                separators=(",", ":")))
    return path


def projection_cache_payload(config, projection, segments, fiducial_pages):
    return {
        "config": config["name"],
        "projection": projection,
        "signature": layout.config_signature(config),
        "segments": segments,
        "fiducials": fiducials_block(fiducial_pages),
        "content_bbox": content_bbox_of(segments),
    }


# =============================================================================
# MAIN
# =============================================================================

def filtered_configs():
    if not ONLY_CONFIGS:
        return list(layout.CONFIGURATIONS)
    out = []
    for config in layout.CONFIGURATIONS:
        if any(p in config["name"] for p in ONLY_CONFIGS):
            out.append(config)
    return out


def compose_tagged(config):
    """Add all of a config's resolved placements + fiducial markers to the doc.
    Returns the tagged id list."""
    tagged = []
    for placement in layout.resolve_placements(config):
        tagged.extend(add_placement_geometry(
            placement, "obj:" + placement["file"]))
    tagged.extend(add_fiducial_markers())
    return tagged


def write_footprints():
    """footprints.json: every component filename used anywhere -> local bbox."""
    files = set()
    for config in layout.CONFIGURATIONS:
        for placement in layout.resolve_placements(config):
            files.add(placement["file"])
    footprints = {}
    for filename in sorted(files):
        footprints[filename] = local_bbox_for(filename)
    write_json("footprints.json", footprints)
    return footprints


def write_index(configs, projections):
    entries = []
    for config in configs:
        entries.append({
            "name": config["name"],
            "machine_key": config["machine_key"],
            "signature": layout.config_signature(config),
        })
    index = {
        "script_version": SCRIPT_VERSION,
        "projections": projections,
        "camera": {
            "distance": CAMERA_DISTANCE,
            "rotation_deg": CAMERA_ROTATION_DEG,
            "elevation_deg": CAMERA_ELEVATION_DEG,
            "target": list(CAMERA_TARGET),
            "parallel": True,
        },
        "desk_corners_world": [list(c) for c in layout.desk_corners()],
        "desk": {
            "width": layout.DESK_WIDTH,
            "depth": layout.DESK_DEPTH,
            "x_min": layout.DESK_X_MIN, "x_max": layout.DESK_X_MAX,
            "y_min": layout.DESK_Y_MIN, "y_max": layout.DESK_Y_MAX,
        },
        "machine_order": layout.MACHINE_ORDER,
        "monitor_order": layout.MONITOR_ORDER,
        "configs": entries,
    }
    write_json("index.json", index)


def main():
    ensure_script_document()

    if not os.path.isdir(COMPONENT_DIR):
        print("Component directory does not exist:")
        print(COMPONENT_DIR)
        return

    cleanup_temp_artifacts()
    ensure_cache_dir()
    ensure_layer(TEMP_LAYER_ROOT)
    ensure_layer(SOURCE_LAYER_NAME)

    view_name = get_work_view_name()
    iso_viewport = build_iso_viewport(view_name)
    top_viewport = build_top_viewport(view_name) if EMIT_TOP_VIEW else None

    projections = ["iso"] + (["top"] if EMIT_TOP_VIEW else [])
    configs = filtered_configs()

    print("=" * 60)
    print("solve.py - Make2D cache builder")
    print("Version: {0}".format(SCRIPT_VERSION))
    print("Component dir: {0}".format(COMPONENT_DIR))
    print("Cache dir: {0}".format(CACHE_DIR))
    print("Projections: {0}".format(", ".join(projections)))
    print("{0} configs to solve".format(len(configs)))
    if ONLY_CONFIGS:
        print("ONLY_CONFIGS filter: {0}".format(", ".join(ONLY_CONFIGS)))
    # Echo the live layout knobs so you can confirm a re-solve picked up edits.
    print("Layout: dual_push={0} tower_gap={1} macmini_gap={2} "
          "laptop_yaw(single/multi)={3}/{4} kbd_x_offset={5}".format(
              layout.DUAL_DISPLAY_MACHINE_SPACING_MM,
              layout.TOWER_LEFTMOST_DISPLAY_GAP_MM,
              layout.MAC_MINI_RIGHTMOST_DISPLAY_GAP_MM,
              layout.LAPTOP_YAW_WORLD_LEFT, layout.LAPTOP_YAW_WORLD_RIGHT,
              layout.KEYBOARD_CENTER_X_FROM_DISPLAY_CENTER_MM))
    print("=" * 60)

    print("Reading component footprints...")
    write_footprints()

    # Dedup the expensive solve by geometry signature. The first config with a
    # given signature is solved; later configs with the same signature reuse
    # the solved payload (only the config name changes).
    solved_by_signature = {}
    solved_count = 0
    reused_count = 0

    rs.EnableRedraw(False)
    try:
        for index, config in enumerate(configs):
            name = config["name"]
            signature = layout.config_signature(config)
            print("[{0}/{1}] {2}".format(index + 1, len(configs), name))

            cached = solved_by_signature.get(signature)
            if cached is not None:
                for projection in projections:
                    payload = dict(cached[projection])
                    payload["config"] = name
                    write_json("{0}__{1}.json".format(name, projection), payload)
                reused_count += 1
                print("  reused solve (signature match)")
                continue

            tagged = compose_tagged(config)
            if not tagged:
                print("  skipped: no source geometry")
                continue

            per_projection = {}
            try:
                iso_segments, iso_fids, iso_skipped = solve_projection(
                    tagged, iso_viewport)
                per_projection["iso"] = projection_cache_payload(
                    config, "iso", iso_segments, iso_fids)
                print("  iso: {0} segments, {1}/4 fiducials{2}".format(
                    len(iso_segments), len(iso_fids),
                    "" if not iso_skipped else ", {0} skipped".format(iso_skipped)))
                if not iso_fids:
                    print("  NOTE: 0 fiducials recovered -- render falls back "
                          "to the analytic frame (still uniform, no per-config "
                          "correction).")

                if EMIT_TOP_VIEW and top_viewport is not None:
                    top_segments, top_fids, top_skipped = solve_projection(
                        tagged, top_viewport)
                    per_projection["top"] = projection_cache_payload(
                        config, "top", top_segments, top_fids)
                    print("  top: {0} segments, {1}/4 fiducials{2}".format(
                        len(top_segments), len(top_fids),
                        "" if not top_skipped else ", {0} skipped".format(
                            top_skipped)))
            finally:
                ids_only = [oid for oid, _tag in tagged]
                if ids_only:
                    rs.DeleteObjects(ids_only)
                cleanup_temp_artifacts()

            for projection in projections:
                write_json("{0}__{1}.json".format(name, projection),
                           per_projection[projection])
            solved_by_signature[signature] = per_projection
            solved_count += 1
    finally:
        rs.EnableRedraw(True)
        cleanup_temp_artifacts()
        rs.UnselectAllObjects()
        ensure_script_document().Views.Redraw()

    write_index(configs, projections)

    print("=" * 60)
    print("Done. solved={0} reused={1} -> cache at:".format(
        solved_count, reused_count))
    print(CACHE_DIR)
    print("=" * 60)


if __name__ == "__main__":
    main()
