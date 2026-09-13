// Sprite asset manifest.
// Only LODs listed here are preloaded. Missing textures still fall back procedurally.

const COMET_SPRITE_ASSETS = {
  // Atom replacement pack remains unchanged by this rendering fix.
  atom_01:              { family: 'atomic',      lods: [32, 64], version: 2 },
  atom_02:              { family: 'atomic',      lods: [32, 64], version: 2 },
  atom_03:              { family: 'atomic',      lods: [32, 64], version: 2 },

  dust_01:              { family: 'dust',        lods: [32, 64], version: 1 },
  dust_02:              { family: 'dust',        lods: [32, 64], version: 1 },
  dust_03:              { family: 'dust',        lods: [32, 64], version: 1 },
  dust_mystery_01:      { family: 'dust',        lods: [] },

  // v3 refreshes the corrected rock detail texture and current clean rock pack.
  rock_01:              { family: 'rock',        lods: [32, 64], version: 3 },
  rock_02:              { family: 'rock',        lods: [32, 64], version: 3 },
  rock_03:              { family: 'rock',        lods: [32, 64], version: 3 },
  rock_mystery_01:      { family: 'rock',        lods: [] },
  rock_mystery_02:      { family: 'rock',        lods: [] },

  // v3 refreshes hard-alpha comet PNGs on cached Home Screen installs.
  comet_01:             { family: 'comet',       lods: [32, 64], version: 3 },
  comet_02:             { family: 'comet',       lods: [32, 64], version: 3 },
  comet_03:             { family: 'comet',       lods: [32, 64], version: 3 },
  comet_mystery_01:     { family: 'comet',       lods: [] },

  // Named comet reveal art. Leave lods empty until each PNG is supplied.
  comet_halley:         { family: 'comet',       lods: [] },
  comet_tempel1:        { family: 'comet',       lods: [] },
  comet_borrelly:       { family: 'comet',       lods: [] },
  comet_67p:            { family: 'comet',       lods: [] },
  comet_wild2:          { family: 'comet',       lods: [] },

  rockyPlanet_01:       { family: 'rockyPlanet', lods: [] },
  rockyPlanet_02:       { family: 'rockyPlanet', lods: [] },
  rockyPlanet_mystery_01:{ family: 'rockyPlanet',lods: [] },

  // Named dwarf-planet reveal art.
  dwarf_ceres:          { family: 'rockyPlanet', lods: [] },
  dwarf_pluto:          { family: 'rockyPlanet', lods: [] },
  dwarf_eris:           { family: 'rockyPlanet', lods: [] },
  dwarf_haumea:         { family: 'rockyPlanet', lods: [] },
  dwarf_makemake:       { family: 'rockyPlanet', lods: [] },
  dwarf_gonggong:       { family: 'rockyPlanet', lods: [] },
  dwarf_quaoar:         { family: 'rockyPlanet', lods: [] },
  dwarf_sedna:          { family: 'rockyPlanet', lods: [] },

  // Named terrestrial planet reveal art.
  planet_mercury:       { family: 'rockyPlanet', lods: [] },
  planet_venus:         { family: 'rockyPlanet', lods: [] },
  planet_earth:         { family: 'rockyPlanet', lods: [] },
  planet_mars:          { family: 'rockyPlanet', lods: [] },

  gasPlanet_01:         { family: 'gasPlanet',   lods: [] },
  gasPlanet_02:         { family: 'gasPlanet',   lods: [] },
  gasPlanet_mystery_01: { family: 'gasPlanet',   lods: [] },

  // Named giant planet reveal art. Uranus/Neptune are scientifically ice giants but remain in
  // the existing GAS PLANET gameplay/visual family until a separate ice-giant family is desired.
  planet_jupiter:       { family: 'gasPlanet',   lods: [] },
  planet_saturn:        { family: 'gasPlanet',   lods: [] },
  planet_uranus:        { family: 'gasPlanet',   lods: [] },
  planet_neptune:       { family: 'gasPlanet',   lods: [] },

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
