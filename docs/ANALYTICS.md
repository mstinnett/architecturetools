# Plausible analytics

Tracking uses named custom events, supported on Plausible Starter. No custom
properties, revenue tracking, or Business features are required. Events count
toward the plan's pageview/event allowance.

## Reading the dashboard

Open https://plausible.io/architecture.tools and use the Goals report. Unique
visitors answer how many people used a feature. Total events here count page
loads on which that category was used, not every calculation or click.

Each named event fires at most once per page load. A visitor can use multiple
software programs, conversion directions, setups, or platforms; those totals
overlap and should not be added together to estimate unique users.

The converter waits 1.2 seconds after input or unit selection. It only counts
complete, supported, in-range calculations. Initial examples, saved URL loads,
redraws, fractions, and unary negatives do not count as expression use.
Arithmetic is identified from parser tokens, never from entered text.

Software events count explicit selections, not deselections. Picker setup and
platform events capture the current configuration one second after interaction
(software, budget, scale, platform, machine type, or monitor choice). This
includes retained Windows/Desktop defaults after engagement, but never an
untouched page load. These are configurations explored, not final purchases.

## Goal inventory

Create each as a Custom event goal with the identical event/display name and
no property constraints. `SiteAnalytics.goals` in `assets/js/analytics.js` is
the authoritative list of 35 names:

- `Conversion Used`, `Picker Used`
- `Conversion: Metric to Metric`, `Conversion: Metric to Imperial`
- `Conversion: Imperial to Metric`, `Conversion: Imperial to Imperial`
- `Conversion: Mixed to Metric`, `Conversion: Mixed to Imperial`
- `Conversion: Area`, `Conversion: Ratio`
- `Expression Used`
- `Expression: Addition`, `Expression: Subtraction`
- `Expression: Multiplication`, `Expression: Division`, `Expression: Combined`
- `Software: Revit`, `Software: ArchiCAD`, `Software: Vectorworks`
- `Software: SketchUp`, `Software: Rhino`, `Software: AutoCAD`
- `Software: Enscape`, `Software: Lumion`, `Software: D5 Render`
- `Software: TwinMotion`, `Software: Unreal Engine`, `Software: V-Ray`, `Software: Corona`
- `Setup: Desktop`, `Setup: Laptop`
- `Setup: Desktop + Travel Laptop`, `Setup: Desktop + Powerful Laptop`
- `Platform: Windows`, `Platform: Mac`

`Expression: Combined` means multiple distinct operation types; their individual
operation goals also fire. Area/ratio goals replace direction goals because
these outputs are displayed together rather than converted to one selected system.

Existing automatic `Outbound Link: Click` tracking covers recommendation links.
Its setup and the other pre-existing automatic goals are retained.

## Implementation and verification

Only fixed category names are sent by the custom-event code. No entered
dimensions, expression text, custom properties, or new persistent identifiers
are added. Events are restricted to architecture.tools and www.architecture.tools;
local previews cannot send them. The existing Plausible tracker remains in place.

Run `node tools/test-analytics.mjs` for parser classification, range guards,
deduplication, tracker failure behavior, host restrictions, and script syntax.
Run the repository gate with a modern Bash: `bash .claude/gate/run.sh`.

Verify production by performing a conversion and selecting software, then
checking the corresponding Goals in Plausible. Browser blockers and Plausible
bot filtering can prevent a test visit from appearing. Historical pageviews
cannot recover these interactions before the tracking code was deployed.

## Compliance statement

`privacy.html` is the site's privacy and analytics statement. Every page links
to it from its footer. It exists because a cookie-free tracker removes the
consent banner, not the duty to tell visitors what is processed. What it
rests on, and what to re-check when the tracker, the host, or the tools change:

- **GDPR / UK GDPR (Articles 6, 13).** Plausible reads the visitor's IP
  address and user agent for the moment it takes to hash them with a daily
  rotating salt; the raw values are never stored and the salt is discarded
  every 24 hours. That momentary processing still needs a lawful basis and a
  transparency notice. The statement names legitimate interest (Article
  6(1)(f)), the purpose (which tools are used), what is received, where it is
  processed (Plausible's EU-owned servers in Germany, Plausible Insights OÜ as
  processor under its DPA), the rights that apply, and a contact route (the
  repository's issue tracker). No data-subject record can be located because
  no identifier is retained; the statement says so rather than promising a
  lookup it cannot perform.
- **ePrivacy Directive / UK PECR.** Plausible sets no cookies and writes
  nothing to the device, so the storage-and-access consent rule does not
  apply to it. The one item this site does write, the `scheme` value in
  localStorage, is written only on the visitor's own press of the light/dark
  key and only to keep that choice; it is user-requested functionality, which
  is the exemption, and it is disclosed. If any future feature stores
  anything else on the device, add it to the statement and confirm it is
  strictly necessary or gated behind consent.
- **CCPA / CPRA and other US state laws.** The site is far below the
  revenue and volume thresholds, but California's CalOPPA has no threshold,
  so the statement is published anyway and states plainly: no sale or
  sharing, no targeted advertising, nothing retained.
- **Hosting.** GitHub Pages may log visitor IPs for security and legal
  compliance under the GitHub Privacy Statement; the site has no access to
  those logs. Fonts, scripts, and data are self-hosted, so no other third
  party is contacted by a page load. Recommendation links are outbound and
  non-affiliate; only `Outbound Link: Click` counts them, without any visitor
  identifier.
- **Named events.** The statement promises that only fixed category names
  are sent, never entered values or full configurations. `assets/js/analytics.js`
  is the code that keeps that promise; `node tools/test-analytics.mjs` checks it.

Update the date at the top of `privacy.html` whenever any of the above
changes.
