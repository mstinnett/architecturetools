# -*- coding: ascii -*-
"""
make2d_layout - shared, runtime-agnostic layout math for the Make2D batch.

This module is imported by BOTH:
  - solve.py   (runs inside Rhino, older Python runtime / IronPython)
  - render.py  (plain CPython + PIL, no Rhino)

So it must stay:
  - ASCII-only (Rhino non-ASCII script warning),
  - free of any Rhino / PIL / CPython3-only import,
  - pure arithmetic (no f-strings, no type hints, no 3-only stdlib).

It is the SINGLE SOURCE OF TRUTH for the configuration matrix and for where
every component lands on the desk. solve.py composes geometry from it;
render.py runs the placement predicates from it. Keeping the math here is what
stops the two sides from drifting.
"""

import math


# =============================================================================
# DESK + LAYOUT CONSTANTS
# (carried over verbatim from make2d.py so the in-Rhino path is unchanged)
# =============================================================================

DESK_WIDTH = 1500
DESK_DEPTH = 750
DESK_HEIGHT = 0

# The desk is CENTERED on the world origin: x in [-750, 750], y in [-375, 375].
# (draw_desk_surface in make2d.py spans -hw..hw / -hd..hd.) Predicates use this
# centered rect, NOT a corner-at-origin rect.
DESK_X_MIN = -DESK_WIDTH / 2.0
DESK_X_MAX = DESK_WIDTH / 2.0
DESK_Y_MIN = -DESK_DEPTH / 2.0
DESK_Y_MAX = DESK_DEPTH / 2.0

MONITOR_GAP = 15

MONITOR_WIDTHS = {
    "monitor_27in.3dm": 612,
    "monitor_32in.3dm": 724,
    "monitor_34in_ultrawide.3dm": 816,
}

SCREEN_YAW_DEG = 90.0
TOWER_YAW_DEG = 90.0
INPUT_YAW_DEG = 90.0
# The laptop is turned an extra 60deg so it reads as angled toward the user.
# Which way it must turn depends on which side of the cluster it lands -- a
# single laptop anchors world-left (renders camera-right), a multi-machine
# laptop (e.g. X1Tower) anchors world-right (camera-left). Mirror the yaw across
# the two sides so it looks "turned in" either way instead of turned out.
LAPTOP_YAW_WORLD_RIGHT = SCREEN_YAW_DEG + 60.0   # multi: camera-left side
# Screen-mirror of the world-right yaw. The iso camera is at azimuth 45deg, so
# the screen-vertical axis maps to the world 45deg line and a yaw reflects as
# (2*45 - yaw) = 90 - yaw. 90 - 150 = -60. (A naive 180-yaw mirror lands 90deg
# off, which is why the single laptop looked rotated wrong.)
LAPTOP_YAW_WORLD_LEFT = 90.0 - LAPTOP_YAW_WORLD_RIGHT  # = -60 for the iso cam
LAPTOP_YAW_DEG = LAPTOP_YAW_WORLD_RIGHT          # back-compat default
COMPONENT_ROTATIONS_DEG = {
    "fractal_tower.3dm": TOWER_YAW_DEG,
    "monitor_27in.3dm": SCREEN_YAW_DEG,
    "monitor_32in.3dm": SCREEN_YAW_DEG,
    "monitor_34in_ultrawide.3dm": SCREEN_YAW_DEG,
    "laptop_closed.3dm": LAPTOP_YAW_DEG,
    "macbook_air_open.3dm": LAPTOP_YAW_DEG,
    "macbook_pro_16_open.3dm": LAPTOP_YAW_DEG,
    "proart_16_open.3dm": LAPTOP_YAW_DEG,
    "keyboard.3dm": INPUT_YAW_DEG,
    "mouse.3dm": INPUT_YAW_DEG,
}

MONITOR_Y_MM = DESK_DEPTH * 0.3
# The extra push machines got on dual-monitor configs. It was the main "drift
# amplifier": with wide dual monitors, +60mm shoved the tower/mac-mini far
# enough left/right to read as a floating, detached object rather than part of
# the desk group. The reference "best" config (NorthXL + 2x27) wants the
# machine tucked CLOSE, so the dual push is off.
DUAL_DISPLAY_MACHINE_SPACING_MM = 0.0

TOWER_ANCHOR_FILENAME = "fractal_tower.3dm"
# Gap from the nominal monitor edge to the tower origin. NOTE these gaps are
# measured against the NOMINAL monitor width (see get_monitor_cluster_info),
# which sits ~120mm inside the real .3dm footprint -- so the real visual gap is
# roughly this value minus ~120mm. Tower kept at 200 (real gap ~75mm) which
# reads close/grouped once the dual-display push is off. Tower geometry extends
# far in its rotated footprint, so it needs a larger nominal gap than the mac
# mini to land the same real gap.
TOWER_LEFTMOST_DISPLAY_GAP_MM = 200.0
TOWER_DESK_Y_MM = 350.0

MAC_MINI_ANCHOR_FILENAME = "macmini.3dm"
# Mac mini geometry is small and near its origin. Now that the keyboard is
# centered (it used to sit +100 toward the mac mini and force a wide gap), the
# mac mini can hug the right monitor: 150 -> 90 (real gap ~80mm) still clears
# the centered keyboard. Single-monitor configs read well at this gap.
MAC_MINI_RIGHTMOST_DISPLAY_GAP_MM = 90.0
# On dual displays the rightmost monitor is far to the +X side, which projects
# to the far camera-LEFT -- so the same edge gap reads as detached. Pull the mac
# mini in by this much on dual configs only (single configs keep the full gap).
MAC_MINI_DUAL_PULL_IN_MM = 60.0
MAC_MINI_DESK_Y_OFFSET_MM = -50.0

LAPTOP_ANCHOR_FILENAMES = (
    "laptop_closed.3dm",
    "macbook_air_open.3dm",
    "macbook_pro_16_open.3dm",
    "proart_16_open.3dm",
)
# Single-config laptop, parked back toward / beside the display: pulled ~1
# laptop-depth back (Y 300 -> -135), then slid camera-right along the monitor
# axis (gap 25 -> 235, ~210mm = ~60% of the monitor foot width) so it clears
# the monitor foot instead of crossing it.
LAPTOP_LEFTMOST_DISPLAY_GAP_MM = 235.0
LAPTOP_DESK_Y_MM = -135.0
# Multi-config laptop was floating ~119mm off its monitor; 200 -> 80 brings it
# in to graze, matching the single-config laptop.
LAPTOP_MULTI_RIGHTMOST_DISPLAY_GAP_MM = 80.0
LAPTOP_MULTI_DESK_Y_MM = 300.0

KEYBOARD_FILENAME = "keyboard.3dm"
MOUSE_FILENAME = "mouse.3dm"
# Keyboard centered on the display cluster (was +100, which sat it off-center).
KEYBOARD_CENTER_X_FROM_DISPLAY_CENTER_MM = 0.0
KEYBOARD_CENTER_Y_MM = MONITOR_Y_MM + 120.0
MOUSE_CENTER_X_FROM_KEYBOARD_CENTER_MM = -310.0
MOUSE_CENTER_Y_FROM_KEYBOARD_CENTER_MM = 60.0


# =============================================================================
# CONFIGURATION MATRIX
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

# Each machine names a .3dm file. Three rows currently point at the same
# laptop_closed.3dm at the same position, so they solve to identical geometry
# -- the geometry signature (see config_signature) collapses those into one
# HLD solve automatically. Point a row at a distinct file (e.g.
# macbook_pro_16_open.3dm) and it stops being a duplicate with no other change.
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

# Preserve insertion order across both runtimes (IronPython 2.7 dicts are not
# ordered). MACHINE_ORDER / MONITOR_ORDER pin the matrix order so config names
# and montage layout are deterministic.
MACHINE_ORDER = [
    "north_xl",
    "laptop_generic",
    "macbook_pro",
    "mac_mini_air",
    "proart",
    "x1_tower",
]

MONITOR_COMBOS = {
    "1x27": [mon("monitor_27in.3dm", 0)],
    "2x27": None,
    "1x32": [mon("monitor_32in.3dm", 0)],
    "2x32": None,
    "1x27_1x32": None,
    "1xUW": [mon("monitor_34in_ultrawide.3dm", 0)],
}
MONITOR_ORDER = ["1x27", "2x27", "1x32", "2x32", "1x27_1x32", "1xUW"]

_x1, _x2 = compute_dual_offsets("monitor_27in.3dm", "monitor_27in.3dm")
MONITOR_COMBOS["2x27"] = [mon("monitor_27in.3dm", _x1), mon("monitor_27in.3dm", _x2)]

_x1, _x2 = compute_dual_offsets("monitor_32in.3dm", "monitor_32in.3dm")
MONITOR_COMBOS["2x32"] = [mon("monitor_32in.3dm", _x1), mon("monitor_32in.3dm", _x2)]

_x1, _x2 = compute_dual_offsets("monitor_27in.3dm", "monitor_32in.3dm")
MONITOR_COMBOS["1x27_1x32"] = [mon("monitor_27in.3dm", _x1), mon("monitor_32in.3dm", _x2)]


def build_configurations():
    configs = []
    for mach_key in MACHINE_ORDER:
        mach = MACHINES[mach_key]
        for mon_key in MONITOR_ORDER:
            mons = MONITOR_COMBOS[mon_key]
            configs.append({
                "name": "{0}_{1}".format(mach["label"], mon_key),
                "machine_key": mach_key,
                "machine": mach["file"],
                "machine_pos": mach["pos"],
                "monitors": mons,
                "extras": mach.get("extras", []),
            })
    return configs


CONFIGURATIONS = build_configurations()


# =============================================================================
# PLACEMENT MATH (pure; mirrors make2d.py)
# =============================================================================

def get_component_rotation_deg(filename):
    return COMPONENT_ROTATIONS_DEG.get(filename, 0.0)


def laptop_yaw_for_config(config):
    """Mirror the laptop's yaw by which side of the cluster it lands on.
    Multi-machine configs (extras present) anchor the laptop world-right;
    single configs anchor it world-left."""
    if config.get("extras"):
        return LAPTOP_YAW_WORLD_RIGHT
    return LAPTOP_YAW_WORLD_LEFT


def rotation_for(config, filename):
    """Per-placement yaw. Laptops are side-dependent (see laptop_yaw_for_config);
    everything else is the fixed per-file rotation."""
    if filename in LAPTOP_ANCHOR_FILENAMES:
        return laptop_yaw_for_config(config)
    return get_component_rotation_deg(filename)


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
        right_edge_x = monitor_x + (get_monitor_width_mm(monitor_file) / 2.0)
        if leftmost_edge_x is None or left_edge_x < leftmost_edge_x:
            leftmost_edge_x = left_edge_x
        if rightmost_edge_x is None or right_edge_x > rightmost_edge_x:
            rightmost_edge_x = right_edge_x

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
    pull_in = MAC_MINI_DUAL_PULL_IN_MM if is_dual_display_config(config) else 0.0
    x_value = (
        anchor_x
        + MAC_MINI_RIGHTMOST_DISPLAY_GAP_MM
        - pull_in
    )
    y_value = anchor_y + MAC_MINI_DESK_Y_OFFSET_MM
    return x_value, y_value


def get_laptop_anchor_position(config):
    cluster_info = get_monitor_cluster_info(config)
    if not cluster_info:
        return None

    if config.get("extras"):
        rightmost_x = cluster_info["right_x"]
        x_value = (
            rightmost_x
            + LAPTOP_MULTI_RIGHTMOST_DISPLAY_GAP_MM
            + get_dual_display_spacing_mm(config)
        )
        return x_value, LAPTOP_MULTI_DESK_Y_MM

    leftmost_x = cluster_info["left_x"]
    x_value = (
        leftmost_x
        - LAPTOP_LEFTMOST_DISPLAY_GAP_MM
        - get_dual_display_spacing_mm(config)
    )
    return x_value, LAPTOP_DESK_Y_MM


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


# =============================================================================
# RESOLVED PLACEMENTS
# =============================================================================
#
# A "placement" is one component instance with everything render.py / solve.py
# need to put it on the desk:
#   file        component filename
#   x, y        target position (mm, desk space)
#   rotation    yaw degrees (rotation is about the world origin, applied BEFORE
#               translation -- matches load_3dm_component in make2d.py)
#   place_mode  "origin" -> local origin lands at (x, y)
#               "center" -> local bbox CENTER lands at (x, y) (input devices,
#                           which make2d.py positions via move_objects_bbox_*)
#   role        machine | monitor | input | extra  (for predicates/labels)
#
# This mirrors compose_configuration in make2d.py exactly, minus the Rhino I/O.

def resolve_placements(config):
    placements = []

    machine_file = config["machine"]
    mx, my = config["machine_pos"]
    mx, my = get_component_base_position(config, machine_file, mx, my)
    placements.append({
        "file": machine_file,
        "x": mx,
        "y": my,
        "rotation": rotation_for(config, machine_file),
        "place_mode": "origin",
        "role": "machine",
    })

    for monitor_file, monitor_x in (config.get("monitors") or []):
        placements.append({
            "file": monitor_file,
            "x": monitor_x,
            "y": MONITOR_Y_MM,
            "rotation": get_component_rotation_deg(monitor_file),
            "place_mode": "origin",
            "role": "monitor",
        })

    for input_file, input_x, input_y in get_input_device_positions(config):
        placements.append({
            "file": input_file,
            "x": input_x,
            "y": input_y,
            "rotation": get_component_rotation_deg(input_file),
            "place_mode": "center",
            "role": "input",
        })

    for extra_file, extra_x, extra_y in config.get("extras", []):
        extra_x, extra_y = get_component_base_position(
            config, extra_file, extra_x, extra_y
        )
        placements.append({
            "file": extra_file,
            "x": extra_x,
            "y": extra_y,
            "rotation": rotation_for(config, extra_file),
            "place_mode": "origin",
            "role": "extra",
        })

    return placements


def config_signature(config):
    """Stable key over the placed geometry. Two configs with the same
    signature solve to identical hidden-line output, so the expensive HLD
    solve can be computed once and the outputs copied to every label."""
    parts = []
    for p in resolve_placements(config):
        parts.append("{0}|{1:.3f}|{2:.3f}|{3:.3f}|{4}".format(
            p["file"], float(p["x"]), float(p["y"]),
            float(p["rotation"]), p["place_mode"],
        ))
    return ";".join(parts)


# =============================================================================
# FOOTPRINT GEOMETRY (used by predicates; pure 2D)
# =============================================================================

def _rotate_xy(x, y, deg):
    rad = math.radians(deg)
    c = math.cos(rad)
    s = math.sin(rad)
    return (x * c - y * s, x * s + y * c)


def placed_corners(placement, local_bbox):
    """The four ACTUAL (rotated, not axis-aligned) XY corners of a placed
    component, in desk space. Same transform as placed_footprint but without
    collapsing to an AABB -- used by the placement preview so a rotated slab
    shows where it really is, not its inflated bounding box."""
    if local_bbox is None:
        return None
    min_x, min_y, max_x, max_y = local_bbox
    corners = [(min_x, min_y), (max_x, min_y), (max_x, max_y), (min_x, max_y)]
    rot = placement.get("rotation", 0.0)
    rotated = [_rotate_xy(cx, cy, rot) for cx, cy in corners]
    if placement.get("place_mode") == "center":
        rxs = [p[0] for p in rotated]
        rys = [p[1] for p in rotated]
        dx = placement["x"] - (min(rxs) + max(rxs)) / 2.0
        dy = placement["y"] - (min(rys) + max(rys)) / 2.0
    else:
        dx = placement["x"]
        dy = placement["y"]
    return [(px + dx, py + dy) for px, py in rotated]


def placed_footprint(placement, local_bbox):
    """Axis-aligned XY footprint of a placed component.

    local_bbox is the component's own-space bounding box as
    (min_x, min_y, max_x, max_y), read once from the .3dm by solve.py and
    cached in footprints.json. Rotation is about the world origin, applied
    before translation, matching load_3dm_component.

    Returns (min_x, min_y, max_x, max_y) in desk space, or None.
    """
    if local_bbox is None:
        return None
    min_x, min_y, max_x, max_y = local_bbox
    corners = [
        (min_x, min_y), (max_x, min_y),
        (max_x, max_y), (min_x, max_y),
    ]
    rot = placement.get("rotation", 0.0)
    rotated = [_rotate_xy(cx, cy, rot) for cx, cy in corners]

    rxs = [p[0] for p in rotated]
    rys = [p[1] for p in rotated]

    if placement.get("place_mode") == "center":
        cx = (min(rxs) + max(rxs)) / 2.0
        cy = (min(rys) + max(rys)) / 2.0
        dx = placement["x"] - cx
        dy = placement["y"] - cy
    else:
        dx = placement["x"]
        dy = placement["y"]

    return (min(rxs) + dx, min(rys) + dy, max(rxs) + dx, max(rys) + dy)


def desk_corners():
    """Four desk corners (world XY, z=0), CCW from the -X/-Y corner."""
    return [
        (DESK_X_MIN, DESK_Y_MIN),
        (DESK_X_MAX, DESK_Y_MIN),
        (DESK_X_MAX, DESK_Y_MAX),
        (DESK_X_MIN, DESK_Y_MAX),
    ]
