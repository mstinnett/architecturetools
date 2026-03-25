# architecture.tools — Project Summary for Claude Code

## What this is

A static site for architects that answers two questions:
1. **What computer should I buy?** (hardware picker)
2. **What's the quick code/math answer?** (utility calculators)

The site uses a minimal, high-contrast design language. No frameworks, no build tools, no backend. Vanilla HTML/CSS/JS served as static files. The aesthetic is architectural — clean, precise, monospaced labels, lots of whitespace.

---

## File Structure

```
/
├── picker.html                     # Main hardware recommendation sheet
├── components.html                 # Main component recommendation sheet
├── site-screen.html                # Main site feasibility sheet
├── assets/
│   ├── css/
│   │   └── global.css              # Shared design tokens and component styles
│   └── data/
│       └── hardware-data.js        # ALL hardware recommendation data
├── calculators/
│   ├── dimension-converter.html
│   ├── slope-calculator.html
│   ├── sheet-sizes.html
│   ├── occupant-load.html
│   ├── stair-calculator.html
│   ├── parking-ratio.html
│   ├── egress-width.html
│   └── fixture-calc.html
└── docs/
    ├── PROJECT.md
    └── SITE_FRAMEWORK.md          # Canonical drawing-set roadmap and sheet list
```

## Framework vs Implementation

`docs/SITE_FRAMEWORK.md` is the canonical product/framework document. It defines the full numbered drawing set (A0-A13), the drawings-first editorial model, and the long-term site structure.

This `PROJECT.md` file documents the current repository and implementation status. Not every planned sheet in the framework exists as a page yet, and not every current page maps 1:1 to a final numbered sheet.

### assets/css/global.css
Shared stylesheet. Root-level pages should import it via `<link rel="stylesheet" href="assets/css/global.css">`. Calculator pages inside `calculators/` should import it via `<link rel="stylesheet" href="../assets/css/global.css">`. Contains:
- Design tokens (colors, type scale, spacing) in CSS custom properties
- Reset
- Layout classes: `.page` (720px), `.page-wide` (1080px), `.page-full`
- Reusable components: `.section-label`, `.input-group`, `.option-pill`, `.app-toggle`, `.result-row`, `.output-row`, `.field-row`, `.note-box`, `.priority-box`, `.card-link`, `.page-footer`, `.spec-block`, `.purchase-path`, `.pick`, `.ref-table`, `.scale-table`
- Higher contrast than original (--black: #0a0a0a, grays darker across the board)
- Base 16px, type scale from --text-xs (11px) to --text-2xl (40px)

**Status:** Created but not yet applied to all pages. `components.html` and `calculators/dimension-converter.html` import it. The picker and the other calculators still have inline styles from earlier iterations that need to be migrated to shared classes.

### assets/data/hardware-data.js
External data file loaded by `picker.html`. All hardware recommendations live here. Structure:

```javascript
var Data = {};

Data.Apps = { revit: { group: 'modeling', platform: 'win' }, ... };

// Build-your-own specs
// Profiles: review, drafting, modeling, viz, modeling_viz, production
// Structure: workloadProfile -> projectScale (small|large) -> budgetTier (cheapest|value|best)
Data.WindowsSpecs = {
  review: {
    small: { cheapest: { cpu, cpuNote, gpu, gpuNote, ram, ramNote, storage, priceRange }, value: { ... }, best: { ... } },
    large: { cheapest: { ... }, value: { ... }, best: { ... } },
    priority: 'Where the money matters text'
  },
  // ... drafting, modeling, viz, modeling_viz, production
};

Data.MacSpecs = {
  // Same profile/projectScale/budgetTier structure
  // Fields: chip, cpuNote, memory, storage, price, priority
};

Data.Prebuilts = [
  // type: 'mini' | 'office' | 'workstation' | 'gaming'
  // Each has: name, price, note, workloadProfiles[], recommendedFor{}
  { type: 'mini', name: 'ASUS ExpertCenter PB64', price: '$600--$900', note: '...', workloadProfiles: ['review','drafting'], recommendedFor: { review: { value: true } } },
  // ...
];
Data.PrebuiltTypeLabels = { mini: 'Mini PC', office: 'Office Tower', workstation: 'Entry Workstation', gaming: 'Gaming Desktop' };
Data.PrebuiltTypeNotes = { mini: '...', office: '...', workstation: '...', gaming: '...' };

Data.Monitors = [ { id, name, price, platform, width, height }, ... ];

Data.Laptops = [
  // category: 'one' | 'desk' | 'travel' | 'student' | 'mac_p' | 'mac_s'
  { category, platform, name, price, weight, note, workloadProfiles[], recommendedFor{} },
  // ...
];
Data.LaptopCategoryLabels = { one: 'One-Machine Solution', desk: 'Desk-Bound Powerhouses', ... };
```

## Main Sheets

The pages below are the current top-level implemented sheets in the repo. The broader planned drawing set lives in `docs/SITE_FRAMEWORK.md`.

### picker.html
The main hardware recommendation sheet. User flow:

1. **Software toggles** — horizontal scrolling strip with mini-nav (Modeling / Drafting / Viz / Rendering). Baseline (Office/Bluebeam/PM) shown as non-toggleable minimum.
2. **Project Scale** — Small/Medium vs Large/Complex (side by side with Budget)
3. **Budget** — Best Value vs Best Available
4. These three inputs determine a workload profile plus `small|large` scale and `cheapest|value|best` budget, which index into `Data.WindowsSpecs` or `Data.MacSpecs`.

Results:
- **Desktop | Mobile** primary tabs
- **Platform toggle** (Windows/Mac) right-aligned in results bar, not a peer tab. Auto-hidden when apps force Windows.
- **Desktop tab**: spec block (CPU/GPU/RAM/Storage), two purchase paths below (Build yourself → /components + PCPartPicker; Buy prebuilt custom → Puget/BOXX), then prebuilt options filtered by profile (mini PCs, office towers, workstations, gaming desktops). Monitor sidebar with drag-and-drop desk area.
- **Mobile tab**: strategy pills (One Machine Docked / Two Machines), laptop list filtered by profile with rec badges.

Key decisions:
- Apps are the input, not workload categories — architects think "I use Revit and Enscape"
- Platform emerges from app selection (win-only apps force Windows)
- All 4 tier combinations are explicit in data — no generated text
- AMD Ryzen for viz/production (GPU-bound, multi-thread helps); Intel for modeling (single-thread)
- Prices reflect March 2026 street reality including GDDR7 shortage
- Prebuilt section: mini PCs for review/drafting, gaming desktops for viz (not workstations — workstations use ISV GPUs that are overpriced for viz)

### components.html
The companion component recommendation sheet. Specific component picks with prices and notes:
- Cases: Fractal North ($130), North XL ($180), Asus ProArt PA602 ($270)
- Motherboards: Intel (ProArt Z890-Creator, MSI Z890 Tomahawk) and AMD (ProArt X870E-Creator, MSI X870 Tomahawk)
- Memory: Corsair Vengeance / G.Skill Trident Z5 DDR5-6000
- Storage: WD Black SN850X / Samsung 990 Pro
- Cooler: Thermalright Peerless Assassin ($35) / Noctua NH-D15 ($100) / Arctic Liquid Freezer III ($100)
- PSU: Seasonic Focus GX-850 / be quiet! Straight Power 12 / Corsair RM850x
- Build time estimate and honest cost comparison vs prebuilt

### site-screen.html
The site feasibility sheet. Split-screen tool with a sketch canvas on the left and numbers on the right.

Sketch features:
- Starts as a rectangle (W×D in toolbar). Heavy ortho snap (8px screen threshold).
- Drag corners to reshape. Click + Point button or double-click edge to add corners.
- Click a dimension label to edit it (type new value, Enter to apply — like Revit).
- Setbacks draw as inward offset polygon (centroid-based normal detection, Sutherland-Hodgman clipping to lot boundary, winding inversion detection for impossible lots).

Numbers chain:
1. Lot area (shoelace formula)
2. Setbacks (front/rear/side per-edge) → buildable footprint
3. Zoning: FAR, max stories, max lot coverage → gross building area
4. Program type presets (SFR, apartment, townhouse, condo, office, retail, mixed) → efficiency, unit size → net usable, unit count
5. Parking: ratio per unit or per 1000SF, surface/structured/underground cost
6. Value: sale $/SF, hard cost $/SF, soft cost %, developer margin %
7. **Residual land value** = GDV - hard - soft - parking - margin. Shown per SF of lot and per unit.

---

## Calculators

Each is a standalone single-page tool. Same design language. No external dependencies except fonts.

### calculators/slope-calculator.html
Enter slope (ratio/percentage/degrees) + a dimension (horizontal run, vertical rise, or slope length). Get all conversions. SVG triangle diagram with edges labeled "plan" and "section". Common slopes table (ADA ramp, roof pitches, drainage, stairs) — click to load.

### calculators/dimension-converter.html
Type a dimension in any format (decimal inches, fractional, feet-inches, mm, cm, m). See all conversions + precision bracket table showing the value rounded to 1", 1/2", 1/4", ... 1/64" with error in mm at each precision.

### calculators/sheet-sizes.html
Pick an ARCH sheet (A through E1), optionally enter building width × depth. See drawable area, scale table showing max dimensions at each architectural scale, SVG sheet drawing with your footprint overlay, and "smallest scale that fits" badge. Common building/lot sizes clickable.

### calculators/occupant-load.html
Click a use from the IBC Table 1004.5 reference table to add it as a zone. Enter area. See occupant count per zone and total. Below the total: minimum exits, egress width (stairs and doors), and approximate plumbing fixture counts (IPC Table 403.1). No dropdown — the table IS the input.

### calculators/stair-calculator.html
Enter total floor-to-floor rise. Auto-calculates riser count, riser height, tread depth, total run, stair angle, comfort check (2R+T). IBC/IRC code check with pass/fail. SVG stair diagram. Common floor-to-floor presets clickable.

### calculators/parking-ratio.html
Enter required parking ratio by unit, bedroom, square foot, or seat count. See required stall count and sensitivity across multiple program areas.

### calculators/egress-width.html
Enter occupant load and egress assumptions. See required stair, door, and level egress width with simple IBC multipliers and comparisons.

### calculators/fixture-calc.html
Enter occupancy and headcount assumptions to estimate plumbing fixture requirements in more detail than the quick rollup shown inside the occupant-load tool.

---

## Design Decisions

- **No frameworks.** Vanilla JS, no React, no Tailwind, no build step. Each page is a static HTML file that can be opened in a browser or served directly.
- **External data for the picker only.** The utility tools have small amounts of hardcoded data (load factors, common slopes, sheet sizes) that don't change often.
- **Human-readable variable names.** `WindowsSpecs`, `MacSpecs`, `deskMonitorDefaults`, `selectedDesktopSpec()`, `workloadProfile()`, `effectivePlatform()`, etc. No compressed synthetic names like `LowValue`.
- **DM Sans + DM Mono.** Body text in DM Sans (300/400/500 weights). All labels, values, and technical content in DM Mono.
- **Illustration placeholders.** The picker has `[ isometric tower illustration ]` placeholder divs. Real isometric line drawings exist as uploaded PNG files but haven't been placed yet.

## Content Documents (uploaded reference files)

These markdown files contain the editorial content that informed the data:
- `docs/SITE_FRAMEWORK.md` — canonical site structure and sheet framework
- `handbook-archetypes.md` — 10 workstation archetypes
- `handbook-cpu-tiers.md` — CPU performance tiers
- `handbook-desktops.md` — desktop recommendations
- `handbook-laptops.md` — laptop recommendations
- `handbook-monitors.md` — monitor recommendations
- `hp-zbook-ultra-g1a-architecture-review.md` — ZBook review

## Uploaded Illustration Files

20 PNG/JPG isometric line drawings at `/mnt/user-data/uploads/`:
- Workstation types (tower, Mac Studio, laptop docked, etc.)
- Workflow diagrams
- Monitor setups

---

## What Needs Doing

### Immediate
- [ ] Migrate all tools to use `assets/css/global.css` or `../assets/css/global.css` as appropriate (currently only `components.html` and `calculators/dimension-converter.html` import it; others still have inline styles)
- [ ] Set up as a proper static site (e.g., with a simple server or static host)
- [ ] Test `assets/data/hardware-data.js` import works when served (requires HTTP server, not file://)
- [ ] Add `index.html` as the root navigation sheet for the main sheets and calculators
- [ ] Translate the A0-A13 framework from `docs/SITE_FRAMEWORK.md` into an implementation plan with page/stub decisions

### Content
- [ ] Place actual isometric illustrations in picker placeholder divs
- [ ] Review and edit `assets/data/hardware-data.js` text (Michael should do a pass on every cpuNote, gpuNote, priority)
- [ ] Verify prebuilt desktop prices and availability
- [ ] Decide which framework sheets become standalone pages first (likely A0, A1, A2, A6, A12)

### Calculator follow-up
- [ ] Review calculator URL conventions and decide whether clean routes should resolve to `/calculators/<slug>` or `/calculators/<slug>.html`
- [ ] Add a calculator index or navigation sheet so the grouped tools are easier to browse

### Site Screen refinements
- [ ] Arc edges for cul-de-sac lot frontage
- [ ] Edge type assignment UI for non-rectangular lots (currently fixed front/right/rear/left)
- [ ] Per-edge setback values in the sketch (instead of just front/rear/side categories)

### Design
- [ ] Site navigation / index page
- [ ] Responsive testing on mobile for all tools
- [ ] Print styles for calculators
