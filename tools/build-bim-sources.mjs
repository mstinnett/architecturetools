// Keep citations static: readable without JavaScript, with numbered return links.
import { readFileSync, writeFileSync } from 'node:fs';
const path = new URL('../bim.html', import.meta.url);
let html = readFileSync(path, 'utf8')
  .replace(/\r\n/g, '\n')
  .replace(/<sup class="source-ref">.*?<\/sup>/g, '')
  .replace(/\s*<!-- sources:start -->[\s\S]*?<!-- sources:end -->\s*/g, '\n');
const sources = [];
function destination(url, fallback) {
  const u = new URL(url);
  const host = u.hostname.replace(/^www\./, '');
  const titles = {
    'https://www.zwsoft.com/about': 'ZWSOFT history: early ZWCAD and international expansion',
    'https://www.zwsoft.com/product/zwcad/pricing': 'ZWCAD Standard and Professional: features, perpetual prices and license terms',
    'https://www.zwsoft.com/user-guide/zwcad-system-requirement': 'ZWCAD supported Windows versions and hardware requirements',
    'https://www.rhino3d.com/inside/revit/1.0/': 'Rhino.Inside.Revit documentation',
    'https://www.rhino3d.com/docs/guides/user-guide-new/drafting-architecture/': 'Architectural drawings: layouts, annotation and PDF output',
    'https://www.rhino3d.com/features/file-formats/': 'Rhino supported import and export formats',
    'https://support.chaos.com/hc/en-us/articles/4406890478865-Recommended-hardware': 'V-Ray CPU, GPU and hybrid rendering hardware',
    'https://www.chaos.com/vray': 'V-Ray renderer features, host integrations and license plans',
    'https://blog.chaos.com/chaos-launches-v-ray-7-for-sketchup-and-rhino': 'V-Ray 7 for SketchUp and Rhino: platforms and Apple silicon GPU rendering',
    'https://blog.chaos.com/3d-rendering-software-for-mac': 'Chaos rendering on Mac: which V-Ray hosts run on macOS',
    'https://documentation.chaos.com/space/VMAYA/111738911/V-Ray+GPU+Setup': 'V-Ray GPU setup: CUDA, RTX, AMD and Metal devices',
    'https://documentation.chaos.com/space/ESKETCHUP/127670780/System+Requirements': 'Enscape system requirements: hosts, Windows GPUs and Mac',
    'https://dev.epicgames.com/documentation/en-us/twinmotion/supported-design-applications-for-datasmith': 'Twinmotion Direct Link: supported design applications',
    'https://dev.epicgames.com/documentation/en-us/twinmotion/import-process-in-twinmotion': 'Twinmotion supported import file formats',
    'https://www.d5render.com/specs': 'D5 Render specifications: Windows and GPU',
    'https://bricscad.octave.com/store/bricscad': 'BricsCAD Lite, Pro and BIM prices',
    'https://www.chaos.com/corona/features': 'Corona features: hosts, Vantage link and outputs',
    'https://documentation.chaos.com/space/CRC4D/176652374': 'Corona system requirements: CPU rendering, Windows and macOS',
    'https://blog.chaos.com/corona-12-update-1': 'Corona 12 Update 1: Chaos Vantage live link',
    'https://www.chaos.com/corona/buy-online': 'Corona Solo and Premium prices',
    'https://www.chaos.com/veras': 'Veras AI visualization: hosts, web app and plans',
    'https://www.chaos.com/press/chaos-acquires-evolvelab-and-its-aec-ai-tools': 'Chaos acquires EvolveLAB and Veras',
    'https://www.chaos.com/press/veras-ai-architecture-enscape-vray-corona': 'Veras included in Enscape, V-Ray and Corona',
    'https://blog.chaos.com/veras-4.0': 'Veras 4.0 render engines',
    'https://blog.chaos.com/new-features-for-your-enscape-workflow': 'Chaos AI Enhancer, AI Upscaler and Veras in Enscape',
    'https://lumion.com/product/ai': 'Lumion AI Enhancer, Upscaler and Material Generator',
    'https://aecmag.com/visualisation/twinmotion-a-new-chapter': 'Twinmotion roadmap: AI planned for 2026',
    'https://docs.d5render.com/getting-started/d5-workflow/ai-features': 'D5 Render AI features',
    'https://help.sketchup.com/en/ai-credits': 'SketchUp AI credits by plan',
    'https://blogs.autodesk.com/forma/2026/03/24/forma-board-now-available-for-autodesk-forma-data-management-users/': 'Forma Board AI renderings for Forma Data Management users',
    'https://www.chaos.com/enscape': 'Enscape features and supported design applications',
    'https://docs.chaos.com/display/ESKETCHUP/System%2BRequirements': 'Enscape system requirements and GPU rendering',
    'https://lumion.com/compatibility': 'Lumion LiveSync plugins and supported import formats',
    'https://lumion.com/product/system-requirements': 'Lumion operating system and GPU requirements',
    'https://lumion.com/product/buy': 'Lumion Pro plans, presentation outputs and Cloud sharing',
    'https://dev.epicgames.com/documentation/twinmotion/datasmith-file-import-workflow-in-twinmotion?lang=en-US': 'Twinmotion Datasmith exporter and file-import workflow',
    'https://dev.epicgames.com/documentation/twinmotion/hardware-and-software-specifications-for-twinmotion': 'Twinmotion hardware, macOS and path-tracer requirements',
    'https://www.twinmotion.com/license': 'Twinmotion free-use eligibility and paid Cloud seats',
    'https://docs.d5render.com/getting-started/d5-workflow/model-connection': 'D5 live-sync plugins and model connections',
    'https://docs.d5render.com/model/how-to-import-model-files-into-d5-render': 'D5 model imports and converter exports',
    'https://www.d5render.com/features': 'D5 rendering, animation and presentation features',
    'https://help.graphisoft.com/AC/27/INT/_AC27_Help/120_Interoperability/120_Interoperability-42.htm': 'Archicad exchange of Revit 3D geometry',
    'https://app-help.vectorworks.net/2025/eng/VW2025_Guide/Import/Importing_Revit.htm': 'Vectorworks: importing Revit files',
    'https://www.allplan.com/fileadmin/user_upload/countries/international/pdfs/system/Data_exchange_formats_ALLPLAN_2026_EN.pdf': 'ALLPLAN 2026 data-exchange formats (PDF)',
    'https://help.sketchup.com/en/extending-sketchup/revit-interoperability': 'SketchUp Revit Importer: supported plans and platform',
    'https://help.sketchup.com/en/accounts-and-administration/trimble-connect-sketchup-desktop': 'Trimble Connect file sharing in SketchUp',
  };
  if (titles[url]) return host + ' — ' + titles[url];
  if (u.pathname.includes('/wiki/')) return host + ' — ' + decodeURIComponent(u.pathname.split('/wiki/')[1]).replaceAll('_', ' ');
  return host + ' — ' + fallback;
}
function cite(url, label) {
  label = destination(url, label);
  const n = sources.length + 1;
  sources.push({ url, label, n });
  return `<sup class="source-ref"><a id="cite-${n}" href="#source-${n}" aria-label="Source ${n}: ${label.replaceAll('"', '&quot;')}">[${n}]</a></sup>`;
}
html = html.replace(/<li\b[^>]*class="tl-item[^>]*>[\s\S]*?<\/li>/g, item => {
  const url = /data-src="([^"]+)"/.exec(item)?.[1];
  const label = /class="tl-name">(.*?)<\/span>/.exec(item)?.[1];
  return url ? item.replace(/(<span class="tl-year[^>]*>.*?)(<\/span>)/, (_, a, b) => a + cite(url, label + ' — history') + b) : item;
});
html = html.replace(/<tr\b[^>]*data-src="[^"]*"[^>]*>[\s\S]*?<\/tr>/g, row => {
  const label = /class="tool-cell"><a[^>]*>(.*?)<\/a>/.exec(row)?.[1];
  const history = /data-src="([^"]+)"/.exec(row)[1];
  const product = /class="tool-cell"><a href="([^"]+)"/.exec(row)[1];
  const urls = /data-evidence="([^"]+)"/.exec(row)?.[1].split('|') || [product];
  row = row.replace('data-label="Price">Vendor pricing', `data-label="Price"><a href="${product}" rel="noopener">Check price</a>`);
  row = row.replace(/(<span class="since-y[^>]*>.*?)(<\/span>)/, (_, a, b) => a + cite(history, label + ' — history') + b);
  return row.replace(/(<span class="line">.*?)(<\/span>)/, (_, a, b) => a + urls.map(u => cite(u, label + (u === product ? ' — official product overview' : ' — product documentation'))).join('') + b);
});
// Watch-list sources become compact references; product links stay in the table.
html = html.replace(/<li class="watch-item"[^>]*>[\s\S]*?<\/li>/g, item => {
  const saved = /data-source="([^"]+)"/.exec(item)?.[1];
  const date = /<time[^>]*>(.*?)<\/time>/.exec(item)?.[1] || '';
  const title = /data-source-title="([^"]+)"/.exec(item)?.[1] || 'Product news';
  if (saved) return item.replace('</p>', cite(saved, title + ' — ' + date) + '</p>');
  return item.replace(/<a href="([^"]+)"[^>]*>(.*?)<\/a>/g, (_, url) => cite(url, 'Announcement — ' + date));
});
const notes = '\n  <!-- sources:start -->\n  <details class="bim-section source-details" id="sources">\n    <summary class="section-label" id="sources-title">Sources (' + sources.length + ')</summary>\n    <ol class="source-list">\n' + sources.map(({ url, label, n }) => `      <li id="source-${n}"><a href="${url}" rel="noopener">${label}</a> <a href="#cite-${n}" aria-label="Return to reference ${n}">↩</a></li>`).join('\n') + '\n    </ol>\n  </details>\n  <!-- sources:end -->\n';
// Preserve watch URLs for repeatable builds after replacing their visible links.
// Each watch item retains its source in a data attribute.
html = html.replace(/<li class="watch-item">([\s\S]*?)<\/li>/g, (all, body) => {
  const n = /href="#source-(\d+)"/.exec(body)?.[1];
  return n ? `<li class="watch-item" data-source="${sources[Number(n) - 1].url}">${body}</li>` : all;
});
const pricingNote = '    <p id="pricing-note">* Pricing accessed on <time datetime="2026-10-19">19 October 2026</time>. Prices are USD. Annual amounts are billed yearly; monthly amounts use monthly billing. Plan, region, taxes and license terms can affect the total. Qonic pricing varies by configuration. Autodesk Flex rates are tokens per day of use.</p>\n';
html = html.replace(/(<div class="page-footer">[\s\S]*?<\/div>)\s*/, (_, footer) => footer + '\n' + notes.replace('    <ol class="source-list">', pricingNote + '    <ol class="source-list">'));
html = html.replace(/[ \t]+$/gm, '');
writeFileSync(path, html);
console.log(`bim: ${sources.length} static source notes`);
