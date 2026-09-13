// Sprite asset manifest.
// Only LODs listed here are preloaded. Missing textures still fall back procedurally.

const COMET_SPRITE_ASSETS = {
  atom_01:              { family: 'atomic',      lods: [32, 64], version: 1 },
  atomic_01:            { family: 'atomic',      lods: [] },
  atomic_mystery_01:    { family: 'atomic',      lods: [] },

  dust_01:              { family: 'dust',        lods: [32, 64], version: 1 },
  dust_02:              { family: 'dust',        lods: [32, 64], version: 1 },
  dust_03:              { family: 'dust',        lods: [32, 64], version: 1 },
  dust_mystery_01:      { family: 'dust',        lods: [] },

  // v2 forces iOS/Home Screen mode to fetch the cleaned hard-alpha sprite bytes.
  rock_01:              { family: 'rock',        lods: [32, 64], version: 2 },
  rock_02:              { family: 'rock',        lods: [32, 64], version: 2 },
  rock_03:              { family: 'rock',        lods: [32, 64], version: 2 },
  rock_mystery_01:      { family: 'rock',        lods: [] },
  rock_mystery_02:      { family: 'rock',        lods: [] },

  comet_01:             { family: 'comet',       lods: [] },
  comet_02:             { family: 'comet',       lods: [] },
  comet_mystery_01:     { family: 'comet',       lods: [] },

  rockyPlanet_01:       { family: 'rockyPlanet', lods: [] },
  rockyPlanet_02:       { family: 'rockyPlanet', lods: [] },
  rockyPlanet_mystery_01:{ family: 'rockyPlanet',lods: [] },

  gasPlanet_01:         { family: 'gasPlanet',   lods: [] },
  gasPlanet_02:         { family: 'gasPlanet',   lods: [] },
  gasPlanet_mystery_01: { family: 'gasPlanet',   lods: [] },

  star_01:              { family: 'star',        lods: [] },
  star_02:              { family: 'star',        lods: [] },
  star_mystery_01:      { family: 'star',        lods: [] },

  nebula_01:            { family: 'nebula',      lods: [] },
  nebula_mystery_01:    { family: 'nebula',      lods: [] },

  pulsar_01:            { family: 'pulsar',      lods: [] },
  pulsar_mystery_01:    { family: 'pulsar',      lods: [] },

  blackHole_01:         { family: 'blackHole',   lods: [] },
  blackHole_mystery_01: { family: 'blackHole',   lods: [] }
};

function cometSpriteTextureKey(variant, lod) {
  return `comet-sprite:${variant}:${lod}`;
}

function cometSpriteAssetPath(variant, lod) {
  const entry = COMET_SPRITE_ASSETS[variant];
  if (!entry) return null;
  if (entry.files && entry.files[lod]) return entry.files[lod];
  const version = entry.version ? `?v=${entry.version}` : '';
  return `assets/sprites/${entry.family}/${variant}_${lod}.png${version}`;
}
