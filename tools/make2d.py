# -*- coding: ascii -*-
"""
architecture.tools - Make2D composition automation for Rhino.
Run in Rhino with EditPythonScript or _RunPythonScript.

Workflow:
1. Edit COMPONENT_DIR to point to your component folder.
2. Edit CONFIGURATIONS to add or remove desk setups.
3. Run the script. It loads components, composes each setup,
   generates 2D linework from the configured camera view,
   and exports files into OUTPUT_DIR.

Notes:
- This version is ASCII-only to avoid Rhino's non-ASCII script warning.
- It stays compatible with Rhino's older Python runtime.
- Default output is PNG and PDF. PNGs are rasterized directly from the
  Make2D linework (System.Drawing) and capped at PNG_MAX_DIM_PX on the
  longest edge so they stay small. Add "svg" to EXPORT_EXTENSIONS if a
  vector copy is also needed.
"""

import math
import os

import Rhino
import rhinoscriptsyntax as rs
import scriptcontext as sc
import System

SCRIPT_VERSION = "2026-05-11.01"


# =============================================================================
# CONFIGURATION - Edit these paths
# =============================================================================

COMPONENT_DIR = (
    r"C:\Users\mstin\Dropbox\Architecture Tools\make2d\objects"  # Update this
)
OUTPUT_DIR = r"C:\Users\mstin\Dropbox\Architecture Tools\make2d\output"  # Update this

# View setup for Make2D-style hidden line generation
WORK_VIEW = "Perspective"
CAMERA_DISTANCE = 2000
CAMERA_ROTATION_DEG = 45
CAMERA_ELEVATION_DEG = 30
CAMERA_TARGET = (400, 300, 200)
USE_PARALLEL = True

# Export formats. PNG is the primary raster output; PDF is kept for vector use.
# Add "svg" if you also want a scalable vector copy.
EXPORT_EXTENSIONS = ("png", "pdf")
EXPORT_TOP_VIEW = True
TOP_VIEW_SUFFIX = "_top"
EXPORT_MARGIN_MM = 10.0

# Vector stroke widths (used when SVG or PDF is in EXPORT_EXTENSIONS).
# Bumped from 0.18mm to 0.35mm so printed/embedded linework reads darker.
SVG_STROKE_WIDTH_MM = 0.35
PDF_STROKE_WIDTH_MM = 0.35
PDF_DPI = 72

# PNG raster export settings.
# PNG_MAX_DIM_PX caps the longest edge of the output, so a wide desk
# composition is at most this many pixels across.
PNG_MAX_DIM_PX = 2000
PNG_BACKGROUND_COLOR_RGB = (255, 255, 255)
PNG_VISIBLE_LINE_COLOR_RGB = (0, 0, 0)
PNG_HIDDEN_LINE_COLOR_RGB = (140, 140, 140)
PNG_VISIBLE_STROKE_WIDTH_PX = 1.8
PNG_HIDDEN_STROKE_WIDTH_PX = 1.2

# Curve sampling tolerance (mm). Looser values produce fewer polyline
# points, which keeps SVG file size small and is plenty fine for the
# 2000px PNG output. Falls back to ModelAbsoluteTolerance if smaller.
CURVE_SAMPLING_TOLERANCE_MM = 0.1

WRITE_DEBUG_CURVES_TO_DOC = False

# Hidden line settings
INCLUDE_HIDDEN_LINES = False
INCLUDE_TANGENT_EDGES = False
USE_MULTITHREADED_HLD = True

# Desk surface for context
DESK_WIDTH = 1500
DESK_DEPTH = 750
DESK_HEIGHT = 0
DRAW_DESK = False


# =============================================================================
# TEST MODE - Iterate quickly on one layout
# =============================================================================

# When non-empty, only configurations whose "name" contains any of these
# substrings are processed. Set to [] (or comment out the entries) to run
# every configuration. Substring matching, so ["NorthXL"] matches all
# NorthXL_* combos and ["NorthXL_2x27"] matches just one.
TEST_CONFIG_NAMES = ["Laptop"]  # e.g. ["NorthXL_2x27"]

# When non-empty, only these component filenames are physically loaded
# into the doc. Positions are still computed from the full configuration,
# so e.g. the tower lands exactly where it would with the monitors
# loaded -- you just don't have to render them. Set to [] to load
# everything.
TEST_ISOLATE_COMPONENTS = []  # e.g. ["fractal_tower.3dm"]


# =============================================================================
# MONITOR SPACING
# =============================================================================

MONITOR_GAP = 15

MONITOR_WIDTHS = {
    "monitor_27in.3dm": 612,
    "monitor_32in.3dm": 724,
    "monitor_34in_ultrawide.3dm": 816,
}

# Rotate screen-based components so they face the configured camera side.
SCREEN_YAW_DEG = 90.0
TOWER_YAW_DEG = 90.0
INPUT_YAW_DEG = 90.0
COMPONENT_ROTATIONS_DEG = {
    "fractal_tower.3dm": TOWER_YAW_DEG,
    "monitor_27in.3dm": SCREEN_YAW_DEG,
    "monitor_32in.3dm": SCREEN_YAW_DEG,
    "monitor_34in_ultrawide.3dm": SCREEN_YAW_DEG,
    "laptop_closed.3dm": SCREEN_YAW_DEG,
    "macbook_air_open.3dm": SCREEN_YAW_DEG,
    "keyboard.3dm": INPUT_YAW_DEG,
    "mouse.3dm": INPUT_YAW_DEG,
}

# Equipment layout uses desk-space XY in millimeters.
# +X is desk right. +Y is toward the back/display side of the desk.
MONITOR_Y_MM = DESK_DEPTH * 0.3
# Reduced from 180mm to 60mm. The previous value pushed machines too far
# away from the displays in dual-monitor setups.
DUAL_DISPLAY_MACHINE_SPACING_MM = 60.0

# The tower lives on the -X side of the displays so it renders on the
# camera-right of the composition (the iso camera sits at +X +Y, which
# inverts world-X relative to the screen).
TOWER_ANCHOR_FILENAME = "fractal_tower.3dm"
TOWER_LEFTMOST_DISPLAY_GAP_MM = 200.0
TOWER_DESK_Y_MM = 350.0

MAC_MINI_ANCHOR_FILENAME = "macmini.3dm"
MAC_MINI_RIGHTMOST_DISPLAY_GAP_MM = 200.0
MAC_MINI_DESK_Y_OFFSET_MM = -50.0

LAPTOP_ANCHOR_FILENAMES = (
    "laptop_closed.3dm",
    "macbook_air_open.3dm",
)
LAPTOP_DESK_X_MM = -500.0
LAPTOP_DESK_Y_MM = 395.0
# Used when the laptop shares the desk with another machine (config has
# "extras"), so the laptop can be tuned independently of the single-
# laptop configs.
LAPTOP_MULTI_DESK_X_MM = -300.0
LAPTOP_MULTI_DESK_Y_MM = 395.0

KEYBOARD_FILENAME = "keyboard.3dm"
MOUSE_FILENAME = "mouse.3dm"
KEYBOARD_CENTER_X_FROM_DISPLAY_CENTER_MM = 100.0
KEYBOARD_CENTER_Y_MM = MONITOR_Y_MM + 120.0
MOUSE_CENTER_X_FROM_KEYBOARD_CENTER_MM = -310.0
MOUSE_CENTER_Y_FROM_KEYBOARD_CENTER_MM = 60.0


# =============================================================================
# DESK CONFIGURATIONS
# =============================================================================


def mon(filename, x_offset=0):
    return (filename, x_offset)


def compute_dual_offsets(mon1_file, mon2_file):
    w1 = MONITOR_WIDTHS.get(mon1_file, 620)
    w2 = MONITOR_WIDTHS.get(mon2_file, 620)
    total = w1 + MONITOR_GAP + w2
    x1 = -(total / 2.0) + (w1 / 2.0)
    x2 = (total / 2.0) - (w2 / 2.0)
    return x1, x2


TOWER_POS = (-500, 50)
LAPTOP_CENTER_POS = (0, -50)
MAC_MINI_POS = (350, 200)

MACHINES = {
    "north_xl": {
        "file": "fractal_tower.3dm",
        "pos": TOWER_POS,
        "label": "NorthXL",
    },
    "laptop_generic": {
        "file": "laptop_closed.3dm",
        "pos": LAPTOP_CENTER_POS,
        "label": "Laptop",
    },
    "macbook_pro": {
        "file": "laptop_closed.3dm",
        "pos": LAPTOP_CENTER_POS,
        "label": "MBP",
    },
    "mac_mini_air": {
        "file": "macmini.3dm",
        "pos": MAC_MINI_POS,
        "label": "MacMini",
    },
    "proart": {
        "file": "laptop_closed.3dm",
        "pos": LAPTOP_CENTER_POS,
        "label": "ProArt",
    },
    "x1_tower": {
        "file": "laptop_closed.3dm",
        "pos": (-250, -50),
        "label": "X1Tower",
        "extras": [
            ("fractal_tower.3dm", -500, 50),
        ],
    },
}

MONITOR_COMBOS = {
    "1x27": [mon("monitor_27in.3dm", 0)],
    "2x27": None,
    "1x32": [mon("monitor_32in.3dm", 0)],
    "2x32": None,
    "1x27_1x32": None,
    "1xUW": [mon("monitor_34in_ultrawide.3dm", 0)],
}

x1, x2 = compute_dual_offsets("monitor_27in.3dm", "monitor_27in.3dm")
MONITOR_COMBOS["2x27"] = [mon("monitor_27in.3dm", x1), mon("monitor_27in.3dm", x2)]

x1, x2 = compute_dual_offsets("monitor_32in.3dm", "monitor_32in.3dm")
MONITOR_COMBOS["2x32"] = [mon("monitor_32in.3dm", x1), mon("monitor_32in.3dm", x2)]

x1, x2 = compute_dual_offsets("monitor_27in.3dm", "monitor_32in.3dm")
MONITOR_COMBOS["1x27_1x32"] = [mon("monitor_27in.3dm", x1), mon("monitor_32in.3dm", x2)]

CONFIGURATIONS = []
for mach_key, mach in MACHINES.items():
    for mon_key, mons in MONITOR_COMBOS.items():
        config = {
            "name": "{}_{}".format(mach["label"], mon_key),
            "machine": mach["file"],
            "machine_pos": mach["pos"],
            "monitors": mons,
            "extras": mach.get("extras", []),
        }
        CONFIGURATIONS.append(config)


# =============================================================================
# SCRIPT LOGIC
# =============================================================================

TEMP_LAYER_ROOT = "__BatchMake2D__"
SOURCE_LAYER_NAME = TEMP_LAYER_ROOT + "::Source"


def normalize_path(path_value):
    return os.path.abspath(os.path.expanduser(path_value))


COMPONENT_DIR = normalize_path(COMPONENT_DIR)
OUTPUT_DIR = normalize_path(OUTPUT_DIR)


def ensure_output_dir():
    if not os.path.isdir(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)


def ensure_script_document():
    if sc.doc is not None:
        return sc.doc

    active_doc = Rhino.RhinoDoc.ActiveDoc
    if active_doc is None:
        raise RuntimeError("No active Rhino document is available.")

    sc.doc = active_doc
    return sc.doc


def get_layer_full_path(layer):
    full_path = getattr(layer, "FullPath", None)
    if full_path:
        return full_path
    return layer.Name


def layer_depth(layer_name):
    return layer_name.count("::")


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


def delete_layers(layer_names):
    unique_names = list(set(layer_names))
    unique_names.sort(key=layer_depth, reverse=True)
    for layer_name in unique_names:
        if rs.IsLayer(layer_name):
            try:
                rs.DeleteLayer(layer_name)
            except Exception:
                pass


def cleanup_existing_temp_artifacts():
    doc = ensure_script_document()
    layer_names = []
    for layer in doc.Layers:
        if layer is None or layer.IsDeleted:
            continue
        layer_name = get_layer_full_path(layer)
        if layer_name == TEMP_LAYER_ROOT or layer_name.startswith(
            TEMP_LAYER_ROOT + "::"
        ):
            layer_names.append(layer_name)

    layer_names.sort(key=layer_depth, reverse=True)
    for layer_name in layer_names:
        object_ids = rs.ObjectsByLayer(layer_name) or []
        if object_ids:
            rs.DeleteObjects(object_ids)

    delete_layers(layer_names)


def all_objects_set():
    return set(rs.AllObjects() or [])


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


def get_camera_position():
    az = math.radians(CAMERA_ROTATION_DEG)
    el = math.radians(CAMERA_ELEVATION_DEG)

    cx = CAMERA_TARGET[0] + CAMERA_DISTANCE * math.cos(el) * math.cos(az)
    cy = CAMERA_TARGET[1] + CAMERA_DISTANCE * math.cos(el) * math.sin(az)
    cz = CAMERA_TARGET[2] + CAMERA_DISTANCE * math.sin(el)
    return (cx, cy, cz)


def point3d_from_tuple(values):
    return Rhino.Geometry.Point3d(values[0], values[1], values[2])


def point3d(x_value, y_value, z_value):
    return Rhino.Geometry.Point3d(float(x_value), float(y_value), float(z_value))


def vector3d_between(start_point, end_point):
    return Rhino.Geometry.Vector3d(
        end_point.X - start_point.X,
        end_point.Y - start_point.Y,
        end_point.Z - start_point.Z,
    )


def get_objects_bbox(object_ids, include_padding=True):
    bbox = Rhino.Geometry.BoundingBox.Empty

    for object_id in object_ids:
        rhino_obj = sc.doc.Objects.FindId(object_id)
        if rhino_obj is None or rhino_obj.Geometry is None:
            continue

        obj_bbox = rhino_obj.Geometry.GetBoundingBox(True)
        if not obj_bbox.IsValid:
            continue

        if bbox.IsValid:
            bbox.Union(obj_bbox)
        else:
            bbox = obj_bbox

    if include_padding and bbox.IsValid:
        padding = max(sc.doc.ModelAbsoluteTolerance * 10.0, 5.0)
        bbox.Inflate(padding, padding, padding)

    return bbox


def build_hidden_line_viewport(view_name, object_ids):
    base_view = find_view(view_name)
    if base_view is None:
        return None

    world_bbox = get_objects_bbox(object_ids)
    if not world_bbox.IsValid:
        return None

    viewport = Rhino.Display.RhinoViewport(base_view.ActiveViewport)
    camera_location = point3d_from_tuple(get_camera_position())
    camera_target = point3d_from_tuple(CAMERA_TARGET)
    camera_direction = vector3d_between(camera_location, camera_target)

    if USE_PARALLEL:
        viewport.ChangeToParallelProjection(True)

    viewport.CameraUp = Rhino.Geometry.Vector3d.ZAxis
    viewport.SetCameraLocation(camera_location, False)
    viewport.SetCameraDirection(camera_direction, True)
    viewport.ZoomBoundingBox(world_bbox)
    viewport.SetClippingPlanes(world_bbox)

    return viewport


def build_top_hidden_line_viewport(view_name, object_ids):
    base_view = find_view(view_name)
    if base_view is None:
        return None

    world_bbox = get_objects_bbox(object_ids)
    if not world_bbox.IsValid:
        return None

    viewport = Rhino.Display.RhinoViewport(base_view.ActiveViewport)
    center = world_bbox.Center
    bbox_height = max(world_bbox.Max.Z - world_bbox.Min.Z, 1.0)
    camera_z = world_bbox.Max.Z + max(CAMERA_DISTANCE, bbox_height + 1000.0)
    camera_location = point3d(center.X, center.Y, camera_z)
    camera_target = point3d(center.X, center.Y, world_bbox.Min.Z)
    camera_direction = vector3d_between(camera_location, camera_target)

    viewport.ChangeToParallelProjection(True)
    viewport.CameraUp = Rhino.Geometry.Vector3d.YAxis
    viewport.SetCameraLocation(camera_location, False)
    viewport.SetCameraDirection(camera_direction, True)
    viewport.ZoomBoundingBox(world_bbox)
    viewport.SetClippingPlanes(world_bbox)

    return viewport


def draw_desk_surface():
    if not DRAW_DESK:
        return []

    hw = DESK_WIDTH / 2.0
    hd = DESK_DEPTH / 2.0
    pts = [
        (-hw, -hd, DESK_HEIGHT),
        (hw, -hd, DESK_HEIGHT),
        (hw, hd, DESK_HEIGHT),
        (-hw, hd, DESK_HEIGHT),
        (-hw, -hd, DESK_HEIGHT),
    ]
    desk_id = rs.AddPolyline(pts)
    if desk_id:
        ensure_layer(SOURCE_LAYER_NAME)
        rs.ObjectLayer(desk_id, SOURCE_LAYER_NAME)
        return [desk_id]
    return []


def get_component_rotation_deg(filename):
    return COMPONENT_ROTATIONS_DEG.get(filename, 0.0)


def get_monitor_width_mm(filename):
    return MONITOR_WIDTHS.get(filename, 620.0)


def get_monitor_cluster_info(config):
    monitors = config.get("monitors") or []
    if not monitors:
        return None

    leftmost_edge_x = None
    rightmost_edge_x = None

    for monitor_file, monitor_x in monitors:
        left_edge_x = monitor_x - (get_monitor_width_mm(monitor_file) / 2.0)
        edge_x = monitor_x + (get_monitor_width_mm(monitor_file) / 2.0)
        if leftmost_edge_x is None or left_edge_x < leftmost_edge_x:
            leftmost_edge_x = left_edge_x
        if rightmost_edge_x is None or edge_x > rightmost_edge_x:
            rightmost_edge_x = edge_x

    if leftmost_edge_x is None or rightmost_edge_x is None:
        return None

    return {
        "left_x": leftmost_edge_x,
        "right_x": rightmost_edge_x,
        "center_x": (leftmost_edge_x + rightmost_edge_x) / 2.0,
        "y": MONITOR_Y_MM,
        "count": len(monitors),
    }


def is_dual_display_config(config):
    return len(config.get("monitors") or []) > 1


def get_dual_display_spacing_mm(config):
    if is_dual_display_config(config):
        return DUAL_DISPLAY_MACHINE_SPACING_MM
    return 0.0


def get_left_display_expansion_mm(config):
    cluster_info = get_monitor_cluster_info(config)
    monitors = config.get("monitors") or []
    if not cluster_info or len(monitors) < 2:
        return 0.0

    first_monitor_width = get_monitor_width_mm(monitors[0][0])
    return cluster_info["left_x"] + (first_monitor_width / 2.0)


def get_rightmost_monitor_edge_position(config):
    cluster_info = get_monitor_cluster_info(config)
    if not cluster_info:
        return None
    return cluster_info["right_x"], cluster_info["y"]


def get_mac_mini_anchor_position(config):
    anchor_position = get_rightmost_monitor_edge_position(config)
    if not anchor_position:
        return None

    anchor_x, anchor_y = anchor_position
    x_value = (
        anchor_x
        + MAC_MINI_RIGHTMOST_DISPLAY_GAP_MM
        + get_dual_display_spacing_mm(config)
    )
    y_value = anchor_y + MAC_MINI_DESK_Y_OFFSET_MM
    return x_value, y_value


def get_laptop_anchor_position(config):
    cluster_info = get_monitor_cluster_info(config)
    if not cluster_info:
        return None

    if config.get("extras"):
        base_x = LAPTOP_MULTI_DESK_X_MM
        base_y = LAPTOP_MULTI_DESK_Y_MM
    else:
        base_x = LAPTOP_DESK_X_MM
        base_y = LAPTOP_DESK_Y_MM

    x_value = base_x
    x_value += get_left_display_expansion_mm(config)
    x_value -= get_dual_display_spacing_mm(config)
    return x_value, base_y


def get_input_device_positions(config):
    cluster_info = get_monitor_cluster_info(config)
    if not cluster_info:
        return []

    center_x = cluster_info["center_x"]
    keyboard_x = center_x + KEYBOARD_CENTER_X_FROM_DISPLAY_CENTER_MM
    keyboard_y = KEYBOARD_CENTER_Y_MM

    return [
        (KEYBOARD_FILENAME, keyboard_x, keyboard_y),
        (
            MOUSE_FILENAME,
            keyboard_x + MOUSE_CENTER_X_FROM_KEYBOARD_CENTER_MM,
            keyboard_y + MOUSE_CENTER_Y_FROM_KEYBOARD_CENTER_MM,
        ),
    ]


def get_component_base_position(config, filename, x_value, y_value):
    if filename == MAC_MINI_ANCHOR_FILENAME:
        anchor_position = get_mac_mini_anchor_position(config)
        if anchor_position:
            return anchor_position
        return x_value, y_value

    if filename in LAPTOP_ANCHOR_FILENAMES:
        anchor_position = get_laptop_anchor_position(config)
        if anchor_position:
            return anchor_position
        return x_value, y_value

    if filename != TOWER_ANCHOR_FILENAME:
        return x_value, y_value

    cluster_info = get_monitor_cluster_info(config)
    if not cluster_info:
        return x_value, y_value

    leftmost_x = cluster_info["left_x"]
    x_value = (
        leftmost_x - TOWER_LEFTMOST_DISPLAY_GAP_MM - get_dual_display_spacing_mm(config)
    )
    y_value = TOWER_DESK_Y_MM
    return x_value, y_value


def rotate_objects(object_ids, rotation_deg, center_point):
    if not object_ids or not rotation_deg:
        return
    rs.RotateObjects(object_ids, center_point, rotation_deg, None, False)


def is_test_config_match(config_name):
    if not TEST_CONFIG_NAMES:
        return True
    return any(pattern in config_name for pattern in TEST_CONFIG_NAMES)


def should_load_component(filename):
    if not TEST_ISOLATE_COMPONENTS:
        return True
    return filename in TEST_ISOLATE_COMPONENTS


def filter_configurations(configs):
    if not TEST_CONFIG_NAMES:
        return list(configs)
    return [config for config in configs if is_test_config_match(config["name"])]


def load_component_into_doc(filepath, dx=0, dy=0, dz=0, rotation_deg=0):
    if not should_load_component(os.path.basename(filepath)):
        return []

    if not os.path.exists(filepath):
        print("WARNING: Missing file: {}".format(filepath))
        return []

    ext = os.path.splitext(filepath)[1].lower()
    if ext == ".3dm":
        return load_3dm_component(filepath, dx, dy, dz, rotation_deg)
    return import_component(filepath, dx, dy, dz, rotation_deg)


def move_objects_bbox_center_to(object_ids, target_x, target_y):
    bbox = get_objects_bbox(object_ids, False)
    if not bbox.IsValid:
        return

    center = bbox.Center
    rs.MoveObjects(object_ids, (target_x - center.X, target_y - center.Y, 0.0))


def load_3dm_component(filepath, dx=0, dy=0, dz=0, rotation_deg=0):
    ensure_layer(SOURCE_LAYER_NAME)

    model = Rhino.FileIO.File3dm.Read(filepath)
    if model is None:
        print("WARNING: Could not read file: {}".format(filepath))
        return []

    transforms = []
    if rotation_deg:
        rotation_radians = math.radians(rotation_deg)
        transforms.append(
            Rhino.Geometry.Transform.Rotation(
                rotation_radians, Rhino.Geometry.Vector3d.ZAxis, point3d(0.0, 0.0, 0.0)
            )
        )
    transforms.append(Rhino.Geometry.Transform.Translation(dx, dy, dz))
    object_ids = []

    for file_obj in model.Objects:
        geometry = file_obj.Geometry
        if geometry is None:
            continue

        duplicate = geometry.Duplicate()
        if duplicate is None:
            continue

        transform_failed = False
        for xform in transforms:
            if not duplicate.Transform(xform):
                transform_failed = True
                break
        if transform_failed:
            continue

        object_id = sc.doc.Objects.Add(duplicate)
        if object_id != System.Guid.Empty:
            rs.ObjectLayer(object_id, SOURCE_LAYER_NAME)
            object_ids.append(object_id)

    return object_ids


def import_component(filepath, dx=0, dy=0, dz=0, rotation_deg=0):
    ensure_layer(SOURCE_LAYER_NAME)

    before = all_objects_set()
    cmd = '_-Import "{}" _Enter'.format(filepath)
    if not rs.Command(cmd, False):
        print("WARNING: Import failed: {}".format(filepath))
        return []

    after = all_objects_set()
    object_ids = list(after - before)

    if object_ids:
        rotate_objects(object_ids, rotation_deg, point3d(0.0, 0.0, 0.0))
        rs.MoveObjects(object_ids, (dx, dy, dz))
        rs.ObjectLayer(object_ids, SOURCE_LAYER_NAME)

    return object_ids


def compose_configuration(config):
    all_ids = []

    desk_ids = draw_desk_surface()
    all_ids.extend(desk_ids)

    machine_path = os.path.join(COMPONENT_DIR, config["machine"])
    mx, my = config["machine_pos"]
    mx, my = get_component_base_position(config, config["machine"], mx, my)
    machine_rotation = get_component_rotation_deg(config["machine"])
    all_ids.extend(load_component_into_doc(machine_path, mx, my, 0, machine_rotation))

    for monitor_file, monitor_x in config["monitors"]:
        monitor_path = os.path.join(COMPONENT_DIR, monitor_file)
        monitor_rotation = get_component_rotation_deg(monitor_file)
        all_ids.extend(
            load_component_into_doc(
                monitor_path, monitor_x, MONITOR_Y_MM, 0, monitor_rotation
            )
        )

    for input_file, input_x, input_y in get_input_device_positions(config):
        input_path = os.path.join(COMPONENT_DIR, input_file)
        input_rotation = get_component_rotation_deg(input_file)
        input_ids = load_component_into_doc(input_path, 0, 0, 0, input_rotation)
        move_objects_bbox_center_to(input_ids, input_x, input_y)
        all_ids.extend(input_ids)

    for extra_file, extra_x, extra_y in config.get("extras", []):
        extra_path = os.path.join(COMPONENT_DIR, extra_file)
        extra_x, extra_y = get_component_base_position(
            config, extra_file, extra_x, extra_y
        )
        extra_rotation = get_component_rotation_deg(extra_file)
        all_ids.extend(
            load_component_into_doc(extra_path, extra_x, extra_y, 0, extra_rotation)
        )

    return all_ids


def find_view(view_name):
    view = sc.doc.Views.Find(view_name, False)
    if view:
        return view
    return sc.doc.Views.ActiveView


def mm_to_points(mm_value):
    return (float(mm_value) * 72.0) / 25.4


def format_number(value):
    return "{:.4f}".format(float(value)).rstrip("0").rstrip(".")


def get_curve_entries_bbox(curve_entries):
    bbox = Rhino.Geometry.BoundingBox.Empty

    for entry in curve_entries:
        curve = entry["curve"]
        if curve is None:
            continue

        curve_bbox = curve.GetBoundingBox(True)
        if not curve_bbox.IsValid:
            continue

        if bbox.IsValid:
            bbox.Union(curve_bbox)
        else:
            bbox = curve_bbox

    return bbox


def get_angle_tolerance_radians():
    angle_tolerance = getattr(sc.doc, "ModelAngleToleranceRadians", None)
    if angle_tolerance:
        return angle_tolerance
    return math.radians(5.0)


def get_curve_sampling_tolerance():
    return max(float(CURVE_SAMPLING_TOLERANCE_MM), float(sc.doc.ModelAbsoluteTolerance))


def curve_to_points(curve):
    if curve is None or not curve.IsValid:
        return []

    sampling_tolerance = get_curve_sampling_tolerance()
    polyline_curve = curve.ToPolyline(
        sampling_tolerance, sampling_tolerance, get_angle_tolerance_radians(), 1000.0
    )
    if polyline_curve:
        polyline = polyline_curve.ToPolyline()
        return [pt for pt in polyline]

    length = curve.GetLength()
    segment_count = max(2, int(math.ceil(max(length, 1.0) / 10.0)))
    parameters = curve.DivideByCount(segment_count, True)
    if not parameters:
        return [curve.PointAtStart, curve.PointAtEnd]

    points = []
    for parameter in parameters:
        points.append(curve.PointAt(parameter))
    return points


def curve_points_to_page(points, bbox):
    page_points = []
    for point in points:
        page_x = (point.X - bbox.Min.X) + EXPORT_MARGIN_MM
        page_y = (bbox.Max.Y - point.Y) + EXPORT_MARGIN_MM
        page_points.append((page_x, page_y))
    return page_points


def get_export_page_size_mm(curve_entries, bbox):
    if not bbox.IsValid:
        return None

    width = max(bbox.Max.X - bbox.Min.X, 1.0)
    height = max(bbox.Max.Y - bbox.Min.Y, 1.0)
    return width + (EXPORT_MARGIN_MM * 2.0), height + (EXPORT_MARGIN_MM * 2.0)


def write_svg(curve_entries, filepath):
    bbox = get_curve_entries_bbox(curve_entries)
    page_size = get_export_page_size_mm(curve_entries, bbox)
    if not page_size:
        return False

    width_mm, height_mm = page_size
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="{}mm" height="{}mm" viewBox="0 0 {} {}">'.format(
            format_number(width_mm),
            format_number(height_mm),
            format_number(width_mm),
            format_number(height_mm),
        ),
        '<g fill="none" stroke="#000000" stroke-width="{}" stroke-linecap="round" stroke-linejoin="round">'.format(
            format_number(SVG_STROKE_WIDTH_MM)
        ),
    ]

    hidden_lines = []
    visible_lines = []
    for entry in curve_entries:
        points = curve_to_points(entry["curve"])
        if len(points) < 2:
            continue

        page_points = curve_points_to_page(points, bbox)
        svg_points = " ".join(
            "{},{}".format(format_number(x), format_number(y)) for x, y in page_points
        )

        if entry["style"] == "hidden":
            hidden_lines.append(
                '<polyline points="{}" stroke-dasharray="3 2" />'.format(svg_points)
            )
        else:
            visible_lines.append('<polyline points="{}" />'.format(svg_points))

    lines.extend(visible_lines)
    lines.extend(hidden_lines)
    lines.append("</g>")
    lines.append("</svg>")

    with open(filepath, "w") as svg_file:
        svg_file.write("\n".join(lines))

    return True


def write_pdf(curve_entries, filepath):
    bbox = get_curve_entries_bbox(curve_entries)
    page_size = get_export_page_size_mm(curve_entries, bbox)
    if not page_size:
        print("  PDF skipped: no valid page size")
        return False

    width_mm, height_mm = page_size
    width_dots = max(1, int(math.ceil(mm_to_points(width_mm))))
    height_dots = max(1, int(math.ceil(mm_to_points(height_mm))))

    pdf = Rhino.FileIO.FilePdf.Create()
    page_number = pdf.AddPage(width_dots, height_dots, PDF_DPI)
    if page_number is None:
        page_number = 0
    draw_page_number = int(page_number)

    visible_color = System.Drawing.Color.Black
    hidden_color = System.Drawing.Color.FromArgb(160, 160, 160)
    stroke_width = mm_to_points(PDF_STROKE_WIDTH_MM)

    for entry in curve_entries:
        points = curve_to_points(entry["curve"])
        if len(points) < 2:
            continue

        page_points_mm = curve_points_to_page(points, bbox)
        color = hidden_color if entry["style"] == "hidden" else visible_color

        for start_point, end_point in zip(page_points_mm[:-1], page_points_mm[1:]):
            from_point = System.Drawing.PointF(
                float(mm_to_points(start_point[0])), float(mm_to_points(start_point[1]))
            )
            to_point = System.Drawing.PointF(
                float(mm_to_points(end_point[0])), float(mm_to_points(end_point[1]))
            )
            line_drawn = False
            page_candidates = [draw_page_number, draw_page_number + 1]
            seen_candidates = set()
            last_error = None

            for candidate in page_candidates:
                if candidate in seen_candidates or candidate < 0:
                    continue
                seen_candidates.add(candidate)
                try:
                    pdf.DrawLine(
                        candidate, from_point, to_point, color, float(stroke_width)
                    )
                    line_drawn = True
                    break
                except Exception as exc:
                    last_error = exc

            if not line_drawn:
                print(
                    "  PDF draw error on page {}: {}".format(
                        draw_page_number, last_error
                    )
                )
                return False

    try:
        write_result = pdf.Write(filepath)
        if write_result is None:
            if os.path.exists(filepath) and os.path.getsize(filepath) > 0:
                return True
        elif bool(write_result):
            return True

        print("  PDF write(path) returned {}".format(write_result))
    except Exception as exc:
        print("  PDF write(path) error: {}".format(exc))

    try:
        file_stream = System.IO.FileStream(
            filepath,
            System.IO.FileMode.Create,
            System.IO.FileAccess.Write,
            getattr(System.IO.FileShare, "None"),
        )
        try:
            write_result = pdf.Write(file_stream)
        finally:
            file_stream.Close()

        if write_result is None:
            if os.path.exists(filepath) and os.path.getsize(filepath) > 0:
                return True
        elif bool(write_result):
            return True

        print("  PDF write(stream) returned {}".format(write_result))
    except Exception as exc:
        print("  PDF write(stream) error: {}".format(exc))

    return os.path.exists(filepath) and os.path.getsize(filepath) > 0


def write_png(curve_entries, filepath):
    bbox = get_curve_entries_bbox(curve_entries)
    page_size = get_export_page_size_mm(curve_entries, bbox)
    if not page_size:
        print("  PNG skipped: no valid page size")
        return False

    width_mm, height_mm = page_size
    max_dim_mm = max(width_mm, height_mm)
    if max_dim_mm <= 0.0:
        return False

    scale = float(PNG_MAX_DIM_PX) / float(max_dim_mm)
    width_px = max(1, int(math.ceil(width_mm * scale)))
    height_px = max(1, int(math.ceil(height_mm * scale)))

    bg_r, bg_g, bg_b = PNG_BACKGROUND_COLOR_RGB
    v_r, v_g, v_b = PNG_VISIBLE_LINE_COLOR_RGB
    h_r, h_g, h_b = PNG_HIDDEN_LINE_COLOR_RGB

    bitmap = System.Drawing.Bitmap(width_px, height_px)
    graphics = None
    visible_pen = None
    hidden_pen = None
    try:
        graphics = System.Drawing.Graphics.FromImage(bitmap)
        graphics.SmoothingMode = System.Drawing.Drawing2D.SmoothingMode.AntiAlias
        graphics.PixelOffsetMode = System.Drawing.Drawing2D.PixelOffsetMode.HighQuality
        graphics.Clear(System.Drawing.Color.FromArgb(bg_r, bg_g, bg_b))

        visible_color = System.Drawing.Color.FromArgb(v_r, v_g, v_b)
        hidden_color = System.Drawing.Color.FromArgb(h_r, h_g, h_b)

        visible_pen = System.Drawing.Pen(
            visible_color, float(PNG_VISIBLE_STROKE_WIDTH_PX)
        )
        visible_pen.StartCap = System.Drawing.Drawing2D.LineCap.Round
        visible_pen.EndCap = System.Drawing.Drawing2D.LineCap.Round
        visible_pen.LineJoin = System.Drawing.Drawing2D.LineJoin.Round

        hidden_pen = System.Drawing.Pen(hidden_color, float(PNG_HIDDEN_STROKE_WIDTH_PX))
        hidden_pen.StartCap = System.Drawing.Drawing2D.LineCap.Round
        hidden_pen.EndCap = System.Drawing.Drawing2D.LineCap.Round
        hidden_pen.LineJoin = System.Drawing.Drawing2D.LineJoin.Round
        hidden_pen.DashStyle = System.Drawing.Drawing2D.DashStyle.Dash

        for entry in curve_entries:
            points = curve_to_points(entry["curve"])
            if len(points) < 2:
                continue

            page_points_mm = curve_points_to_page(points, bbox)
            count = len(page_points_mm)
            arr = System.Array.CreateInstance(System.Drawing.PointF, count)
            for i in range(count):
                px_x, px_y = page_points_mm[i]
                arr[i] = System.Drawing.PointF(float(px_x * scale), float(px_y * scale))

            pen = hidden_pen if entry["style"] == "hidden" else visible_pen
            graphics.DrawLines(pen, arr)

        bitmap.Save(filepath, System.Drawing.Imaging.ImageFormat.Png)
    except Exception as exc:
        print("  PNG write error: {}".format(exc))
        return False
    finally:
        if visible_pen is not None:
            visible_pen.Dispose()
        if hidden_pen is not None:
            hidden_pen.Dispose()
        if graphics is not None:
            graphics.Dispose()
        bitmap.Dispose()

    return os.path.exists(filepath) and os.path.getsize(filepath) > 0


def write_debug_curves(curve_entries, config_name):
    if not WRITE_DEBUG_CURVES_TO_DOC or not curve_entries:
        return []

    debug_layer = TEMP_LAYER_ROOT + "::Debug::" + config_name
    ensure_layer(debug_layer)

    bbox = get_curve_entries_bbox(curve_entries)
    if not bbox.IsValid:
        return []

    translation = Rhino.Geometry.Transform.Translation(
        -bbox.Min.X + EXPORT_MARGIN_MM, -bbox.Min.Y + EXPORT_MARGIN_MM, 0.0
    )

    object_ids = []
    for entry in curve_entries:
        curve = entry["curve"].DuplicateCurve()
        if curve is None:
            continue

        curve.Transform(translation)
        object_id = sc.doc.Objects.AddCurve(curve)
        if object_id != System.Guid.Empty:
            rs.ObjectLayer(object_id, debug_layer)
            object_ids.append(object_id)

    return object_ids


def collect_hidden_line_output(
    source_ids, view_name, config_name, projection_name="iso"
):
    if not source_ids:
        return [], {}

    if projection_name == "top":
        viewport = build_top_hidden_line_viewport(view_name, source_ids)
    else:
        viewport = build_hidden_line_viewport(view_name, source_ids)

    if viewport is None:
        print(
            "WARNING: Could not build hidden line viewport for '{}'.".format(
                config_name
            )
        )
        return [], {}

    params = Rhino.Geometry.HiddenLineDrawingParameters()
    params.AbsoluteTolerance = sc.doc.ModelAbsoluteTolerance
    params.Flatten = True
    params.IncludeHiddenCurves = INCLUDE_HIDDEN_LINES
    params.IncludeTangentEdges = INCLUDE_TANGENT_EDGES
    params.IncludeTangentSeams = INCLUDE_TANGENT_EDGES
    params.SetViewport(viewport)

    for object_id in source_ids:
        rhino_obj = sc.doc.Objects.FindId(object_id)
        if rhino_obj is None or rhino_obj.Geometry is None:
            continue
        params.AddGeometry(rhino_obj.Geometry, str(object_id))

    drawing = Rhino.Geometry.HiddenLineDrawing.Compute(params, USE_MULTITHREADED_HLD)
    if drawing is None:
        print("WARNING: Hidden line generation failed for {}".format(config_name))
        return [], {}

    drawing.RejoinCompatibleVisible()

    visibility_enum = Rhino.Geometry.HiddenLineDrawingSegment.Visibility
    curve_entries = []
    stats = {
        "visible": 0,
        "hidden": 0,
        "duplicate": 0,
        "other": 0,
    }

    for segment in drawing.Segments:
        if segment is None or segment.CurveGeometry is None:
            continue

        style = None
        if segment.SegmentVisibility == visibility_enum.Visible:
            stats["visible"] += 1
            style = "visible"
        elif segment.SegmentVisibility == visibility_enum.Duplicate:
            stats["duplicate"] += 1
            style = "visible"
        elif (
            INCLUDE_HIDDEN_LINES and segment.SegmentVisibility == visibility_enum.Hidden
        ):
            stats["hidden"] += 1
            style = "hidden"
        else:
            stats["other"] += 1

        if style is None:
            continue

        curve = segment.CurveGeometry.DuplicateCurve()
        if curve is None or not curve.IsValid:
            continue

        curve_entries.append(
            {
                "curve": curve,
                "style": style,
            }
        )

    return curve_entries, stats


def export_output(curve_entries, config_name):
    if not curve_entries:
        print("No 2D output generated for: {}".format(config_name))
        return False

    exported_any = False

    for ext in EXPORT_EXTENSIONS:
        output_path = os.path.join(OUTPUT_DIR, "{}.{}".format(config_name, ext))

        ext_lower = ext.lower()
        if ext_lower == "svg":
            success = write_svg(curve_entries, output_path)
        elif ext_lower == "pdf":
            success = write_pdf(curve_entries, output_path)
        elif ext_lower == "png":
            success = write_png(curve_entries, output_path)
        else:
            print("  WARNING: Unsupported export extension '{}'".format(ext))
            success = False

        if success:
            print("  Exported {}".format(output_path))
            exported_any = True
        else:
            print("  WARNING: Export failed for {}".format(output_path))

    return exported_any


def print_segment_stats(prefix, stats):
    if not stats:
        return

    print(
        "  {}Segments: visible={}, duplicate={}, hidden={}, other={}".format(
            prefix,
            stats.get("visible", 0),
            stats.get("duplicate", 0),
            stats.get("hidden", 0),
            stats.get("other", 0),
        )
    )


def delete_objects(object_ids):
    if object_ids:
        rs.DeleteObjects(object_ids)


def cleanup_run(source_ids, debug_ids):
    delete_objects(debug_ids)
    delete_objects(source_ids)
    cleanup_existing_temp_artifacts()
    rs.UnselectAllObjects()
    ensure_script_document().Views.Redraw()


def main():
    ensure_script_document()

    if not os.path.isdir(COMPONENT_DIR):
        print("Component directory does not exist:")
        print(COMPONENT_DIR)
        return

    cleanup_existing_temp_artifacts()
    ensure_output_dir()
    ensure_layer(TEMP_LAYER_ROOT)
    ensure_layer(SOURCE_LAYER_NAME)

    view_name = get_work_view_name()
    configs_to_run = filter_configurations(CONFIGURATIONS)
    total = len(configs_to_run)
    completed = 0

    print("=" * 60)
    print("architecture.tools Make2D Generator")
    print("Script version: {}".format(SCRIPT_VERSION))
    print("Component dir: {}".format(COMPONENT_DIR))
    print("Output dir: {}".format(OUTPUT_DIR))
    print("Using view: {}".format(view_name))
    print("{} configurations to process".format(total))
    if TEST_CONFIG_NAMES:
        print(
            "TEST_CONFIG_NAMES filter active: {} ({} of {} configs matched)".format(
                ", ".join(TEST_CONFIG_NAMES), total, len(CONFIGURATIONS)
            )
        )
        if total == 0:
            print("WARNING: filter matched 0 configs. Available names:")
            for config in CONFIGURATIONS:
                print("  {}".format(config["name"]))
    if TEST_ISOLATE_COMPONENTS:
        print(
            "TEST_ISOLATE_COMPONENTS filter active: {}".format(
                ", ".join(TEST_ISOLATE_COMPONENTS)
            )
        )
    print("=" * 60)

    rs.EnableRedraw(False)
    try:
        for index, config in enumerate(configs_to_run):
            print("")
            print("[{}/{}] {}".format(index + 1, total, config["name"]))

            source_ids = []
            debug_ids = []

            try:
                source_ids = compose_configuration(config)
                if not source_ids:
                    print("  Skipped: no source objects were created")
                    continue

                curve_entries, stats = collect_hidden_line_output(
                    source_ids, view_name, config["name"]
                )
                print_segment_stats("", stats)

                if not curve_entries:
                    print("  Skipped: hidden line output was empty")
                    continue

                debug_ids = write_debug_curves(curve_entries, config["name"])

                if export_output(curve_entries, config["name"]):
                    completed += 1

                if EXPORT_TOP_VIEW:
                    top_config_name = config["name"] + TOP_VIEW_SUFFIX
                    top_curve_entries, top_stats = collect_hidden_line_output(
                        source_ids, view_name, top_config_name, "top"
                    )
                    print_segment_stats("Top ", top_stats)

                    if top_curve_entries:
                        debug_ids.extend(
                            write_debug_curves(top_curve_entries, top_config_name)
                        )
                        export_output(top_curve_entries, top_config_name)
                    else:
                        print("  Skipped: top hidden line output was empty")

            finally:
                cleanup_run(source_ids, debug_ids)

    finally:
        rs.EnableRedraw(True)

    print("")
    print("=" * 60)
    print("Done. {} of {} configurations exported to:".format(completed, total))
    print(OUTPUT_DIR)
    print("=" * 60)


if __name__ == "__main__":
    main()
