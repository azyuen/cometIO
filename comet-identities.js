// Named celestial identities are deliberately separate from gameplay tier/physics data.
// They are flavour/art identities revealed after the player's choice. They do NOT change mass,
// radius, speed, encounter odds or progression. spriteVariant is the stable sprite filename base.
//
// Collection phase begins at DWARF PLANET. Named comets remain flavour encounters, can repeat,
// and never count toward the collection or unique-object score bonus.

const COMET_NAMED_IDENTITIES = [
  // Comets — named flavour only; shared between Small/Larger Comet and deliberately repeatable.
  { id:'comet_halley', name:"HALLEY'S COMET", designation:'1P/Halley', gameplayTiers:['SMALL COMET','LARGER COMET'], scienceClass:'COMET', status:'confirmed', spriteVariant:'comet_halley', collectible:false, allowRotation:true, rotationStep:90, allowFlip:true },
  { id:'comet_tempel1', name:'TEMPEL 1', designation:'9P/Tempel 1', gameplayTiers:['SMALL COMET','LARGER COMET'], scienceClass:'COMET', status:'confirmed', spriteVariant:'comet_tempel1', collectible:false, allowRotation:true, rotationStep:90, allowFlip:true },
  { id:'comet_borrelly', name:'BORRELLY', designation:'19P/Borrelly', gameplayTiers:['SMALL COMET','LARGER COMET'], scienceClass:'COMET', status:'confirmed', spriteVariant:'comet_borrelly', collectible:false, allowRotation:true, rotationStep:90, allowFlip:true },
  { id:'comet_67p', name:'67P / CHURYUMOV–GERASIMENKO', designation:'67P/Churyumov–Gerasimenko', gameplayTiers:['SMALL COMET','LARGER COMET'], scienceClass:'COMET', status:'confirmed', spriteVariant:'comet_67p', collectible:false, allowRotation:true, rotationStep:90, allowFlip:true },
  { id:'comet_wild2', name:'WILD 2', designation:'81P/Wild 2', gameplayTiers:['SMALL COMET','LARGER COMET'], scienceClass:'COMET', status:'confirmed', spriteVariant:'comet_wild2', collectible:false, allowRotation:true, rotationStep:90, allowFlip:true },

  // Collection phase begins here.
  // Dwarf planets. First five are IAU-recognized; final three are strong candidates.
  { id:'dwarf_ceres', name:'CERES', gameplayTiers:['DWARF PLANET'], scienceClass:'DWARF PLANET', status:'iau-recognized', spriteVariant:'dwarf_ceres', collectible:true, allowRotation:false, allowFlip:false },
  { id:'dwarf_pluto', name:'PLUTO', gameplayTiers:['DWARF PLANET'], scienceClass:'DWARF PLANET', status:'iau-recognized', spriteVariant:'dwarf_pluto', collectible:true, allowRotation:false, allowFlip:false },
  { id:'dwarf_eris', name:'ERIS', gameplayTiers:['DWARF PLANET'], scienceClass:'DWARF PLANET', status:'iau-recognized', spriteVariant:'dwarf_eris', collectible:true, allowRotation:false, allowFlip:false },
  { id:'dwarf_haumea', name:'HAUMEA', gameplayTiers:['DWARF PLANET'], scienceClass:'DWARF PLANET', status:'iau-recognized', spriteVariant:'dwarf_haumea', collectible:true, allowRotation:false, allowFlip:false },
  { id:'dwarf_makemake', name:'MAKEMAKE', gameplayTiers:['DWARF PLANET'], scienceClass:'DWARF PLANET', status:'iau-recognized', spriteVariant:'dwarf_makemake', collectible:true, allowRotation:false, allowFlip:false },
  { id:'dwarf_gonggong', name:'GONGGONG', gameplayTiers:['DWARF PLANET'], scienceClass:'DWARF-PLANET CANDIDATE', status:'candidate', spriteVariant:'dwarf_gonggong', collectible:true, allowRotation:false, allowFlip:false },
  { id:'dwarf_quaoar', name:'QUAOAR', gameplayTiers:['DWARF PLANET'], scienceClass:'DWARF-PLANET CANDIDATE', status:'candidate', spriteVariant:'dwarf_quaoar', collectible:true, allowRotation:false, allowFlip:false },
  { id:'dwarf_sedna', name:'SEDNA', gameplayTiers:['DWARF PLANET'], scienceClass:'DWARF-PLANET CANDIDATE', status:'candidate', spriteVariant:'dwarf_sedna', collectible:true, allowRotation:false, allowFlip:false },

  // Solar System planets. Uranus and Neptune remain in GAS PLANET gameplay but are ice giants.
  { id:'planet_mercury', name:'MERCURY', gameplayTiers:['ROCKY PLANET'], scienceClass:'TERRESTRIAL PLANET', status:'planet', spriteVariant:'planet_mercury', collectible:true, allowRotation:false, allowFlip:false },
  { id:'planet_venus', name:'VENUS', gameplayTiers:['ROCKY PLANET'], scienceClass:'TERRESTRIAL PLANET', status:'planet', spriteVariant:'planet_venus', collectible:true, allowRotation:false, allowFlip:false },
  { id:'planet_earth', name:'EARTH', gameplayTiers:['ROCKY PLANET'], scienceClass:'TERRESTRIAL PLANET', status:'planet', spriteVariant:'planet_earth', collectible:true, allowRotation:false, allowFlip:false },
  { id:'planet_mars', name:'MARS', gameplayTiers:['ROCKY PLANET'], scienceClass:'TERRESTRIAL PLANET', status:'planet', spriteVariant:'planet_mars', collectible:true, allowRotation:false, allowFlip:false },
  { id:'planet_jupiter', name:'JUPITER', gameplayTiers:['GAS PLANET'], scienceClass:'GAS GIANT', status:'planet', spriteVariant:'planet_jupiter', collectible:true, allowRotation:false, allowFlip:false },
  { id:'planet_saturn', name:'SATURN', gameplayTiers:['GAS PLANET'], scienceClass:'GAS GIANT', status:'planet', spriteVariant:'planet_saturn', collectible:true, allowRotation:false, allowFlip:false },
  { id:'planet_uranus', name:'URANUS', gameplayTiers:['GAS PLANET'], scienceClass:'ICE GIANT', status:'planet', spriteVariant:'planet_uranus', collectible:true, allowRotation:false, allowFlip:false },
  { id:'planet_neptune', name:'NEPTUNE', gameplayTiers:['GAS PLANET'], scienceClass:'ICE GIANT', status:'planet', spriteVariant:'planet_neptune', collectible:true, allowRotation:false, allowFlip:false },

  // Yellow dwarf / Sun-like stars. Unique sprite art can differentiate surface activity and corona.
  { id:'yellowDwarf_sun', name:'THE SUN', gameplayTiers:['YELLOW DWARF STAR'], scienceClass:'G-TYPE MAIN-SEQUENCE STAR', status:'star', spriteVariant:'yellowDwarf_sun', collectible:true, allowRotation:false, allowFlip:false },
  { id:'yellowDwarf_alphaCentauriA', name:'ALPHA CENTAURI A', gameplayTiers:['YELLOW DWARF STAR'], scienceClass:'G-TYPE MAIN-SEQUENCE STAR', status:'star', spriteVariant:'yellowDwarf_alphaCentauriA', collectible:true, allowRotation:false, allowFlip:false },
  { id:'yellowDwarf_tauCeti', name:'TAU CETI', gameplayTiers:['YELLOW DWARF STAR'], scienceClass:'G-TYPE MAIN-SEQUENCE STAR', status:'star', spriteVariant:'yellowDwarf_tauCeti', collectible:true, allowRotation:false, allowFlip:false },
  { id:'yellowDwarf_18Scorpii', name:'18 SCORPII', gameplayTiers:['YELLOW DWARF STAR'], scienceClass:'G-TYPE MAIN-SEQUENCE STAR', status:'star', spriteVariant:'yellowDwarf_18Scorpii', collectible:true, allowRotation:false, allowFlip:false },

  // Blue giants / supergiants grouped into the existing BLUE GIANT STAR gameplay tier.
  { id:'blueGiant_rigel', name:'RIGEL', gameplayTiers:['BLUE GIANT STAR'], scienceClass:'BLUE SUPERGIANT', status:'star', spriteVariant:'blueGiant_rigel', collectible:true, allowRotation:false, allowFlip:false },
  { id:'blueGiant_spica', name:'SPICA', gameplayTiers:['BLUE GIANT STAR'], scienceClass:'BLUE GIANT SYSTEM', status:'star', spriteVariant:'blueGiant_spica', collectible:true, allowRotation:false, allowFlip:false },
  { id:'blueGiant_alnitak', name:'ALNITAK', gameplayTiers:['BLUE GIANT STAR'], scienceClass:'BLUE SUPERGIANT SYSTEM', status:'star', spriteVariant:'blueGiant_alnitak', collectible:true, allowRotation:false, allowFlip:false },
  { id:'blueGiant_bellatrix', name:'BELLATRIX', gameplayTiers:['BLUE GIANT STAR'], scienceClass:'BLUE GIANT', status:'star', spriteVariant:'blueGiant_bellatrix', collectible:true, allowRotation:false, allowFlip:false },

  // Very large evolved red stars. Some are scientifically supergiants rather than strict hypergiants;
  // they intentionally share the game's RED HYPERGIANT STAR progression tier.
  { id:'redHypergiant_betelgeuse', name:'BETELGEUSE', gameplayTiers:['RED HYPERGIANT STAR'], scienceClass:'RED SUPERGIANT', status:'star', spriteVariant:'redHypergiant_betelgeuse', collectible:true, allowRotation:false, allowFlip:false },
  { id:'redHypergiant_vyCanisMajoris', name:'VY CANIS MAJORIS', gameplayTiers:['RED HYPERGIANT STAR'], scienceClass:'RED HYPERGIANT', status:'star', spriteVariant:'redHypergiant_vyCanisMajoris', collectible:true, allowRotation:false, allowFlip:false },
  { id:'redHypergiant_uyScuti', name:'UY SCUTI', gameplayTiers:['RED HYPERGIANT STAR'], scienceClass:'RED SUPERGIANT', status:'star', spriteVariant:'redHypergiant_uyScuti', collectible:true, allowRotation:false, allowFlip:false },
  { id:'redHypergiant_nmlCygni', name:'NML CYGNI', gameplayTiers:['RED HYPERGIANT STAR'], scienceClass:'RED HYPERGIANT', status:'star', spriteVariant:'redHypergiant_nmlCygni', collectible:true, allowRotation:false, allowFlip:false },

  // Visually distinctive nebulae. Named nebulae share the same gameplay tier but keep real identities.
  { id:'nebula_orion', name:'ORION NEBULA', designation:'M42', gameplayTiers:['NEBULA'], scienceClass:'EMISSION NEBULA', status:'nebula', spriteVariant:'nebula_orion', collectible:true, allowRotation:false, allowFlip:false },
  { id:'nebula_carina', name:'CARINA NEBULA', designation:'NGC 3372', gameplayTiers:['NEBULA'], scienceClass:'EMISSION NEBULA', status:'nebula', spriteVariant:'nebula_carina', collectible:true, allowRotation:false, allowFlip:false },
  { id:'nebula_eagle', name:'EAGLE NEBULA', designation:'M16', gameplayTiers:['NEBULA'], scienceClass:'EMISSION NEBULA', status:'nebula', spriteVariant:'nebula_eagle', collectible:true, allowRotation:false, allowFlip:false },
  { id:'nebula_helix', name:'HELIX NEBULA', designation:'NGC 7293', gameplayTiers:['NEBULA'], scienceClass:'PLANETARY NEBULA', status:'nebula', spriteVariant:'nebula_helix', collectible:true, allowRotation:false, allowFlip:false },
  { id:'nebula_ring', name:'RING NEBULA', designation:'M57 / NGC 6720', gameplayTiers:['NEBULA'], scienceClass:'PLANETARY NEBULA', status:'nebula', spriteVariant:'nebula_ring', collectible:true, allowRotation:false, allowFlip:false },
  { id:'nebula_dumbbell', name:'DUMBBELL NEBULA', designation:'M27 / NGC 6853', gameplayTiers:['NEBULA'], scienceClass:'PLANETARY NEBULA', status:'nebula', spriteVariant:'nebula_dumbbell', collectible:true, allowRotation:false, allowFlip:false },
  { id:'nebula_butterfly', name:'BUTTERFLY NEBULA', designation:'NGC 6302', gameplayTiers:['NEBULA'], scienceClass:'PLANETARY NEBULA', status:'nebula', spriteVariant:'nebula_butterfly', collectible:true, allowRotation:false, allowFlip:false },
  { id:'nebula_catsEye', name:"CAT'S EYE NEBULA", designation:'NGC 6543', gameplayTiers:['NEBULA'], scienceClass:'PLANETARY NEBULA', status:'nebula', spriteVariant:'nebula_catsEye', collectible:true, allowRotation:false, allowFlip:false },
  { id:'nebula_hourglass', name:'HOURGLASS NEBULA', designation:'MyCn 18', gameplayTiers:['NEBULA'], scienceClass:'PLANETARY NEBULA', status:'nebula', spriteVariant:'nebula_hourglass', collectible:true, allowRotation:false, allowFlip:false },
  { id:'nebula_rosette', name:'ROSETTE NEBULA', designation:'NGC 2237 / NGC 2244', gameplayTiers:['NEBULA'], scienceClass:'EMISSION NEBULA', status:'nebula', spriteVariant:'nebula_rosette', collectible:true, allowRotation:false, allowFlip:false },
  { id:'nebula_tarantula', name:'TARANTULA NEBULA', designation:'30 DORADUS', gameplayTiers:['NEBULA'], scienceClass:'EMISSION NEBULA', status:'nebula', spriteVariant:'nebula_tarantula', collectible:true, hostGalaxy:'lmc', allowRotation:false, allowFlip:false },
  { id:'nebula_horsehead', name:'HORSEHEAD NEBULA', designation:'BARNARD 33', gameplayTiers:['NEBULA'], scienceClass:'DARK NEBULA', status:'nebula', spriteVariant:'nebula_horsehead', collectible:true, allowRotation:false, allowFlip:false },
  { id:'nebula_sn1987a', name:'SN 1987A', designation:'SUPERNOVA 1987A', gameplayTiers:['NEBULA'], scienceClass:'SUPERNOVA REMNANT', status:'nebula', spriteVariant:'nebula_sn1987a', collectible:true, hostGalaxy:'lmc', allowRotation:false, allowFlip:false },
  { id:'nebula_n157b', name:'N157B', designation:'SNR N157B', gameplayTiers:['NEBULA'], scienceClass:'SUPERNOVA REMNANT / PULSAR-WIND NEBULA', status:'nebula', spriteVariant:'nebula_n157b', collectible:true, hostGalaxy:'lmc', allowRotation:false, allowFlip:false },
  { id:'nebula_n49', name:'N49', designation:'DEM L 190', gameplayTiers:['NEBULA'], scienceClass:'SUPERNOVA REMNANT', status:'nebula', spriteVariant:'nebula_n49', collectible:true, hostGalaxy:'lmc', allowRotation:false, allowFlip:false },
  { id:'nebula_n132d', name:'N132D', designation:'SNR J052501−693842', gameplayTiers:['NEBULA'], scienceClass:'OXYGEN-RICH SUPERNOVA REMNANT', status:'nebula', spriteVariant:'nebula_n132d', collectible:true, hostGalaxy:'lmc', allowRotation:false, allowFlip:false },

  // Pulsars are visually identified through their beam/wind-nebula treatment in the sprite art.
  // The expanded set deliberately mixes isolated pulsars, planetary systems, companions, accretion
  // states and bow shocks so Phase 3 encounters remain scientifically grounded and visually varied.
  { id:'pulsar_crab', name:'CRAB PULSAR', designation:'PSR B0531+21', gameplayTiers:['PULSAR'], scienceClass:'PULSAR', status:'pulsar', spriteVariant:'pulsar_crab', collectible:true, allowRotation:false, allowFlip:false },
  { id:'pulsar_vela', name:'VELA PULSAR', designation:'PSR B0833−45', gameplayTiers:['PULSAR'], scienceClass:'PULSAR', status:'pulsar', spriteVariant:'pulsar_vela', collectible:true, allowRotation:false, allowFlip:false },
  { id:'pulsar_geminga', name:'GEMINGA', designation:'PSR J0633+1746', gameplayTiers:['PULSAR'], scienceClass:'PULSAR', status:'pulsar', spriteVariant:'pulsar_geminga', collectible:true, allowRotation:false, allowFlip:false },
  { id:'pulsar_b1509', name:'PSR B1509–58', designation:'PSR B1509−58', gameplayTiers:['PULSAR'], scienceClass:'PULSAR', status:'pulsar', spriteVariant:'pulsar_b1509', collectible:true, allowRotation:false, allowFlip:false },
  { id:'pulsar_b1257_12', name:'PSR B1257+12', designation:'PSR B1257+12', gameplayTiers:['PULSAR'], scienceClass:'PULSAR PLANETARY SYSTEM', status:'pulsar', spriteVariant:'pulsar_b1257_12', collectible:true, allowRotation:false, allowFlip:false },
  { id:'pulsar_b1957_20', name:'BLACK WIDOW PULSAR', designation:'PSR B1957+20', gameplayTiers:['PULSAR'], scienceClass:'MILLISECOND PULSAR BINARY', status:'pulsar', spriteVariant:'pulsar_b1957_20', collectible:true, allowRotation:false, allowFlip:false },
  { id:'pulsar_j0337_1715', name:'PSR J0337+1715', designation:'PSR J0337+1715', gameplayTiers:['PULSAR'], scienceClass:'TRIPLE-SYSTEM MILLISECOND PULSAR', status:'pulsar', spriteVariant:'pulsar_j0337_1715', collectible:true, allowRotation:false, allowFlip:false },
  { id:'pulsar_j1748_2446ad', name:'PSR J1748−2446ad', designation:'PSR J1748−2446ad', gameplayTiers:['PULSAR'], scienceClass:'MILLISECOND PULSAR', status:'pulsar', spriteVariant:'pulsar_j1748_2446ad', collectible:true, allowRotation:false, allowFlip:false },
  { id:'pulsar_j0437_4715', name:'PSR J0437−4715', designation:'PSR J0437−4715', gameplayTiers:['PULSAR'], scienceClass:'MILLISECOND PULSAR BINARY', status:'pulsar', spriteVariant:'pulsar_j0437_4715', collectible:true, allowRotation:false, allowFlip:false },
  { id:'pulsar_j1023_0038', name:'PSR J1023+0038', designation:'PSR J1023+0038', gameplayTiers:['PULSAR'], scienceClass:'TRANSITIONAL MILLISECOND PULSAR', status:'pulsar', spriteVariant:'pulsar_j1023_0038', collectible:true, allowRotation:false, allowFlip:false },
  { id:'pulsar_b1919_21', name:'PSR B1919+21', designation:'PSR B1919+21', gameplayTiers:['PULSAR'], scienceClass:'PULSAR', status:'pulsar', spriteVariant:'pulsar_b1919_21', collectible:true, allowRotation:false, allowFlip:false },
  { id:'pulsar_j2124_3358', name:'PSR J2124−3358', designation:'PSR J2124−3358', gameplayTiers:['PULSAR'], scienceClass:'MILLISECOND PULSAR', status:'pulsar', spriteVariant:'pulsar_j2124_3358', collectible:true, allowRotation:false, allowFlip:false },
  { id:'pulsar_j0537_6910', name:'PSR J0537−6910', designation:'PSR J0537−6910', gameplayTiers:['PULSAR'], scienceClass:'YOUNG X-RAY PULSAR', status:'pulsar', spriteVariant:'pulsar_j0537_6910', collectible:true, hostGalaxy:'lmc', allowRotation:false, allowFlip:false },
  { id:'pulsar_m51_ulx7', name:'M51 ULX-7', designation:'M51 ULX-7', gameplayTiers:['PULSAR'], scienceClass:'ULTRALUMINOUS X-RAY PULSAR', status:'pulsar', spriteVariant:'pulsar_m51_ulx7', collectible:true, hostGalaxy:'whirlpool', allowRotation:false, allowFlip:false },
  { id:'pulsar_b0540_69', name:'PSR B0540−69', designation:'PSR B0540−69', gameplayTiers:['PULSAR'], scienceClass:'YOUNG PULSAR / PULSAR-WIND NEBULA', status:'pulsar', spriteVariant:'pulsar_b0540_69', collectible:true, hostGalaxy:'lmc', allowRotation:false, allowFlip:false },
  { id:'pulsar_m82_x2', name:'M82 X-2', designation:'NuSTAR J095551+6940.8', gameplayTiers:['PULSAR'], scienceClass:'ULTRALUMINOUS X-RAY PULSAR', status:'pulsar', spriteVariant:'pulsar_m82_x2', collectible:true, hostGalaxy:'m82', allowRotation:false, allowFlip:false },

  // Stellar-mass black holes. Sprite identity comes from accretion/jet/companion context.
  { id:'blackHole_cygnusX1', name:'CYGNUS X-1', gameplayTiers:['BLACK HOLE'], scienceClass:'STELLAR-MASS BLACK HOLE', status:'black-hole', spriteVariant:'blackHole_cygnusX1', collectible:true, allowRotation:false, allowFlip:false },
  { id:'blackHole_v404Cygni', name:'V404 CYGNI', gameplayTiers:['BLACK HOLE'], scienceClass:'STELLAR-MASS BLACK HOLE', status:'black-hole', spriteVariant:'blackHole_v404Cygni', collectible:true, allowRotation:false, allowFlip:false },
  { id:'blackHole_gaiaBH1', name:'GAIA BH1', gameplayTiers:['BLACK HOLE'], scienceClass:'STELLAR-MASS BLACK HOLE', status:'black-hole', spriteVariant:'blackHole_gaiaBH1', collectible:true, allowRotation:false, allowFlip:false },
  { id:'blackHole_maxiJ1820_070', name:'MAXI J1820+070', gameplayTiers:['BLACK HOLE'], scienceClass:'STELLAR-MASS BLACK HOLE', status:'black-hole', spriteVariant:'blackHole_maxiJ1820_070', collectible:true, allowRotation:false, allowFlip:false },
  { id:'blackHole_lmcX1', name:'LMC X-1', designation:'LMC X-1', gameplayTiers:['BLACK HOLE'], scienceClass:'STELLAR-MASS BLACK-HOLE BINARY', status:'black-hole', spriteVariant:'blackHole_lmcX1', collectible:true, hostGalaxy:'lmc', allowRotation:false, allowFlip:false },
  { id:'blackHole_m31_2014_ds1', name:'M31-2014-DS1', designation:'M31-2014-DS1', gameplayTiers:['BLACK HOLE'], scienceClass:'DIRECT-COLLAPSE / FAILED-SUPERNOVA BLACK-HOLE CANDIDATE', status:'black-hole', spriteVariant:'blackHole_m31_2014_ds1', collectible:true, hostGalaxy:'andromeda', allowRotation:false, allowFlip:false },
  { id:'blackHole_cartwheelN10', name:'CARTWHEEL N.10', designation:'N.10', gameplayTiers:['BLACK HOLE'], scienceClass:'ULTRALUMINOUS X-RAY SOURCE / BLACK-HOLE CANDIDATE', status:'black-hole', spriteVariant:'blackHole_cartwheelN10', collectible:true, hostGalaxy:'cartwheel', allowRotation:false, allowFlip:false },
  { id:'blackHole_lmcX3', name:'LMC X-3', designation:'LMC X-3', gameplayTiers:['BLACK HOLE'], scienceClass:'STELLAR-MASS BLACK-HOLE BINARY', status:'black-hole', spriteVariant:'blackHole_lmcX3', collectible:true, hostGalaxy:'lmc', allowRotation:false, allowFlip:false },
  { id:'blackHole_m82X1', name:'M82 X-1', designation:'M82 X-1', gameplayTiers:['BLACK HOLE'], scienceClass:'INTERMEDIATE-MASS BLACK-HOLE CANDIDATE / ULX', status:'black-hole', spriteVariant:'blackHole_m82X1', collectible:true, hostGalaxy:'m82', allowRotation:false, allowFlip:false },
  { id:'blackHole_antennaeX11', name:'ANTENNAE X-11', designation:'X-11', gameplayTiers:['BLACK HOLE'], scienceClass:'ULTRALUMINOUS X-RAY SOURCE / BLACK-HOLE CANDIDATE', status:'black-hole', spriteVariant:'blackHole_antennaeX11', collectible:true, hostGalaxy:'antennae', allowRotation:false, allowFlip:false },

  // Supermassive black holes / active nuclei for the final gameplay tier.
  { id:'smbh_sagittariusA', name:'SAGITTARIUS A*', gameplayTiers:['SUPER MASSIVE BLACK HOLE'], scienceClass:'SUPERMASSIVE BLACK HOLE', status:'supermassive-black-hole', spriteVariant:'smbh_sagittariusA', collectible:true, allowRotation:false, allowFlip:false },
  { id:'smbh_m87', name:'M87*', gameplayTiers:['SUPER MASSIVE BLACK HOLE'], scienceClass:'SUPERMASSIVE BLACK HOLE', status:'supermassive-black-hole', spriteVariant:'smbh_m87', collectible:true, allowRotation:false, allowFlip:false },
  { id:'smbh_ton618', name:'TON 618', gameplayTiers:['SUPER MASSIVE BLACK HOLE'], scienceClass:'QUASAR / SUPERMASSIVE BLACK HOLE', status:'supermassive-black-hole', spriteVariant:'smbh_ton618', collectible:true, allowRotation:false, allowFlip:false },
  { id:'smbh_ngc4889', name:'NGC 4889', gameplayTiers:['SUPER MASSIVE BLACK HOLE'], scienceClass:'SUPERMASSIVE BLACK HOLE', status:'supermassive-black-hole', spriteVariant:'smbh_ngc4889', collectible:true, allowRotation:false, allowFlip:false },
  { id:'smbh_m31', name:'M31 CENTRAL BLACK HOLE', designation:'ANDROMEDA NUCLEUS', gameplayTiers:['SUPER MASSIVE BLACK HOLE'], scienceClass:'SUPERMASSIVE BLACK HOLE', status:'supermassive-black-hole', spriteVariant:'smbh_m31', collectible:true, hostGalaxy:'andromeda', allowRotation:false, allowFlip:false },
  { id:'smbh_m51', name:'M51 CENTRAL BLACK HOLE', designation:'WHIRLPOOL NUCLEUS', gameplayTiers:['SUPER MASSIVE BLACK HOLE'], scienceClass:'MASSIVE CENTRAL BLACK HOLE / ACTIVE NUCLEUS', status:'supermassive-black-hole', spriteVariant:'smbh_m51', collectible:true, hostGalaxy:'whirlpool', allowRotation:false, allowFlip:false },
  { id:'smbh_m104', name:'M104 CENTRAL BLACK HOLE', designation:'SOMBRERO NUCLEUS', gameplayTiers:['SUPER MASSIVE BLACK HOLE'], scienceClass:'SUPERMASSIVE BLACK HOLE', status:'supermassive-black-hole', spriteVariant:'smbh_m104', collectible:true, hostGalaxy:'sombrero', allowRotation:false, allowFlip:false }
];

const COMET_IDENTITY_BY_ID = Object.fromEntries(COMET_NAMED_IDENTITIES.map(identity => [identity.id, identity]));
const COMET_COLLECTIBLE_IDENTITIES = COMET_NAMED_IDENTITIES.filter(identity => identity.collectible === true);
const COMET_COLLECTIBLE_BY_ID = Object.fromEntries(COMET_COLLECTIBLE_IDENTITIES.map(identity => [identity.id, identity]));
const COMET_COLLECTIBLE_TIER_ORDER = [
  'DWARF PLANET',
  'ROCKY PLANET',
  'GAS PLANET',
  'YELLOW DWARF STAR',
  'BLUE GIANT STAR',
  'RED HYPERGIANT STAR',
  'NEBULA',
  'PULSAR',
  'BLACK HOLE',
  'SUPER MASSIVE BLACK HOLE'
];

function cometIdentityPoolForTier(tierName) {
  return COMET_NAMED_IDENTITIES.filter(identity => identity.gameplayTiers.includes(tierName));
}

function cometCollectiblePoolForTier(tierName) {
  return COMET_COLLECTIBLE_IDENTITIES.filter(identity => identity.gameplayTiers.includes(tierName));
}

function pickCometNamedIdentity(tierName) {
  const pool = cometIdentityPoolForTier(tierName);
  if (!pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

function getCometNamedIdentity(id) {
  return id ? COMET_IDENTITY_BY_ID[id] || null : null;
}

function isCometCollectibleIdentity(id) {
  return !!(id && COMET_COLLECTIBLE_BY_ID[id]);
}
