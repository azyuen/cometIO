// Phase completion title cards.
// Entirely Phaser-rendered using the live game palette, text and existing object assets.
(() => {
  const proto = GameScene.prototype;
  const baseResolve = proto.resolve;
  const baseFinishUniverse = proto.finishUniverse;

  const tierIndex = name => TIERS.findIndex(t => t.name === name);
  const DWARF_PLANET = tierIndex('DWARF PLANET');
  const ROCKY_PLANET = tierIndex('ROCKY PLANET');
  const PULSAR = tierIndex('PULSAR');
  const SMBH = tierIndex('SUPER MASSIVE BLACK HOLE');

  function tierObject(index) {
    const t = TIERS[index];
    if (!t) return null;
    return {
      name: t.name,
      realName: t.name,
      tier: index,
      radiusM: t.r,
      massKg: t.m,
      speedMS: t.v,
      kind: t.kind,
      color: t.color,
      solid: t.solid,
      hint: t.hint
    };
  }

  function universeObject() {
    const supercluster = window.CometPhase4 ? TIERS[window.CometPhase4.superclusterTier] : TIERS[TIERS.length - 1];
    return {
      name: 'OBSERVABLE UNIVERSE',
      realName: 'OBSERVABLE UNIVERSE',
      tier: supercluster ? TIERS.indexOf(supercluster) : TIERS.length - 1,
      radiusM: 4.4e26,
      massKg: 1e53,
      speedMS: 0,
      kind: 'universe',
      color: C.cyan,
      solid: false
    };
  }

  function shortLabel(name) {
    return String(name || '')
      .replace('DUST PARTICLE', 'DUST')
      .replace('LARGE METEORITE', 'METEORITE')
      .replace('YELLOW DWARF STAR', 'YELLOW DWARF')
      .replace('RED HYPERGIANT STAR', 'RED HYPERGIANT')
      .replace('SUPER MASSIVE BLACK HOLE', 'SUPER MASSIVE\nBLACK HOLE')
      .replace('GALAXY CLUSTER', 'GALAXY\nCLUSTER')
      .replace('OBSERVABLE UNIVERSE', 'OBSERVABLE\nUNIVERSE');
  }

  function phaseConfig(phase) {
    const p4 = window.CometPhase4;
    if (phase === 1) return {
      phase: 1,
      title: 'THE AGE OF ACCRETION',
      tagline: 'Matter gathers into larger bodies.',
      range: 'FROM ATOM TO ASTEROID.',
      transition: 'A DWARF PLANET FORMS — A SYSTEM CAN NOW BEGIN.',
      next: 2,
      button: 'TAP TO CONTINUE TO PHASE 2',
      items: [
        { object: tierObject(0), radius: 7 },
        { object: tierObject(1), radius: 10 },
        { object: tierObject(3), radius: 14 },
        { object: tierObject(5), radius: 20 },
        { object: tierObject(6), radius: 30 }
      ]
    };
    if (phase === 2) return {
      phase: 2,
      title: 'THE AGE OF SYSTEMS',
      tagline: 'Moons form. Worlds gather. Stars ignite — and die.',
      range: 'FROM DWARF PLANET TO NEBULA.',
      transition: 'THE NEBULA EXPANDS. A COMPACT REMNANT SURVIVES AT ITS CORE.',
      next: 3,
      button: 'TAP TO REVEAL THE COMPACT REMNANT',
      items: [
        { object: tierObject(tierIndex('DWARF PLANET')), radius: 14 },
        { object: tierObject(tierIndex('ROCKY PLANET')), radius: 17 },
        { object: tierObject(tierIndex('YELLOW DWARF STAR')), radius: 21 },
        { object: tierObject(tierIndex('RED HYPERGIANT STAR')), radius: 27 },
        { object: tierObject(tierIndex('NEBULA')), radius: 34 }
      ]
    };
    if (phase === 3) return {
      phase: 3,
      title: 'THE AGE OF GRAVITY',
      tagline: 'Gravity becomes the dominant force.',
      range: 'FROM PULSAR TO SUPER MASSIVE BLACK HOLE.',
      next: 4,
      button: 'TAP TO CONTINUE TO PHASE 4',
      items: [
        { object: tierObject(tierIndex('PULSAR')), radius: 20 },
        { object: tierObject(tierIndex('BLACK HOLE')), radius: 29 },
        { object: tierObject(tierIndex('SUPER MASSIVE BLACK HOLE')), radius: 39 }
      ]
    };

    const galaxy = p4?.galaxyTier ?? tierIndex('GALAXY');
    const cluster = p4?.clusterTier ?? tierIndex('GALAXY CLUSTER');
    const supercluster = p4?.superclusterTier ?? tierIndex('SUPERCLUSTER');
    return {
      phase: 4,
      title: 'THE COSMIC AGE',
      tagline: 'Systems become the visible cosmos.',
      range: 'FROM GALACTIC NUCLEUS TO OBSERVABLE UNIVERSE.',
      next: null,
      final: true,
      button: 'TAP TO BEGIN A NEW UNIVERSE',
      items: [
        { object: tierObject(galaxy), radius: 17 },
        { object: tierObject(cluster), radius: 23 },
        { object: tierObject(supercluster), radius: 29 },
        { object: universeObject(), radius: 38 }
      ]
    };
  }

  function addBackground(scene, phase) {
    const g = scene.add.graphics();
    g.fillStyle(C.bg, 1).fillRect(-20, -20, W + 40, H + 40);

    // Pixel stars: intentionally sparse and close to the existing game backdrop.
    for (let i = 0; i < 86; i++) {
      const x = Phaser.Math.Between(7, W - 7);
      const y = Phaser.Math.Between(scene.Y(6), H - 10);
      const alpha = Phaser.Math.RND.pick([.18, .26, .36, .52, .72]);
      const size = Phaser.Math.RND.pick([1, 1, 1, 2]);
      const color = i % 17 === 0 ? C.cyan : i % 29 === 0 ? C.purple : C.star;
      g.fillStyle(color, alpha).fillRect(x, y, size, size);
    }

    // Cyan/purple travel streaks echo the live regional backgrounds.
    const streaks = [
      [9, scene.Y(86), 60, scene.Y(36), C.cyan],
      [330, scene.Y(124), 411, scene.Y(48), C.blue],
      [18, scene.Y(490), 78, scene.Y(430), phase % 2 ? C.cyan : C.purple],
      [315, scene.Y(570), 408, scene.Y(480), C.cyan],
      [14, scene.Y(818), 82, scene.Y(748), C.blue],
      [350, scene.Y(810), 416, scene.Y(745), C.cyan]
    ];
    streaks.forEach(([x1,y1,x2,y2,color], i) => {
      g.lineStyle(i % 2 ? 2 : 1.5, color, .48).lineBetween(x1, y1, x2, y2);
    });
    scene.ui.addAt(g, 0);
  }

  function addHeader(scene) {
    scene.addText(18, scene.Y(16), 'COMET IO', 15, C.white, { bold: true });
    scene.addText(18, scene.Y(38), 'SMALL THINGS GO FAR', 6.5, C.cyan, { bold: true });
    scene.addText(W - 18, scene.Y(17), 'SAME UNIVERSE.', 6.7, C.muted, { ox: 1, bold: true });
    scene.addText(W - 18, scene.Y(34), 'BIGGER POSSIBILITIES.', 6.7, C.white, { ox: 1, bold: true });
    const line = scene.add.graphics();
    line.lineStyle(1.5, C.cyan, .88).lineBetween(0, scene.Y(59), W, scene.Y(59));
    scene.ui.add(line);
  }

  function drawProgression(scene, config) {
    const items = config.items.filter(item => item.object);
    const count = items.length;
    if (!count) return;

    const left = count <= 3 ? 91 : count === 4 ? 60 : 43;
    const right = count <= 3 ? 329 : count === 4 ? 360 : 377;
    const xs = items.map((_, i) => count === 1 ? W / 2 : left + (right - left) * (i / (count - 1)));
    const y0 = scene.Y(390);
    const rise = count <= 3 ? 32 : 24;
    const ys = items.map((_, i) => y0 + i * rise);

    const path = scene.add.graphics();
    path.lineStyle(2, C.cyan, .18);
    for (let i = 0; i < count - 1; i++) path.lineBetween(xs[i], ys[i], xs[i + 1], ys[i + 1]);
    for (let i = 0; i < count - 1; i++) {
      for (let d = 1; d <= 3; d++) {
        const t = d / 4;
        const x = Phaser.Math.Linear(xs[i], xs[i + 1], t);
        const y = Phaser.Math.Linear(ys[i], ys[i + 1], t);
        path.fillStyle(d === 2 ? C.white : C.cyan, d === 2 ? .52 : .38).fillRect(x - 1, y - 1, 2, 2);
      }
    }
    scene.ui.add(path);

    items.forEach((item, i) => {
      scene.drawObject(xs[i], ys[i], item.radius, item.object, false, i === count - 1);
      const labelY = ys[i] + item.radius + 13;
      scene.addText(xs[i], labelY, shortLabel(item.object.name), 6.3, C.white, {
        ox: .5, bold: true, align: 'center', width: count <= 3 ? 110 : 76, lineSpacing: 0
      });
    });
  }

  function addContinueButton(scene, config) {
    const x = W / 2;
    const y = scene.Y(754);
    const width = 344;
    const height = 58;
    const c = scene.add.container(x, y);
    const g = scene.add.graphics();
    g.fillStyle(C.panel, .96).fillRoundedRect(-width / 2, -height / 2, width, height, 7);
    g.lineStyle(2, C.cyan, .95).strokeRoundedRect(-width / 2, -height / 2, width, height, 7);
    const text = scene.add.text(0, 0, config.button, {
      fontFamily: FONT,
      fontSize: config.final ? '11px' : '11.5px',
      fontStyle: 'bold',
      color: '#f7fbff',
      align: 'center'
    }).setOrigin(.5);
    if (text.setResolution) text.setResolution(Math.min(window.devicePixelRatio || 1, 3));
    const arrow = scene.add.text(width / 2 - 27, -1, '›', {
      fontFamily: FONT, fontSize: '28px', fontStyle: 'bold', color: '#20d9ff'
    }).setOrigin(.5);
    const hit = scene.add.rectangle(0, 0, width, height, 0xffffff, .001).setInteractive({ useHandCursor: true });
    hit.on('pointerdown', () => scene.continueFromPhaseCard(config));
    c.add([g, text, arrow, hit]);
    scene.ui.add(c);
  }

  proto.showPhaseCompleteCard = function (phase) {
    const config = phaseConfig(phase);
    this.tweens.killAll();
    this.clearUI();
    this.state = 'PHASE_COMPLETE_CARD';
    this._activePhaseCard = config;

    addBackground(this, phase);
    addHeader(this);

    // Completion heading: this is intentionally the first large message on the card.
    this.addText(W / 2, this.Y(92), `PHASE ${phase} COMPLETE`, 19, C.green, { ox: .5, bold: true });

    const frame = this.add.graphics();
    frame.fillStyle(C.panel, .50).fillRoundedRect(29, this.Y(126), 362, 112, 9);
    frame.lineStyle(1.8, C.cyan, .92).strokeRoundedRect(29, this.Y(126), 362, 112, 9);
    this.ui.add(frame);

    this.addText(W / 2, this.Y(148), config.title, config.title.length > 21 ? 23 : 26, C.white, {
      ox: .5, bold: true, width: 334, align: 'center'
    });
    this.addText(W / 2, this.Y(253), config.tagline, 10.5, C.muted, { ox: .5, bold: true });

    drawProgression(this, config);

    const dividerY = this.Y(656);
    const divider = this.add.graphics();
    divider.lineStyle(1.5, C.cyan, .64).lineBetween(72, dividerY, 135, dividerY).lineBetween(285, dividerY, 348, dividerY);
    this.ui.add(divider);
    this.addText(W / 2, dividerY - 6, config.range, config.range.length > 42 ? 7.1 : 7.8, C.muted, {
      ox: .5, bold: true, width: 270, align: 'center'
    });
    if (config.transition) {
      this.addText(W / 2, this.Y(686), config.transition, 7.25, C.cyan, {
        ox: .5, bold: true, width: 350, align: 'center', lineSpacing: 2
      });
    }

    addContinueButton(this, config);
    this.cameras.main.fadeIn(260, 0, 0, 0);
  };

  proto.continueFromPhaseCard = function (config) {
    if (this.state !== 'PHASE_COMPLETE_CARD') return;
    this.state = 'PHASE_CARD_EXIT';

    if (Array.isArray(this._phaseCardQueue) && this._phaseCardQueue.length) {
      const nextPhase = this._phaseCardQueue.shift();
      return this.showPhaseCompleteCard(nextPhase);
    }

    this._activePhaseCard = null;
    if (config.final) {
      if (typeof this.continueNextUniverse === 'function') return this.continueNextUniverse();
      return this.resetRun();
    }
    return this.startEncounter();
  };

  function crossedCards(beforeTier, afterTier) {
    const cards = [];
    if (DWARF_PLANET >= 0 && beforeTier < DWARF_PLANET && afterTier >= DWARF_PLANET) cards.push(1);
    if (PULSAR >= 0 && beforeTier < PULSAR && afterTier >= PULSAR) cards.push(2);
    if (SMBH >= 0 && beforeTier < SMBH && afterTier >= SMBH) cards.push(3);
    return cards;
  }

  proto.resolve = function () {
    const beforeTier = Number(this.tierIndex) || 0;
    const result = baseResolve.call(this);

    if (this._devModeActive || this._devPhase4Test) return result;
    const cards = crossedCards(beforeTier, Number(this.tierIndex) || 0);
    if (!cards.length) return result;

    this._phaseCardQueue = cards.slice(1);
    this.time.delayedCall(30, () => {
      if (!this._devModeActive && !this._devPhase4Test) this.showPhaseCompleteCard(cards[0]);
    });
    return result;
  };

  if (typeof baseFinishUniverse === 'function') {
    proto.finishUniverse = function () {
      const result = baseFinishUniverse.call(this);
      if (this._devPhase4Test || this._devModeActive) return result;
      this._phaseCardQueue = [];
      this.time.delayedCall(40, () => this.showPhaseCompleteCard(4));
      return result;
    };
  }

  window.CometPhaseCards = Object.freeze({
    enabled: true,
    phases: [
      'THE AGE OF ACCRETION',
      'THE AGE OF SYSTEMS',
      'THE AGE OF GRAVITY',
      'THE COSMIC AGE'
    ],
    boundaries: { dwarfPlanet: DWARF_PLANET, rockyPlanet: ROCKY_PLANET, pulsar: PULSAR, supermassiveBlackHole: SMBH }
  });
})();
