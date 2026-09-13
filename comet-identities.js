// Named celestial identities are deliberately separate from gameplay tier/physics data.
// They are flavour/art identities revealed after the player's choice. They do NOT change mass,
// radius, speed, encounter odds or progression. Future named sprites can use spriteVariant.

const COMET_NAMED_IDENTITIES = [
  // Comets — these all remain hidden behind the shared generic comet mystery family until reveal.
  { id:'comet_halley', name:"HALLEY'S COMET", designation:'1P/Halley', gameplayTiers:['SMALL COMET','LARGER COMET'], scienceClass:'COMET', status:'confirmed', spriteVariant:'comet_halley', allowRotation:true, rotationStep:90, allowFlip:true },
  { id:'comet_tempel1', name:'TEMPEL 1', designation:'9P/Tempel 1', gameplayTiers:['SMALL COMET','LARGER COMET'], scienceClass:'COMET', status:'confirmed', spriteVariant:'comet_tempel1', allowRotation:true, rotationStep:90, allowFlip:true },
  { id:'comet_borrelly', name:'BORRELLY', designation:'19P/Borrelly', gameplayTiers:['SMALL COMET','LARGER COMET'], scienceClass:'COMET', status:'confirmed', spriteVariant:'comet_borrelly', allowRotation:true, rotationStep:90, allowFlip:true },
  { id:'comet_67p', name:'67P / CHURYUMOV–GERASIMENKO', designation:'67P/Churyumov–Gerasimenko', gameplayTiers:['SMALL COMET','LARGER COMET'], scienceClass:'COMET', status:'confirmed', spriteVariant:'comet_67p', allowRotation:true, rotationStep:90, allowFlip:true },
  { id:'comet_wild2', name:'WILD 2', designation:'81P/Wild 2', gameplayTiers:['SMALL COMET','LARGER COMET'], scienceClass:'COMET', status:'confirmed', spriteVariant:'comet_wild2', allowRotation:true, rotationStep:90, allowFlip:true },

  // Dwarf planets. The first five are IAU-recognized dwarf planets. The final three are strong
  // dwarf-planet candidates and are flagged internally so future encyclopedia UI can distinguish them.
  { id:'dwarf_ceres', name:'CERES', gameplayTiers:['DWARF PLANET'], scienceClass:'DWARF PLANET', status:'iau-recognized', spriteVariant:'dwarf_ceres', allowRotation:false, allowFlip:false },
  { id:'dwarf_pluto', name:'PLUTO', gameplayTiers:['DWARF PLANET'], scienceClass:'DWARF PLANET', status:'iau-recognized', spriteVariant:'dwarf_pluto', allowRotation:false, allowFlip:false },
  { id:'dwarf_eris', name:'ERIS', gameplayTiers:['DWARF PLANET'], scienceClass:'DWARF PLANET', status:'iau-recognized', spriteVariant:'dwarf_eris', allowRotation:false, allowFlip:false },
  { id:'dwarf_haumea', name:'HAUMEA', gameplayTiers:['DWARF PLANET'], scienceClass:'DWARF PLANET', status:'iau-recognized', spriteVariant:'dwarf_haumea', allowRotation:false, allowFlip:false },
  { id:'dwarf_makemake', name:'MAKEMAKE', gameplayTiers:['DWARF PLANET'], scienceClass:'DWARF PLANET', status:'iau-recognized', spriteVariant:'dwarf_makemake', allowRotation:false, allowFlip:false },
  { id:'dwarf_gonggong', name:'GONGGONG', gameplayTiers:['DWARF PLANET'], scienceClass:'DWARF-PLANET CANDIDATE', status:'candidate', spriteVariant:'dwarf_gonggong', allowRotation:false, allowFlip:false },
  { id:'dwarf_quaoar', name:'QUAOAR', gameplayTiers:['DWARF PLANET'], scienceClass:'DWARF-PLANET CANDIDATE', status:'candidate', spriteVariant:'dwarf_quaoar', allowRotation:false, allowFlip:false },
  { id:'dwarf_sedna', name:'SEDNA', gameplayTiers:['DWARF PLANET'], scienceClass:'DWARF-PLANET CANDIDATE', status:'candidate', spriteVariant:'dwarf_sedna', allowRotation:false, allowFlip:false },

  // All eight Solar System planets. Uranus and Neptune keep the existing GAS PLANET gameplay tier
  // but are correctly tagged as ICE GIANT scientifically. Named identity never changes tier physics.
  { id:'planet_mercury', name:'MERCURY', gameplayTiers:['ROCKY PLANET'], scienceClass:'TERRESTRIAL PLANET', status:'planet', spriteVariant:'planet_mercury', allowRotation:false, allowFlip:false },
  { id:'planet_venus', name:'VENUS', gameplayTiers:['ROCKY PLANET'], scienceClass:'TERRESTRIAL PLANET', status:'planet', spriteVariant:'planet_venus', allowRotation:false, allowFlip:false },
  { id:'planet_earth', name:'EARTH', gameplayTiers:['ROCKY PLANET'], scienceClass:'TERRESTRIAL PLANET', status:'planet', spriteVariant:'planet_earth', allowRotation:false, allowFlip:false },
  { id:'planet_mars', name:'MARS', gameplayTiers:['ROCKY PLANET'], scienceClass:'TERRESTRIAL PLANET', status:'planet', spriteVariant:'planet_mars', allowRotation:false, allowFlip:false },
  { id:'planet_jupiter', name:'JUPITER', gameplayTiers:['GAS PLANET'], scienceClass:'GAS GIANT', status:'planet', spriteVariant:'planet_jupiter', allowRotation:false, allowFlip:false },
  { id:'planet_saturn', name:'SATURN', gameplayTiers:['GAS PLANET'], scienceClass:'GAS GIANT', status:'planet', spriteVariant:'planet_saturn', allowRotation:false, allowFlip:false },
  { id:'planet_uranus', name:'URANUS', gameplayTiers:['GAS PLANET'], scienceClass:'ICE GIANT', status:'planet', spriteVariant:'planet_uranus', allowRotation:false, allowFlip:false },
  { id:'planet_neptune', name:'NEPTUNE', gameplayTiers:['GAS PLANET'], scienceClass:'ICE GIANT', status:'planet', spriteVariant:'planet_neptune', allowRotation:false, allowFlip:false }
];

const COMET_IDENTITY_BY_ID = Object.fromEntries(COMET_NAMED_IDENTITIES.map(identity => [identity.id, identity]));

function cometIdentityPoolForTier(tierName) {
  return COMET_NAMED_IDENTITIES.filter(identity => identity.gameplayTiers.includes(tierName));
}

function pickCometNamedIdentity(tierName) {
  const pool = cometIdentityPoolForTier(tierName);
  if (!pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

function getCometNamedIdentity(id) {
  return id ? COMET_IDENTITY_BY_ID[id] || null : null;
}
