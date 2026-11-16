# PDF markup — research notes

Background for `data/pdf-markup.json` that the page doesn't show. Not
published (`/data` is in `.assetsignore`). Add the date to each entry.

## Mac processor support (checked 7 November 2026)

We decided **not** to show Apple Silicon / Intel on the page: the Mac cell is
a plain mark for every tool, including Layr, whose "Apple Silicon" label was
removed. This is the record in case that changes.

### Apple Silicon only

| Tool | Evidence |
|---|---|
| Layr | layrpdf.com/download: "Windows 10 / 11 and macOS Apple Silicon" |
| PlanDiFy | plandify.app/download: "Mac Apple silicon · M1 or newer · macOS 13+". The v0.14.250 release ships only `PlanDiFy-0.14.250-mac-arm64.zip` |
| Ncored | ncored.com FAQ: "built natively for Apple Silicon (M-series) … (there is no Intel Mac build)". Site metadata: "macOS 11+ (Apple Silicon)" |
| Drawboard PDF | The Mac version is the iPad app: its App Store listing (id1086503728) says "Designed for iPad. Not verified for macOS." iPad apps run only on Apple Silicon Macs. The page still shows a full Mac mark; "partly, iPad app" would be more exact |

### Intel supported — confirmed

| Tool | Evidence |
|---|---|
| Caliper | caliperapp.co: "macOS 14 Sonoma or later · Apple silicon + Intel", direct download or Mac App Store |
| Project Blueprint | blueprintformac.com: "macOS 14 or later, natively on both Apple silicon and Intel Macs" |
| redcolumn | GitHub release v0.1.18 ships `redcolumn-x64.dmg` and `redcolumn-arm64.dmg` |
| Open PDF Studio | GitHub release v2026.45.0: "`.dmg` file (universal - supports Intel and Apple Silicon)" |
| Okular | okular.kde.org/download: nightly builds for "macOS (ARM)" and "macOS (Intel)" |

### Intel supported — from general knowledge, not checked

Adobe Acrobat Pro, Foxit PDF Editor, PDF Expert, Master PDF Editor,
PDF Studio Pro, Xournal++, Preview.

### Unknown

- **PolyPDF.** The Mac App Store version (id6751167250) is the iPad app
  ("Designed for iPad"), so Apple Silicon only. The website's desktop build
  (`polypdf.com/downloads/PolyPDFMac.dmg`, about 275 MB) doesn't say which
  Macs it supports, and neither does polypdf.com/versions. Inspecting the
  binary would settle it.
- **Deta Studio** (checked 12 November 2026). deta.studio says only
  "Desktop apps for Mac and Windows", with no processor requirement.

## PlanDiFy — claims from the developer (6 November 2026)

Relayed by the developer, then added to the page:

- Linux: confirmed by the v0.14.250 release (`Linux x64 AppImage ZIP`).
- Takeoff: confirmed by the v0.14.245 release ("supports native takeoffs with
  custom columns").
- Compare revisions with overlay: the site owner found it on PlanDiFy's
  pages; we didn't locate the exact page, so the mark links to
  plandify.app/help/. Swap in a deep link when found.
- iPad: the browser app works in Safari, so the cell is "partly, in Safari",
  linking to plandify.app/app/.
- No longer in beta; maker shown as "PlanDiFy", not a personal name.

## Project Blueprint — Windows (checked 12 November 2026)

- Windows edition on sale, per the owner. Requirements on blueprintformac.com/windows: "Windows 10 (version 1809 or later) or Windows 11, 64-bit". On Arm it runs through Windows' x64 emulation; no native Arm build stated.
- Pricing: US$149 one-time per platform, two computers per licence, Mac and Windows sold separately. Introductory US$19 for the first 100 licences on each platform. The page shows a live Mac count; we don't print it.
- Earlier "US$79 for two Macs" was out of date.
- Notes no longer state macOS 14 or the Windows version; the Mac requirement is still macOS 14 or later, Apple silicon and Intel.

## PDFelement — added (checked 12 November 2026)

- Pricing from pdf.wondershare.com/store/windows-individuals.html, US prices. Each plan has a cross-platform and a single-platform (Windows only) price: quarterly $21.99 / $11.99; yearly auto-renew $76.99 / $67.99; yearly manual renew $41.99 / $31.99; 2-year $119.99 / $109.99; perpetual (v13) $61.99 / $51.99. A second "V13 Discounts" perpetual box shows $118.99 / $110.49. All are shown against higher struck-through prices, so they may be promotional.
- The plan comparison lists "Measure (Distance/Perimeter/Area)" and Compare as a 14-day trial on the free version.
- The measuring guide (Windows) sets the scale by typing a "Scale Ratio" in Measurement Settings. It shows no calibration on a known length; not confirmed either way. Measurement on Mac and iPad not checked.
- Team review is PDFelement Cloud: share by link or email to collect comments.

## PDF-XChange Editor — re-checked (12 November 2026)

- Current version 11.1.2.0, Windows 10 and later, including an ARM64 installer.
- The feature list marks distance, perimeter and area measurement, Calibrate Measurement Scales and Export Measurements to CSV as free features. Compare Documents is licensed (Plus).
- Single-user license US$62 (Editor) or US$79 (Editor Plus), one year of maintenance included; renewal about 25% of the license price a year.
- Price column changed from "One-time" to "Free tier, one-time", so it now appears under the Free filter.

## RedDraft — added (checked 15 November 2026)

- Source: Microsoft Store listing 9P7Z6Q9B6127 (publisher Kongy Labs LLC, released 29 October 2026, version 1.0.17) and kongylabs.com/apps/reddraft/. No ratings yet.
- Windows 10 version 1809 or later, x64 only. No Mac, iPad or browser version stated.
- Price US$49.99, shown as 50% off US$99.99 with the promotion ending 30 December 2026. Re-check the meta line after that date. The store also offers a free trial; its length isn't stated.
- Measurement: sets a sheet scale or calibrates from a known dimension; lengths, perimeters, areas, angles and counts. Neither page mentions totals, a schedule or CSV export, so the label is "length, area, count", not "with takeoff".
- Compare: "overlay comparison of two sheets" appears only in the store description, so that cell links to the store page. The store page renders with JavaScript, so the text-fragment link may not highlight.
- Not tested hands-on; everything is from the developer's own listing.

## Tools 4 All SVG Editor — added (checked 15 November 2026)

- Source: tools-4all.com/svg-editor and the editor's own scripts. Not tested hands-on with a drawing set.
- The site owner reports the developer fixed earlier performance problems and that it is now fast enough for AEC drawing sets. The developer is interested in AEC use. The page itself says it keeps panning and zooming fast "even with tens of thousands of shapes".
- Placed under Reading, notes and sketching, beside Concepts: it is an illustration tool first, not a markup app.
- Opens PDF (one page, or all pages as the pages of one drawing), DXF and HPGL plot files, among many design formats. Exports SVG, PNG, JPEG, WebP and PDF.
- Measure tool: length, area and angle in the document's or rulers' units (px, mm, cm, in, pt, pc). No drawing scale or calibration found, so the measure cell is "no". Revisit if it gains a scale.
- iPad cell "partly, in browser": the page says it edits full screen on phones and desktops; not tried on an iPad.
- Marked as a newcomer at the site owner's call.

## PDF Annotator — added (checked 16 November 2026)

- Source: pdfannotator.com/en/, /en/how (feature list), /en/shop and /en/aboutus. GRAHL software design, near Munich; PDF Annotator 1 released January 2005; measuring and dimensioning added in version 7 (2018); version 10 released 2025.
- Windows only ("designed for computers running Microsoft Windows"). No Mac, iPad or browser version.
- Measurement: preset or custom scales, or the scale taken from a known dimension; distances, perimeters, areas, angles, plus dimension objects saved in the PDF. No count tool, totals or measurement export mentioned, so the label is "length, area", not "with takeoff".
- No shared review (file-based: save to PDF, email) and no document comparison anywhere on the site.
- Price US$79.95 per user (1–4 users), perpetual, one-time; two years of upgrades and support US$39.94; volume tiers down to US$23.95 at 1,000+ users. 30-day trial; 60-day money-back guarantee.
- Listed under General PDF editors (page tools, stamps, merging), not as a newcomer.

## Protakeoff — added (checked 16 November 2026)

- Source: protakeoff.org home, /pricing, /download and /compare/bluebeam-alternative. The site renders with JavaScript; a plain fetch returns only page titles, so the text was read in a headless browser. Text-fragment links may not highlight.
- Protakeoff LLC. Version 0.1.31 (November 2026); "© 2026". No launch date stated; the 0.1.x version marks it as new, so it is a newcomer.
- Windows 10+ x64; macOS 12+, Apple Silicon and Intel builds. The download page tells Mac users to run `xattr -dr com.apple.quarantine`, which suggests the Mac build isn't notarized; noted on the page.
- Measurement: per-sheet or per-region calibration, lengths, areas with cutouts, counts, AutoCount, priced assemblies, PDF/Excel/CSV export → "with takeoff".
- Team cell is "part": the Team plan lists "Real-time team sync" and a shared template library, but nothing says markups are shared or reviewed live.
- Compare: blue/red overlay of revised sets.
- Price: Solo US$13/month or US$120/year; Team (6 seats) US$76/month or US$500/year; 30-day trial, no card. Volume pricing above 30 seats by email.
- It's a takeoff/estimating app more than a markup tool; the maker's own FAQ says it doesn't replace Bluebeam's review role. Listed under Built for drawings with that caveat in the notes.
- Also ships an MCP connector for ChatGPT, Claude or Antigravity (new in 0.1.31); not mentioned on the page.
- Not tested hands-on.
