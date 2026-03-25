// ============================================================================
// architecture.tools — hardware data
// Edit this file to update all recommendations. The picker imports it.
// Updated March 2026.
// ============================================================================

var Data = {};

// ---- APPS ----
Data.Apps = {
  revit:       { group: 'modeling', platform: 'win' },
  archicad:    { group: 'modeling', platform: 'both' },
  vectorworks: { group: 'modeling', platform: 'both' },
  sketchup:    { group: 'modeling', platform: 'both' },
  rhino:       { group: 'modeling', platform: 'both' },
  autocad:     { group: 'drafting', platform: 'win' },
  enscape:     { group: 'viz',      platform: 'both' },
  lumion:      { group: 'viz',      platform: 'win' },
  d5:          { group: 'viz',      platform: 'win' },
  twinmotion:  { group: 'viz',      platform: 'both' },
  unreal:      { group: 'viz',      platform: 'win' },
  vray:        { group: 'render',   platform: 'both' },
  corona:      { group: 'render',   platform: 'both' },
};

Data.PickerOptions = {
  defaultState: {
    platform: 'win',
    scale: 'small',
    budget: 'value',
    mobileStrategy: 'one',
    deskMonitors: ['m5k27', 'm5k27'],
  },
  budgetOptions: [
    { id: 'cheapest', label: 'Cheapest', detail: 'Minimum spec that still makes sense' },
    { id: 'value',    label: 'Best Value', detail: '90% of the performance, better price' },
    { id: 'best',     label: 'Best Available', detail: 'Top tier, no compromise' },
  ],
};


// ============================================================================
// WINDOWS DESKTOP SPECS (build-your-own)
// Structure: workloadProfile -> projectScale (small|large) -> budgetTier
// budgetTier keys: cheapest, value, best
// Fields: cpu, cpuNote, gpu, gpuNote, ram, ramNote, storage, priceRange
// Prices reflect March 2026 US street prices.
// ============================================================================
Data.WindowsSpecs = {
  review: {
    small: {
      cheapest: { cpu: 'Intel Core Ultra 5 245K',  cpuNote: 'Minimum spend that still feels fast for office work', gpu: 'NVIDIA RTX 4060',    gpuNote: 'Only here to drive displays cleanly',      ram: '16 GB DDR5',  ramNote: '',                                          storage: '1 TB NVMe', priceRange: '$900--$1,100' },
      value:    { cpu: 'Intel Core Ultra 5 245K',  cpuNote: 'More than enough for documents',                     gpu: 'NVIDIA RTX 4060',    gpuNote: 'Viewport display only',                     ram: '32 GB DDR5',  ramNote: '',                                          storage: '1 TB NVMe', priceRange: '$1,100--$1,400' },
      best:     { cpu: 'Intel Core Ultra 7 265K',  cpuNote: 'Headroom for the future',                            gpu: 'NVIDIA RTX 4060',    gpuNote: 'Viewport display only',                     ram: '64 GB DDR5',  ramNote: '',                                          storage: '2 TB NVMe', priceRange: '$1,500--$1,800' },
    },
    large: {
      cheapest: { cpu: 'Intel Core Ultra 5 245K',  cpuNote: 'Enough for large document sets if budget is tight', gpu: 'NVIDIA RTX 4060',    gpuNote: 'Viewport display only',                     ram: '32 GB DDR5',  ramNote: 'Lets drawings, PDFs, and browser tabs coexist', storage: '1 TB NVMe', priceRange: '$1,100--$1,400' },
      value:    { cpu: 'Intel Core Ultra 7 265K',  cpuNote: 'Headroom for larger document sets',                  gpu: 'NVIDIA RTX 4060',    gpuNote: 'Viewport display only',                     ram: '64 GB DDR5',  ramNote: 'Larger reference sets open simultaneously', storage: '2 TB NVMe', priceRange: '$1,500--$1,800' },
      best:     { cpu: 'Intel Core Ultra 7 265K',  cpuNote: 'Same chip -- documents are not demanding',          gpu: 'NVIDIA RTX 4060',    gpuNote: 'Viewport display only',                     ram: '64 GB DDR5',  ramNote: '',                                          storage: '2 TB NVMe', priceRange: '$1,500--$1,800' },
    },
    priority: 'Your work is document-primary. The monitor is the most important purchase.'
  },
  drafting: {
    small: {
      cheapest: { cpu: 'Intel Core Ultra 5 245K',  cpuNote: 'Cheapest CPU I would still buy for CAD',            gpu: 'NVIDIA RTX 4060',    gpuNote: 'AutoCAD viewport is not demanding',         ram: '32 GB DDR5',  ramNote: '',                                          storage: '1 TB NVMe', priceRange: '$1,100--$1,400' },
      value:    { cpu: 'Intel Core Ultra 7 265K',  cpuNote: 'Best value for single-thread CAD',                  gpu: 'NVIDIA RTX 4060',    gpuNote: 'AutoCAD viewport is not demanding',         ram: '32 GB DDR5',  ramNote: '',                                          storage: '1 TB NVMe', priceRange: '$1,300--$1,600' },
      best:     { cpu: 'Intel Core Ultra 9 285K',  cpuNote: 'Top single-thread',                                 gpu: 'NVIDIA RTX 5070',    gpuNote: 'Comfortable headroom',                      ram: '64 GB DDR5',  ramNote: '',                                          storage: '2 TB NVMe', priceRange: '$2,200--$2,600' },
    },
    large: {
      cheapest: { cpu: 'Intel Core Ultra 7 265K',  cpuNote: 'Acceptable for larger xrefs if budget is tight',   gpu: 'NVIDIA RTX 4060',    gpuNote: 'Still enough for complex 2D work',          ram: '32 GB DDR5',  ramNote: 'Manageable if you avoid keeping everything open', storage: '1 TB NVMe', priceRange: '$1,400--$1,700' },
      value:    { cpu: 'Intel Core Ultra 7 265K',  cpuNote: 'Best value for single-thread CAD',                  gpu: 'NVIDIA RTX 4060',    gpuNote: 'AutoCAD viewport is not demanding',         ram: '64 GB DDR5',  ramNote: 'Large drawing sets with xrefs',             storage: '2 TB NVMe', priceRange: '$1,600--$1,900' },
      best:     { cpu: 'Intel Core Ultra 9 285K',  cpuNote: 'Faster regen on complex drawings',                  gpu: 'NVIDIA RTX 5070',    gpuNote: 'Comfortable headroom',                      ram: '64 GB DDR5',  ramNote: '',                                          storage: '2 TB NVMe', priceRange: '$2,400--$2,800' },
    },
    priority: '2D drafting is single-thread CPU bound but not demanding. Display quality matters more than compute.'
  },
  modeling: {
    small: {
      cheapest: { cpu: 'Intel Core Ultra 7 265K',  cpuNote: 'The floor for a modeling desktop that still feels good', gpu: 'NVIDIA RTX 4060',    gpuNote: 'Enough for modeling, light for viz',        ram: '32 GB DDR5',  ramNote: '',                                          storage: '1 TB NVMe', priceRange: '$1,600--$1,900' },
      value:    { cpu: 'Intel Core Ultra 7 265K',  cpuNote: 'Best value for Revit -- 90-95% of the 285K',       gpu: 'NVIDIA RTX 5070',    gpuNote: 'Transparent for modeling, ready for occasional Enscape', ram: '64 GB DDR5',  ramNote: '',                        storage: '2 TB NVMe', priceRange: '$1,900--$2,300' },
      best:     { cpu: 'Intel Core Ultra 9 285K',  cpuNote: 'Top single-thread -- view regen, family loading',  gpu: 'NVIDIA RTX 5070 Ti', gpuNote: 'Ready for viz if your role expands -- 16 GB VRAM', ram: '64 GB DDR5',  ramNote: '',                       storage: '2 TB NVMe', priceRange: '$2,600--$3,100' },
    },
    large: {
      cheapest: { cpu: 'Intel Core Ultra 7 265K',  cpuNote: 'Tight-budget choice for large linked models',      gpu: 'NVIDIA RTX 5070',    gpuNote: 'Enough for modeling, still not a viz-first build', ram: '64 GB DDR5', ramNote: 'The minimum I would buy for large-model work', storage: '2 TB NVMe', priceRange: '$2,100--$2,500' },
      value:    { cpu: 'Intel Core Ultra 9 285K',  cpuNote: 'Large models with linked consultants need top single-thread', gpu: 'NVIDIA RTX 5070',    gpuNote: 'Transparent for modeling', ram: '128 GB DDR5', ramNote: 'Multiple linked models open simultaneously', storage: '2 TB NVMe', priceRange: '$2,600--$3,100' },
      best:     { cpu: 'Intel Core Ultra 9 285K',  cpuNote: 'Top single-thread for complex view regeneration',   gpu: 'NVIDIA RTX 5070 Ti', gpuNote: 'Headroom for Enscape walkthroughs of large models', ram: '128 GB DDR5', ramNote: '500MB+ models with full consultant links', storage: '4 TB NVMe', priceRange: '$3,100--$3,700' },
    },
    priority: 'BIM modeling is single-thread CPU bound. Clock speed governs how Revit, Rhino, and SketchUp feel. The GPU is nearly invisible.'
  },
  viz: {
    small: {
      cheapest: { cpu: 'AMD Ryzen 7 9800X3D',  cpuNote: 'Strong scene handling without jumping to halo pricing', gpu: 'NVIDIA RTX 5070',    gpuNote: '12 GB VRAM is the cheapest point that still makes sense', ram: '32 GB DDR5',  ramNote: '',                                          storage: '1 TB NVMe', priceRange: '$1,900--$2,300' },
      value:    { cpu: 'AMD Ryzen 7 9800X3D',  cpuNote: 'Strong single-thread, excellent multi-thread for scene loading', gpu: 'NVIDIA RTX 5070 Ti', gpuNote: '16 GB VRAM -- the viz sweet spot at current prices', ram: '64 GB DDR5',  ramNote: '', storage: '2 TB NVMe', priceRange: '$2,400--$2,900' },
      best:     { cpu: 'AMD Ryzen 9 9950X',    cpuNote: '16-core -- scene loading and CPU-side rendering',       gpu: 'NVIDIA RTX 5090',    gpuNote: '32 GB VRAM -- maximum viz. Currently selling $2,900+ due to memory shortage', ram: '64 GB DDR5',  ramNote: '', storage: '2 TB NVMe', priceRange: '$4,500--$5,500' },
    },
    large: {
      cheapest: { cpu: 'AMD Ryzen 9 9950X',    cpuNote: 'The cheapest CPU I would trust for large viz scenes',   gpu: 'NVIDIA RTX 5070 Ti', gpuNote: '16 GB VRAM is the practical minimum at this scale', ram: '64 GB DDR5',  ramNote: 'You will need to manage scene size carefully', storage: '2 TB NVMe', priceRange: '$2,700--$3,200' },
      value:    { cpu: 'AMD Ryzen 9 9950X',    cpuNote: '16-core -- large scenes benefit from multi-thread',     gpu: 'NVIDIA RTX 5080',    gpuNote: '16 GB VRAM -- large scenes with heavy geometry', ram: '128 GB DDR5', ramNote: 'Viz software loads the full scene into RAM', storage: '2 TB NVMe', priceRange: '$3,200--$3,800' },
      best:     { cpu: 'AMD Ryzen 9 9950X',    cpuNote: 'Maximum multi-thread for complex scene handling',       gpu: 'NVIDIA RTX 5090',    gpuNote: '32 GB VRAM -- large scenes need VRAM headroom. $2,900+ street price', ram: '128 GB DDR5', ramNote: 'Running out of VRAM crashes the software', storage: '4 TB NVMe', priceRange: '$5,000--$6,000' },
    },
    priority: 'Interactive viz is GPU bound. Enscape, Lumion, D5, TwinMotion scale directly with GPU power and VRAM. GPU prices are inflated in early 2026 due to a GDDR7 memory shortage -- the 5070 Ti is the best value right now.'
  },
  modeling_viz: {
    small: {
      cheapest: { cpu: 'Intel Core Ultra 7 265K',  cpuNote: 'Cheapest balanced CPU for mixed modeling and viz',  gpu: 'NVIDIA RTX 5070',    gpuNote: 'Enough GPU to cross into real-time viz without overspending', ram: '64 GB DDR5',  ramNote: '', storage: '2 TB NVMe', priceRange: '$2,100--$2,500' },
      value:    { cpu: 'Intel Core Ultra 7 265K',  cpuNote: 'Best single-thread for Revit, strong enough for viz', gpu: 'NVIDIA RTX 5070 Ti', gpuNote: '16 GB VRAM -- handles both workflows', ram: '64 GB DDR5',  ramNote: '', storage: '2 TB NVMe', priceRange: '$2,300--$2,800' },
      best:     { cpu: 'AMD Ryzen 9 9950X',        cpuNote: '16-core -- strong single-thread plus serious multi-thread', gpu: 'NVIDIA RTX 5080',    gpuNote: '16 GB VRAM -- serious viz without the 5090 markup', ram: '64 GB DDR5',  ramNote: '', storage: '2 TB NVMe', priceRange: '$3,000--$3,600' },
    },
    large: {
      cheapest: { cpu: 'Intel Core Ultra 9 285K',  cpuNote: 'Budget-conscious choice for large mixed workloads', gpu: 'NVIDIA RTX 5070',    gpuNote: 'Will do the job, but this is where I stop cutting', ram: '64 GB DDR5',  ramNote: 'Enough for big models if you are disciplined', storage: '2 TB NVMe', priceRange: '$2,500--$3,000' },
      value:    { cpu: 'Intel Core Ultra 9 285K',  cpuNote: 'Large linked models need top single-thread',        gpu: 'NVIDIA RTX 5070 Ti', gpuNote: '16 GB VRAM -- large model viz',             ram: '128 GB DDR5', ramNote: 'Modeling plus viz open simultaneously eats memory', storage: '2 TB NVMe', priceRange: '$2,800--$3,400' },
      best:     { cpu: 'AMD Ryzen 9 9950X',        cpuNote: 'Best all-around for large models plus heavy viz',   gpu: 'NVIDIA RTX 5090',    gpuNote: '32 GB VRAM -- no compromises. $2,900+ street price', ram: '128 GB DDR5', ramNote: '', storage: '4 TB NVMe', priceRange: '$5,000--$6,000' },
    },
    priority: 'You need both: fast single-core for modeling and a capable GPU for viz. The 5070 Ti at ~$1,000 is the honest sweet spot in early 2026.'
  },
  production: {
    small: {
      cheapest: { cpu: 'AMD Ryzen 9 9900X', cpuNote: '12 cores is the floor for a render box that still makes sense', gpu: 'NVIDIA RTX 5070',    gpuNote: 'Enough for GPU hybrid rendering without overspending', ram: '64 GB DDR5',  ramNote: '', storage: '2 TB NVMe', priceRange: '$2,300--$2,800' },
      value:    { cpu: 'AMD Ryzen 9 9950X', cpuNote: '16-core -- best for CPU rendering plus strong single-thread',   gpu: 'NVIDIA RTX 5070 Ti', gpuNote: 'GPU hybrid rendering plus viz -- 16 GB VRAM', ram: '64 GB DDR5',  ramNote: '', storage: '2 TB NVMe', priceRange: '$2,600--$3,100' },
      best:     { cpu: 'AMD Ryzen 9 9950X', cpuNote: '16-core -- still the right chip at top budget',               gpu: 'NVIDIA RTX 5090',    gpuNote: '32 GB VRAM -- GPU hybrid at maximum. $2,900+ street price', ram: '128 GB DDR5', ramNote: '', storage: '4 TB NVMe', priceRange: '$5,000--$6,000' },
    },
    large: {
      cheapest: { cpu: 'AMD Ryzen 9 9950X', cpuNote: 'The cheapest CPU I would trust for large production scenes',  gpu: 'NVIDIA RTX 5070 Ti', gpuNote: 'Still enough VRAM for serious hybrid rendering work', ram: '64 GB DDR5',  ramNote: 'You will need to manage scene size more carefully', storage: '2 TB NVMe', priceRange: '$2,900--$3,400' },
      value:    { cpu: 'AMD Ryzen 9 9950X', cpuNote: '16-core -- large scenes render longer, cores matter more',    gpu: 'NVIDIA RTX 5080',    gpuNote: '16 GB VRAM -- large scene GPU rendering',   ram: '128 GB DDR5', ramNote: 'V-Ray loads the full scene into RAM before rendering', storage: '4 TB NVMe', priceRange: '$3,400--$4,000' },
      best:     { cpu: 'AMD Ryzen 9 9950X', cpuNote: 'Maximum cores for production rendering',                      gpu: 'NVIDIA RTX 5090',    gpuNote: '32 GB VRAM -- no scene too large. $2,900+ street price', ram: '128 GB DDR5', ramNote: '', storage: '4 TB NVMe', priceRange: '$5,200--$6,200' },
    },
    priority: 'V-Ray and Corona are multi-thread CPU bound with GPU hybrid modes. The Ryzen 9 9950X leads. Note: the 5090 is severely marked up in early 2026. The 5080 is the better value for GPU hybrid rendering right now.'
  }
};


// ============================================================================
// MAC DESKTOP SPECS
// Structure: workloadProfile -> projectScale (small|large) -> budgetTier
// budgetTier keys: cheapest, value, best
// ============================================================================
Data.MacSpecs = {
  review: {
    small: {
      cheapest: { chip: 'Mac Mini -- M4',        cpuNote: 'Quiet, small, and enough for documents',                    memory: '16 GB unified',  storage: '512 GB SSD', price: '$800--$1,000' },
      value:    { chip: 'Mac Mini -- M4 Pro',    cpuNote: 'More than enough for documents',                            memory: '24 GB unified',  storage: '512 GB SSD', price: '$1,400--$1,600' },
      best:     { chip: 'Mac Mini -- M4 Pro',    cpuNote: 'Same chip -- no need to go higher',                         memory: '48 GB unified',  storage: '1 TB SSD',   price: '$1,800--$2,000' },
    },
    large: {
      cheapest: { chip: 'Mac Mini -- M4',        cpuNote: '24 GB is the floor once file sizes grow',                   memory: '24 GB unified',  storage: '512 GB SSD', price: '$1,000--$1,200' },
      value:    { chip: 'Mac Mini -- M4 Pro',    cpuNote: 'Same chip -- documents are not demanding at any scale',    memory: '48 GB unified',  storage: '1 TB SSD',   price: '$1,800--$2,000' },
      best:     { chip: 'Mac Mini -- M4 Pro',    cpuNote: 'Same chip -- display matters more',                         memory: '48 GB unified',  storage: '1 TB SSD',   price: '$1,800--$2,000' },
    },
    priority: 'Document-primary. The display matters more than the Mac.'
  },
  drafting: {
    small: {
      cheapest: { chip: 'Mac Mini -- M4 Pro',    cpuNote: 'The cheapest Mac desktop I would still buy for CAD',        memory: '24 GB unified',  storage: '512 GB SSD', price: '$1,400--$1,600' },
      value:    { chip: 'Mac Mini -- M4 Pro',    cpuNote: 'Strong single-thread for 2D CAD',                           memory: '24 GB unified',  storage: '1 TB SSD',   price: '$1,600--$1,800' },
      best:     { chip: 'Mac Studio -- M4 Max',  cpuNote: 'Headroom for larger drawings',                              memory: '36 GB unified',  storage: '1 TB SSD',   price: '$2,000--$2,400' },
    },
    large: {
      cheapest: { chip: 'Mac Mini -- M4 Pro',    cpuNote: 'Still workable for big drawing sets if budget is tight',   memory: '24 GB unified',  storage: '1 TB SSD',   price: '$1,600--$1,800' },
      value:    { chip: 'Mac Studio -- M4 Max',  cpuNote: 'Large drawing sets with many xrefs',                        memory: '36 GB unified',  storage: '1 TB SSD',   price: '$2,000--$2,400' },
      best:     { chip: 'Mac Studio -- M4 Max',  cpuNote: 'Headroom for complex drawings and multitasking',            memory: '64 GB unified',  storage: '2 TB SSD',   price: '$2,800--$3,200' },
    },
    priority: '2D drafting on Mac is well-served by the M4 Pro.'
  },
  modeling: {
    small: {
      cheapest: { chip: 'Mac Mini -- M4 Pro',    cpuNote: 'Acceptable for ArchiCAD, Rhino, and SketchUp if models stay moderate', memory: '48 GB unified',  storage: '1 TB SSD', price: '$1,800--$2,100' },
      value:    { chip: 'Mac Studio -- M4 Max',  cpuNote: 'Strong GPU cores for ArchiCAD/Rhino/SketchUp',             memory: '36 GB unified',  storage: '1 TB SSD',   price: '$2,000--$2,400' },
      best:     { chip: 'Mac Studio -- M4 Max',  cpuNote: 'More memory for larger models',                            memory: '64 GB unified',  storage: '2 TB SSD',   price: '$2,800--$3,200' },
    },
    large: {
      cheapest: { chip: 'Mac Studio -- M4 Max',  cpuNote: 'The minimum Mac desktop I would buy for large models',     memory: '48 GB unified',  storage: '1 TB SSD',   price: '$2,400--$2,800' },
      value:    { chip: 'Mac Studio -- M4 Max',  cpuNote: 'Large models need memory and GPU bandwidth',               memory: '64 GB unified',  storage: '2 TB SSD',   price: '$2,800--$3,200' },
      best:     { chip: 'Mac Studio -- M4 Ultra', cpuNote: 'Large complex models benefit from Ultra GPU cores',       memory: '128 GB unified', storage: '2 TB SSD',   price: '$4,000--$5,000' },
    },
    priority: 'ArchiCAD, Vectorworks, SketchUp, Rhino v8 all run on Mac. Performance scales with GPU cores and unified memory.'
  },
  viz: {
    small: {
      cheapest: { chip: 'Mac Studio -- M4 Max',  cpuNote: 'Cheapest Mac desktop I would still call a viz machine',    memory: '48 GB unified',  storage: '1 TB SSD',   price: '$2,300--$2,700' },
      value:    { chip: 'Mac Studio -- M4 Max',  cpuNote: 'Enough for Enscape/TwinMotion at SFR scale',               memory: '64 GB unified',  storage: '1 TB SSD',   price: '$2,500--$3,000' },
      best:     { chip: 'Mac Studio -- M4 Ultra', cpuNote: 'Maximum GPU cores and bandwidth',                         memory: '128 GB unified', storage: '2 TB SSD',   price: '$4,000--$5,000' },
    },
    large: {
      cheapest: { chip: 'Mac Studio -- M4 Ultra', cpuNote: 'Large scenes really do need the Ultra tier on Mac',      memory: '96 GB unified',  storage: '2 TB SSD',   price: '$3,600--$4,300' },
      value:    { chip: 'Mac Studio -- M4 Ultra', cpuNote: 'Large scenes need maximum GPU cores',                     memory: '128 GB unified', storage: '2 TB SSD',   price: '$4,000--$5,000' },
      best:     { chip: 'Mac Studio -- M4 Ultra', cpuNote: 'Maximum config for large scene visualization',            memory: '192 GB unified', storage: '4 TB SSD',   price: '$5,500--$7,000' },
    },
    priority: 'Enscape works on Mac. TwinMotion runs via Rosetta. Lumion and D5 are Windows-only.'
  },
  modeling_viz: {
    small: {
      cheapest: { chip: 'Mac Studio -- M4 Max',  cpuNote: 'Cheapest balanced Mac for modeling plus viz',              memory: '48 GB unified',  storage: '1 TB SSD',   price: '$2,500--$2,900' },
      value:    { chip: 'Mac Studio -- M4 Max',  cpuNote: 'Balanced for modeling and viz',                            memory: '64 GB unified',  storage: '2 TB SSD',   price: '$2,800--$3,200' },
      best:     { chip: 'Mac Studio -- M4 Ultra', cpuNote: 'Maximum headroom for both workflows',                     memory: '128 GB unified', storage: '2 TB SSD',   price: '$4,000--$5,000' },
    },
    large: {
      cheapest: { chip: 'Mac Studio -- M4 Max',  cpuNote: 'Budget-conscious choice for large mixed workloads',        memory: '64 GB unified',  storage: '2 TB SSD',   price: '$2,800--$3,200' },
      value:    { chip: 'Mac Studio -- M4 Ultra', cpuNote: 'Large models plus viz need Ultra GPU cores',             memory: '128 GB unified', storage: '2 TB SSD',   price: '$4,000--$5,000' },
      best:     { chip: 'Mac Studio -- M4 Ultra', cpuNote: 'Maximum config for large-scale modeling and viz',        memory: '192 GB unified', storage: '4 TB SSD',   price: '$5,500--$7,000' },
    },
    priority: 'Unified memory serves as both RAM and VRAM.'
  },
  production: {
    small: {
      cheapest: { chip: 'Mac Studio -- M4 Max',  cpuNote: 'Entry point if you insist on Mac for rendering',           memory: '64 GB unified',  storage: '2 TB SSD',   price: '$3,200--$3,800' },
      value:    { chip: 'Mac Studio -- M4 Ultra', cpuNote: 'Maximum cores for V-Ray CPU plus Metal GPU',             memory: '128 GB unified', storage: '2 TB SSD',   price: '$4,000--$5,000' },
      best:     { chip: 'Mac Studio -- M4 Ultra', cpuNote: 'Maximum config',                                          memory: '192 GB unified', storage: '4 TB SSD',   price: '$5,500--$7,000' },
    },
    large: {
      cheapest: { chip: 'Mac Studio -- M4 Ultra', cpuNote: 'The cheapest Mac desktop I would trust for large renders', memory: '128 GB unified', storage: '2 TB SSD',  price: '$4,000--$5,000' },
      value:    { chip: 'Mac Studio -- M4 Ultra', cpuNote: 'Large scenes need max memory for rendering',             memory: '192 GB unified', storage: '4 TB SSD',   price: '$5,500--$7,000' },
      best:     { chip: 'Mac Studio -- M4 Ultra', cpuNote: 'Maximum everything -- still slower than a mid-range Windows PC with an RTX 4070 for V-Ray', memory: '192 GB unified', storage: '4 TB SSD', price: '$5,500--$7,000' },
    },
    priority: 'V-Ray supports Metal GPU since V-Ray 7. A mid-range Windows PC with an RTX 4070 still outrenders a maxed Mac Studio. Mac wins on ecosystem, display, and silence.'
  }
};


// ============================================================================
// PREBUILT DESKTOPS
// Organized by machine type. Each entry has the workloads it fits, pricing,
// and optional recommendation badges by workload profile and budget tier.
// ============================================================================
Data.Prebuilts = [
  // ---- Mini PCs (review, drafting, light modeling) ----
  { type: 'mini',        name: 'ASUS ExpertCenter PB64',         price: '$600--$900',     note: 'Core Ultra 5/7, up to 64 GB DDR5, quad 4K display. VESA mounts behind a monitor. Silent.', workloadProfiles: ['review', 'drafting'],             recommendedFor: { review: { value: true } } },
  { type: 'mini',        name: 'ASUS ExpertCenter PN55',         price: '$600--$800',     note: 'AMD Ryzen AI 400, Radeon 800M, quad 4K. Shipping Q2 2026.',                                 workloadProfiles: ['review', 'drafting'],             recommendedFor: { review: { cheapest: true }, drafting: { cheapest: true } } },
  { type: 'mini',        name: 'Intel NUC 14 Pro',               price: '$550--$850',     note: 'Core Ultra, compact, Thunderbolt 4. Good dock ecosystem.',                                   workloadProfiles: ['review', 'drafting'],             recommendedFor: {} },
  { type: 'mini',        name: 'Lenovo ThinkCentre Tiny (M90q)', price: '$700--$1,000',   note: 'Core Ultra 7, vPro, 64 GB max. IT-managed fleets.',                                         workloadProfiles: ['review', 'drafting'],             recommendedFor: { review: { best: true } } },
  { type: 'mini',        name: 'Mac Mini M4 Pro',                price: '$1,400--$2,000', note: '24-48 GB unified. The Mac mini PC.',                                                         workloadProfiles: ['review', 'drafting', 'modeling'], recommendedFor: {} },

  // ---- Office towers (drafting, modeling -- optional GPU) ----
  { type: 'office',      name: 'Lenovo ThinkCentre Neo 50t',     price: '$800--$1,200',   note: 'i5/i7, 32 GB, has PCIe x16 slot. Add an RTX 4060 ($300) for viewport acceleration.',       workloadProfiles: ['review', 'drafting', 'modeling'], recommendedFor: { drafting: { value: true } } },
  { type: 'office',      name: 'Dell Inspiron Tower (Plus)',     price: '$900--$1,400',   note: 'Core Ultra, up to RTX 4060 from factory. Solid value.',                                      workloadProfiles: ['review', 'drafting', 'modeling'], recommendedFor: { modeling: { cheapest: true } } },
  { type: 'office',      name: 'HP ProDesk Tower 400/600',       price: '$800--$1,200',   note: 'Core i7, optional RTX A400. A commodity box -- reliable, boring, cheap.',                  workloadProfiles: ['review', 'drafting'],             recommendedFor: { drafting: { cheapest: true } } },

  // ---- Entry workstations (modeling, light viz) ----
  { type: 'workstation', name: 'Dell Pro Max Tower T2',          price: '$1,300--$2,500', note: 'Core Ultra 5/7/9, unlimited turbo duration, ISV certified. RTX Pro GPUs only -- no GeForce.', workloadProfiles: ['review', 'drafting', 'modeling'], recommendedFor: { modeling: { value: true } } },
  { type: 'workstation', name: 'HP Z2 Tower G9 / G10',           price: '$1,200--$2,500', note: 'Core i7/i9 or Core Ultra, ISV certified. Quiet. RTX A-series GPUs.',                        workloadProfiles: ['review', 'drafting', 'modeling'], recommendedFor: {} },
  { type: 'workstation', name: 'Lenovo ThinkStation P3 Tower',   price: '$1,200--$2,500', note: 'Core i7/i9 or Core Ultra 7, 128 GB max, RTX Ada GPUs. ThinkStation reliability.',             workloadProfiles: ['review', 'drafting', 'modeling'], recommendedFor: { modeling: { best: true } } },

  // ---- Gaming desktops (viz, production -- real GPUs) ----
  { type: 'gaming',      name: 'ASUS ROG G16CH',                 price: '$1,800--$2,500', note: 'RTX 5070 Ti, 850W PSU, good airflow. Looks like a gaming PC because it is one.',             workloadProfiles: ['modeling', 'viz', 'modeling_viz', 'production'], recommendedFor: { viz: { value: true }, modeling_viz: { value: true } } },
  { type: 'gaming',      name: 'MSI MAG Infinite S3',            price: '$1,600--$2,200', note: 'RTX 5070/5070 Ti, clean design, 750W PSU. Less gamer aesthetic than most.',                  workloadProfiles: ['modeling', 'viz', 'modeling_viz', 'production'], recommendedFor: { viz: { cheapest: true }, modeling_viz: { cheapest: true } } },
  { type: 'gaming',      name: 'CyberPowerPC Gamer Xtreme',      price: '$1,500--$2,200', note: 'Configurable. Order with an RTX 5070 Ti and 64 GB. Cheapest path to a real GPU.',              workloadProfiles: ['modeling', 'viz', 'modeling_viz', 'production'], recommendedFor: { production: { cheapest: true, value: true }, viz: { cheapest: true }, modeling_viz: { cheapest: true } } },
  { type: 'gaming',      name: 'iBuyPower / NZXT BLD',           price: '$1,800--$2,800', note: 'Custom config. Pick your CPU, GPU, RAM. Cleaner builds than CyberPowerPC.',                  workloadProfiles: ['viz', 'modeling_viz', 'production'], recommendedFor: { viz: { best: true }, modeling_viz: { best: true }, production: { best: true } } },
];

Data.PrebuiltTypeLabels = {
  mini:        'Mini PC',
  office:      'Office Tower',
  workstation: 'Entry Workstation',
  gaming:      'Gaming Desktop',
};

Data.PrebuiltTypeNotes = {
  mini:        'Silent, tiny, no discrete GPU. Drives 2-4 monitors on integrated graphics. Perfect for document review, drafting, and light modeling.',
  office:      'Standard office tower. Some accept a low-power GPU (RTX 4060 class, 115W). Good for drafting and modeling. Cannot fit a high-end GPU.',
  workstation: 'ISV-certified, vPro, ECC optional. Real support. RTX Pro (not GeForce) GPUs -- fine for modeling, underpowered for serious viz.',
  gaming:      'When you need a real GPU, buy a gaming desktop. 850W PSU, triple-slot GPU clearance, proper cooling. Outperforms a $4,000 workstation for Enscape/Lumion/V-Ray at half the price.',
};


// ============================================================================
// MONITORS
// ============================================================================
Data.Monitors = [
  { id: 'm5k27', name: '27" 5K',         price: 800,  platform: 'both', width: 39, height: 25 },
  { id: 'm6k32', name: '32" 6K',         price: 1300, platform: 'both', width: 46, height: 29 },
  { id: 'm4k27', name: '27" 4K',         price: 500,  platform: 'both', width: 39, height: 24 },
  { id: 'm4k24', name: '24" 4K',         price: 350,  platform: 'both', width: 34, height: 22 },
  { id: 'muw34', name: '34" UW',         price: 1000, platform: 'win',  width: 52, height: 22 },
  { id: 'masd',  name: 'Studio Display', price: 1600, platform: 'both', width: 39, height: 25 },
];


// ============================================================================
// LAPTOPS
// category: one (one-machine), desk (desk-bound), travel, student,
// mac_p (Mac primary), mac_s (Mac student)
// ============================================================================
Data.Laptops = [
  { category: 'one',     platform: 'win', name: 'HP ZBook Ultra G1a',                 price: '$3,500--$4,500', weight: '3.3 lbs', note: 'AMD Strix Halo, OLED, 128 GB unified. Battery is the weakness.', workloadProfiles: ['review', 'drafting', 'modeling', 'viz', 'modeling_viz'], recommendedFor: { review: { best: true }, drafting: { value: true } } },
  { category: 'one',     platform: 'win', name: 'Lenovo ThinkPad P1 Gen 8',           price: '$2,800--$3,400', weight: '3.8 lbs', note: 'Arrow Lake, RTX Pro 2000, CAMM2, tandem OLED. Best keyboard.',   workloadProfiles: ['drafting', 'modeling', 'modeling_viz'], recommendedFor: { drafting: { best: true }, modeling: { best: true }, modeling_viz: { value: true } } },
  { category: 'one',     platform: 'win', name: 'Asus ProArt P16',                    price: '$2,200--$2,600', weight: '4.2 lbs', note: 'OLED, creator-focused. Strong one-machine candidate.',           workloadProfiles: ['review', 'drafting', 'modeling', 'modeling_viz'], recommendedFor: { modeling: { value: true } } },
  { category: 'one',     platform: 'win', name: 'Asus ROG Zephyrus G16',              price: '$2,000--$2,500', weight: '4.1 lbs', note: 'Good thermals, strong display, lighter than workstations.',      workloadProfiles: ['drafting', 'modeling', 'viz', 'modeling_viz'], recommendedFor: { viz: { cheapest: true }, modeling_viz: { cheapest: true } } },
  { category: 'one',     platform: 'win', name: 'Asus ROG Zephyrus G14',              price: '$1,800--$2,200', weight: '3.3 lbs', note: 'Serious power in 14".',                                          workloadProfiles: ['drafting', 'modeling'], recommendedFor: { modeling: { cheapest: true } } },
  { category: 'one',     platform: 'win', name: 'Razer Blade 16',                     price: '$2,500--$3,200', weight: '4.6 lbs', note: 'Premium build, OLED option. Support is mixed.',                  workloadProfiles: ['modeling', 'viz', 'modeling_viz'], recommendedFor: {} },
  { category: 'desk',    platform: 'win', name: 'Lenovo Legion Pro 7i',               price: '$2,200--$2,800', weight: '5.5 lbs', note: 'RTX 5070 Ti, OLED. Incredible value. Loud. Desk-only.',          workloadProfiles: ['viz', 'modeling_viz', 'production'], recommendedFor: { viz: { value: true }, production: { value: true } } },
  { category: 'desk',    platform: 'win', name: 'Lenovo ThinkPad P16 Gen 3',          price: '$3,800--$4,500', weight: '5.8 lbs', note: 'Flagship ThinkPad. RTX Pro 5000, up to 192 GB.',                 workloadProfiles: ['modeling_viz', 'production'], recommendedFor: { modeling_viz: { best: true } } },
  { category: 'desk',    platform: 'win', name: 'HP ZBook Fury 16 G1i',               price: '$4,000--$4,800', weight: '6.0 lbs', note: '280W adapter. Best sustained rendering thermals.',               workloadProfiles: ['viz', 'modeling_viz', 'production'], recommendedFor: { viz: { best: true }, production: { best: true } } },
  { category: 'desk',    platform: 'win', name: 'Dell Pro Max 16 Plus',               price: '$3,500--$4,200', weight: '5.6 lbs', note: 'Intel HX, RTX Pro 5000. AEC Magazine rates highly.',             workloadProfiles: ['viz', 'modeling_viz', 'production'], recommendedFor: {} },
  { category: 'travel',  platform: 'win', name: 'Lenovo ThinkPad X1 Carbon Gen 13',   price: '$1,500--$1,800', weight: '2.5 lbs', note: 'The standard ultraportable. All-day battery.',                     workloadProfiles: ['review', 'drafting'], recommendedFor: { review: { value: true } } },
  { category: 'student', platform: 'win', name: 'Asus TUF Gaming A16',                price: '$1,000--$1,400', weight: '4.8 lbs', note: 'RTX 4060. Durable, affordable.',                                workloadProfiles: ['modeling', 'viz', 'modeling_viz', 'drafting', 'review'], recommendedFor: { modeling: { cheapest: true } } },
  { category: 'student', platform: 'win', name: 'Lenovo LOQ 16',                      price: '$900--$1,200',   weight: '5.2 lbs', note: 'Good configurability, upgradeable.',                                     workloadProfiles: ['modeling', 'drafting', 'review'], recommendedFor: { review: { cheapest: true }, drafting: { cheapest: true } } },
  { category: 'student', platform: 'win', name: 'Acer Predator Helios 16',            price: '$1,400--$1,800', weight: '5.5 lbs', note: 'High-wattage GPU. Studios that demand viz.',                     workloadProfiles: ['viz', 'modeling_viz', 'production'], recommendedFor: { viz: { cheapest: true }, production: { cheapest: true } } },
  { category: 'mac_p',   platform: 'mac', name: 'MacBook Air 15" M4',                 price: '$1,300--$1,500', weight: '3.3 lbs', note: 'Fanless, all-day battery. Docs and light drafting.',             workloadProfiles: ['review', 'drafting'], recommendedFor: { review: { value: true } } },
  { category: 'mac_p',   platform: 'mac', name: 'MacBook Pro 14" M4 Pro',             price: '$2,400--$2,800', weight: '3.5 lbs', note: 'Mac workhorse. ArchiCAD/Rhino/SketchUp.',                       workloadProfiles: ['drafting', 'modeling', 'modeling_viz'], recommendedFor: { drafting: { value: true, best: true }, modeling: { value: true } } },
  { category: 'mac_p',   platform: 'mac', name: 'MacBook Pro 16" M4 Pro',             price: '$2,800--$3,200', weight: '4.7 lbs', note: 'More screen, more power. One-machine for Mac.',                 workloadProfiles: ['modeling', 'viz', 'modeling_viz'], recommendedFor: { modeling: { best: true }, modeling_viz: { value: true } } },
  { category: 'mac_p',   platform: 'mac', name: 'MacBook Pro 16" M4 Max',             price: '$3,800--$4,800', weight: '4.7 lbs', note: '64-128 GB unified. Serious Enscape and V-Ray Metal.',           workloadProfiles: ['viz', 'modeling_viz', 'production'], recommendedFor: { viz: { value: true, best: true }, modeling_viz: { best: true }, production: { value: true, best: true } } },
  { category: 'mac_s',   platform: 'mac', name: 'MacBook Air 13" M4',                 price: '$1,100--$1,300', weight: '2.7 lbs', note: 'Budget Mac. Small screen -- dock to a monitor.',                workloadProfiles: ['review', 'drafting', 'modeling'], recommendedFor: { review: { cheapest: true } } },
  { category: 'mac_s',   platform: 'mac', name: 'MacBook Pro 14" M4',                 price: '$1,600--$1,800', weight: '3.4 lbs', note: 'Base Pro. Better sustained perf than Air.',                     workloadProfiles: ['modeling', 'drafting', 'viz'], recommendedFor: { drafting: { cheapest: true }, modeling: { cheapest: true }, viz: { cheapest: true } } },
];

Data.LaptopCategoryLabels = {
  one:     'One-Machine Solution',
  desk:    'Desk-Bound Powerhouses',
  travel:  'Document / Travel',
  student: 'Student',
  mac_p:   'MacBook',
  mac_s:   'Student',
};
