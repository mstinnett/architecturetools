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
