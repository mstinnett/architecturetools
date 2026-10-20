# Promotion audit — 19 October 2026

Scope: the dev branch's new cover/layout, Slope, Roof, Roof Taper, Drain, PDF Markup and Architecture Software. This is an audit and working-tree correction, not a deployment or approval to merge. Voice basis: `docs/voice.md`.

Review follow-up: removed Stairs, Ramp, Tile, Scale Resolution and Sizes cards from the new cover. Existing live Converter and Computer Chooser remain. Removed the BIM overview's market-share caveat at the owner's request. Boxed Revit, AutoCAD, SketchUp, Rhino, V-Ray and Enscape as an explicitly editorial 2026 market-leader selection, with a tools-only filter that combines with category filtering and persists in the URL. This is not a measured US market-share ranking. Software tables switch to labeled rows at 1100px to avoid cramped columns. Checked desktop, intermediate and mobile widths, filter intersection/reset, saved URLs and static citations.

Further review corrections: SketchUp is separated from Rhino + Grasshopper and excluded by the Parametric filter. Rhino's Drawings cell now lists layouts, dimensions, PDF and DWG export, supported by McNeel's architectural drawing and file-format documentation. Renderer columns now compare model connection, file transfer, rendering hardware and outputs. Added official product links for Skema, Swapp and Nemetschek Creator; Swapp's current product page includes Archicad as well as Revit. The overview's “and seven more” is visually secondary. Sources are collapsed below Feedback, with publisher and descriptive destination labels. Citation clicks and direct source URLs open the list; native details/summary remains usable without JavaScript.

Pricing follow-up (19 October 2026): restored verified USD plan amounts for Archicad (Studio from $2,414/year, Collaborate from $2,840/year), SketchUp (Pro $399/year), Rhino ($995 full, $595 upgrade), V-Ray (Solo $540/year), Lumion (Pro $1,149/year named, $1,499/year floating), Enscape (Solo $574.80/year), Twinmotion ($445/year where a paid seat is required), and D5 (Pro $360/year). Each amount links directly to its vendor source; the page states date, currency, tax exclusion and annual billing basis. Other amounts remain unstated pending reliable US verification. This supersedes the earlier blanket removal of numeric prices. Verified desktop/mobile renderer layouts, source expansion, direct hash navigation, return links, footer order, filters and generator repeatability.

## Findings and changes

| Page | Finding | Disposition |
| --- | --- | --- |
| Cover/layout | Roof still carried a dev-only marker and would disappear during staging. Several thumbnail strokes were heavier than the chooser. | Keep Roof in the promotion set; reduce visible diagram strokes. Unfinished tools retain dev-only markers. |
| Slope | Opening copy described the mechanism before the question. Reference slopes lacked sources and scope. Landscape examples were labeled maximums. | Rewrite opening; add ADA/IRC/OSHA scope and source links; identify landscape values as references. Keep illustrative angles separate from code limits. |
| Roof | Area equivalence omitted the equal-pitch condition in its second sentence. Directed rounding could cross the requested direction within half a lattice unit. | Clarify equal pitch; preserve ceil/floor direction before snapping; regression tests added. |
| Roof Taper | A coarse grid and local refinement could miss a global high point. Perimeter minimum was also sampled. Diagonal valleys were called crickets. The text implied the entered plane slope was the minimum drainage slope. | Replace high-point search with a bounded square-coverage search. Calculate perimeter minimum analytically. Correct valley terminology; disclose lower diagonal slope and excluded base insulation. Label average and volume as sampled estimates. |
| Drain | Trade-practice examples read as code minimums. The opening implied hangers were automatically included. A general drainage-pipe slope was also labeled as applying to vent pipe. | Distinguish planning slopes, specify user allowance, rename horizontal drainage pipe. Remove blanket edition-equivalence claim and oversimplified accessible-shower advice. |
| PDF Markup | Several unsupported superlatives, a false Acrobat limitation, stale mobile claims and an absolute Mac exclusion. | Correct the entries below. Market-leader badges become an editorial shortlist, with that meaning stated. |
| Architecture Software | Mixed survey populations supported a visual popularity hierarchy. Several exchange cells were wrong. Prices had no dated per-plan evidence. Sources were verbose in some rows and invisible in timeline data attributes. | Equal-weight overview; remove unsupported popularity statistics and rounded price claims; qualify exchange workflows; static numbered footnotes with return links. Sort news chronologically. |

## Architecture Software: product-by-product review

The page's numbered notes now distinguish history from capabilities. Vendor documentation is evidence of advertised functionality, not an interoperability test. In particular, RVT geometry transfer is not native Revit editing. There is no defensible current US product-share estimate in the sources reviewed. The AIA firm survey is not a vendor-share census; UK NBS figures and European research cannot stand in for it. [AIA survey scope](https://www.aia.org/resource-center/aia-firm-survey-report-2024).

| Product | Audit disposition |
| --- | --- |
| Revit | State US architectural, structural and MEP RVT coordination. Remove LT. Distinguish local worksharing from cloud entitlement. |
| Archicad | Remove licensing aside. Qualify RVT exchange as 3D geometry import/export, per Graphisoft help. |
| Vectorworks Architect | Qualify RVT/RFA import; do not imply native Revit editing. |
| Allplan | Correct “no RVT” to version-limited import, supported by the ALLPLAN 2026 format matrix. |
| Chief Architect | Retain residential documentation scope and native-platform description. Its published import/export documentation does not establish an IFC/RVT workflow. |
| AutoCAD | Remove universal consultant-compatibility claim; DWG version and references need coordination. IFC entry refers to base AutoCAD, not specialized toolsets. |
| BricsCAD BIM | Correct RVT geometry import/export. Change timeline to 2002 company founding and BIM tools in V15 (2014), rather than assert a 2004 first release or 2015 BIM debut. |
| SketchUp | LayOut produces sheets. Revit Importer is plan-dependent and Windows-based. Trimble Connect is file collaboration, not simultaneous model authoring. |
| Rhino + Grasshopper | Add Rhino.Inside.Revit on Windows. Qualify VisualARQ's Windows requirement. |
| V-Ray | Remove unsupported Archicad-host and Mac-Rhino claims. Mac architectural workflow is SketchUp; host compatibility remains version-specific. |
| Lumion | Specify the standalone Pro app; separate Lumion View supports SketchUp on Mac. |
| Enscape | Retain the documented Mac software-ray-tracing distinction. Remove old usage percentages and investor customer-count claim. |
| Twinmotion | Preserve the documented $1M-or-less free-use boundary and paid Cloud requirement. |
| D5 Render | Retain Windows standalone scope; remove unsourced user count. Correct commercial-release text using the developer's 2020 anniversary account. |
| Forma | Correct IFC import in Site Design; describe a Revit connection rather than native RVT editing. Product bundle naming does not make every Forma service one editor. |
| Speckle | Specify IFC upload/import and Revit connectors; web viewer and model-data exchange do not equal shared native-model authoring. |
| Snaptrude | IFC export is documented in its API guidance; Revit transfer is vendor-advertised. Do not claim lossless round-tripping. |
| Qonic | Update Revit connection to the documented two-way plugin. Drawing-generation claims are supported by vendor release notes. |
| Hypar | Correct two false negatives: scaled PDF plans and live collaboration are documented. |
| Higharc | Retain homebuilder plan-set scope; remove the browser-section claim that none of these products produces construction documents. |
| Rayon | Correct drawings to 2D PDF/DWG output. Remove forward-looking functionality from current capability copy. |
| Arcol | Retain early-design/model collaboration scope; paid Revit export is on its pricing page. |
| Motif | Distinguish Design from Review and state that Design access is arranged through its team. Remove an unsupported universal price. |
| Pascal Editor | Describe its published editor/CLI/MCP scope; remove mutable GitHub-star count and promotional phrasing. |

Current numerical prices were removed from the BIM table where a current US plan price was not established. Product links remain the purchase reference. They should not be restored from memory or a different region's storefront.

## PDF Markup: all 18 entries

| Product | Audit disposition |
| --- | --- |
| Bluebeam | Desktop Windows scope retained; Mac support ended June 2023 and iPad withdrawal was December 2025. Remove App Store rating/Pencil anecdote and a blanket current mobile-calibration claim. Remove incomplete price range. |
| Drawboard PDF | Remove “single-user” contradiction: shared documents are documented. Add commercial-use plan restriction. |
| Ncored | Keep documented measurement, revision comparison and Apple Silicon requirement. Remove unqualified competitor-performance assertion. |
| PDF Studio | Retain cross-platform editor scope. Capabilities remain linked to product-specific documentation in the matrix. |
| PDF-XChange | Retain Windows and Plus comparison distinction; explicit feature and measuring-tool references remain. |
| PolyPDF | Desktop site confirms $74.95, free three-measurement limit and comparison. The separate App Store entry supports iPad/iPhone. |
| Adequate | **Evidence gap:** six positive cells have no source. The site redirects and could not be retrieved. Added a visible provisional disclosure; did not invent citations. |
| Drawboard Projects | Retain live project review, tasks and versioning. Vendor pricing confirms $29/user/month. |
| Acrobat | Correct “no sortable markups list”: Adobe documents sorting/filtering comments. |
| Foxit | Retain shared review/comparison and desktop scope. Current pricing confirms $129.99/$159.99 annual tiers. |
| Master PDF Editor | Retain Linux and measurement scope; existing measuring-tool evidence remains linked. |
| PDF Expert | Keep Mac/iPad measurement. Remove unnecessary release-year and future Windows-plan claims. |
| Documents | Retain file-manager and PDF-annotation scope. |
| Morpholio Trace | Keep scaled sketching/area measurement. Remove irrelevant acquisition and unneeded dated feature announcement. |
| Okular | Correct Mac from “no” to untested nightly builds, per KDE downloads. |
| Preview & Markup | Retain basic annotation scope; remove page-wide promise that every tool supports clouds/callouts. |
| Xournal++ | Retain cross-platform pen/layered annotation scope. |
| Concepts | Keep calibrated sketching; remove an unverified exact subscription price. |

## History and announcements: evidence limits

This sweep does **not** certify every historical date or announcement as independently verified. Existing historical sources are now visible; many still point to secondary histories. The accompanying CSV inventories every retained timeline entry and its source for follow-up. Important corrections include IFC's published release (1997, buildingSMART), Bricsys founding/BIM dates, and D5's release description. Remove “first use” and “overtaken” assertions that exceed the cited evidence.

The Revit MCP announcement was substantively wrong: Autodesk's June 2026 release provides read-only access, not model editing. Corrected from [Autodesk's announcement](https://www.autodesk.com/blogs/aec/2026/06/17/revit-public-mcp-server/). News is now sorted newest first. BIMopen's release/platform/RVT claims could not be verified; the page identifies that uncertainty rather than repeating them as facts. Specific day-level dates on community entries and the remaining secondary-source history still need primary-source corroboration before claiming a fully verified chronology.

## Validation

- Engine suites: Slope 52, slope figure 15, Roof 32, Drain 32, Snap 19 checks passed.
- Hosting: 7 checks passed. Analytics: 33 checks passed, including page-script parsing.
- Seven target pages at 1440 px and 390 px: no page JavaScript errors, document overflow or broken internal anchors.
- Relative links resolve. Source build is repeatable. `git diff --check` passes.
- Browser screenshots reviewed for diagram weight, mobile layout and citation styling. Filters, footnote navigation, dark figures, metric controls, adding a taper drain and no-JavaScript footnotes also passed. All BIM IDs are unique.

## Promotion handoff

Keep `tools/build-bim-sources.mjs` with BIM edits and run it after changing source metadata; it generates static footnotes. PDF matrix edits belong in `data/pdf-markup.json`, followed by `node tools/build-pdf-markup.mjs`.

The implementation is reviewable on dev. Remaining evidence gaps are Adequate's six cells, the marked BIMopen item and primary verification of the long historical timeline. No merge, push or deployment was performed.

Owner-supplied pricing update, 19 October 2026: incorporated the owner's current amounts for Revit/AEC/Flex, Vectorworks Architect/Design Suite, Allplan Pro, Chief Architect, AutoCAD, BricsCAD Lite/Pro, Forma, Snaptrude, Hypar, Rayon, Motif, Qonic, Arcol and Higharc. These values were supplied by the owner, not independently fetched in this update. Hypar's $1,000 annual amount is calculated from $100 × 12 less the stated $200 saving. Qonic remains explicitly EUR and configuration-dependent. BricsCAD Lite/Pro amounts are labeled separately from the BIM plan. Added a shared pricing access-date footnote for 19 October 2026, with collapsed bundle/token details. Verified pricing-footnote navigation, direct URLs, details expansion and desktop/mobile layout.

Final layout/consistency pass, 19 October 2026: reviewed the cover, Slope, Roof, Roof Taper, Drain, PDF Markup and Architecture Software. Reduced Slope's excessive phone diagram whitespace; changed Roof/Taper/Drain result rows below 480px to place rounding notes beneath values, preventing split fractions and label collisions. Shortened Taper's edge label and aligned cover/metadata terminology with plane slope and diagonal valleys. Unified the software review date and made Architecture Software source/section scroll offsets follow the actual filter-bar height, including direct source URLs.

Validation: 28 page/viewport combinations at 360, 768, 1024 and 1366px; additional PDF checks at 390, 1024, 1280, 1366 and 1440px; visual inspection of desktop/mobile calculator outputs and metric views; light/dark themes; cover tabs; software category/platform/leader filters; pricing details and footnotes; source jumps, direct URLs and return links; engine disclosures; taper drain placement. No page overflow or browser JavaScript errors found. All 150 engine assertions, 33 analytics checks, 7 hosting checks and promotion-page relative-link checks pass. This is a layout pass, not new certification of the previously documented evidence gaps. No merge, promotion or deployment performed; promotion-time noindex/stage handling still belongs to the normal release step.
