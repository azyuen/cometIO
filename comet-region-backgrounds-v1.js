// Region-aware procedural encounter backgrounds.
// Keeps approach object scale/uncertainty untouched while giving each side its own location.
(() => {
  const APPROACH_RADIUS = 16;
  const ACTION_TOP = 160;
  const ACTION_BOTTOM = 625;

  const THEMES = {
    'outer-heliosphere': {
      base: 0x020815, tint: 0x0b2444, star: 0xa8dfff, accent: 0x4ab8ff,
      stars: 48, dust: 18, feature: 'solarGlow'
    },
    'oort-cloud': {
      base: 0x040915, tint: 0x10243a, star: 0xd8f5ff, accent: 0x8edff4,
      stars: 35, dust: 30, feature: 'ice'
    },
    'scattered-disk': {
      base: 0x08091c, tint: 0x34245e, star: 0xc7dcff, accent: 0x9d72e6,
      stars: 50, dust: 20, feature: 'violetHaze'
    },
    'kuiper-belt': {
      base: 0x031124, tint: 0x12395a, star: 0xc7f2ff, accent: 0x55d5ef,
      stars: 54, dust: 34, feature: 'iceBelt'
    },
    'asteroid-belt': {
      base: 0x100c12, tint: 0x3a2720, star: 0xffe4c7, accent: 0xc98d61,
      stars: 42, dust: 42, feature: 'rocks'
    },
    'inner-solar': {
      base: 0x120c09, tint: 0x5b3215, star: 0xfff2c5, accent: 0xffbd5b,
      stars: 36, dust: 19, feature: 'sunward'
    },
    'outer-solar': {
      base: 0x020b19, tint: 0x172b55, star: 0xd9edff, accent: 0x7398e6,
      stars: 44, dust: 24, feature: 'giantWorld'
    },
    'hyperspace': {
      base: 0x08051b, tint: 0x32115d, star: 0xe6d4ff, accent: 0x42dfff,
      stars: 28, dust: 12, feature: 'streaks'
    }
  };

  const fallbackTheme = THEMES['outer-heliosphere'];
  const themeFor = id => THEMES[id] || fallbackTheme;

  const lineY = (scene, x) => scene.Y(610) + (scene.Y(226) - scene.Y(610)) * (x / W);
  const inSide = (scene, x, y, side) => side === 'you' ? y < lineY(scene, x) : y > lineY(scene, x);

  const seeded = seed => {
    let s = (seed >>> 0) || 1;
    return () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  };

  const hash = str => {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  };

  function plausibleOriginRegion(scene, o) {
    const current = scene.regionId;
    const candidates = [];
    for (const r of REGIONS) {
      if (r.id === current) continue;
      const occurrences = r.pool.filter(v => v === o.tier).length;
      for (let i = 0; i < occurrences; i++) candidates.push(r.id);
    }
    if (candidates.length) return candidates[Phaser.Math.Between(0, candidates.length - 1)];

    const kind = o.kind;
    const preferred = kind === 'gas' ? 'outer-solar'
      : kind === 'world' ? (o.tier <= 8 ? 'inner-solar' : 'outer-solar')
      : kind === 'ice' ? 'oort-cloud'
      : ['rock', 'dust'].includes(kind) ? 'asteroid-belt'
      : ['star', 'nebula', 'pulsar', 'blackhole'].includes(kind) ? 'hyperspace'
      : 'scattered-disk';
    if (preferred !== current) return preferred;
    return REGIONS.find(r => r.id !== current)?.id || current;
  }

  const priorPickOpponent = GameScene.prototype.pickOpponent;
  GameScene.prototype.pickOpponent = function () {
    const o = priorPickOpponent.call(this);
    o.originRegionId = plausibleOriginRegion(this, o);
    return o;
  };

  // Replace the old one-size-fits-all permanent backdrop with a neutral base.
  // Encounter-specific scenery is rebuilt every time drawArena runs.
  GameScene.prototype.makeBackdrop = function () {
    const g = this.add.graphics().setDepth(-20);
    g.fillStyle(C.bg, 1).fillRect(0, 0, W, H);
    g.fillStyle(C.black, 1).fillRect(0, 0, W, SAFE_TOP);
  };

  GameScene.prototype.drawRegionBackdropSide = function (regionId, side, seedValue) {
    const t = themeFor(regionId);
    const top = this.Y(ACTION_TOP), bottom = this.Y(ACTION_BOTTOM);
    const yL = this.Y(610), yR = this.Y(226);
    const g = this.add.graphics();

    if (side === 'you') {
      g.fillStyle(t.base, 1).fillPoints([
        new Phaser.Geom.Point(0, top), new Phaser.Geom.Point(W, top),
        new Phaser.Geom.Point(W, yR), new Phaser.Geom.Point(0, yL)
      ], true);
    } else {
      g.fillStyle(t.base, 1).fillPoints([
        new Phaser.Geom.Point(0, yL), new Phaser.Geom.Point(W, yR),
        new Phaser.Geom.Point(W, bottom), new Phaser.Geom.Point(0, bottom)
      ], true);
    }

    const rnd = seeded(seedValue);
    const sideHeight = bottom - top;

    // Soft pixel-space haze bands. They stay clipped by side testing rather than requiring bitmap art.
    for (let i = 0; i < 5; i++) {
      const x = rnd() * W;
      const y = top + rnd() * sideHeight;
      if (!inSide(this, x, y, side)) continue;
      const w = 70 + rnd() * 145, h = 15 + rnd() * 35;
      g.fillStyle(t.tint, .08 + rnd() * .08).fillRoundedRect(x - w / 2, y - h / 2, w, h, 8);
    }

    // Region-specific star density.
    let made = 0, attempts = 0;
    while (made < t.stars && attempts++ < t.stars * 8) {
      const x = 5 + rnd() * (W - 10), y = top + 4 + rnd() * (sideHeight - 8);
      if (!inSide(this, x, y, side)) continue;
      const bright = rnd() > .84, s = bright ? 2 : 1;
      g.fillStyle(bright ? t.accent : t.star, bright ? .8 : (.28 + rnd() * .5)).fillRect(x, y, s, s);
      made++;
    }

    // Tiny environmental particles: rockier, icier or sparser depending on region.
    made = 0; attempts = 0;
    while (made < t.dust && attempts++ < t.dust * 10) {
      const x = 8 + rnd() * (W - 16), y = top + 8 + rnd() * (sideHeight - 16);
      if (!inSide(this, x, y, side)) continue;
      const r = 1 + Math.floor(rnd() * (t.feature === 'rocks' ? 3 : 2));
      const col = ['ice', 'iceBelt'].includes(t.feature) ? 0xb9e8ee : (t.feature === 'rocks' ? 0x7f6a5c : t.accent);
      g.fillStyle(col, .12 + rnd() * .28).fillCircle(x, y, r);
      made++;
    }

    // One restrained landmark per region, deliberately distant so it never reveals object scale.
    if (t.feature === 'solarGlow') {
      const x = side === 'you' ? 30 : W - 35, y = side === 'you' ? top + 86 : bottom - 70;
      if (inSide(this, x, y, side)) {
        g.fillStyle(0x9fdcff, .035).fillCircle(x, y, 52);
        g.fillStyle(0xcdeeff, .08).fillCircle(x, y, 25);
        g.fillStyle(0xf2fbff, .75).fillCircle(x, y, 2);
      }
    } else if (t.feature === 'sunward') {
      const x = side === 'you' ? 34 : W - 34, y = side === 'you' ? top + 78 : bottom - 68;
      if (inSide(this, x, y, side)) {
        g.fillStyle(0xffa52b, .045).fillCircle(x, y, 62);
        g.fillStyle(0xffd77c, .10).fillCircle(x, y, 32);
        g.fillStyle(0xfff3c2, .9).fillCircle(x, y, 3);
      }
    } else if (t.feature === 'giantWorld') {
      const x = side === 'you' ? 18 : W - 18, y = side === 'you' ? top + 90 : bottom - 82;
      if (inSide(this, x, y, side)) {
        g.fillStyle(0x3d5d87, .15).fillCircle(x, y, 25);
        g.lineStyle(2, 0x7899c4, .12).strokeEllipse(x, y, 70, 15);
      }
    } else if (t.feature === 'violetHaze') {
      g.lineStyle(12, 0x8756bf, .06).beginPath()
        .moveTo(side === 'you' ? -20 : 180, side === 'you' ? top + 105 : bottom - 145)
        .lineTo(side === 'you' ? 190 : W + 30, side === 'you' ? top + 45 : bottom - 80).strokePath();
    } else if (t.feature === 'iceBelt') {
      g.lineStyle(5, 0x83dce7, .05).beginPath()
        .moveTo(side === 'you' ? -10 : 175, side === 'you' ? top + 135 : bottom - 125)
        .lineTo(side === 'you' ? 205 : W + 20, side === 'you' ? top + 90 : bottom - 72).strokePath();
    } else if (t.feature === 'streaks') {
      for (let i = 0; i < 9; i++) {
        const x = rnd() * W, y = top + rnd() * sideHeight;
        if (!inSide(this, x, y, side)) continue;
        g.lineStyle(1 + rnd() * 2, i % 2 ? 0x9a68ff : 0x31d9ff, .16 + rnd() * .18)
          .lineBetween(x - 18, y + 18, x + 18, y - 18);
      }
    }

    this.ui.addAt(g, 0);

    // A few subtle twinkles make the space feel alive without introducing image assets.
    const twinkles = this.add.container(0, 0);
    for (let i = 0; i < 6; i++) {
      let x, y, tries = 0;
      do {
        x = 8 + rnd() * (W - 16); y = top + 8 + rnd() * (sideHeight - 16); tries++;
      } while (!inSide(this, x, y, side) && tries < 25);
      if (!inSide(this, x, y, side)) continue;
      const dot = this.add.rectangle(x, y, 2, 2, t.accent, .18 + rnd() * .22);
      twinkles.add(dot);
      this.tweens.add({targets:dot, alpha:.8, duration:900 + rnd() * 1200, yoyo:true, repeat:-1, delay:rnd() * 900});
    }
    this.ui.addAt(twinkles, 1);
  };

  GameScene.prototype.drawArena = function () {
    const otherRegion = this.other?.originRegionId || plausibleOriginRegion(this, this.other);
    const encounterSeed = hash(`${this.regionId}|${otherRegion}|${this.encounters}|${this.other?.tier ?? 0}`);

    this.drawRegionBackdropSide(this.regionId, 'you', encounterSeed ^ 0x9e3779b9);
    this.drawRegionBackdropSide(otherRegion, 'other', encounterSeed ^ 0x85ebca6b);

    // Diagonal split: two independent locations before the encounter closes.
    const d = this.add.graphics();
    d.lineStyle(10, C.cyan, .06).lineBetween(0, this.Y(610), W, this.Y(226));
    d.lineStyle(3, C.cyan, .92).lineBetween(0, this.Y(610), W, this.Y(226));
    this.ui.add(d);

    // Preserve the existing uncertainty rule: both bodies have the same apparent approach size.
    this.youSprite = this.drawObject(128, this.Y(330), APPROACH_RADIUS, this.player, false, false);
    this.otherSprite = this.drawObject(303, this.Y(480), APPROACH_RADIUS, this.other, true, false);

    const playerUsesSprite = !!this.youSprite?.cometVisual && !this.youSprite.cometVisual.fallback;
    const targetUsesSprite = !!this.otherSprite?.cometVisual && !this.otherSprite.cometVisual.fallback;
    if (!playerUsesSprite) this.trail(128, this.Y(330));
    if (!targetUsesSprite) this.specks(303, this.Y(480));

    this.addText(14, this.Y(170), 'YOU', 10, C.green, { bold: true });
    this.addText(W - 14, this.Y(603), 'UNKNOWN', 10, C.orange, { bold: true, ox: 1 });

    this.tweens.add({targets:this.youSprite, x:'+=4', y:'-=2', duration:650, yoyo:true, repeat:-1, ease:'Sine.inOut'});
    this.tweens.add({targets:this.otherSprite, x:'-=3', y:'+=2', duration:760, yoyo:true, repeat:-1, ease:'Sine.inOut'});
  };
})();
