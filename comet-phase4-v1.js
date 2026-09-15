// Phase 4: system-scale growth and the observable-universe finale.
// Loaded last so the existing atom -> SMBH game remains authoritative below Phase 4.
// Phase 4 deliberately reuses the current encounter loop/UI and uses procedural Phaser art only;
// later sprite packs can replace these draw routines without changing progression mechanics.
(() => {
  const SMBH_INDEX = TIERS.findIndex(t => t.name === 'SUPER MASSIVE BLACK HOLE');
  if (SMBH_INDEX < 0) return;

  // Turn the old terminal SMBH into the gateway to system-scale play.
  TIERS[SMBH_INDEX].need = 4.8;
  TIERS[SMBH_INDEX].zone = 'GALACTIC NUCLEUS';
  TIERS[SMBH_INDEX].hint = 'A massive black hole at the heart of a growing galactic system';

  const GALAXY_INDEX = TIERS.length;
  TIERS.push({
    name: 'GALAXY', zone: 'GALACTIC ASSEMBLY', r: 4.7e20, m: 1.2e42, v: 260000,
    kind: 'galaxy', color: 0x8fc9ff, solid: false, need: 5.2,
    hint: 'Stars, gas, dark matter and a central nucleus bound into one galaxy',
    examples: ['SPIRAL GALAXY', 'ELLIPTICAL GALAXY', 'BARRED SPIRAL GALAXY']
  });

  const CLUSTER_INDEX = TIERS.length;
  TIERS.push({
    name: 'GALAXY CLUSTER', zone: 'CLUSTER SPACE', r: 4.5e22, m: 1.0e45, v: 800000,
    kind: 'cluster', color: 0x72d8ff, solid: false, need: 5.8,
    hint: 'Many galaxies gravitationally bound in one enormous cluster',
    examples: ['GALAXY CLUSTER', 'RICH GALAXY CLUSTER', 'CLUSTER CORE']
  });

  const SUPERCLUSTER_INDEX = TIERS.length;
  TIERS.push({
    name: 'SUPERCLUSTER', zone: 'COSMIC WEB', r: 1.8e24, m: 1.0e47, v: 1100000,
    kind: 'supercluster', color: 0xb58cff, solid: false, need: 999,
    hint: 'A vast network of galaxy clusters linked across the cosmic web',
    examples: ['SUPERCLUSTER', 'COSMIC-WEB NODE', 'SUPERCLUSTER COMPLEX']
  });

  const PHASE4_FIRST = SMBH_INDEX;
  const MANUAL_SLOT_KEY = 'cometio-manual-checkpoint-v1';
  const OBSERVABLE_UNIVERSE_MASS = 1.0e53;
  const UNIVERSE_BONUS = 5000;
  const MAX_VISIBLE_CAPTURE_MARKERS = 6;

  const baseResetRun = GameScene.prototype.resetRun;
  const baseSetPlayer = GameScene.prototype.setPlayer;
  const basePickOpponent = GameScene.prototype.pickOpponent;
  const baseStartEncounter = GameScene.prototype.startEncounter;
  const baseDrawHud = GameScene.prototype.drawHud;
  const baseDrawArena = GameScene.prototype.drawArena;
  const baseDrawPrompt = GameScene.prototype.drawPrompt;
  const baseDrawObject = GameScene.prototype.drawObject;
  const baseChoose = GameScene.prototype.choose;
  const baseOutcome = GameScene.prototype.outcome;
  const baseReveal = GameScene.prototype.reveal;
  const baseAnimate = GameScene.prototype.animate;
  const baseGrowthPoints = GameScene.prototype.growthPoints;
  const baseResolve = GameScene.prototype.resolve;
  const baseDrawResult = GameScene.prototype.drawResult;
  const baseSave = GameScene.prototype.save;
  const baseLoad = GameScene.prototype.load;

  const clamp01 = n => clamp(Number(n) || 0, 0, 1);
  const whole = n => Math.max(0, Math.floor(Number(n) || 0));

  function inPhase4(scene) {
    return !scene._devModeActive && scene.tierIndex >= PHASE4_FIRST && scene.tierIndex <= SUPERCLUSTER_INDEX;
  }

  function inPlayablePhase4(scene) {
    return inPhase4(scene) && scene.tierIndex < SUPERCLUSTER_INDEX;
  }

  function phase4Progress(scene) {
    const tier = TIERS[scene.tierIndex];
    if (!tier || scene.tierIndex >= SUPERCLUSTER_INDEX) return 1;
    return clamp01(scene.growth / Math.max(.001, tier.need));
  }

  function phase4Region() {
    return {
      id: 'deep-cosmos', name: 'DEEP COSMOS', short: 'DEEP COSMOS',
      science: 'Galaxies and larger cosmic structures', common: 'clusters • galaxies • satellites',
      chance: 1, pool: []
    };
  }

  function templateObject(scene, spec) {
    const tierIndex = clamp(Number(spec.tier) || scene.tierIndex, 0, SUPERCLUSTER_INDEX);
    const t = TIERS[tierIndex] || TIERS[scene.tierIndex];
    return {
      name: spec.name,
      realName: spec.realName || spec.name,
      tier: tierIndex,
      radiusM: Number(spec.r) || t.r,
      massKg: Number(spec.m) || t.m,
      speedMS: Number(spec.v) || t.v,
      kind: spec.kind || t.kind,
      color: spec.color || t.color,
      solid: false,
      hint: spec.hint || 'A large gravitationally bound cosmic structure',
      gap: tierIndex - scene.tierIndex,
      phase4Structure: true
    };
  }

  function phase4Opponent(scene) {
    let pool;
    if (scene.tierIndex === SMBH_INDEX) {
      pool = [
        { name: 'GLOBULAR CLUSTER', tier: SMBH_INDEX - 1, r: 5e18, m: 2e36, kind: 'starcluster', color: 0xffe9a8, hint: 'A dense old star cluster that can join the growing galactic system' },
        { name: 'STELLAR HALO', tier: SMBH_INDEX, r: 1.8e20, m: 4e39, kind: 'starcluster', color: 0xbddcff, hint: 'A huge population of stars surrounding a galactic nucleus' },
        { name: 'GAS-RICH SATELLITE', tier: SMBH_INDEX, r: 8e19, m: 8e39, kind: 'galaxy', color: 0x8ed8ff, hint: 'A small gas-rich system falling toward the growing galaxy' },
        { name: 'DWARF GALAXY', tier: GALAXY_INDEX, r: 1.4e20, m: 3e40, kind: 'galaxy', color: 0xa6c9ff, hint: 'A small galaxy that can be captured or merged' }
      ];
    } else if (scene.tierIndex === GALAXY_INDEX) {
      pool = [
        { name: 'GLOBULAR CLUSTER', tier: SMBH_INDEX, r: 5e18, m: 3e36, kind: 'starcluster', color: 0xffe9a8 },
        { name: 'DWARF GALAXY', tier: GALAXY_INDEX, r: 1.5e20, m: 4e40, kind: 'galaxy', color: 0xa6c9ff },
        { name: 'SPIRAL GALAXY', tier: GALAXY_INDEX, r: 4.8e20, m: 1.1e42, kind: 'galaxy', color: 0x86cfff },
        { name: 'GIANT ELLIPTICAL GALAXY', tier: CLUSTER_INDEX, r: 7e20, m: 2.6e42, kind: 'galaxy', color: 0xffd7a0 }
      ];
    } else {
      pool = [
        { name: 'SPIRAL GALAXY', tier: GALAXY_INDEX, r: 4.8e20, m: 1.1e42, kind: 'galaxy', color: 0x86cfff },
        { name: 'GALAXY GROUP', tier: CLUSTER_INDEX, r: 1.5e22, m: 2.5e44, kind: 'cluster', color: 0x8ddaff },
        { name: 'SMALL GALAXY CLUSTER', tier: CLUSTER_INDEX, r: 3.5e22, m: 7e44, kind: 'cluster', color: 0x78d0ff },
        { name: 'RICH GALAXY CLUSTER', tier: CLUSTER_INDEX, r: 5.5e22, m: 1.5e45, kind: 'cluster', color: 0xc7a5ff }
      ];
    }
    return templateObject(scene, Phaser.Math.RND.pick(pool));
  }

  function addToUi(scene, object) {
    scene.ui?.add(object);
    return object;
  }

  function drawMiniGalaxy(g, x, y, radius, color, alpha = 1) {
    g.fillStyle(color, .10 * alpha).fillCircle(x, y, radius * 1.7);
    g.lineStyle(Math.max(1, radius * .13), color, .72 * alpha)
      .strokeEllipse(x, y, radius * 2.8, radius * .78);
    g.lineStyle(Math.max(1, radius * .10), 0xffffff, .42 * alpha)
      .strokeEllipse(x, y, radius * 2.1, radius * .55);
    g.fillStyle(0xffffff, .9 * alpha).fillCircle(x, y, Math.max(1.3, radius * .18));
  }

  function proceduralSystemObject(scene, x, y, radius, object, mystery = false, glow = false) {
    const c = scene.add.container(x, y);
    const g = scene.add.graphics();
    const color = mystery ? 0x586676 : (object.color || C.cyan);
    const kind = object.kind;

    if (glow) g.fillStyle(C.cyan, .07).fillCircle(0, 0, radius + 13);

    if (kind === 'starcluster') {
      g.fillStyle(color, mystery ? .16 : .10).fillCircle(0, 0, radius * .95);
      const count = 18;
      for (let i = 0; i < count; i++) {
        const a = i * 2.399 + ((object.tier || 0) * .17);
        const d = radius * (.16 + .72 * ((i * 37) % count) / count);
        const rr = Math.max(1, radius * (.035 + (i % 3) * .014));
        g.fillStyle(mystery ? 0x7b8792 : (i % 4 ? color : 0xffffff), mystery ? .35 : .78)
          .fillCircle(Math.cos(a) * d, Math.sin(a) * d, rr);
      }
    } else if (kind === 'galaxy') {
      g.fillStyle(color, mystery ? .07 : .08).fillEllipse(0, 0, radius * 2.3, radius * 1.25);
      for (let arm = 0; arm < 3; arm++) {
        g.lineStyle(Math.max(1.2, radius * .055), mystery ? 0x687582 : color, mystery ? .32 : .60);
        g.beginPath();
        for (let i = 0; i <= 18; i++) {
          const t = i / 18;
          const a = arm * Math.PI * 2 / 3 + t * Math.PI * 1.55;
          const d = radius * (.18 + .78 * t);
          const px = Math.cos(a) * d;
          const py = Math.sin(a) * d * .47;
          if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
        }
        g.strokePath();
      }
      g.fillStyle(mystery ? 0x697681 : 0xfff3c7, mystery ? .45 : .95).fillCircle(0, 0, Math.max(2, radius * .15));
      if (!mystery) g.fillStyle(0x11111c, .96).fillCircle(0, 0, Math.max(1.5, radius * .055));
    } else if (kind === 'cluster') {
      g.fillStyle(color, mystery ? .045 : .055).fillCircle(0, 0, radius * 1.08);
      const positions = [[-.46,-.22],[.35,-.37],[.46,.28],[-.31,.42],[.02,.05],[-.05,-.53],[.04,.58]];
      positions.forEach((p, i) => drawMiniGalaxy(g, p[0] * radius, p[1] * radius, radius * (i === 4 ? .19 : .13), color, mystery ? .42 : .95));
    } else if (kind === 'supercluster') {
      const nodes = [[-.66,-.32],[-.28,-.53],[.12,-.18],[.58,-.47],[.68,.18],[.25,.56],[-.28,.42],[-.67,.24],[0,.12]];
      const links = [[0,1],[1,2],[2,3],[2,4],[2,8],[8,5],[8,6],[6,7],[0,7],[4,5]];
      links.forEach(([a,b], i) => {
        g.lineStyle(Math.max(1, radius * .035), mystery ? 0x697582 : (i % 2 ? C.purple : C.cyan), mystery ? .24 : .36)
          .lineBetween(nodes[a][0] * radius, nodes[a][1] * radius, nodes[b][0] * radius, nodes[b][1] * radius);
      });
      nodes.forEach((p, i) => {
        const rr = radius * (i === 8 ? .12 : .075);
        g.fillStyle(mystery ? 0x6c7781 : (i % 3 ? color : C.cyan), mystery ? .40 : .84).fillCircle(p[0] * radius, p[1] * radius, rr);
        if (!mystery) g.fillStyle(0xffffff, .65).fillCircle(p[0] * radius, p[1] * radius, Math.max(1, rr * .24));
      });
    } else if (kind === 'universe') {
      g.fillStyle(0x091225, 1).fillCircle(0, 0, radius);
      g.lineStyle(Math.max(1.5, radius * .055), C.cyan, .72).strokeCircle(0, 0, radius);
      g.lineStyle(Math.max(1, radius * .025), C.purple, .55).strokeCircle(0, 0, radius * .84);
      if (!mystery) {
        [[-.28,-.2],[.27,-.31],[.34,.25],[-.25,.31],[.03,.04]].forEach((p, i) => {
          g.fillStyle(i === 4 ? 0xffffff : (i % 2 ? C.cyan : C.purple), i === 4 ? .9 : .55)
            .fillCircle(p[0] * radius, p[1] * radius, Math.max(1, radius * (i === 4 ? .055 : .025)));
        });
      }
    } else {
      // SMBH as the nucleus of a visible, growing system.
      g.fillStyle(0x05050a, 1).fillCircle(0, 0, radius * .36);
      g.lineStyle(Math.max(2, radius * .07), mystery ? 0x697582 : C.purple, mystery ? .42 : .82)
        .strokeEllipse(0, 0, radius * 1.55, radius * .48);
      if (!mystery) g.lineStyle(Math.max(1, radius * .035), C.orange, .62).strokeEllipse(0, 0, radius * 1.18, radius * .28);
    }

    c.add(g);

    // Representative captured structures: visual only, not inventory slots.
    if (!mystery && object === scene.player && scene.tierIndex >= PHASE4_FIRST && scene.tierIndex < SUPERCLUSTER_INDEX) {
      const captures = Math.min(MAX_VISIBLE_CAPTURE_MARKERS, whole(scene.systemCaptures));
      const rings = scene.add.graphics();
      for (let i = 0; i < captures; i++) {
        const rx = radius * (1.05 + i * .13);
        const ry = radius * (.40 + i * .045);
        rings.lineStyle(1, C.cyan, .08).strokeEllipse(0, 0, rx * 2, ry * 2);
        const a = (i / Math.max(1, captures)) * Math.PI * 2 + scene.tierIndex * .31;
        const px = Math.cos(a) * rx;
        const py = Math.sin(a) * ry;
        if (scene.tierIndex === SMBH_INDEX) {
          rings.fillStyle(i % 2 ? C.cyan : 0xffe8ac, .88).fillCircle(px, py, Math.max(2.2, radius * .065));
        } else {
          drawMiniGalaxy(rings, px, py, Math.max(3, radius * .08), i % 2 ? C.cyan : C.purple, .85);
        }
      }
      c.add(rings);
    }

    addToUi(scene, c);
    return c;
  }

  function drawPhase4Arena(scene) {
    const divider = scene.add.graphics();
    divider.lineStyle(8, C.cyan, .055).lineBetween(0, scene.Y(610), W, scene.Y(226));
    divider.lineStyle(2.5, C.cyan, .72).lineBetween(0, scene.Y(610), W, scene.Y(226));
    scene.ui.add(divider);

    scene.youSprite = scene.drawObject(126, scene.Y(337), 43, scene.player, false, true);
    scene.otherSprite = scene.drawObject(304, scene.Y(477), 45, scene.other, true, false);
    scene.addText(14, scene.Y(184), 'YOU • YOUR SYSTEM', 9.2, C.green, { bold: true });
    scene.addText(W - 14, scene.Y(604), 'UNKNOWN STRUCTURE', 9.2, C.orange, { bold: true, ox: 1 });

    scene.tweens.add({ targets: scene.youSprite, x: '+=3', y: '-=2', duration: 820, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    scene.tweens.add({ targets: scene.otherSprite, x: '-=3', y: '+=2', duration: 930, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
  }

  function drawPhase4Hud(scene, controls) {
    const tier = TIERS[scene.tierIndex];
    const utilityY = SAFE_TOP + 15;
    const y = controls ? SAFE_TOP + 42 : SAFE_TOP + 18;
    if (controls) {
      scene.miniButton(48, utilityY, 72, 24, 'SAVE', C.green, () => scene.save(false));
      scene.miniButton(140, utilityY, 104, 24, 'LOAD', C.blue, () => scene.load());
      scene.miniButton(232, utilityY, 72, 24, 'HOME', C.orange, () => {
        scene.save(true); scene.runActive = true; scene.showHome();
      });
    }

    const gap = 5, x0 = 10, cw = 96.25, ch = 84;
    const pct = Math.round(phase4Progress(scene) * 100);
    const rows = [
      ['SYSTEM MASS', `${pct}%`],
      ['SPEED', scene.speedText(scene.player.speedMS)],
      ['UNIVERSE', `NO. ${whole(scene.universeCount) + 1}`],
      [`TIER ${scene.tierIndex + 1}`, scene.shortTier(tier.name)]
    ];

    rows.forEach((row, i) => {
      const x = x0 + i * (cw + gap), g = scene.add.graphics();
      g.fillStyle(C.panel, .985).fillRoundedRect(x, y, cw, ch, 7);
      g.lineStyle(2, C.cyan, .68).strokeRoundedRect(x, y, cw, ch, 7);
      scene.ui.add(g);
      if (i === 0) {
        const q = scene.add.graphics();
        q.lineStyle(2, C.cyan, .75).strokeCircle(x + 18, y + 39, 10);
        q.fillStyle(C.purple, .75).fillCircle(x + 18, y + 39, 4);
        scene.ui.add(q);
      }
      if (i === 1) scene.speedGauge(x + 17, y + 39);
      if (i === 2) {
        const q = scene.add.graphics();
        q.lineStyle(1, C.cyan, .55).strokeEllipse(x + 18, y + 39, 27, 11);
        q.fillStyle(C.white, .85).fillCircle(x + 18, y + 39, 3.2);
        q.fillStyle(C.orange, .9).fillCircle(x + 29, y + 36, 2.8);
        scene.ui.add(q);
      }
      if (i === 3) {
        const bar = scene.add.graphics(), by = y + 73;
        bar.fillStyle(0x20364a).fillRoundedRect(x + 8, by, cw - 16, 5, 2);
        bar.fillStyle(C.cyan).fillRoundedRect(x + 8, by, (cw - 16) * phase4Progress(scene), 5, 2);
        scene.ui.add(bar);
      }
      scene.addText(x + 7, y + 9, row[0], i === 0 ? 7.2 : 8.2, C.muted, { bold: true });
      scene.addText(i < 3 ? x + 34 : x + 7, y + 30, row[1], i === 3 ? 7.4 : 9.1, C.white, {
        bold: true, width: i === 3 ? 82 : 61, lineSpacing: 1
      });
    });

    const infoY = y + 101;
    scene.addText(13, infoY, 'DEEP COSMOS', 9.6, C.white, { bold: true, width: 245 });
    scene.addText(W - 13, infoY, `R${scene.encounters + 1} • ${scene.score.toLocaleString('en-US')}`, 9.2, C.muted, { ox: 1, bold: true });
  }

  function phase4ResultScreen(scene, res) {
    scene.clearUI();
    scene.state = 'PHASE4_RESULT';
    drawPhase4Hud(scene, false);

    const baseY = scene.Y(172), g = scene.add.graphics();
    g.fillStyle(C.panel, .98).fillRoundedRect(14, baseY, 392, 488, 10);
    g.lineStyle(2, res.color, .9).strokeRoundedRect(14, baseY, 392, 488, 10);
    scene.ui.add(g);
    scene.addText(W / 2, baseY + 26, res.title, 18, res.color, { ox: .5, bold: true, align: 'center', width: 360 });
    scene.addText(W / 2, baseY + 58, scene.other.realName || scene.other.name, 11, C.orange, { ox: .5, bold: true, width: 350, align: 'center' });

    scene.drawObject(108, baseY + 150, 38, scene.player, false, true);
    scene.drawObject(312, baseY + 150, 38, scene.other, false, false);
    scene.addText(108, baseY + 198, 'YOUR SYSTEM', 8.5, C.green, { ox: .5, bold: true });
    scene.addText(312, baseY + 198, 'ENCOUNTER', 8.5, C.orange, { ox: .5, bold: true });

    const rb = scene.add.graphics();
    rb.fillStyle(C.panel2, .9).fillRoundedRect(34, baseY + 236, 352, 106, 7);
    scene.ui.add(rb);
    scene.addText(48, baseY + 249, 'WHAT HAPPENED?', 9, C.cyan, { bold: true });
    scene.addText(48, baseY + 271, res.reason, 10, C.white, { width: 324, lineSpacing: 4 });
    scene.addText(W / 2, baseY + 378, res.detail, 10.5, C.white, { ox: .5, align: 'center', width: 350, bold: true });

    const label = scene.tierIndex >= SUPERCLUSTER_INDEX ? 'BEGIN FINAL MERGE' : 'NEXT ENCOUNTER';
    scene.wideButton(W / 2, scene.Y(711), 330, 58, label, C.cyan, () => scene.startEncounter());
  }

  function phase4Reveal(scene, choice) {
    scene.clearUI();
    scene.state = 'PHASE4_REVEAL';
    drawPhase4Hud(scene, false);
    scene.addText(W / 2, scene.Y(163), 'COSMIC STRUCTURE REVEAL', 14, C.white, { ox: .5, bold: true });

    const ratio = clamp(Math.sqrt(Math.max(scene.other.massKg, 1) / Math.max(scene.player.massKg, 1)), .72, 1.38);
    const pr = 40, or = 40 * ratio;
    const p = scene.drawObject(105, scene.Y(365), pr, scene.player, false, true);
    const o = scene.drawObject(315, scene.Y(408), or, scene.other, false, false);
    p.setScale(.62).setAlpha(.25); o.setScale(.62).setAlpha(.25);
    scene.tweens.add({ targets: [p, o], scale: 1, alpha: 1, duration: 600, ease: 'Back.out' });

    scene.addText(20, scene.Y(516), `YOU\n${TIERS[scene.tierIndex].name}`, 10.5, C.green, { bold: true, lineSpacing: 4, width: 170 });
    scene.addText(W - 20, scene.Y(516), `IDENTIFIED\n${scene.other.realName}`, 10.5, C.orange, { ox: 1, align: 'right', bold: true, lineSpacing: 4, width: 190 });

    const panel = scene.add.graphics();
    panel.fillStyle(C.panel, .98).fillRoundedRect(10, scene.Y(646), 400, 68, 8);
    panel.lineStyle(2, C.cyan, .86).strokeRoundedRect(10, scene.Y(646), 400, 68, 8);
    scene.ui.add(panel);
    scene.addText(W / 2, scene.Y(666), `${choice} LOCKED IN`, 13, C.white, { ox: .5, bold: true });
    scene.addText(W / 2, scene.Y(691), 'WATCH THE GRAVITATIONAL ENCOUNTER…', 9, C.muted, { ox: .5, bold: true });
    scene.time.delayedCall(1050, () => scene.animate(choice, p, o, pr, or));
  }

  function captureAnimation(scene, p, o) {
    const sx = o.x, sy = o.y, px = p.x, py = p.y;
    const controlX = (sx + px) / 2 + 16;
    const controlY = (sy + py) / 2 - 78;
    scene.tweens.killTweensOf(p); scene.tweens.killTweensOf(o);
    scene.tweens.addCounter({
      from: 0, to: 1, duration: 850, ease: 'Sine.inOut',
      onUpdate: tw => {
        const t = tw.getValue(), u = 1 - t;
        o.x = u*u*sx + 2*u*t*controlX + t*t*(px + 53);
        o.y = u*u*sy + 2*u*t*controlY + t*t*(py + 7);
        o.setScale(Math.max(.22, 1 - .68 * t));
      }
    });
    scene.time.delayedCall(820, () => {
      const ring = scene.add.circle(px, py, 54, 0x000000, 0).setStrokeStyle(1.5, C.cyan, .42);
      scene.ui.add(ring);
      scene.tweens.add({ targets: ring, scale: 1.22, alpha: 0, duration: 390, onComplete: () => ring.destroy() });
    });
    scene.time.delayedCall(1180, () => scene.resolve());
  }

  function tidalLossAnimation(scene, p, o) {
    const px = p.x, py = p.y;
    scene.tweens.add({ targets: o, x: px + 70, y: py + 24, duration: 560, ease: 'Quad.inOut' });
    scene.time.delayedCall(470, () => {
      scene.flash(px + 38, py + 12, C.orange);
      const lost = scene.add.circle(px + 34, py + 4, 5, C.cyan, .9);
      scene.ui.add(lost);
      scene.tweens.add({ targets: lost, x: W + 30, y: scene.Y(235), alpha: 0, duration: 680, ease: 'Cubic.out', onComplete: () => lost.destroy() });
      scene.tweens.add({ targets: p, x: px - 10, duration: 90, yoyo: true, repeat: 3 });
    });
    scene.time.delayedCall(1250, () => scene.resolve());
  }

  function capturedThenEscapeAnimation(scene, p, o) {
    const cx = o.x, cy = o.y, startX = p.x, startY = p.y;
    const rx = Math.max(64, Math.abs(startX - cx)), ry = 48;
    const startAngle = Math.atan2(startY - cy, startX - cx);
    scene.tweens.addCounter({
      from: 0, to: 1, duration: 1200, ease: 'Sine.inOut',
      onUpdate: tw => {
        const t = tw.getValue();
        const angle = startAngle + t * Math.PI * 2.35;
        const r = rx * (1 - .28 * Math.sin(Math.PI * t));
        p.x = cx + Math.cos(angle) * r;
        p.y = cy + Math.sin(angle) * ry;
        p.setScale(.72 + .28 * Math.abs(Math.cos(angle)));
      }
    });
    scene.time.delayedCall(930, () => {
      scene.flash(p.x, p.y, C.red);
      scene.tweens.add({ targets: p, x: 25, y: scene.Y(235), duration: 420, ease: 'Cubic.out' });
    });
    scene.time.delayedCall(1450, () => scene.resolve());
  }

  function patchPhase4Save(scene) {
    const fields = {
      phase4Version: 1,
      universeCount: whole(scene.universeCount),
      systemCaptures: whole(scene.systemCaptures),
      finaleMergeCount: whole(scene.finaleMergeCount)
    };
    for (const key of [MANUAL_SLOT_KEY, SAVE_KEY]) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const data = JSON.parse(raw);
        Object.assign(data, fields);
        localStorage.setItem(key, JSON.stringify(data));
      } catch (e) {}
    }
  }

  function readPhase4Save() {
    try {
      const raw = localStorage.getItem(MANUAL_SLOT_KEY) || localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const d = JSON.parse(raw);
      return {
        universeCount: whole(d.universeCount),
        systemCaptures: whole(d.systemCaptures),
        finaleMergeCount: whole(d.finaleMergeCount)
      };
    } catch (e) { return null; }
  }

  function makeSuperclusterPiece(scene, x, y, index, parent = null, scale = 1) {
    const c = scene.add.container(x, y).setScale(scale);
    const g = scene.add.graphics();
    const half = 42;
    g.fillStyle(index % 2 ? 0x173151 : 0x241b43, .34).fillRoundedRect(-half, -half, half * 2, half * 2, 12);

    const nodesByPiece = [
      [[-28,-22],[-6,-31],[22,-16],[11,12],[-19,23],[34,18]],
      [[-33,-16],[-8,-30],[25,-25],[18,6],[-14,19],[32,27]],
      [[-28,-27],[2,-18],[28,-5],[18,26],[-14,31],[-34,8]],
      [[-32,-23],[-4,-28],[27,-12],[29,21],[2,29],[-24,17]]
    ];
    const n = nodesByPiece[index] || nodesByPiece[0];
    const links = [[0,1],[1,2],[1,3],[3,4],[3,5]];
    links.forEach(([a,b], i) => g.lineStyle(2, i % 2 ? C.purple : C.cyan, .46).lineBetween(n[a][0], n[a][1], n[b][0], n[b][1]));

    // Matching filaments at the seams make the four independent superclusters read as one web.
    const seams = [
      [[half,18],[22,-16]], [[-half,18],[-33,-16]], [[half,-7],[28,-5]], [[-half,-7],[-32,-23]]
    ];
    const seam = seams[index];
    g.lineStyle(2, C.cyan, .42).lineBetween(seam[0][0], seam[0][1], seam[1][0], seam[1][1]);
    if (index < 2) g.lineStyle(2, C.purple, .38).lineBetween(index ? -12 : 11, half, index ? -14 : 11, 12);
    else g.lineStyle(2, C.purple, .38).lineBetween(index === 2 ? -14 : 2, -half, index === 2 ? 2 : -4, -18);

    n.forEach((p, i) => {
      g.fillStyle(i % 3 ? C.cyan : C.purple, .86).fillCircle(p[0], p[1], i === 3 ? 5.2 : 3.6);
      g.fillStyle(C.white, .65).fillCircle(p[0], p[1], 1.2);
    });
    c.add(g);
    if (parent) parent.add(c); else scene.ui.add(c);
    return c;
  }

  function drawUniverseAssembly(scene, mergeCount, incoming = true) {
    const centerX = W / 2, centerY = scene.Y(395);
    const slots = [[-43,-43],[43,-43],[-43,43],[43,43]];
    for (let i = 0; i <= mergeCount; i++) makeSuperclusterPiece(scene, centerX + slots[i][0], centerY + slots[i][1], i);

    if (!incoming || mergeCount >= 3) return null;
    const index = mergeCount + 1;
    const piece = makeSuperclusterPiece(scene, W - 60, scene.Y(570), index, null, .92);
    piece._finalX = centerX + slots[index][0];
    piece._finalY = centerY + slots[index][1];
    return piece;
  }

  GameScene.prototype.startUniverseFinale = function () {
    this.clearUI();
    this.state = 'UNIVERSE_MERGE';
    this.finaleMergeCount = clamp(whole(this.finaleMergeCount), 0, 3);
    this.addText(W / 2, this.Y(58), 'FINAL ASSEMBLY', 21, C.white, { ox: .5, bold: true });
    this.addText(W / 2, this.Y(91), 'SUPERCLUSTERS JOIN ACROSS THE COSMIC WEB', 9, C.muted, { ox: .5, bold: true });
    this.addText(W / 2, this.Y(126), `${this.finaleMergeCount + 1} OF 4 SUPERCLUSTERS`, 10.5, C.cyan, { ox: .5, bold: true });

    const incoming = drawUniverseAssembly(this, this.finaleMergeCount, true);
    this._finaleIncomingPiece = incoming;
    this.addText(W / 2, this.Y(646), 'ONE MORE PIECE OF THE COSMIC WEB IS WITHIN REACH.', 8.7, C.white, { ox: .5, bold: true, width: 350, align: 'center' });
    this.wideButton(W / 2, this.Y(725), 320, 58, 'MERGE', C.green, () => this.mergeUniversePiece());
  };

  GameScene.prototype.mergeUniversePiece = function () {
    if (this.state !== 'UNIVERSE_MERGE' || !this._finaleIncomingPiece) return;
    this.state = 'UNIVERSE_MERGING';
    const piece = this._finaleIncomingPiece;
    this.tweens.add({
      targets: piece, x: piece._finalX, y: piece._finalY, scale: 1,
      duration: 760, ease: 'Cubic.inOut',
      onComplete: () => {
        this.flash(piece.x, piece.y, C.cyan);
        this.finaleMergeCount++;
        this.encounters++;
        this.score += 350;
        if (this.finaleMergeCount >= 3) this.time.delayedCall(500, () => this.completeUniverseAssembly());
        else this.time.delayedCall(450, () => this.startUniverseFinale());
      }
    });
  };

  GameScene.prototype.completeUniverseAssembly = function () {
    this.clearUI();
    this.state = 'UNIVERSE_FORMING';
    this.addText(W / 2, this.Y(72), 'OBSERVABLE UNIVERSE FORMED', 20, C.green, { ox: .5, bold: true });
    this.addText(W / 2, this.Y(105), 'FOUR SUPERCLUSTERS • ONE VISIBLE COSMOS', 9, C.muted, { ox: .5, bold: true });

    const assembly = this.add.container(W / 2, this.Y(405));
    this.ui.add(assembly);
    const slots = [[-43,-43],[43,-43],[-43,43],[43,43]];
    for (let i = 0; i < 4; i++) makeSuperclusterPiece(this, slots[i][0], slots[i][1], i, assembly);
    const rim = this.add.graphics();
    rim.lineStyle(2, C.cyan, .34).strokeCircle(0, 0, 70);
    rim.lineStyle(1, C.purple, .32).strokeCircle(0, 0, 82);
    assembly.add(rim);

    const universeObject = { name: 'OBSERVABLE UNIVERSE', tier: SUPERCLUSTER_INDEX, radiusM: 4.4e26, massKg: OBSERVABLE_UNIVERSE_MASS, speedMS: 0, kind: 'universe', color: C.cyan, solid: false };
    const simple = this.drawObject(W / 2, this.Y(405), 28, universeObject, false, true);
    simple.setAlpha(0).setScale(.45);
    this.tweens.add({ targets: assembly, scale: .18, alpha: 0, duration: 1250, ease: 'Cubic.inOut' });
    this.tweens.add({ targets: simple, scale: 1, alpha: 1, delay: 820, duration: 560, ease: 'Back.out' });
    this.addText(W / 2, this.Y(543), 'ZOOMING OUT…', 9, C.muted, { ox: .5, bold: true }).setAlpha(.75);
    this.time.delayedCall(1900, () => this.showUniverseAtomEncounter());
  };

  GameScene.prototype.showUniverseAtomEncounter = function () {
    this.clearUI();
    this.state = 'UNIVERSE_ATOM';
    this.addText(W / 2, this.Y(58), 'ENCOUNTER DETECTED', 18, C.white, { ox: .5, bold: true });
    this.addText(W / 2, this.Y(88), 'BEYOND THE EDGE OF YOUR UNIVERSE…', 9, C.muted, { ox: .5, bold: true });

    const divider = this.add.graphics();
    divider.lineStyle(2.5, C.cyan, .70).lineBetween(0, this.Y(606), W, this.Y(224));
    this.ui.add(divider);
    const universeObject = { name: 'OBSERVABLE UNIVERSE', tier: SUPERCLUSTER_INDEX, radiusM: 4.4e26, massKg: OBSERVABLE_UNIVERSE_MASS, speedMS: 0, kind: 'universe', color: C.cyan, solid: false };
    const atomTier = TIERS[0];
    const atom = { name: atomTier.name, tier: 0, radiusM: atomTier.r, massKg: atomTier.m, speedMS: atomTier.v, kind: atomTier.kind, color: atomTier.color, solid: atomTier.solid };
    this._universeSprite = this.drawObject(120, this.Y(342), 42, universeObject, false, true);
    this._finalAtomSprite = baseDrawObject.call(this, 305, this.Y(478), 37, atom, false, true);
    this.addText(15, this.Y(177), 'YOU', 10, C.green, { bold: true });
    this.addText(W - 15, this.Y(604), 'UNKNOWN OBJECT', 10, C.orange, { ox: 1, bold: true });

    const panel = this.add.graphics();
    panel.fillStyle(C.panel, .98).fillRoundedRect(10, this.Y(636), 400, 78, 8);
    panel.lineStyle(2, C.cyan, .88).strokeRoundedRect(10, this.Y(636), 400, 78, 8);
    this.ui.add(panel);
    this.addText(W / 2, this.Y(655), 'IT LOOKS STRANGELY FAMILIAR.', 14, C.white, { ox: .5, bold: true });
    this.addText(W / 2, this.Y(684), 'THERE IS ONLY ONE THING TO TRY.', 9, C.muted, { ox: .5, bold: true });
    this.wideButton(W / 2, this.Y(771), 300, 70, 'ABSORB', C.green, () => this.absorbFinalAtom());
  };

  GameScene.prototype.absorbFinalAtom = function () {
    if (this.state !== 'UNIVERSE_ATOM') return;
    this.state = 'UNIVERSE_ATOM_ABSORB';
    const u = this._universeSprite, a = this._finalAtomSprite;
    this.tweens.add({ targets: a, x: u.x, y: u.y, scale: .08, alpha: .2, duration: 900, ease: 'Cubic.in' });
    this.tweens.add({ targets: u, scale: 1.18, duration: 220, delay: 700, yoyo: true, ease: 'Sine.out' });
    this.time.delayedCall(860, () => this.flash(u.x, u.y, C.white));
    this.time.delayedCall(1250, () => this.finishUniverse());
  };

  function bankUniverseScore(scene, completed) {
    const before = Date.now();
    if (!scene.qualifies()) return false;
    scene.recordScore();
    try {
      const scores = scene.getScores();
      let candidate = null;
      for (const s of scores) {
        if (Number(s.score) !== Number(scene.score)) continue;
        if (!candidate || Number(s.date) > Number(candidate.date)) candidate = s;
      }
      if (candidate && Number(candidate.date) >= before - 1500) {
        candidate.object = `OBSERVABLE UNIVERSE • U${completed}`;
        candidate.massKg = OBSERVABLE_UNIVERSE_MASS;
        candidate.universes = completed;
        candidate.tierIndex = SUPERCLUSTER_INDEX;
        localStorage.setItem(SCORES_KEY, JSON.stringify(scores));
      }
    } catch (e) {}
    return true;
  }

  GameScene.prototype.finishUniverse = function () {
    this.score += UNIVERSE_BONUS;
    this.encounters++;
    this.actionHistory.push('ABSORB');
    const completed = whole(this.universeCount) + 1;
    this.universeCount = completed;
    bankUniverseScore(this, completed);

    this.clearUI();
    this.state = 'UNIVERSE_COMPLETE';
    this.cameras.main.flash(420, 255, 255, 255, false);
    this.addText(W / 2, this.Y(170), 'UNIVERSE COMPLETE', 25, C.green, { ox: .5, bold: true });
    this.addText(W / 2, this.Y(213), `UNIVERSES COMPLETED  ${completed}`, 10.5, C.cyan, { ox: .5, bold: true });

    const atomTier = TIERS[0];
    const atom = { name: atomTier.name, tier: 0, radiusM: atomTier.r, massKg: atomTier.m, speedMS: atomTier.v, kind: atomTier.kind, color: atomTier.color, solid: atomTier.solid };
    baseDrawObject.call(this, W / 2, this.Y(390), 48, atom, false, true);
    this.addText(W / 2, this.Y(480), `ALTERNATIVE UNIVERSE NO. ${completed + 1}`, 18, C.white, { ox: .5, bold: true, width: 360, align: 'center' });
    this.addText(W / 2, this.Y(523), 'SOMEHOW, YOU ARE AN ATOM AGAIN.', 10, C.muted, { ox: .5, bold: true });
    this.addText(W / 2, this.Y(558), `UNIVERSE BONUS  +${UNIVERSE_BONUS.toLocaleString('en-US')}`, 9.5, C.orange, { ox: .5, bold: true });
    this.wideButton(W / 2, this.Y(680), 320, 58, 'CONTINUE AS AN ATOM', C.cyan, () => this.continueNextUniverse());
  };

  GameScene.prototype.continueNextUniverse = function () {
    const keepUniverse = whole(this.universeCount);
    this.tierIndex = 0;
    this.growth = 0;
    this.systemCaptures = 0;
    this.finaleMergeCount = 0;
    this.orbitalCount = 0;
    this.orbitalProgress = 0;
    this.orbitalsUnlocked = false;
    this.craters = 0;
    this.regionId = 'outer-heliosphere';
    this.lastRegionPromptEncounter = this.encounters;
    this.setPlayer(true);
    this.universeCount = keepUniverse;
    this.other = null;
    this.startEncounter();
  };

  GameScene.prototype.resetRun = function () {
    this.universeCount = 0;
    this.systemCaptures = 0;
    this.finaleMergeCount = 0;
    return baseResetRun.call(this);
  };

  GameScene.prototype.setPlayer = function (resetSpeed = false) {
    const result = baseSetPlayer.call(this, resetSpeed);
    if (this.player && this.tierIndex >= PHASE4_FIRST) {
      this.player.phase4System = true;
      this.player.phase4CaptureCount = whole(this.systemCaptures);
    }
    return result;
  };

  GameScene.prototype.region = function () {
    if (inPhase4(this)) return phase4Region();
    return REGIONS.find(r => r.id === this.regionId) || REGIONS[0];
  };

  GameScene.prototype.pickOpponent = function () {
    if (inPlayablePhase4(this)) return phase4Opponent(this);
    if (this.tierIndex < PHASE4_FIRST) {
      // Extending TIERS must not leak galaxy-scale targets into the earlier compact-object phase.
      for (let i = 0; i < 7; i++) {
        const other = basePickOpponent.call(this);
        if (other.tier <= SMBH_INDEX) return other;
      }
      const t = TIERS[SMBH_INDEX];
      return { name:t.name, realName:this.exampleName(t), tier:SMBH_INDEX, radiusM:t.r, massKg:t.m, speedMS:t.v, kind:t.kind, color:t.color, solid:t.solid, hint:t.hint, gap:SMBH_INDEX-this.tierIndex };
    }
    return basePickOpponent.call(this);
  };

  GameScene.prototype.startEncounter = function () {
    if (this._devModeActive) return baseStartEncounter.call(this);
    if (this.tierIndex >= SUPERCLUSTER_INDEX) return this.startUniverseFinale();
    if (inPlayablePhase4(this)) {
      this.other = this.pickOpponent();
      return this.drawEncounter();
    }
    return baseStartEncounter.call(this);
  };

  GameScene.prototype.drawHud = function (controls = false) {
    if (inPhase4(this) && this.tierIndex < SUPERCLUSTER_INDEX) return drawPhase4Hud(this, controls);
    return baseDrawHud.call(this, controls);
  };

  GameScene.prototype.drawArena = function () {
    if (inPlayablePhase4(this)) return drawPhase4Arena(this);
    return baseDrawArena.call(this);
  };

  GameScene.prototype.drawPrompt = function () {
    if (!inPlayablePhase4(this)) return baseDrawPrompt.call(this);
    const y = this.Y(636), g = this.add.graphics();
    g.fillStyle(C.panel, .98).fillRoundedRect(10, y, 400, 78, 8);
    g.lineStyle(2, C.cyan, .88).strokeRoundedRect(10, y, 400, 78, 8);
    this.ui.add(g);
    this.addText(W / 2, y + 17, 'A COSMIC STRUCTURE IS AHEAD.', 14.5, C.white, { ox: .5, bold: true });
    this.addText(W / 2, y + 44, 'WHAT WILL YOUR SYSTEM DO?', 10.5, C.muted, { ox: .5, bold: true });
    this.choice(73, this.Y(771), 'ABSORB', C.green, 'CAPTURE');
    this.choice(210, this.Y(771), 'DEFLECT', C.orange, 'REDIRECT');
    this.choice(347, this.Y(771), 'AVOID', C.blue, 'PASS');
  };

  GameScene.prototype.drawObject = function (x, y, radius, object, mystery = false, glow = false) {
    const isPhase4Kind = ['starcluster','galaxy','cluster','supercluster','universe'].includes(object?.kind);
    const isPhase4Player = object === this.player && this.tierIndex >= PHASE4_FIRST;
    if (isPhase4Kind || isPhase4Player) return proceduralSystemObject(this, x, y, radius, object, mystery, glow);
    return baseDrawObject.call(this, x, y, radius, object, mystery, glow);
  };

  GameScene.prototype.choose = function (choice) {
    if (!inPlayablePhase4(this)) return baseChoose.call(this, choice);
    if (this.state !== 'APPROACH') return;
    this.pending = this.outcome(choice);
    this.state = 'PHASE4_REVEAL';
    this.tweens.killAll();
    this.reveal(choice);
  };

  GameScene.prototype.outcome = function (choice) {
    if (!inPlayablePhase4(this)) return baseOutcome.call(this, choice);
    const p = this.player, o = this.other;
    const ratio = Math.max(1e-6, o.massKg / Math.max(p.massKg, 1e-300));
    const gap = o.tier - p.tier;
    const roll = Math.random();
    let chance;

    if (choice === 'ABSORB') {
      if (ratio <= .05) chance = .96;
      else if (ratio <= .35) chance = .90;
      else if (ratio <= .8) chance = .78;
      else if (ratio <= 1.35) chance = .64;
      else if (ratio <= 2.5) chance = .42;
      else chance = .22;
      chance = clamp(chance - Math.max(0, gap - 1) * .07, .12, .97);
      const success = roll < chance;
      return {
        choice, chance, success, result: success ? 'capture' : 'setback',
        phase4Failure: !success && ratio > 1.55 ? 'captured' : 'tidal-loss',
        gap, massRatio: ratio, sizeRatio: o.radiusM / Math.max(p.radiusM, 1e-300),
        relV: relativeSpeed(p, o), targetEscape: escapeVelocity(o), fatalChance: 0
      };
    }

    if (choice === 'DEFLECT') {
      chance = clamp(.91 - Math.max(0, gap) * .08 - Math.max(0, Math.log10(ratio)) * .09, .52, .96);
      const success = roll < chance;
      return {
        choice, chance, success, result: success ? 'clean' : 'rough', gap, massRatio: ratio,
        sizeRatio: o.radiusM / Math.max(p.radiusM, 1e-300), relV: relativeSpeed(p,o), targetEscape: escapeVelocity(o), fatalChance: 0
      };
    }

    chance = clamp(.97 - Math.max(0, gap) * .05 - Math.max(0, Math.log10(ratio)) * .05, .68, .99);
    return {
      choice, chance, success: roll < chance, result: roll < chance ? 'clean' : 'rough', gap, massRatio: ratio,
      sizeRatio: o.radiusM / Math.max(p.radiusM, 1e-300), relV: relativeSpeed(p,o), targetEscape: escapeVelocity(o), fatalChance: 0
    };
  };

  GameScene.prototype.reveal = function (choice) {
    if (!inPlayablePhase4(this)) return baseReveal.call(this, choice);
    return phase4Reveal(this, choice);
  };

  GameScene.prototype.animate = function (choice, p, o, pr, or) {
    if (!inPlayablePhase4(this)) return baseAnimate.call(this, choice, p, o, pr, or);
    if (choice === 'ABSORB') {
      if (this.pending?.success) return captureAnimation(this, p, o);
      if (this.pending?.phase4Failure === 'captured') return capturedThenEscapeAnimation(this, p, o);
      return tidalLossAnimation(this, p, o);
    }
    return baseAnimate.call(this, choice, p, o, pr, or);
  };

  GameScene.prototype.growthPoints = function () {
    if (!inPlayablePhase4(this)) return baseGrowthPoints.call(this);
    const gap = Number(this.other?.tier || 0) - this.tierIndex;
    const ratio = Math.max(1e-6, Number(this.other?.massKg || 0) / Math.max(this.player.massKg, 1e-300));
    let points = gap <= -1 ? .72 : gap === 0 ? 1.05 : gap === 1 ? 1.55 : 1.85;
    points *= clamp(1 + .12 * Math.log10(Math.max(.05, ratio)), .78, 1.22);
    return clamp(points, .55, 2.05);
  };

  GameScene.prototype.resolve = function () {
    if (!inPlayablePhase4(this)) return baseResolve.call(this);
    const r = this.pending;
    let title = '', detail = '', reason = '', color = C.green;
    let evolved = false;

    if (r.choice === 'ABSORB' && r.success) {
      const gp = this.growthPoints();
      this.growth += gp;
      this.absorbs++;
      this.systemCaptures = whole(this.systemCaptures) + 1;
      this.player.massKg += Math.min(this.other.massKg, this.player.massKg * 1.4) * .22;
      this.player.speedMS = clamp(this.player.speedMS + this.other.speedMS * .025, 150, 1.5e6);

      while (this.tierIndex < SUPERCLUSTER_INDEX && this.growth >= TIERS[this.tierIndex].need) {
        this.growth -= TIERS[this.tierIndex].need;
        this.tierIndex++;
        this.setPlayer(false);
        evolved = true;
      }
      title = evolved ? 'SYSTEM EXPANDED!' : 'CAPTURE SUCCESS';
      detail = evolved ? `YOU ARE NOW A ${TIERS[this.tierIndex].name}` : `SYSTEM MASS +${Math.round(gp / TIERS[this.tierIndex].need * 100)}%`;
      reason = 'The incoming structure became gravitationally bound to your growing system instead of disappearing into the centre.';
    } else if (r.choice === 'ABSORB') {
      if (r.phase4Failure === 'captured') {
        const loss = Math.min(this.growth, Math.max(.6, this.growth * .36));
        this.growth = Math.max(0, this.growth - loss);
        this.systemCaptures = Math.max(0, whole(this.systemCaptures) - 2);
        title = 'CAPTURED — THEN ESCAPED';
        detail = `SYSTEM MASS -${Math.round(loss / Math.max(.001, TIERS[this.tierIndex].need) * 100)}%`;
        color = C.red;
        reason = 'The larger system briefly captured you. You escaped, but some of your bound material stayed behind.';
      } else {
        const loss = Math.min(this.growth, Math.max(.35, this.growth * .22));
        this.growth = Math.max(0, this.growth - loss);
        this.systemCaptures = Math.max(0, whole(this.systemCaptures) - 1);
        title = 'TIDAL LOSS';
        detail = `SYSTEM MASS -${Math.round(loss / Math.max(.001, TIERS[this.tierIndex].need) * 100)}%`;
        color = C.orange;
        reason = 'The close pass pulled some orbiting material away from your system. You survived and kept going.';
      }
    }

    if (r.choice === 'DEFLECT') {
      if (r.success) {
        const steal = Math.random() < .22;
        if (steal) {
          const bonus = .35;
          this.growth += bonus;
          this.systemCaptures = whole(this.systemCaptures) + 1;
          title = 'CLEAN DEFLECTION';
          detail = 'ORBITAL STOLEN • SYSTEM MASS +BONUS';
          reason = 'The two systems curved past each other, and one small bound structure was tidally captured by you.';
        } else {
          title = 'CLEAN DEFLECTION';
          detail = 'DANGEROUS STRUCTURE REDIRECTED';
          reason = 'Gravity bent the encounter without forcing a merger. Both systems continued on separate paths.';
        }
      } else {
        const loss = Math.min(this.growth, .35);
        this.growth = Math.max(0, this.growth - loss);
        title = 'ROUGH DEFLECTION';
        detail = 'SURVIVED • SMALL TIDAL LOSS';
        color = C.orange;
        reason = 'The pass was rough enough to strip a little material, but your system was not destroyed.';
      }
    }

    if (r.choice === 'AVOID') {
      if (r.success) {
        title = 'SAFE PASS';
        detail = 'NO SYSTEM MASS GAINED OR LOST';
        reason = 'You changed course early and let the larger structure pass without a major gravitational interaction.';
      } else {
        const loss = Math.min(this.growth, .28);
        this.growth = Math.max(0, this.growth - loss);
        title = 'GRAVITY CAUGHT YOU';
        detail = 'ESCAPED • SMALL SYSTEM MASS LOSS';
        color = C.orange;
        reason = 'The target bent your path more than expected, but you escaped before becoming permanently bound.';
      }
    }

    this.actionHistory.push(r.choice);
    const base = r.choice === 'ABSORB' ? (r.success ? 180 : 45) : r.choice === 'DEFLECT' ? (r.success ? 90 : 35) : 35;
    this.score += Math.round(base + this.tierIndex * 14 + Math.max(0, r.gap) * 45);
    this.encounters++;
    this.player.phase4CaptureCount = whole(this.systemCaptures);
    return this.drawResult({ title, detail, reason, color, survived: true, evolved });
  };

  GameScene.prototype.drawResult = function (result) {
    if (!inPhase4(this) || this._devModeActive) return baseDrawResult.call(this, result);
    return phase4ResultScreen(this, result);
  };

  GameScene.prototype.save = function (silent = false) {
    const result = baseSave.call(this, silent);
    if (!silent && result !== false) patchPhase4Save(this);
    return result;
  };

  GameScene.prototype.load = function () {
    const p4 = readPhase4Save();
    if (p4) {
      this.universeCount = p4.universeCount;
      this.systemCaptures = p4.systemCaptures;
      this.finaleMergeCount = p4.finaleMergeCount;
    }
    const result = baseLoad.call(this);
    if (this.player && this.tierIndex >= PHASE4_FIRST) this.player.phase4CaptureCount = whole(this.systemCaptures);
    return result;
  };

  window.CometPhase4 = Object.freeze({
    firstTier: PHASE4_FIRST,
    galaxyTier: GALAXY_INDEX,
    clusterTier: CLUSTER_INDEX,
    superclusterTier: SUPERCLUSTER_INDEX,
    universeBonus: UNIVERSE_BONUS,
    isActive(scene) { return inPhase4(scene); },
    tierNames: TIERS.slice(PHASE4_FIRST).map(t => t.name)
  });
})();
