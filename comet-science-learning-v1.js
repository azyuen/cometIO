// Science learning v2: facts are acquired through the Collection, never merely by encountering an object.
// Successful unique ABSORB/MERGE => collection toggle + FACT acquired. Result and Collection both let
// the player tap the acquired object to open a modal science card. No automatic panel covers NEXT.
(() => {
  const proto = GameScene.prototype;
  const baseResolve = proto.resolve;
  const baseDrawResult = proto.drawResult;
  const baseShowCollection = proto.showCollection;

  const FACTS = {
    dwarf_ceres:['CERES','The largest object in the asteroid belt.','Its gravity made it round — one reason it is classed as a dwarf planet.'],
    dwarf_pluto:['PLUTO','A small icy world beyond Neptune.','Its orbit sits in the Kuiper Belt, a region rich in icy bodies.'],
    dwarf_eris:['ERIS','A distant dwarf planet similar in size to Pluto.','Its discovery helped trigger the modern definition of a planet.'],
    dwarf_haumea:['HAUMEA','A fast-spinning dwarf planet.','Its rapid rotation stretches it into an unusual elongated shape.'],
    dwarf_makemake:['MAKEMAKE','A bright icy dwarf planet in the Kuiper Belt.','Small worlds can still hold moons and complex surfaces.'],
    dwarf_gonggong:['GONGGONG','A distant icy world beyond Neptune.','It is massive enough to be considered one of the strongest dwarf-planet candidates.'],
    dwarf_quaoar:['QUAOAR','A large Kuiper Belt world with a surprising ring system.','Small distant worlds can still have complex orbital systems.'],
    dwarf_sedna:['SEDNA','A very distant reddish world on an extremely long orbit.','Its unusual orbit hints at the structure of the far outer Solar System.'],

    planet_mercury:['MERCURY','The smallest planet in our Solar System.','Small size does not mean slow: Mercury races around the Sun fastest.'],
    planet_venus:['VENUS','Similar in size to Earth, but extremely hot.','A thick carbon-dioxide atmosphere produces a powerful greenhouse effect.'],
    planet_earth:['EARTH','Our rocky planet and the only world known to support life.','A planet can be part of a larger gravitational system without being swallowed by its star.'],
    planet_mars:['MARS','A cold rocky planet with enormous volcanoes and canyons.','Its lower gravity helped it lose much of its early atmosphere.'],
    planet_jupiter:['JUPITER','The most massive planet in our Solar System.','Its strong gravity can dramatically alter the paths of smaller objects.'],
    planet_saturn:['SATURN','A gas giant surrounded by spectacular rings.','The rings are countless pieces of ice and rock orbiting Saturn.'],
    planet_uranus:['URANUS','An ice giant rotating almost on its side.','Not every giant planet is the same: ice giants differ from Jupiter and Saturn.'],
    planet_neptune:['NEPTUNE','The outermost major planet in our Solar System.','Despite its distance from the Sun, Neptune has extremely fast winds.'],

    yellowDwarf_sun:['THE SUN','A G-type main-sequence star.','Its gravity holds the Solar System together while fusion powers the star.'],
    yellowDwarf_alphaCentauriA:['ALPHA CENTAURI A','A Sun-like star in our nearest neighbouring star system.','Stars commonly exist in multiple-star systems rather than alone.'],
    yellowDwarf_tauCeti:['TAU CETI','A nearby Sun-like star.','Astronomers study nearby stars to compare other planetary systems with ours.'],
    yellowDwarf_18Scorpii:['18 SCORPII','A star often described as a close solar analogue.','Comparing Sun-like stars helps astronomers understand how typical our own Sun is.'],

    blueGiant_rigel:['RIGEL','A luminous blue supergiant in Orion.','Massive stars burn fuel quickly, so being bigger does not mean living longer.'],
    blueGiant_spica:['SPICA','What looks like one bright star is actually a close stellar system.','Some points of light hide multiple objects bound together by gravity.'],
    blueGiant_alnitak:['ALNITAK','A hot multiple-star system in Orion’s Belt.','Very massive stars can dominate the light of an entire stellar system.'],
    blueGiant_bellatrix:['BELLATRIX','A hot blue giant star in Orion.','Blue colour is a clue to a star’s high surface temperature.'],

    redHypergiant_betelgeuse:['BETELGEUSE','A huge evolved red supergiant.','As massive stars age, their outer layers can expand enormously.'],
    redHypergiant_vyCanisMajoris:['VY CANIS MAJORIS','An enormous evolved red star.','A star can have a gigantic radius without being the densest object in the game.'],
    redHypergiant_uyScuti:['UY SCUTI','An extremely large evolved red star.','Stellar radius and stellar mass are related, but they are not the same measurement.'],
    redHypergiant_nmlCygni:['NML CYGNI','A very large luminous red star losing material into space.','Massive evolved stars can shed huge amounts of gas before the end of their lives.'],

    nebula_orion:['ORION NEBULA','A vast cloud where new stars are forming.','Nebulae can be enormous but very diffuse — size and density are different things.'],
    nebula_carina:['CARINA NEBULA','A giant star-forming region filled with gas, dust and massive stars.','Gravity gathers parts of gas clouds until new stars can form.'],
    nebula_eagle:['EAGLE NEBULA','Home to the famous Pillars of Creation.','Dense pockets inside huge gas clouds can collapse to form stars.'],
    nebula_helix:['HELIX NEBULA','A planetary nebula made by a dying Sun-like star.','Despite the name, a planetary nebula is not a planet.'],
    nebula_ring:['RING NEBULA','A glowing shell of gas expelled by a dying Sun-like star.','Its famous ring is our view of a three-dimensional shell of gas rather than a flat cosmic doughnut.'],
    nebula_dumbbell:['DUMBBELL NEBULA','The first planetary nebula discovered, recorded by Charles Messier in 1764.','Its two-lobed shape comes from gas shed during the late stages of a Sun-like star’s life.'],
    nebula_butterfly:['BUTTERFLY NEBULA','A bipolar planetary nebula with two enormous lobes of expelled gas.','A dense dusty waist channels the outflow into its dramatic butterfly shape.'],
    nebula_catsEye:["CAT'S EYE NEBULA",'A complex planetary nebula wrapped in nested shells of gas.','Its rings and knots record repeated episodes of mass loss from the central star.'],
    nebula_hourglass:['HOURGLASS NEBULA','A young planetary nebula with two opposing lobes pinched at the centre.','Fast stellar winds meeting denser material around the equator help create its hourglass shape.'],
    nebula_rosette:['ROSETTE NEBULA','A vast star-forming cloud surrounding the young cluster NGC 2244.','Radiation and winds from hot young stars have carved a large cavity in its centre.'],
    nebula_tarantula:['TARANTULA NEBULA','A huge star-forming region in the Large Magellanic Cloud.','It is one of the most active stellar nurseries in the Local Group of galaxies.'],
    nebula_horsehead:['HORSEHEAD NEBULA','A dark tower of dust silhouetted against the bright emission nebula IC 434.','It looks dark because dense dust blocks the glowing hydrogen behind it.'],

    pulsar_crab:['CRAB PULSAR','The Crab Pulsar is the rapidly spinning neutron star left behind by the supernova seen from Earth in 1054 CE.','It spins about 30 times per second and powers the glowing Crab Nebula around it.'],
    pulsar_vela:['VELA PULSAR','The Vela Pulsar is a young neutron star born in the Vela supernova remnant.','It is one of the brightest pulsars in the sky at high energies and is famous for sudden changes in spin called glitches.'],
    pulsar_geminga:['GEMINGA','Geminga is a nearby pulsar first identified as a strong gamma-ray source.','It is bright in gamma rays but unusually faint at radio wavelengths, making it a classic radio-quiet pulsar.'],
    pulsar_b1509:['PSR B1509–58','PSR B1509–58 is a young energetic pulsar that powers the dramatic nebula often nicknamed the Hand of God.','Its rapid rotation and strong magnetic field drive a powerful particle wind that sculpts the surrounding nebula.'],
    pulsar_b1257_12:['PSR B1257+12','PSR B1257+12 hosts the first confirmed planets discovered beyond the Solar System.','Its planets showed that planetary systems can exist even around the compact remnant of a dead star.'],
    pulsar_b1957_20:['BLACK WIDOW PULSAR','PSR B1957+20 is nicknamed the Black Widow because its energetic pulsar wind strips material from a tiny companion star.','The system shows how radiation and particle winds from a millisecond pulsar can gradually erode a nearby companion.'],
    pulsar_j0337_1715:['PSR J0337+1715','PSR J0337+1715 is a millisecond pulsar in a remarkable system with two white-dwarf companions.','Its precisely measured three-body orbits make the system an unusually sensitive laboratory for testing gravity.'],
    pulsar_j1748_2446ad:['PSR J1748−2446ad','PSR J1748−2446ad is the fastest-spinning pulsar currently known, rotating 716 times each second.','At that speed, one complete rotation takes only about 1.4 milliseconds.'],
    pulsar_j0437_4715:['PSR J0437−4715','PSR J0437−4715 is a nearby millisecond pulsar orbiting a white-dwarf companion.','Its brightness, proximity and very regular pulses make it especially valuable for precision pulsar timing.'],
    pulsar_j1023_0038:['PSR J1023+0038','PSR J1023+0038 is a transitional millisecond pulsar that has been observed switching between a radio-pulsar state and an accretion-disk state.','It provides a rare direct view of the link between accreting neutron-star binaries and recycled millisecond pulsars.'],
    pulsar_b1919_21:['PSR B1919+21','PSR B1919+21 was the first pulsar discovered, identified by Jocelyn Bell Burnell in 1967.','Its remarkably regular radio pulses revealed an entirely new class of ultra-dense stellar remnants.'],
    pulsar_j2124_3358:['PSR J2124−3358','PSR J2124−3358 is a nearby millisecond pulsar associated with an asymmetric bow-shock nebula.','The bow shock traces the interaction between the pulsar wind, the surrounding gas and the pulsar’s motion through space.'],

    blackHole_cygnusX1:['CYGNUS X-1','One of the best-known stellar-mass black-hole systems.','A black hole can be physically small yet have gravity strong enough to dominate a close encounter.'],
    blackHole_v404Cygni:['V404 CYGNI','A stellar-mass black hole in a binary system.','Matter pulled from a companion can heat up brightly before crossing the event horizon.'],
    blackHole_gaiaBH1:['GAIA BH1','A relatively nearby dormant stellar-mass black hole.','Black holes do not need to glow; astronomers can infer them from the motion of companion stars.'],
    blackHole_maxiJ1820_070:['MAXI J1820+070','A black-hole binary observed in a bright outburst.','Accreting matter can produce energetic radiation and jets around a black hole.'],

    smbh_sagittariusA:['SAGITTARIUS A*','The supermassive black hole at the centre of the Milky Way.','The central black hole is one component of a vastly larger galactic system.'],
    smbh_m87:['M87*','A supermassive black hole famous for the first Event Horizon Telescope black-hole image.','Its host galaxy is vastly larger than the black hole itself.'],
    smbh_ton618:['TON 618','An extremely luminous quasar powered by a very massive black hole.','Bright quasars reveal matter heating as it falls toward an active galactic nucleus.'],
    smbh_ngc4889:['NGC 4889','A giant elliptical galaxy containing an extremely massive central black hole.','Galaxies and their central black holes grow on very different physical scales.']
  };

  const TIER_FALLBACK = {
    'DWARF PLANET':['Small worlds can become rounded under their own gravity.','Gravity can reshape an object long before it becomes a full-sized planet.'],
    'ROCKY PLANET':['Rocky planets are dense solid worlds.','Composition and gravity both affect how planets respond to collisions.'],
    'GAS PLANET':['Giant planets hold enormous envelopes of gas.','Their large masses can strongly redirect smaller bodies.'],
    'YELLOW DWARF STAR':['Main-sequence stars shine through nuclear fusion.','A star can anchor an entire planetary system through gravity.'],
    'BLUE GIANT STAR':['Blue giant stars are extremely hot and luminous.','Massive stars burn through their fuel much faster than smaller stars.'],
    'RED HYPERGIANT STAR':['Evolved red stars can expand to enormous radii.','Visible size alone does not tell you an object’s density.'],
    'NEBULA':['Nebulae are huge clouds of gas and dust.','They can be enormous while remaining much more diffuse than stars.'],
    'PULSAR':['Pulsars are rapidly rotating neutron stars.','They pack stellar-scale mass into a remarkably small volume.'],
    'BLACK HOLE':['Black holes concentrate mass into an extremely compact region.','Close to them, gravity matters far more than visible size.'],
    'SUPER MASSIVE BLACK HOLE':['Supermassive black holes occupy galactic centres.','Even a huge black hole is only one part of its host galaxy.']
  };

  function factData(identityId) {
    const identity = getCometNamedIdentity(identityId);
    if (!identity?.collectible) return null;
    const direct = FACTS[identityId];
    if (direct) return { identity, title: direct[0], fact: direct[1], why: direct[2] };
    const fallback = TIER_FALLBACK[identity.gameplayTiers?.[0]] || [identity.scienceClass, 'Its properties affect how it behaves in space.'];
    return { identity, title: identity.name, fact: fallback[0], why: fallback[1] };
  }

  function isSuccessfulUniqueAcquisition(scene) {
    const pending = scene.pending;
    const id = scene.other?.identityId;
    if (!id || !COMET_COLLECTIBLE_BY_ID?.[id]) return null;
    if (scene._devModeActive || scene._labSandboxRun) return null;
    if (pending?.choice !== 'ABSORB' || pending?.compactGravityReverse) return null;
    const result = String(pending?.result || '').toLowerCase();
    if (result !== 'absorb' && result !== 'merge') return null;
    const state = scene.uniqueCollectionState;
    if (state?.[id] === true || (Array.isArray(scene.collectedIdentityIds) && scene.collectedIdentityIds.includes(id))) return null;
    return id;
  }

  function destroyScienceModal(scene) {
    if (!Array.isArray(scene._scienceModalObjects)) return;
    scene._scienceModalObjects.forEach(obj => { try { obj?.destroy?.(true); } catch (e) {} });
    scene._scienceModalObjects = [];
  }

  function trackModal(scene, obj) {
    scene._scienceModalObjects ||= [];
    scene._scienceModalObjects.push(obj);
    return obj;
  }

  function showScienceModal(scene, identityId) {
    destroyScienceModal(scene);
    const data = factData(identityId);
    if (!data) return;

    const blocker = scene.add.rectangle(W / 2, scene.Y(455), W, H, 0x000000, .72).setInteractive();
    scene.ui.add(blocker); trackModal(scene, blocker);

    const panel = scene.add.graphics();
    panel.fillStyle(C.panel, .995).fillRoundedRect(28, scene.Y(248), 364, 404, 12);
    panel.lineStyle(2, C.cyan, .82).strokeRoundedRect(28, scene.Y(248), 364, 404, 12);
    scene.ui.add(panel); trackModal(scene, panel);

    trackModal(scene, scene.addText(W / 2, scene.Y(270), '◆ FACT ACQUIRED', 8.2, C.green, { ox:.5, bold:true }));
    trackModal(scene, scene.addText(W / 2, scene.Y(299), data.title, 14, C.white, { ox:.5, bold:true, width:330, align:'center' }));
    trackModal(scene, scene.addText(W / 2, scene.Y(327), data.identity.scienceClass, 7.2, C.cyan, { ox:.5, bold:true, width:330, align:'center' }));

    const tierIndex = TIERS.findIndex(t => data.identity.gameplayTiers?.includes(t.name));
    const tier = TIERS[Math.max(0, tierIndex)];
    if (tier) {
      const object = {
        name:tier.name, realName:data.identity.name, tier:tierIndex,
        radiusM:tier.r, massKg:tier.m, speedMS:tier.v, kind:tier.kind,
        color:tier.color, solid:tier.solid, identityId:data.identity.id,
        namedSpriteBase:data.identity.spriteVariant, scienceClass:data.identity.scienceClass,
        identityStatus:data.identity.status
      };
      trackModal(scene, scene.drawObject(W / 2, scene.Y(395), 43, object, false, false));
    }

    trackModal(scene, scene.addText(48, scene.Y(462), 'WHAT IS IT?', 7.6, C.white, { bold:true }));
    trackModal(scene, scene.addText(48, scene.Y(486), data.fact, 8.1, C.muted, { bold:true, width:324, lineSpacing:3 }));
    trackModal(scene, scene.addText(48, scene.Y(542), 'WHY IT MATTERS', 7.6, C.white, { bold:true }));
    trackModal(scene, scene.addText(48, scene.Y(566), data.why, 8.1, C.cyan, { bold:true, width:324, lineSpacing:3 }));

    const close = scene.add.container(W / 2, scene.Y(622));
    const cg = scene.add.graphics();
    cg.fillStyle(C.cyan, .14).fillRoundedRect(-82, -19, 164, 38, 7);
    cg.lineStyle(1.5, C.cyan, .9).strokeRoundedRect(-82, -19, 164, 38, 7);
    const ct = scene.add.text(0, 0, 'CLOSE', { fontFamily:FONT, fontSize:'11px', fontStyle:'bold', color:'#ffffff' }).setOrigin(.5);
    const hit = scene.add.rectangle(0, 0, 164, 38, 0xffffff, .001).setInteractive({ useHandCursor:true });
    hit.on('pointerdown', () => destroyScienceModal(scene));
    close.add([cg, ct, hit]); scene.ui.add(close); trackModal(scene, close);
  }

  proto.resolve = function () {
    this._scienceEarnedIdentity = isSuccessfulUniqueAcquisition(this);
    return baseResolve.call(this);
  };

  proto.drawResult = function (result) {
    // Suppress any legacy auto-science discovery panel. Science is now opened only by deliberate tap.
    const earned = this._scienceEarnedIdentity;
    const legacy = this._scienceDiscovery;
    this._scienceDiscovery = null;
    const value = baseDrawResult.call(this, result);
    this._scienceDiscovery = legacy;

    if (earned && result?.survived !== false) {
      const base = this.Y(160);
      const x = 357, y = base + 103;
      const badge = this.add.container(x, y);
      const bg = this.add.circle(0, 0, 12, C.cyan, .95);
      const t = this.add.text(0, 0, 'i', { fontFamily:FONT, fontSize:'13px', fontStyle:'bold', color:'#00131f' }).setOrigin(.5);
      const badgeHit = this.add.circle(0, 0, 18, 0xffffff, .001).setInteractive({ useHandCursor:true });
      badgeHit.on('pointerdown', () => showScienceModal(this, earned));
      badge.add([bg, t, badgeHit]); this.ui.add(badge);

      this.addText(325, base + 177, 'FACT ✓', 6.5, C.cyan, { ox:.5, bold:true });
      const spriteHit = this.add.rectangle(325, base + 132, 86, 86, 0xffffff, .001).setInteractive({ useHandCursor:true });
      spriteHit.on('pointerdown', () => showScienceModal(this, earned));
      this.ui.add(spriteHit);
    }

    this._scienceEarnedIdentity = null;
    return value;
  };

  proto.showCollection = function (options = {}) {
    destroyScienceModal(this);
    const result = baseShowCollection.call(this, options);
    const page = Math.max(0, Math.min((COMET_COLLECTIBLE_TIER_ORDER?.length || 1) - 1, Number(options.page) || 0));
    const tierName = COMET_COLLECTIBLE_TIER_ORDER?.[page];
    const items = COMET_COLLECTIBLE_IDENTITIES?.filter(x => x.gameplayTiers.includes(tierName)) || [];
    const ownedIds = options.score?.collection || options.saved?.ids || this.collectedIdentityIds || [];
    const owned = new Set(ownedIds);

    items.forEach((identity, index) => {
      if (!owned.has(identity.id)) return;
      const y = this.Y(205 + index * 51);
      this.addText(368, y, 'FACT ✓', 6.1, C.cyan, { ox:1, bold:true });
      const hit = this.add.rectangle(W / 2, y + 10, 368, 43, 0xffffff, .001).setInteractive({ useHandCursor:true });
      hit.on('pointerdown', () => showScienceModal(this, identity.id));
      this.ui.add(hit);
    });

    this.addText(W / 2, this.Y(690), 'TAP A COLLECTED OBJECT TO OPEN ITS SCIENCE FACT', 6.3, C.cyan, { ox:.5, bold:true });
    return result;
  };

  // Retain the public method name for any older callers, but make it a modal instead of replacing
  // the Collection/result screen.
  proto.showScienceObject = function (identityId) {
    showScienceModal(this, identityId);
  };

  window.CometScienceLearning = Object.freeze({
    enabled:true,
    acquisition:'successful-unique-absorb-or-merge',
    automaticResultPopup:false,
    resultSpriteTap:true,
    collectionScienceCards:true,
    getFact(identityId){ const d=factData(identityId); return d ? { title:d.title, fact:d.fact, why:d.why } : null; }
  });
})();