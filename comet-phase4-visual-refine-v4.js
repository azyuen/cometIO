// Phase 4 visual refinement v4.
// Cosmetic-only overlay: varied black-hole cores, fluid gas arms, stronger colour variation,
// readable high-tier orbitals (handled by companion overlay), and faint cluster filaments.
(() => {
  if (typeof GameScene === 'undefined' || !window.CometPhase4SpriteCompositeV1) return;

  const proto = GameScene.prototype;
  const baseDrawObject = proto.drawObject;

  const CORE_VARIANTS = Object.freeze({
    milkyway: ['smbh_sagittariusA'],
    andromeda: ['smbh_ngc4889'],
    whirlpool: ['smbh_m87'],
    sombrero: ['smbh_ton618'],
    cartwheel: ['blackHole_cygnusX1'],
    antennae: ['smbh_02', 'blackHole_v404Cygni'],
    virgo: ['smbh_m87'],
    coma: ['smbh_ngc4889'],
    bullet: ['blackHole_maxiJ1820_070'],
    pandora: ['smbh_ton618']
  });

  const PALETTES = Object.freeze({
    milkyway: [0x78d9ff, 0xb6a2ff, 0xffd38a],
    andromeda: [0x91cfff, 0xd6b4ff, 0xffddb1],
    whirlpool: [0x63e4ff, 0xae8cff, 0xffb6dc],
    sombrero: [0xffcf87, 0xff9f72, 0xd9bcff],
    cartwheel: [0x72e8ff, 0xffb7e9, 0xffde8a],
    antennae: [0x7bdcff, 0xc38cff, 0xffa679],
    virgo: [0x72d9ff, 0xb9a1ff, 0xffd79a],
    coma: [0x8ec9ff, 0xc18eff, 0xffbf8d],
    bullet: [0x55d9ff, 0xa98cff, 0xff9f8f],
    pandora: [0x7ce7ff, 0xd08cff, 0xffc5e9]
  });

  const GAS_CONFIG = Object.freeze({
    milkyway: { mode:'spiral', arms:4, turns:1.28, flat:.58, phase:.18 },
    andromeda: { mode:'spiral', arms:2, turns:1.34, flat:.39, phase:.12 },
    whirlpool: { mode:'spiral', arms:2, turns:1.62, flat:.82, phase:.15 },
    sombrero: { mode:'disk', arms:2, turns:1.0, flat:.20, phase:0 },
    cartwheel: { mode:'ring', arms:1, turns:1.0, flat:1.0, phase:0 },
    antennae: { mode:'spiral', arms:2, turns:1.20, flat:.72, phase:.35 }
  });

  function stopOnDestroy(parent, tween) {
    if (!parent || !tween) return;
    parent.once('destroy', () => { try { tween.stop(); } catch (_) {} });
  }

  function textureFor(scene, variant, preferredLod = 32) {
    if (typeof COMET_SPRITE_ASSETS === 'undefined' || typeof cometSpriteTextureKey !== 'function') return null;
    const entry = COMET_SPRITE_ASSETS[variant];
    if (!entry || !Array.isArray(entry.lods) || !entry.lods.length) return null;
    const order = preferredLod === 64 ? [64,32] : [32,64];
    for (const lod of order) {
      if (!entry.lods.includes(lod)) continue;
      const key = cometSpriteTextureKey(variant, lod);
      if (!scene.textures?.exists?.(key)) continue;
      return { key, lod };
    }
    return null;
  }

  function addSprite(scene, parent, variant, x, y, size, alpha = .95, angle = 0) {
    const resolved = textureFor(scene, variant, size >= 14 ? 64 : 32);
    if (!resolved) return null;
    const image = scene.add.image(x, y, resolved.key).setAlpha(alpha).setAngle(angle);
    const iw = Math.max(1, image.width || 1);
    const ih = Math.max(1, image.height || iw);
    image.setDisplaySize(size, size * (ih / iw));
    parent.add(image);
    return image;
  }

  function pulse(scene, parent, target, duration = 3000, amount = .06) {
    if (!target) return;
    const tween = scene.tweens.add({
      targets: target,
      scaleX: { from: 1 - amount / 2, to: 1 + amount / 2 },
      scaleY: { from: 1 - amount / 2, to: 1 + amount / 2 },
      alpha: { from: Math.max(.58, (target.alpha || .9) - .12), to: Math.min(1, (target.alpha || .9) + .05) },
      duration, yoyo: true, repeat: -1, ease: 'Sine.inOut'
    });
    stopOnDestroy(parent, tween);
  }

  function walk(node, fn) {
    if (!node) return;
    fn(node);
    if (Array.isArray(node.list)) node.list.forEach(child => walk(child, fn));
  }

  function hideExistingBlackHoleSprites(visual) {
    walk(visual, node => {
      if (node?.type !== 'Image') return;
      const key = String(node.texture?.key || '');
      if (/comet-sprite:(?:smbh|blackHole)_/i.test(key)) node.setAlpha?.(.04);
    });
  }

  function addProfileCore(scene, visual, object, r) {
    const profile = object?.phase4NamedProfile;
    const variants = CORE_VARIANTS[profile];
    if (!variants?.length) return;
    hideExistingBlackHoleSprites(visual);

    if (object.phase4NamedType === 'cluster') {
      const image = addSprite(scene, visual, variants[0], 0, 0, clamp(r * .055, 4, 7.5), .86);
      pulse(scene, visual, image, 3400, .045);
      return;
    }

    if (profile === 'antennae') {
      const left = addSprite(scene, visual, variants[0], -r * .19, -r * .05, clamp(r * .17, 8, 19), .94, -8);
      const right = addSprite(scene, visual, variants[1], r * .19, r * .06, clamp(r * .15, 7, 17), .92, 10);
      pulse(scene, visual, left, 3100, .05);
      pulse(scene, visual, right, 3550, .05);
      return;
    }

    const image = addSprite(scene, visual, variants[0], 0, 0, clamp(r * .27, 12, 29), .97);
    pulse(scene, visual, image, 2900 + (profile?.length || 0) * 70, .055);
  }

  function spiralPoint(r, cfg, arm, t, layer) {
    const start = cfg.phase + arm * Math.PI * 2 / cfg.arms;
    const wave = Math.sin(t * Math.PI * 4 + arm * .83 + layer * 1.7) * (.035 + layer * .008);
    const angle = start + t * Math.PI * cfg.turns + wave;
    const radialWave = 1 + Math.sin(t * Math.PI * 3 + layer * 1.13) * .026;
    const d = r * (.16 + .79 * t) * radialWave;
    return { x: Math.cos(angle) * d, y: Math.sin(angle) * d * cfg.flat };
  }

  function drawSpiralGas(graphics, r, cfg, color, layer) {
    for (let arm = 0; arm < cfg.arms; arm++) {
      graphics.lineStyle(Math.max(1.4, r * (.070 - layer * .010)), color, .13 + layer * .045).beginPath();
      for (let j = 0; j <= 28; j++) {
        const p = spiralPoint(r, cfg, arm, j / 28, layer);
        if (!j) graphics.moveTo(p.x, p.y); else graphics.lineTo(p.x, p.y);
      }
      graphics.strokePath();
      graphics.lineStyle(Math.max(1, r * .018), color, .18 + layer * .035).beginPath();
      for (let j = 0; j <= 28; j++) {
        const p = spiralPoint(r, cfg, arm, j / 28, layer + .35);
        if (!j) graphics.moveTo(p.x, p.y); else graphics.lineTo(p.x, p.y);
      }
      graphics.strokePath();
    }
  }

  function drawDiskGas(graphics, r, color, layer) {
    graphics.lineStyle(Math.max(1.2, r * (.045 - layer * .006)), color, .15 + layer * .035)
      .strokeEllipse(0, (layer - 1) * r * .008, r * (1.66 + layer * .09), r * (.17 + layer * .025));
    graphics.lineStyle(Math.max(1, r * .018), color, .20)
      .arc(0, 0, r * (.71 + layer * .06), Math.PI * (.03 + layer * .04), Math.PI * (1.04 + layer * .05), false)
      .strokePath();
  }

  function drawRingGas(graphics, r, color, layer) {
    const rr = r * (.76 + layer * .035);
    graphics.lineStyle(Math.max(1.4, r * (.050 - layer * .006)), color, .13 + layer * .04)
      .strokeCircle(0, 0, rr);
    for (let i = 0; i < 9; i++) {
      const a = i * Math.PI * 2 / 9 + layer * .17;
      const x = Math.cos(a) * rr, y = Math.sin(a) * rr;
      graphics.fillStyle(color, .10 + (i % 3) * .025).fillCircle(x, y, Math.max(1, r * .035));
    }
  }

  function addFluidGas(scene, visual, object, r) {
    const profile = object?.phase4NamedProfile;
    const cfg = GAS_CONFIG[profile];
    if (!cfg) return;
    const palette = PALETTES[profile] || [C.cyan, C.purple, 0xffd6a0];

    for (let layer = 0; layer < 3; layer++) {
      const g = scene.add.graphics();
      const color = palette[layer % palette.length];
      if (cfg.mode === 'disk') drawDiskGas(g, r, color, layer);
      else if (cfg.mode === 'ring') drawRingGas(g, r, color, layer);
      else drawSpiralGas(g, r, cfg, color, layer);

      if (typeof g.setBlendMode === 'function' && Phaser.BlendModes) g.setBlendMode(Phaser.BlendModes.ADD);
      visual.addAt(g, Math.min(1 + layer, visual.list?.length || 0));

      const tween = scene.tweens.add({
        targets: g,
        angle: { from: -2.2 + layer * .8, to: 2.6 - layer * .6 },
        scaleX: { from: .985 + layer * .004, to: 1.018 + layer * .005 },
        scaleY: { from: 1.015 - layer * .004, to: .986 + layer * .004 },
        alpha: { from: .58 + layer * .07, to: .88 - layer * .05 },
        duration: 5200 + layer * 1700 + (profile?.length || 0) * 90,
        yoyo: true, repeat: -1, ease: 'Sine.inOut'
      });
      stopOnDestroy(visual, tween);
    }
  }

  function findMemberField(node) {
    if (!node || !Array.isArray(node.list)) return null;
    const directContainers = node.list.filter(child => child?.type === 'Container');
    if (directContainers.length >= 6) return node;
    for (const child of directContainers) {
      const found = findMemberField(child);
      if (found) return found;
    }
    return null;
  }

  function addClusterFilaments(scene, visual, object, r) {
    const field = findMemberField(visual);
    if (!field) return;
    const members = (field.list || []).filter(child => child?.type === 'Container');
    if (members.length < 4) return;

    const palette = PALETTES[object.phase4NamedProfile] || [C.cyan, C.purple, 0xffd6a0];
    const g = scene.add.graphics();
    const used = new Set();
    let drawn = 0;
    const maxLinks = Math.min(14, Math.max(6, members.length));

    for (let i = 0; i < members.length && drawn < maxLinks; i++) {
      let best = -1, bestD = Infinity;
      for (let j = 0; j < members.length; j++) {
        if (i === j) continue;
        const dx = members[i].x - members[j].x;
        const dy = members[i].y - members[j].y;
        const d = dx * dx + dy * dy;
        if (d < bestD) { bestD = d; best = j; }
      }
      if (best < 0) continue;
      const key = i < best ? `${i}:${best}` : `${best}:${i}`;
      if (used.has(key) || Math.sqrt(bestD) > r * .64) continue;
      used.add(key);
      const color = palette[drawn % palette.length];
      g.lineStyle(Math.max(.7, r * .006), color, .075 + (drawn % 3) * .018)
        .lineBetween(members[i].x, members[i].y, members[best].x, members[best].y);
      drawn++;
    }

    for (let i = 0; i < Math.min(3, Math.floor(members.length / 4)); i++) {
      const a = (i * 3) % members.length;
      const b = (a + Math.floor(members.length / 2) + 1) % members.length;
      g.lineStyle(Math.max(.7, r * .0045), palette[(i + 1) % palette.length], .045)
        .lineBetween(members[a].x, members[a].y, members[b].x, members[b].y);
    }

    field.addAt(g, 0);
    const tw = scene.tweens.add({
      targets: g, alpha: { from: .58, to: .96 },
      duration: 3900, yoyo: true, repeat: -1, ease: 'Sine.inOut'
    });
    stopOnDestroy(visual, tw);

    members.forEach((member, i) => {
      const halo = scene.add.graphics();
      const color = palette[(i * 2 + 1) % palette.length];
      const rr = Math.max(2.5, r * (.020 + (i % 4) * .003));
      halo.fillStyle(color, .045 + (i % 3) * .012).fillEllipse(0, 0, rr * 2.7, rr * 1.7);
      member.addAt(halo, 0);
    });
  }

  proto.drawObject = function(x, y, radius, object, mystery = false, glow = false) {
    const visual = baseDrawObject.call(this, x, y, radius, object, mystery, glow);
    if (!visual || mystery || !object?.phase4NamedId || visual._phase4VisualRefineV4) return visual;

    visual._phase4VisualRefineV4 = true;
    const r = radius * (Number(visual.phase4CompressedScale) || 1);
    addProfileCore(this, visual, object, r);

    if (object.phase4NamedType === 'cluster') {
      addClusterFilaments(this, visual, object, r);
    } else {
      addFluidGas(this, visual, object, r);
    }

    visual.phase4RelativeSizeV4 = {
      profile: object.phase4NamedProfile,
      compressedPhysicalScale: Number(visual.phase4CompressedScale) || 1,
      clusterLargerThanGalaxy: object.phase4NamedType === 'cluster'
    };
    return visual;
  };

  window.CometPhase4VisualRefineV4 = Object.freeze({
    enabled: true,
    version: 4,
    cosmeticOnly: true,
    variedCoreSprites: true,
    stellarBlackHoleCoreVariants: true,
    fluidGasArms: true,
    clusterFilaments: true,
    colourVariation: true,
    preservesCompressedPhysicalScale: true
  });
})();