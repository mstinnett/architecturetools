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


// ============================================================================
// WINDOWS DESKTOP SPECS (build-your-own)
// Keys: LowValue, LowBest, HighValue, HighBest
// Fields: cpu, cpuNote, gpu, gpuNote, ram, ramNote, storage, priceRange
// Prices reflect March 2026 US street prices.
// ============================================================================
Data.WindowsSpecs = {
  review: {
    LowValue:  { cpu: 'Intel Core Ultra 5 245K',  cpuNote: 'More than enough for documents',            gpu: 'NVIDIA RTX 4060',    gpuNote: 'Viewport display only',     ram: '32 GB DDR5', ramNote: '',                                          storage: '1 TB NVMe', priceRange: '$1,100--$1,400' },
    LowBest:   { cpu: 'Intel Core Ultra 7 265K',  cpuNote: 'Headroom for the future',                   gpu: 'NVIDIA RTX 4060',    gpuNote: 'Viewport display only',     ram: '64 GB DDR5', ramNote: '',                                          storage: '2 TB NVMe', priceRange: '$1,500--$1,800' },
    HighValue: { cpu: 'Intel Core Ultra 7 265K',  cpuNote: 'Headroom for larger document sets',          gpu: 'NVIDIA RTX 4060',    gpuNote: 'Viewport display only',     ram: '64 GB DDR5', ramNote: 'Larger reference sets open simultaneously', storage: '2 TB NVMe', priceRange: '$1,500--$1,800' },
    HighBest:  { cpu: 'Intel Core Ultra 7 265K',  cpuNote: 'Same chip -- documents are not demanding',   gpu: 'NVIDIA RTX 4060',    gpuNote: 'Viewport display only',     ram: '64 GB DDR5', ramNote: '',                                          storage: '2 TB NVMe', priceRange: '$1,500--$1,800' },
    priority: 'Your work is document-primary. The monitor is the most important purchase.'
  },
  drafting: {
    LowValue:  { cpu: 'Intel Core Ultra 7 265K',  cpuNote: 'Best value for single-thread CAD',           gpu: 'NVIDIA RTX 4060',    gpuNote: 'AutoCAD viewport is not demanding', ram: '32 GB DDR5', ramNote: '',                         storage: '1 TB NVMe', priceRange: '$1,300--$1,600' },
    LowBest:   { cpu: 'Intel Core Ultra 9 285K',  cpuNote: 'Top single-thread',                          gpu: 'NVIDIA RTX 5070',    gpuNote: 'Comfortable headroom',              ram: '64 GB DDR5', ramNote: '',                         storage: '2 TB NVMe', priceRange: '$2,200--$2,600' },
    HighValue: { cpu: 'Intel Core Ultra 7 265K',  cpuNote: 'Best value for single-thread CAD',           gpu: 'NVIDIA RTX 4060',    gpuNote: 'AutoCAD viewport is not demanding', ram: '64 GB DDR5', ramNote: 'Large drawing sets with xrefs', storage: '2 TB NVMe', priceRange: '$1,600--$1,900' },
    HighBest:  { cpu: 'Intel Core Ultra 9 285K',  cpuNote: 'Faster regen on complex drawings',           gpu: 'NVIDIA RTX 5070',    gpuNote: 'Comfortable headroom',              ram: '64 GB DDR5', ramNote: '',                         storage: '2 TB NVMe', priceRange: '$2,400--$2,800' },
    priority: '2D drafting is single-thread CPU bound but not demanding. Display quality matters more than compute.'
  },
  modeling: {
    LowValue:  { cpu: 'Intel Core Ultra 7 265K',  cpuNote: 'Best value for Revit -- 90-95% of the 285K',                  gpu: 'NVIDIA RTX 5070',    gpuNote: 'Transparent for modeling, ready for occasional Enscape',          ram: '64 GB DDR5',  ramNote: '',                                         storage: '2 TB NVMe', priceRange: '$1,900--$2,300' },
    LowBest:   { cpu: 'Intel Core Ultra 9 285K',  cpuNote: 'Top single-thread -- view regen, family loading',             gpu: 'NVIDIA RTX 5070 Ti', gpuNote: 'Ready for viz if your role expands -- 16 GB VRAM',                ram: '64 GB DDR5',  ramNote: '',                                         storage: '2 TB NVMe', priceRange: '$2,600--$3,100' },
    HighValue: { cpu: 'Intel Core Ultra 9 285K',  cpuNote: 'Large models with linked consultants need top single-thread',  gpu: 'NVIDIA RTX 5070',    gpuNote: 'Transparent for modeling',                                       ram: '128 GB DDR5', ramNote: 'Multiple linked models open simultaneously', storage: '2 TB NVMe', priceRange: '$2,600--$3,100' },
    HighBest:  { cpu: 'Intel Core Ultra 9 285K',  cpuNote: 'Top single-thread for complex view regeneration',             gpu: 'NVIDIA RTX 5070 Ti', gpuNote: 'Headroom for Enscape walkthroughs of large models',              ram: '128 GB DDR5', ramNote: '500MB+ models with full consultant links', storage: '4 TB NVMe', priceRange: '$3,100--$3,700' },
    priority: 'BIM modeling is single-thread CPU bound. Clock speed governs how Revit, Rhino, and SketchUp feel. The GPU is nearly invisible.'
  },
  viz: {
    LowValue:  { cpu: 'AMD Ryzen 7 9800X3D',  cpuNote: 'Strong single-thread, excellent multi-thread for scene loading',  gpu: 'NVIDIA RTX 5070 Ti', gpuNote: '16 GB VRAM -- the viz sweet spot at current prices',                       ram: '64 GB DDR5',  ramNote: '',                                         storage: '2 TB NVMe', priceRange: '$2,400--$2,900' },
    LowBest:   { cpu: 'AMD Ryzen 9 9950X',    cpuNote: '16-core -- scene loading and CPU-side rendering',                 gpu: 'NVIDIA RTX 5090',    gpuNote: '32 GB VRAM -- maximum viz. Currently selling $2,900+ due to memory shortage', ram: '64 GB DDR5',  ramNote: '',                                     storage: '2 TB NVMe', priceRange: '$4,500--$5,500' },
    HighValue: { cpu: 'AMD Ryzen 9 9950X',    cpuNote: '16-core -- large scenes benefit from multi-thread',               gpu: 'NVIDIA RTX 5080',    gpuNote: '16 GB VRAM -- large scenes with heavy geometry',                             ram: '128 GB DDR5', ramNote: 'Viz software loads the full scene into RAM', storage: '2 TB NVMe', priceRange: '$3,200--$3,800' },
    HighBest:  { cpu: 'AMD Ryzen 9 9950X',    cpuNote: 'Maximum multi-thread for complex scene handling',                 gpu: 'NVIDIA RTX 5090',    gpuNote: '32 GB VRAM -- large scenes need VRAM headroom. $2,900+ street price',       ram: '128 GB DDR5', ramNote: 'Running out of VRAM crashes the software', storage: '4 TB NVMe', priceRange: '$5,000--$6,000' },
    priority: 'Interactive viz is GPU bound. Enscape, Lumion, D5, TwinMotion scale directly with GPU power and VRAM. GPU prices are inflated in early 2026 due to a GDDR7 memory shortage -- the 5070 Ti is the best value right now.'
  },
  modeling_viz: {
    LowValue:  { cpu: 'Intel Core Ultra 7 265K',  cpuNote: 'Best single-thread for Revit, strong enough for viz',                 gpu: 'NVIDIA RTX 5070 Ti', gpuNote: '16 GB VRAM -- handles both workflows',                               ram: '64 GB DDR5',  ramNote: '',                                                    storage: '2 TB NVMe', priceRange: '$2,300--$2,800' },
    LowBest:   { cpu: 'AMD Ryzen 9 9950X',        cpuNote: '16-core -- strong single-thread plus serious multi-thread',           gpu: 'NVIDIA RTX 5080',    gpuNote: '16 GB VRAM -- serious viz without the 5090 markup',                  ram: '64 GB DDR5',  ramNote: '',                                                    storage: '2 TB NVMe', priceRange: '$3,000--$3,600' },
    HighValue: { cpu: 'Intel Core Ultra 9 285K',   cpuNote: 'Large linked models need top single-thread',                          gpu: 'NVIDIA RTX 5070 Ti', gpuNote: '16 GB VRAM -- large model viz',                                      ram: '128 GB DDR5', ramNote: 'Modeling plus viz open simultaneously eats memory',    storage: '2 TB NVMe', priceRange: '$2,800--$3,400' },
    HighBest:  { cpu: 'AMD Ryzen 9 9950X',        cpuNote: 'Best all-around for large models plus heavy viz',                     gpu: 'NVIDIA RTX 5090',    gpuNote: '32 GB VRAM -- no compromises. $2,900+ street price',                 ram: '128 GB DDR5', ramNote: '',                                                    storage: '4 TB NVMe', priceRange: '$5,000--$6,000' },
    priority: 'You need both: fast single-core for modeling and a capable GPU for viz. The 5070 Ti at ~$1,000 is the honest sweet spot in early 2026.'
  },
  production: {
    LowValue:  { cpu: 'AMD Ryzen 9 9950X', cpuNote: '16-core -- best for CPU rendering plus strong single-thread',   gpu: 'NVIDIA RTX 5070 Ti', gpuNote: 'GPU hybrid rendering plus viz -- 16 GB VRAM',                     ram: '64 GB DDR5',  ramNote: '',                                                   storage: '2 TB NVMe', priceRange: '$2,600--$3,100' },
    LowBest:   { cpu: 'AMD Ryzen 9 9950X', cpuNote: '16-core -- still the right chip at top budget',                 gpu: 'NVIDIA RTX 5090',    gpuNote: '32 GB VRAM -- GPU hybrid at maximum. $2,900+ street price',      ram: '128 GB DDR5', ramNote: '',                                                   storage: '4 TB NVMe', priceRange: '$5,000--$6,000' },
    HighValue: { cpu: 'AMD Ryzen 9 9950X', cpuNote: '16-core -- large scenes render longer, cores matter more',      gpu: 'NVIDIA RTX 5080',    gpuNote: '16 GB VRAM -- large scene GPU rendering',                        ram: '128 GB DDR5', ramNote: 'V-Ray loads the full scene into RAM before rendering', storage: '4 TB NVMe', priceRange: '$3,400--$4,000' },
    HighBest:  { cpu: 'AMD Ryzen 9 9950X', cpuNote: 'Maximum cores for production rendering',                        gpu: 'NVIDIA RTX 5090',    gpuNote: '32 GB VRAM -- no scene too large. $2,900+ street price',         ram: '128 GB DDR5', ramNote: '',                                                   storage: '4 TB NVMe', priceRange: '$5,200--$6,200' },
    priority: 'V-Ray and Corona are multi-thread CPU bound with GPU hybrid modes. The Ryzen 9 9950X leads. Note: the 5090 is severely marked up in early 2026. The 5080 is the better value for GPU hybrid rendering right now.'
  }
};


// ============================================================================
// MAC DESKTOP SPECS
// ============================================================================
Data.MacSpecs = {
  review: {
    LowValue:  { chip: 'Mac Mini -- M4 Pro',    cpuNote: 'More than enough for documents',                        memory: '24 GB unified',  storage: '512 GB SSD', price: '$1,400--$1,600' },
    LowBest:   { chip: 'Mac Mini -- M4 Pro',    cpuNote: 'Same chip -- no need to go higher',                     memory: '48 GB unified',  storage: '1 TB SSD',   price: '$1,800--$2,000' },
    HighValue: { chip: 'Mac Mini -- M4 Pro',    cpuNote: 'Same chip -- documents are not demanding at any scale',  memory: '48 GB unified',  storage: '1 TB SSD',   price: '$1,800--$2,000' },
    HighBest:  { chip: 'Mac Mini -- M4 Pro',    cpuNote: 'Same chip -- display matters more',                      memory: '48 GB unified',  storage: '1 TB SSD',   price: '$1,800--$2,000' },
    priority: 'Document-primary. The display matters more than the Mac.'
  },
  drafting: {
    LowValue:  { chip: 'Mac Mini -- M4 Pro',    cpuNote: 'Strong single-thread for 2D CAD',                    memory: '24 GB unified',  storage: '1 TB SSD', price: '$1,600--$1,800' },
    LowBest:   { chip: 'Mac Studio -- M4 Max',  cpuNote: 'Headroom for larger drawings',                       memory: '36 GB unified',  storage: '1 TB SSD', price: '$2,000--$2,400' },
    HighValue: { chip: 'Mac Studio -- M4 Max',  cpuNote: 'Large drawing sets with many xrefs',                 memory: '36 GB unified',  storage: '1 TB SSD', price: '$2,000--$2,400' },
    HighBest:  { chip: 'Mac Studio -- M4 Max',  cpuNote: 'Headroom for complex drawings and multitasking',     memory: '64 GB unified',  storage: '2 TB SSD', price: '$2,800--$3,200' },
    priority: '2D drafting on Mac is well-served by the M4 Pro.'
  },
  modeling: {
    LowValue:  { chip: 'Mac Studio -- M4 Max',   cpuNote: 'Strong GPU cores for ArchiCAD/Rhino/SketchUp',          memory: '36 GB unified',  storage: '1 TB SSD', price: '$2,000--$2,400' },
    LowBest:   { chip: 'Mac Studio -- M4 Max',   cpuNote: 'More memory for larger models',                         memory: '64 GB unified',  storage: '2 TB SSD', price: '$2,800--$3,200' },
    HighValue: { chip: 'Mac Studio -- M4 Max',   cpuNote: 'Large models need memory and GPU bandwidth',            memory: '64 GB unified',  storage: '2 TB SSD', price: '$2,800--$3,200' },
    HighBest:  { chip: 'Mac Studio -- M4 Ultra', cpuNote: 'Large complex models benefit from Ultra GPU cores',     memory: '128 GB unified', storage: '2 TB SSD', price: '$4,000--$5,000' },
    priority: 'ArchiCAD, Vectorworks, SketchUp, Rhino v8 all run on Mac. Performance scales with GPU cores and unified memory.'
  },
  viz: {
    LowValue:  { chip: 'Mac Studio -- M4 Max',   cpuNote: 'Enough for Enscape/TwinMotion at SFR scale',       memory: '64 GB unified',  storage: '1 TB SSD', price: '$2,500--$3,000' },
    LowBest:   { chip: 'Mac Studio -- M4 Ultra', cpuNote: 'Maximum GPU cores and bandwidth',                  memory: '128 GB unified', storage: '2 TB SSD', price: '$4,000--$5,000' },
    HighValue: { chip: 'Mac Studio -- M4 Ultra', cpuNote: 'Large scenes need maximum GPU cores',              memory: '128 GB unified', storage: '2 TB SSD', price: '$4,000--$5,000' },
    HighBest:  { chip: 'Mac Studio -- M4 Ultra', cpuNote: 'Maximum config for large scene visualization',     memory: '192 GB unified', storage: '4 TB SSD', price: '$5,500--$7,000' },
    priority: 'Enscape works on Mac. TwinMotion runs via Rosetta. Lumion and D5 are Windows-only.'
  },
  modeling_viz: {
    LowValue:  { chip: 'Mac Studio -- M4 Max',   cpuNote: 'Balanced for modeling and viz',                         memory: '64 GB unified',  storage: '2 TB SSD', price: '$2,800--$3,200' },
    LowBest:   { chip: 'Mac Studio -- M4 Ultra', cpuNote: 'Maximum headroom for both workflows',                  memory: '128 GB unified', storage: '2 TB SSD', price: '$4,000--$5,000' },
    HighValue: { chip: 'Mac Studio -- M4 Ultra', cpuNote: 'Large models plus viz need Ultra GPU cores',           memory: '128 GB unified', storage: '2 TB SSD', price: '$4,000--$5,000' },
    HighBest:  { chip: 'Mac Studio -- M4 Ultra', cpuNote: 'Maximum config for large-scale modeling and viz',      memory: '192 GB unified', storage: '4 TB SSD', price: '$5,500--$7,000' },
    priority: 'Unified memory serves as both RAM and VRAM.'
  },
  production: {
    LowValue:  { chip: 'Mac Studio -- M4 Ultra', cpuNote: 'Maximum cores for V-Ray CPU plus Metal GPU',                                                     memory: '128 GB unified', storage: '2 TB SSD', price: '$4,000--$5,000' },
    LowBest:   { chip: 'Mac Studio -- M4 Ultra', cpuNote: 'Maximum config',                                                                                 memory: '192 GB unified', storage: '4 TB SSD', price: '$5,500--$7,000' },
    HighValue: { chip: 'Mac Studio -- M4 Ultra', cpuNote: 'Large scenes need max memory for rendering',                                                     memory: '192 GB unified', storage: '4 TB SSD', price: '$5,500--$7,000' },
    HighBest:  { chip: 'Mac Studio -- M4 Ultra', cpuNote: 'Maximum everything -- still slower than a mid-range Windows PC with an RTX 4070 for V-Ray',      memory: '192 GB unified', storage: '4 TB SSD', price: '$5,500--$7,000' },
    priority: 'V-Ray supports Metal GPU since V-Ray 7. A mid-range Windows PC with an RTX 4070 still outrenders a maxed Mac Studio. Mac wins on ecosystem, display, and silence.'
  }
};


// ============================================================================
// PREBUILT DESKTOPS
// Organized by machine type. Each has profiles it fits, price, and note.
// The picker matches these to the current workload profile.
// ============================================================================
Data.Prebuilts = [
  // ---- Mini PCs (review, drafting, light modeling) ----
  { type: 'mini',    name: 'ASUS ExpertCenter PB64',         price: '$600--$900',     note: 'Core Ultra 5/7, up to 64 GB DDR5, quad 4K display. VESA mounts behind a monitor. Silent.',  profiles: ['review', 'drafting'],               rec: { review_value: 1 } },
  { type: 'mini',    name: 'ASUS ExpertCenter PN55',         price: '$600--$800',     note: 'AMD Ryzen AI 400, Radeon 800M, quad 4K. Shipping Q2 2026.',                                  profiles: ['review', 'drafting'],               rec: {} },
  { type: 'mini',    name: 'Intel NUC 14 Pro',               price: '$550--$850',     note: 'Core Ultra, compact, Thunderbolt 4. Good dock ecosystem.',                                    profiles: ['review', 'drafting'],               rec: {} },
  { type: 'mini',    name: 'Lenovo ThinkCentre Tiny (M90q)', price: '$700--$1,000',   note: 'Core Ultra 7, vPro, 64 GB max. IT-managed fleets.',                                          profiles: ['review', 'drafting'],               rec: { review_best: 1 } },
  { type: 'mini',    name: 'Mac Mini M4 Pro',                price: '$1,400--$2,000', note: '24-48 GB unified. The Mac mini PC.',                                                          profiles: ['review', 'drafting', 'modeling'],   rec: {} },

  // ---- Office towers (drafting, modeling -- optional GPU) ----
  { type: 'office',  name: 'Lenovo ThinkCentre Neo 50t',         price: '$800--$1,200',   note: 'i5/i7, 32 GB, has PCIe x16 slot. Add an RTX 4060 ($300) for viewport acceleration.', profiles: ['review', 'drafting', 'modeling'], rec: { drafting_value: 1 } },
  { type: 'office',  name: 'Dell Inspiron Tower (Plus)',          price: '$900--$1,400',   note: 'Core Ultra, up to RTX 4060 from factory. Solid value.',                                profiles: ['review', 'drafting', 'modeling'], rec: {} },
  { type: 'office',  name: 'HP ProDesk Tower 400/600',           price: '$800--$1,200',   note: 'Core i7, optional RTX A400. A commodity box -- reliable, boring, cheap.',               profiles: ['review', 'drafting'],             rec: {} },

  // ---- Entry workstations (modeling, light viz) ----
  { type: 'workstation', name: 'Dell Pro Max Tower T2',           price: '$1,300--$2,500', note: 'Core Ultra 5/7/9, unlimited turbo duration, ISV certified. RTX Pro GPUs only -- no GeForce.', profiles: ['review', 'drafting', 'modeling'],                   rec: { modeling_value: 1 } },
  { type: 'workstation', name: 'HP Z2 Tower G9 / G10',           price: '$1,200--$2,500', note: 'Core i7/i9 or Core Ultra, ISV certified. Quiet. RTX A-series GPUs.',                           profiles: ['review', 'drafting', 'modeling'],                   rec: {} },
  { type: 'workstation', name: 'Lenovo ThinkStation P3 Tower',    price: '$1,200--$2,500', note: 'Core i7/i9 or Core Ultra 7, 128 GB max, RTX Ada GPUs. ThinkStation reliability.',              profiles: ['review', 'drafting', 'modeling'],                   rec: { modeling_best: 1 } },

  // ---- Gaming desktops (viz, production -- real GPUs) ----
  { type: 'gaming',  name: 'ASUS ROG G16CH',                   price: '$1,800--$2,500', note: 'RTX 5070 Ti, 850W PSU, good airflow. Looks like a gaming PC because it is one.',        profiles: ['modeling', 'viz', 'modeling_viz', 'production'], rec: { viz_value: 1, modeling_viz_value: 1 } },
  { type: 'gaming',  name: 'MSI MAG Infinite S3',              price: '$1,600--$2,200', note: 'RTX 5070/5070 Ti, clean design, 750W PSU. Less gamer aesthetic than most.',             profiles: ['modeling', 'viz', 'modeling_viz', 'production'], rec: {} },
  { type: 'gaming',  name: 'CyberPowerPC Gamer Xtreme',        price: '$1,500--$2,200', note: 'Configurable. Order with an RTX 5070 Ti and 64 GB. Cheapest path to a real GPU.',       profiles: ['modeling', 'viz', 'modeling_viz', 'production'], rec: { production_value: 1 } },
  { type: 'gaming',  name: 'iBuyPower / NZXT BLD',             price: '$1,800--$2,800', note: 'Custom config. Pick your CPU, GPU, RAM. Cleaner builds than CyberPowerPC.',             profiles: ['viz', 'modeling_viz', 'production'],             rec: { viz_best: 1, production_best: 1 } },
];

Data.PrebuiltCategories = {
  mini:        'Mini PC',
  office:      'Office Tower',
  workstation: 'Entry Workstation',
  gaming:      'Gaming Desktop',
};

Data.PrebuiltNote = {
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
// category: one (one-machine), desk (desk-bound), travel, student, mac_p (Mac primary), mac_s (Mac student)
// ============================================================================
Data.Laptops = [
  { category: 'one',     platform: 'win', name: 'HP ZBook Ultra G1a',            price: '$3,500--$4,500', weight: '3.3 lbs', note: 'AMD Strix Halo, OLED, 128 GB unified. Battery is the weakness.',                  profiles: ['review','drafting','modeling','viz','modeling_viz'],  rec: { review_best: 1, drafting_value: 1 } },
  { category: 'one',     platform: 'win', name: 'Lenovo ThinkPad P1 Gen 8',      price: '$2,800--$3,400', weight: '3.8 lbs', note: 'Arrow Lake, RTX Pro 2000, CAMM2, tandem OLED. Best keyboard.',                    profiles: ['drafting','modeling','modeling_viz'],                 rec: { drafting_best: 1, modeling_best: 1, modeling_viz_value: 1 } },
  { category: 'one',     platform: 'win', name: 'Asus ProArt P16',               price: '$2,200--$2,600', weight: '4.2 lbs', note: 'OLED, creator-focused. Strong one-machine candidate.',                            profiles: ['review','drafting','modeling','modeling_viz'],        rec: { modeling_value: 1 } },
  { category: 'one',     platform: 'win', name: 'Asus ROG Zephyrus G16',         price: '$2,000--$2,500', weight: '4.1 lbs', note: 'Good thermals, strong display, lighter than workstations.',                       profiles: ['drafting','modeling','viz','modeling_viz'] },
  { category: 'one',     platform: 'win', name: 'Asus ROG Zephyrus G14',         price: '$1,800--$2,200', weight: '3.3 lbs', note: 'Serious power in 14".',                                                           profiles: ['drafting','modeling'] },
  { category: 'one',     platform: 'win', name: 'Razer Blade 16',                price: '$2,500--$3,200', weight: '4.6 lbs', note: 'Premium build, OLED option. Support is mixed.',                                   profiles: ['modeling','viz','modeling_viz'] },
  { category: 'desk',    platform: 'win', name: 'Lenovo Legion Pro 7i',           price: '$2,200--$2,800', weight: '5.5 lbs', note: 'RTX 5070 Ti, OLED. Incredible value. Loud. Desk-only.',                           profiles: ['viz','modeling_viz','production'],                    rec: { viz_value: 1, production_value: 1 } },
  { category: 'desk',    platform: 'win', name: 'Lenovo ThinkPad P16 Gen 3',      price: '$3,800--$4,500', weight: '5.8 lbs', note: 'Flagship ThinkPad. RTX Pro 5000, up to 192 GB.',                                  profiles: ['modeling_viz','production'],                          rec: { modeling_viz_best: 1 } },
  { category: 'desk',    platform: 'win', name: 'HP ZBook Fury 16 G1i',           price: '$4,000--$4,800', weight: '6.0 lbs', note: '280W adapter. Best sustained rendering thermals.',                                profiles: ['viz','modeling_viz','production'],                    rec: { viz_best: 1, production_best: 1 } },
  { category: 'desk',    platform: 'win', name: 'Dell Pro Max 16 Plus',           price: '$3,500--$4,200', weight: '5.6 lbs', note: 'Intel HX, RTX Pro 5000. AEC Magazine rates highly.',                              profiles: ['viz','modeling_viz','production'] },
  { category: 'travel',  platform: 'win', name: 'Lenovo ThinkPad X1 Carbon Gen 13', price: '$1,500--$1,800', weight: '2.5 lbs', note: 'The standard ultraportable. All-day battery.',                                  profiles: ['review','drafting'],                                 rec: { review_value: 1 } },
  { category: 'student', platform: 'win', name: 'Asus TUF Gaming A16',            price: '$1,000--$1,400', weight: '4.8 lbs', note: 'RTX 4060. Durable, affordable.',                                                 profiles: ['modeling','viz','modeling_viz','drafting','review'] },
  { category: 'student', platform: 'win', name: 'Lenovo LOQ 16',                  price: '$900--$1,200',   weight: '5.2 lbs', note: 'Good configurability, upgradeable.',                                              profiles: ['modeling','drafting','review'] },
  { category: 'student', platform: 'win', name: 'Acer Predator Helios 16',        price: '$1,400--$1,800', weight: '5.5 lbs', note: 'High-wattage GPU. Studios that demand viz.',                                      profiles: ['viz','modeling_viz','production'] },
  { category: 'mac_p',   platform: 'mac', name: 'MacBook Air 15" M4',             price: '$1,300--$1,500', weight: '3.3 lbs', note: 'Fanless, all-day battery. Docs and light drafting.',                              profiles: ['review','drafting'],                                 rec: { review_value: 1 } },
  { category: 'mac_p',   platform: 'mac', name: 'MacBook Pro 14" M4 Pro',         price: '$2,400--$2,800', weight: '3.5 lbs', note: 'Mac workhorse. ArchiCAD/Rhino/SketchUp.',                                        profiles: ['drafting','modeling','modeling_viz'],                 rec: { drafting_value: 1, drafting_best: 1, modeling_value: 1 } },
  { category: 'mac_p',   platform: 'mac', name: 'MacBook Pro 16" M4 Pro',         price: '$2,800--$3,200', weight: '4.7 lbs', note: 'More screen, more power. One-machine for Mac.',                                  profiles: ['modeling','viz','modeling_viz'],                      rec: { modeling_best: 1, modeling_viz_value: 1 } },
  { category: 'mac_p',   platform: 'mac', name: 'MacBook Pro 16" M4 Max',         price: '$3,800--$4,800', weight: '4.7 lbs', note: '64-128 GB unified. Serious Enscape and V-Ray Metal.',                            profiles: ['viz','modeling_viz','production'],                    rec: { viz_value: 1, viz_best: 1, modeling_viz_best: 1, production_value: 1, production_best: 1 } },
  { category: 'mac_s',   platform: 'mac', name: 'MacBook Air 13" M4',             price: '$1,100--$1,300', weight: '2.7 lbs', note: 'Budget Mac. Small screen -- dock to a monitor.',                                 profiles: ['review','drafting','modeling'] },
  { category: 'mac_s',   platform: 'mac', name: 'MacBook Pro 14" M4',             price: '$1,600--$1,800', weight: '3.4 lbs', note: 'Base Pro. Better sustained perf than Air.',                                      profiles: ['modeling','drafting','viz'] },
];

Data.LaptopCategories = {
  one:     'One-Machine Solution',
  desk:    'Desk-Bound Powerhouses',
  travel:  'Document / Travel',
  student: 'Student',
  mac_p:   'MacBook',
  mac_s:   'Student',
};
