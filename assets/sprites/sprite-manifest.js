// Sprite asset manifest.
// Only LODs listed here are preloaded. Missing/future textures keep lods: [] so the renderer falls
// back procedurally without generating 404s. When a 32/64 PNG pair is uploaded, switch that entry
// to lods: [32, 64] and bump its version.

const COMET_SPRITE_ASSETS = {
  // v4 forces a fresh Atom image fetch after removing the iOS runtime CanvasTexture workaround.
  atom_01:              { family: 'atomic',      lods: [32, 64], version: 4 },
  atom_02:              { family: 'atomic',      lods: [32, 64], version: 4 },
  atom_03:              { family: 'atomic',      lods: [32, 64], version: 4 },

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

  // Named comet reveal art. Named comets are not part of the collectible phase.
  comet_halley:         { family: 'comet',       lods: [] },
  comet_tempel1:        { family: 'comet',       lods: [] },
  comet_borrelly:       { family: 'comet',       lods: [] },
  comet_67p:            { family: 'comet',       lods: [] },
  comet_wild2:          { family: 'comet',       lods: [] },

  // Generic rocky-planet art for the player/non-identity path plus anonymous mystery art.
  rockyPlanet_01:       { family: 'rockyPlanet', lods: [32, 64], version: 1 },
  rockyPlanet_02:       { family: 'rockyPlanet', lods: [32, 64], version: 1 },
  rockyPlanet_mystery_01:{ family: 'rockyPlanet',lods: [32, 64], version: 1 },

  // Named dwarf-planet reveal art — collectible phase begins here.
  dwarf_ceres:          { family: 'rockyPlanet', lods: [32, 64], version: 1 },
  dwarf_pluto:          { family: 'rockyPlanet', lods: [32, 64], version: 1 },
  dwarf_eris:           { family: 'rockyPlanet', lods: [32, 64], version: 1 },
  dwarf_haumea:         { family: 'rockyPlanet', lods: [32, 64], version: 1 },
  dwarf_makemake:       { family: 'rockyPlanet', lods: [32, 64], version: 1 },
  dwarf_gonggong:       { family: 'rockyPlanet', lods: [32, 64], version: 1 },
  dwarf_quaoar:         { family: 'rockyPlanet', lods: [32, 64], version: 1 },
  dwarf_sedna:          { family: 'rockyPlanet', lods: [32, 64], version: 1 },

  // Named terrestrial planet reveal art.
  planet_mercury:       { family: 'rockyPlanet', lods: [32, 64], version: 1 },
  planet_venus:         { family: 'rockyPlanet', lods: [32, 64], version: 1 },
  planet_earth:         { family: 'rockyPlanet', lods: [32, 64], version: 1 },
  planet_mars:          { family: 'rockyPlanet', lods: [32, 64], version: 1 },

  // Gas/ice giant generic + mystery art and all four named planets are already active.
  gasPlanet_01:         { family: 'gasPlanet',   lods: [32, 64], version: 1 },
  gasPlanet_02:         { family: 'gasPlanet',   lods: [32, 64], version: 1 },
  gasPlanet_mystery_01: { family: 'gasPlanet',   lods: [32, 64], version: 1 },
  planet_jupiter:       { family: 'gasPlanet',   lods: [32, 64], version: 1 },
  planet_saturn:        { family: 'gasPlanet',   lods: [32, 64], version: 1 },
  planet_uranus:        { family: 'gasPlanet',   lods: [32, 64], version: 1 },
  planet_neptune:       { family: 'gasPlanet',   lods: [32, 64], version: 1 },

  // Legacy shared star placeholders remain reserved, but gameplay now points at tier-specific pools.
  star_01:              { family: 'star',        lods: [] },
  star_02:              { family: 'star',        lods: [] },
  star_mystery_01:      { family: 'star',        lods: [] },

  // YELLOW DWARF STAR — generic/mystery + four collectible named identities.
  yellowDwarf_01:              { family: 'star', lods: [32, 64], version: 1 },
  yellowDwarf_02:              { family: 'star', lods: [32, 64], version: 1 },
  yellowDwarf_mystery_01:      { family: 'star', lods: [32, 64], version: 1 },
  yellowDwarf_sun:             { family: 'star', lods: [32, 64], version: 1 },
  yellowDwarf_alphaCentauriA:  { family: 'star', lods: [32, 64], version: 1 },
  yellowDwarf_tauCeti:         { family: 'star', lods: [32, 64], version: 1 },
  yellowDwarf_18Scorpii:       { family: 'star', lods: [32, 64], version: 1 },

  // BLUE GIANT STAR.
  blueGiant_01:          { family: 'star', lods: [32, 64], version: 1 },
  blueGiant_02:          { family: 'star', lods: [32, 64], version: 1 },
  blueGiant_mystery_01:  { family: 'star', lods: [32, 64], version: 1 },
  blueGiant_rigel:       { family: 'star', lods: [32, 64], version: 1 },
  blueGiant_spica:       { family: 'star', lods: [32, 64], version: 1 },
  blueGiant_alnitak:     { family: 'star', lods: [32, 64], version: 1 },
  blueGiant_bellatrix:   { family: 'star', lods: [32, 64], version: 1 },

  // RED HYPERGIANT STAR gameplay tier.
  redHypergiant_01:              { family: 'star', lods: [32, 64], version: 1 },
  redHypergiant_02:              { family: 'star', lods: [32, 64], version: 1 },
  redHypergiant_mystery_01:      { family: 'star', lods: [32, 64], version: 1 },
  redHypergiant_betelgeuse:      { family: 'star', lods: [32, 64], version: 1 },
  redHypergiant_vyCanisMajoris:  { family: 'star', lods: [32, 64], version: 1 },
  redHypergiant_uyScuti:         { family: 'star', lods: [32, 64], version: 1 },
  redHypergiant_nmlCygni:        { family: 'star', lods: [32, 64], version: 1 },

  // NEBULA.
  nebula_01:            { family: 'nebula', lods: [32, 64], version: 1 },
  nebula_02:            { family: 'nebula', lods: [32, 64], version: 1 },
  nebula_mystery_01:    { family: 'nebula', lods: [32, 64], version: 1 },
  nebula_orion:         { family: 'nebula', lods: [32, 64], version: 1 },
  nebula_carina:        { family: 'nebula', lods: [32, 64], version: 1 },
  nebula_eagle:         { family: 'nebula', lods: [32, 64], version: 1 },
  nebula_helix:         { family: 'nebula', lods: [32, 64], version: 1 },

  // PULSAR.
  pulsar_01:            { family: 'pulsar', lods: [32, 64], version: 1 },
  pulsar_02:            { family: 'pulsar', lods: [32, 64], version: 1 },
  pulsar_mystery_01:    { family: 'pulsar', lods: [32, 64], version: 1 },
  pulsar_crab:          { family: 'pulsar', lods: [32, 64], version: 1 },
  pulsar_vela:          { family: 'pulsar', lods: [32, 64], version: 1 },
  pulsar_geminga:       { family: 'pulsar', lods: [32, 64], version: 1 },
  pulsar_b1509:         { family: 'pulsar', lods: [32, 64], version: 1 },

  // Stellar-mass BLACK HOLE.
  blackHole_01:             { family: 'blackHole', lods: [] },
  blackHole_02:             { family: 'blackHole', lods: [] },
  blackHole_mystery_01:     { family: 'blackHole', lods: [] },
  blackHole_cygnusX1:       { family: 'blackHole', lods: [] },
  blackHole_v404Cygni:      { family: 'blackHole', lods: [] },
  blackHole_gaiaBH1:        { family: 'blackHole', lods: [] },
  blackHole_maxiJ1820_070:  { family: 'blackHole', lods: [] },

  // SUPER MASSIVE BLACK HOLE generic/mystery + named endgame identities.
  smbh_01:             { family: 'blackHole', lods: [] },
  smbh_02:             { family: 'blackHole', lods: [] },
  smbh_mystery_01:     { family: 'blackHole', lods: [] },
  smbh_sagittariusA:   { family: 'blackHole', lods: [] },
  smbh_m87:            { family: 'blackHole', lods: [] },
  smbh_ton618:         { family: 'blackHole', lods: [] },
  smbh_ngc4889:        { family: 'blackHole', lods: [] }
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
