// cometIO visual metadata — deliberately separate from gameplay/mass/progression data.
// Add new art/variants here and in assets/sprites/sprite-manifest.js; encounter rules should not care.

const COMET_VISUAL_SETTINGS = {
  debug: false,
  lodThresholds: {
    // Selection is based only on current DISPLAYED diameter in screen pixels.
    smallMaxPx: 48,
    normalMaxPx: 96
  },
  defaultFlipChance: 0.5
};

const COMET_VISUAL_FAMILIES = {
  atomic: {
    collisionFamily: 'atomic',
    normalVariants: ['atom_01', 'atom_02', 'atom_03'],
    mysteryVariants: ['atom_01', 'atom_02', 'atom_03'],
    sharedVariants: ['atom_01', 'atom_02', 'atom_03'],
    fixedLods: { mystery: 32, normal: 64 },
    lodByDisplayedSize: true,
    tintEnabled: true,
    tintPalette: [0xffffff, 0xe7e8e6, 0xdce3e6, 0xe7e2d9, 0xd7d9d7, 0xe9e8e2],
    mysteryTintPalette: [0xe7e8e6, 0xdce3e6, 0xe7e2d9, 0xe9e8e2],
    allowRotation: true,
    rotationStep: 90,
    allowFlip: true,
    alphaRange: [1, 1],
    effects: { back: null, front: null }
  },
  dust: {
    collisionFamily: 'dust',
    normalVariants: ['dust_01', 'dust_02', 'dust_03'],
    mysteryVariants: ['dust_01', 'dust_02', 'dust_03'],
    sharedVariants: ['dust_01', 'dust_02', 'dust_03'],
    fixedLods: { mystery: 32, normal: 64 },
    tintEnabled: false,
    tintPalette: [0xc6b895, 0xaaa18d, 0x8f8b83],
    mysteryTintPalette: [0xa8a39a],
    allowRotation: true,
    rotationStep: 90,
    allowFlip: true,
    alphaRange: [1, 1],
    effects: { back: null, front: null }
  },
  rock: {
    collisionFamily: 'rocky',
    normalVariants: ['rock_01', 'rock_02', 'rock_03'],
    mysteryVariants: ['rock_01', 'rock_02', 'rock_03'],
    sharedVariants: ['rock_01', 'rock_02', 'rock_03'],
    fixedLods: { mystery: 32, normal: 64 },
    tintEnabled: false,
    tintPalette: [0x5c6068, 0x85888d, 0x8c715e, 0x8e5749, 0x687884],
    mysteryTintPalette: [0x777b80, 0x85888d],
    allowRotation: true,
    rotationStep: 90,
    allowFlip: true,
    alphaRange: [1, 1],
    effects: { back: null, front: 'rockDebris' }
  },
  comet: {
    collisionFamily: 'icy',
    normalVariants: ['comet_01', 'comet_02', 'comet_03'],
    mysteryVariants: ['comet_01', 'comet_02', 'comet_03'],
    sharedVariants: ['comet_01', 'comet_02', 'comet_03'],
    fixedLods: { mystery: 32, normal: 64 },
    lodByDisplayedSize: true,
    tintEnabled: true,
    tintPalette: [0xffffff, 0xf0f4f5, 0xe5eef2, 0xd9dddc, 0xe7e0d8, 0xe3eae5],
    mysteryTintPalette: [0xf0f4f5, 0xe5eef2, 0xe3eae5],
    allowRotation: true,
    rotationStep: 90,
    allowFlip: true,
    alphaRange: [1, 1],
    effects: { back: null, front: null },
    futureEffects: { reveal: 'cometTail', collision: 'cometTail', absorb: 'cometTail' }
  },
  rockyPlanet: {
    collisionFamily: 'planetary',
    normalVariants: ['rockyPlanet_01', 'rockyPlanet_02'],
    mysteryVariants: ['rockyPlanet_mystery_01'],
    tintEnabled: true,
    tintPalette: [0x96745d, 0xa85e47, 0x8b8b85, 0xa88752, 0x6d7f87],
    mysteryTintPalette: [0x81868a],
    allowRotation: true,
    allowFlip: true,
    alphaRange: [1, 1],
    effects: { back: null, front: null }
  },
  gasPlanet: {
    collisionFamily: 'gaseous',
    normalVariants: ['gasPlanet_01', 'gasPlanet_02'],
    mysteryVariants: ['gasPlanet_mystery_01'],
    tintEnabled: true,
    tintPalette: [0xe0c38f, 0xcda77d, 0xa7b8c9, 0xc7b596],
    mysteryTintPalette: [0xa8a6a0],
    allowRotation: false,
    allowFlip: true,
    alphaRange: [1, 1],
    effects: { back: null, front: null }
  },
  star: {
    collisionFamily: 'stellar',
    // Legacy family-level placeholders remain as a procedural fallback path. Each stellar tier below
    // overrides these with its own generic/mystery pool so uploaded art can be visually distinct.
    normalVariants: ['star_01', 'star_02'],
    mysteryVariants: ['star_mystery_01'],
    tintEnabled: true,
    tintPalette: [0xffe59a],
    mysteryTintPalette: [0xd5d9dc],
    allowRotation: false,
    allowFlip: false,
    alphaRange: [1, 1],
    effects: { back: 'starGlow', front: 'starFlicker' }
  },
  nebula: {
    collisionFamily: 'nebular',
    normalVariants: ['nebula_01', 'nebula_02'],
    mysteryVariants: ['nebula_mystery_01'],
    tintEnabled: false,
    tintPalette: [],
    mysteryTintPalette: [],
    allowRotation: true,
    allowFlip: true,
    alphaRange: [0.82, 0.96],
    effects: { back: 'nebulaDrift', front: null }
  },
  pulsar: {
    collisionFamily: 'pulsar',
    normalVariants: ['pulsar_01', 'pulsar_02'],
    mysteryVariants: ['pulsar_mystery_01'],
    tintEnabled: false,
    tintPalette: [],
    mysteryTintPalette: [],
    allowRotation: false,
    allowFlip: false,
    alphaRange: [1, 1],
    effects: { back: null, front: 'pulsarBeams' }
  },
  blackHole: {
    collisionFamily: 'blackHole',
    normalVariants: ['blackHole_01', 'blackHole_02'],
    mysteryVariants: ['blackHole_mystery_01'],
    tintEnabled: false,
    tintPalette: [],
    mysteryTintPalette: [],
    allowRotation: false,
    allowFlip: false,
    alphaRange: [1, 1],
    effects: { back: 'blackHoleAccretion', front: null }
  }
};

const COMET_OBJECT_VISUALS = {
  'ATOM': { visualFamily: 'atomic' },
  'DUST PARTICLE': { visualFamily: 'dust' },
  'TINY METEORITE': { visualFamily: 'rock' },
  'LARGE METEORITE': { visualFamily: 'rock' },
  'SMALL COMET': { visualFamily: 'comet' },
  'LARGER COMET': { visualFamily: 'comet' },
  'ASTEROID': { visualFamily: 'rock' },
  'DWARF PLANET': { visualFamily: 'rockyPlanet' },
  'ROCKY PLANET': { visualFamily: 'rockyPlanet' },
  'GAS PLANET': { visualFamily: 'gasPlanet' },

  // Tier-specific generic pools are reserved now. Until their PNGs are uploaded/activated in the
  // manifest, the existing renderer simply falls back to the proven procedural art.
  'YELLOW DWARF STAR': {
    visualFamily: 'star',
    normalVariants: ['yellowDwarf_01', 'yellowDwarf_02'],
    mysteryVariants: ['yellowDwarf_mystery_01'],
    tintPalette: [0xffd766, 0xffe69a, 0xffefb7]
  },
  'BLUE GIANT STAR': {
    visualFamily: 'star',
    normalVariants: ['blueGiant_01', 'blueGiant_02'],
    mysteryVariants: ['blueGiant_mystery_01'],
    tintPalette: [0x9ed7ff, 0xc1e6ff, 0xe0f3ff]
  },
  'RED HYPERGIANT STAR': {
    visualFamily: 'star',
    normalVariants: ['redHypergiant_01', 'redHypergiant_02'],
    mysteryVariants: ['redHypergiant_mystery_01'],
    tintPalette: [0xff765e, 0xff9a70, 0xffb078]
  },
  'NEBULA': {
    visualFamily: 'nebula',
    normalVariants: ['nebula_01', 'nebula_02'],
    mysteryVariants: ['nebula_mystery_01']
  },
  'PULSAR': {
    visualFamily: 'pulsar',
    normalVariants: ['pulsar_01', 'pulsar_02'],
    mysteryVariants: ['pulsar_mystery_01']
  },
  'BLACK HOLE': {
    visualFamily: 'blackHole',
    normalVariants: ['blackHole_01', 'blackHole_02'],
    mysteryVariants: ['blackHole_mystery_01']
  },
  'SUPER MASSIVE BLACK HOLE': {
    visualFamily: 'blackHole',
    normalVariants: ['smbh_01', 'smbh_02'],
    mysteryVariants: ['smbh_mystery_01']
  }
};

function getCometVisualDefinition(object) {
  const tierName = object?.name || TIERS[object?.tier]?.name;
  const objectVisual = COMET_OBJECT_VISUALS[tierName] || { visualFamily: 'rock' };
  const family = COMET_VISUAL_FAMILIES[objectVisual.visualFamily] || COMET_VISUAL_FAMILIES.rock;
  return {
    ...family,
    ...objectVisual,
    visualFamily: objectVisual.visualFamily || 'rock',
    collisionFamily: objectVisual.collisionFamily || family.collisionFamily,
    effects: { ...(family.effects || {}), ...(objectVisual.effects || {}) }
  };
}
