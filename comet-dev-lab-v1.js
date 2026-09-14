// Developer collision lab.
// Purpose: quickly test any two object graphics/scales through the real reveal + encounter animation.
// The lab is isolated from progression, saves, collection and high scores.
(() => {
  const baseShowHome = GameScene.prototype.showHome;
  const baseClearUI = GameScene.prototype.clearUI;
  const baseResolve = GameScene.prototype.resolve;

  const DEV_SELECT_CLASS = 'comet-dev-object-select';
  const DEV_PIN = '8888';

  function copyRunState(scene) {
    const keys = [
      'runActive', 'state', 'tierIndex', 'growth', 'craters', 'encounters', 'absorbs', 'score',
      'regionId', 'lastRegionPromptEncounter', 'runStarted', 'player', 'other', 'pending',
      'preEncounterPlayer', 'preEncounterOther', 'actionHistory', 'collectedIdentityIds',
      'collectionBonusScore', 'manualSaves', 'manualLoads', 'scorePenalty'
    ];
    const snapshot = {};
    keys.forEach(key => {
      snapshot[key] = scene[key];
    });
    return snapshot;
  }

  function restoreRunState(scene, snapshot) {
    if (!snapshot) return;
    Object.keys(snapshot).forEach(key => {
      if (snapshot[key] === undefined) delete scene[key];
      else scene[key] = snapshot[key];
    });
  }

  function randomFactor(logRange) {
    return Math.pow(10, Phaser.Math.FloatBetween(-logRange, logRange));
  }

  function optionKeyForTier(tierIndex) {
    return `tier:${tierIndex}`;
  }

  function optionKeyForIdentity(identity, tierIndex) {
    return `identity:${identity.id}:${tierIndex}`;
  }

  function parseOptionKey(key) {
    const parts = String(key || '').split(':');
    if (parts[0] === 'identity') {
      return { type: 'identity', id: parts[1], tierIndex: Number(parts[2]) };
    }
    return { type: 'tier', tierIndex: Number(parts[1]) };
  }

  function objectFromOption(key) {
    const parsed = parseOptionKey(key);
    const tierIndex = clamp(Number.isInteger(parsed.tierIndex) ? parsed.tierIndex : 0, 0, TIERS.length - 1);
    const tier = TIERS[tierIndex];
    const identity = parsed.type === 'identity'
      ? (typeof COMET_IDENTITY_BY_ID !== 'undefined' ? COMET_IDENTITY_BY_ID[parsed.id] : null)
      : null;

    const object = {
      name: tier.name,
      realName: identity?.name || `GENERIC ${tier.name}`,
      tier: tierIndex,
      radiusM: tier.r * randomFactor(.055),
      massKg: tier.m * randomFactor(.09),
      speedMS: tier.v * Phaser.Math.FloatBetween(.90, 1.10),
      kind: tier.kind,
      color: tier.color,
      solid: tier.solid,
      hint: tier.hint,
      gap: 0
    };

    if (identity) {
      object.identityId = identity.id;
      object.namedSpriteBase = identity.spriteVariant;
      object.scienceClass = identity.scienceClass;
      object.identityStatus = identity.status;
    }
    return object;
  }

  function buildSelectOptions(select) {
    TIERS.forEach((tier, tierIndex) => {
      const group = document.createElement('optgroup');
      group.label = tier.name;

      const generic = document.createElement('option');
      generic.value = optionKeyForTier(tierIndex);
      generic.textContent = `GENERIC ${tier.name}`;
      group.appendChild(generic);

      if (typeof COMET_NAMED_IDENTITIES !== 'undefined') {
        COMET_NAMED_IDENTITIES
          .filter(identity => Array.isArray(identity.gameplayTiers) && identity.gameplayTiers.includes(tier.name))
          .forEach(identity => {
            const option = document.createElement('option');
            option.value = optionKeyForIdentity(identity, tierIndex);
            option.textContent = identity.name;
            group.appendChild(option);
          });
      }
      select.appendChild(group);
    });
  }

  function removeDevDom(scene) {
    const nodes = Array.from(document.querySelectorAll(`.${DEV_SELECT_CLASS}`));
    nodes.forEach(node => node.remove());
    if (scene?._devSelectResizeHandler) {
      window.removeEventListener('resize', scene._devSelectResizeHandler);
      window.removeEventListener('orientationchange', scene._devSelectResizeHandler);
      scene._devSelectResizeHandler = null;
    }
    scene._devSelectA = null;
    scene._devSelectB = null;
  }

  function positionSelect(scene, select, gameX, gameY, gameWidth, gameHeight) {
    if (!select || !scene?.game?.canvas) return;
    const rect = scene.game.canvas.getBoundingClientRect();
    const sx = rect.width / W;
    const sy = rect.height / H;
    const uiShift = Number(scene.ui?.y || 0);

    select.style.left = `${Math.round(rect.left + gameX * sx)}px`;
    select.style.top = `${Math.round(rect.top + (gameY + uiShift) * sy)}px`;
    select.style.width = `${Math.round(gameWidth * sx)}px`;
    select.style.height = `${Math.max(34, Math.round(gameHeight * sy))}px`;
  }

  function createSelect(scene, value, x, y, width, onChange) {
    const select = document.createElement('select');
    select.className = DEV_SELECT_CLASS;
    buildSelectOptions(select);
    if ([...select.options].some(option => option.value === value)) select.value = value;

    Object.assign(select.style, {
      position: 'fixed',
      zIndex: '99999',
      background: '#071829',
      color: '#f7fbff',
      border: '1.5px solid #20d9ff',
      borderRadius: '7px',
      padding: '4px 8px',
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif",
      fontSize: '16px', // Prevent iOS focus-zoom.
      fontWeight: '700',
      outline: 'none'
    });

    select.addEventListener('change', () => onChange(select.value));
    document.body.appendChild(select);
    positionSelect(scene, select, x, y, width, 37);
    return select;
  }

  function relativePreviewRadii(a, b) {
    const ratio = b.radiusM / Math.max(a.radiusM, 1e-300);
    let ar = 42;
    let br = ar * ratio;
    const maxRadius = 68;
    const minRadius = 4;

    if (ratio >= .18 && ratio <= 5.5) {
      if (br > maxRadius) {
        const scale = maxRadius / br;
        br *= scale;
        ar *= scale;
      }
      if (ar > maxRadius) {
        const scale = maxRadius / ar;
        ar *= scale;
        br *= scale;
      }
    } else {
      if (br > maxRadius) {
        const scale = maxRadius / br;
        br = maxRadius;
        ar = Math.max(minRadius, ar * scale);
      }
      if (br < minRadius) {
        const scale = minRadius / Math.max(br, 1e-6);
        br = minRadius;
        ar = Math.min(maxRadius, ar * scale);
      }
    }
    return { a: Math.max(1.5, ar), b: Math.max(1.5, br), ratio };
  }

  function destroyPreview(scene) {
    (scene._devPreviewObjects || []).forEach(object => {
      try { object?.destroy?.(true); } catch (e) {}
    });
    scene._devPreviewObjects = [];
  }

  function addPreviewObject(scene, object) {
    scene._devPreviewObjects.push(object);
    return object;
  }

  function pinKey(scene, x, y, label, onPress, color = C.cyan) {
    const c = scene.add.container(x, y);
    const g = scene.add.graphics();
    const w = 82;
    const h = 58;
    g.fillStyle(color, .10).fillRoundedRect(-w / 2, -h / 2, w, h, 9);
    g.lineStyle(1.5, color, .72).strokeRoundedRect(-w / 2, -h / 2, w, h, 9);
    const t = scene.add.text(0, 0, label, {
      fontFamily: FONT,
      fontSize: label.length > 2 ? '10px' : '20px',
      fontStyle: 'bold',
      color: '#f7fbff'
    }).setOrigin(.5);
    if (t.setResolution) t.setResolution(Math.min(window.devicePixelRatio || 1, 3));
    const hit = scene.add.rectangle(0, 0, w, h, 0xffffff, .001).setInteractive({ useHandCursor: true });
    hit.on('pointerdown', onPress);
    c.add([g, t, hit]);
    scene.ui.add(c);
    return c;
  }

  GameScene.prototype.clearUI = function () {
    removeDevDom(this);
    destroyPreview(this);
    return baseClearUI.call(this);
  };

  GameScene.prototype.showHome = function () {
    const result = baseShowHome.call(this);
    this.miniButton(42, this.Y(31), 58, 24, 'DEV', C.purple, () => this.showDevPinGate());
    return result;
  };

  GameScene.prototype.showDevPinGate = function () {
    this.clearUI();
    this.state = 'DEV_PIN';
    this._devPinEntry = '';
    this._devPinLocked = false;

    const bg = this.add.graphics();
    bg.fillStyle(C.bg, .88).fillRect(0, SAFE_TOP, W, H - SAFE_TOP);
    this.ui.add(bg);

    this.addText(W / 2, this.Y(92), 'DEV ACCESS', 20, C.white, { ox: .5, bold: true });
    this.addText(W / 2, this.Y(132), 'ENTER 4-DIGIT CODE', 9, C.muted, { ox: .5, bold: true });

    const dots = [];
    [159, 193, 227, 261].forEach(x => {
      const circle = this.add.circle(x, this.Y(190), 8, C.panel2, 1);
      circle.setStrokeStyle(2, C.cyan, .8);
      this.ui.add(circle);
      dots.push(circle);
    });

    const status = this.addText(W / 2, this.Y(224), '', 8.5, C.red, { ox: .5, bold: true });

    const refreshDots = () => {
      dots.forEach((dot, index) => {
        dot.setFillStyle(index < this._devPinEntry.length ? C.cyan : C.panel2, 1);
      });
    };

    const resetWrongPin = () => {
      this._devPinLocked = true;
      status.setText('INCORRECT CODE');
      status.setColor('#ff5368');
      this.cameras.main.shake(110, .004);
      this.time.delayedCall(520, () => {
        if (this.state !== 'DEV_PIN') return;
        this._devPinEntry = '';
        this._devPinLocked = false;
        status.setText('');
        refreshDots();
      });
    };

    const enterDigit = digit => {
      if (this._devPinLocked || this._devPinEntry.length >= 4) return;
      this._devPinEntry += String(digit);
      refreshDots();
      if (this._devPinEntry.length !== 4) return;

      if (this._devPinEntry === DEV_PIN) {
        this._devPinLocked = true;
        status.setColor('#25f29a');
        status.setText('ACCESS GRANTED');
        this.time.delayedCall(220, () => {
          if (this.state === 'DEV_PIN') this.enterDevLab();
        });
      } else {
        resetWrongPin();
      }
    };

    const backspace = () => {
      if (this._devPinLocked || !this._devPinEntry.length) return;
      this._devPinEntry = this._devPinEntry.slice(0, -1);
      refreshDots();
    };

    const clear = () => {
      if (this._devPinLocked) return;
      this._devPinEntry = '';
      status.setText('');
      refreshDots();
    };

    const xs = [112, 210, 308];
    const ys = [this.Y(302), this.Y(374), this.Y(446)];
    let digit = 1;
    ys.forEach(y => {
      xs.forEach(x => {
        const value = digit++;
        pinKey(this, x, y, String(value), () => enterDigit(value));
      });
    });
    pinKey(this, xs[0], this.Y(518), 'CLEAR', clear, C.muted);
    pinKey(this, xs[1], this.Y(518), '0', () => enterDigit(0));
    pinKey(this, xs[2], this.Y(518), '⌫', backspace, C.orange);

    this.wideButton(W / 2, this.Y(630), 280, 46, 'CANCEL', C.muted, () => this.showHome());
  };

  GameScene.prototype.enterDevLab = function () {
    if (!this._devRunSnapshot) this._devRunSnapshot = copyRunState(this);
    this._devModeActive = true;

    if (!this._devSelectedA) {
      const startTier = Number.isInteger(this._devRunSnapshot?.tierIndex) ? this._devRunSnapshot.tierIndex : 0;
      this._devSelectedA = optionKeyForTier(clamp(startTier, 0, TIERS.length - 1));
    }
    if (!this._devSelectedB) {
      const tier = Math.min(TIERS.length - 1, (Number.isInteger(this._devRunSnapshot?.tierIndex) ? this._devRunSnapshot.tierIndex : 0) + 1);
      this._devSelectedB = optionKeyForTier(tier);
    }

    this.showDevLab();
  };

  GameScene.prototype.exitDevLab = function () {
    removeDevDom(this);
    destroyPreview(this);
    const snapshot = this._devRunSnapshot;
    this._devModeActive = false;
    this._devRunSnapshot = null;
    restoreRunState(this, snapshot);
    this.showHome();
  };

  GameScene.prototype.refreshDevPreview = function (rerollA = false, rerollB = false) {
    if (!this._devModeActive || this.state !== 'DEV_LAB') return;
    destroyPreview(this);

    if (!this._devObjectA || rerollA) this._devObjectA = objectFromOption(this._devSelectedA);
    if (!this._devObjectB || rerollB) this._devObjectB = objectFromOption(this._devSelectedB);

    const a = this._devObjectA;
    const b = this._devObjectB;
    const radii = relativePreviewRadii(a, b);

    addPreviewObject(this, this.drawObject(105, this.Y(318), radii.a, a, false, false));
    addPreviewObject(this, this.drawObject(315, this.Y(318), radii.b, b, false, false));

    addPreviewObject(this, this.addText(105, this.Y(405), a.realName, 8.7, C.green, {
      ox: .5, bold: true, align: 'center', width: 178
    }));
    addPreviewObject(this, this.addText(315, this.Y(405), b.realName, 8.7, C.orange, {
      ox: .5, bold: true, align: 'center', width: 178
    }));
    addPreviewObject(this, this.addText(105, this.Y(432), `LIKELY Ø ${this.sizeText(a.radiusM)}`, 7.3, C.muted, {
      ox: .5, bold: true, align: 'center', width: 180
    }));
    addPreviewObject(this, this.addText(315, this.Y(432), `LIKELY Ø ${this.sizeText(b.radiusM)}`, 7.3, C.muted, {
      ox: .5, bold: true, align: 'center', width: 180
    }));
    addPreviewObject(this, this.addText(W / 2, this.Y(465), this.scaleRelation(radii.ratio), 8.2, C.cyan, {
      ox: .5, bold: true, align: 'center', width: 360
    }));
  };

  GameScene.prototype.showDevLab = function () {
    this.clearUI();
    this.state = 'DEV_LAB';
    this._devModeActive = true;

    // Fresh likely physical sizes each time the loop returns, while retaining the chosen identities.
    this._devObjectA = objectFromOption(this._devSelectedA);
    this._devObjectB = objectFromOption(this._devSelectedB);

    const bg = this.add.graphics();
    bg.fillStyle(C.bg, .78).fillRect(0, SAFE_TOP, W, H - SAFE_TOP);
    this.ui.add(bg);

    this.addText(W / 2, this.Y(34), 'DEV COLLISION LAB', 17, C.white, { ox: .5, bold: true });
    this.addText(W / 2, this.Y(67), 'SELECT TWO OBJECTS • SIZES ARE AUTO-GENERATED', 7.8, C.muted, {
      ox: .5, bold: true, align: 'center', width: 390
    });

    this.addText(22, this.Y(108), 'OBJECT A', 9, C.green, { bold: true });
    this.addText(218, this.Y(108), 'OBJECT B', 9, C.orange, { bold: true });

    const previewPanel = this.add.graphics();
    previewPanel.fillStyle(C.panel, .94).fillRoundedRect(16, this.Y(190), 388, 298, 10);
    previewPanel.lineStyle(1.5, C.cyan, .42).strokeRoundedRect(16, this.Y(190), 388, 298, 10);
    previewPanel.lineStyle(1, C.cyan, .20).lineBetween(W / 2, this.Y(202), W / 2, this.Y(392));
    this.ui.add(previewPanel);
    this.addText(W / 2, this.Y(212), 'RELATIVE SCALE PREVIEW', 7.2, C.muted, { ox: .5, bold: true });

    this._devPreviewObjects = [];
    this.refreshDevPreview();

    this.addText(W / 2, this.Y(515), 'RUN ENCOUNTER AS…', 9.3, C.white, { ox: .5, bold: true });

    // Reuse the real gameplay action controls. choose() will execute the real outcome/reveal/animate
    // pipeline; only resolve() is intercepted so no game state is permanently changed.
    this.choice(73, this.Y(625), 'ABSORB', C.green);
    this.choice(210, this.Y(625), 'DEFLECT', C.orange);
    this.choice(347, this.Y(625), 'AVOID', C.blue);

    this.wideButton(W / 2, this.Y(744), 300, 44, 'BACK HOME', C.cyan, () => this.exitDevLab());

    this._devSelectA = createSelect(this, this._devSelectedA, 22, this.Y(137), 180, value => {
      this._devSelectedA = value;
      this._devObjectA = objectFromOption(value);
      this.refreshDevPreview(false, false);
    });
    this._devSelectB = createSelect(this, this._devSelectedB, 218, this.Y(137), 180, value => {
      this._devSelectedB = value;
      this._devObjectB = objectFromOption(value);
      this.refreshDevPreview(false, false);
    });

    const reposition = () => {
      positionSelect(this, this._devSelectA, 22, this.Y(137), 180, 37);
      positionSelect(this, this._devSelectB, 218, this.Y(137), 180, 37);
    };
    this._devSelectResizeHandler = reposition;
    window.addEventListener('resize', reposition, { passive: true });
    window.addEventListener('orientationchange', reposition, { passive: true });
  };

  GameScene.prototype.choose = (function (baseChoose) {
    return function (choice) {
      if (!this._devModeActive || this.state !== 'DEV_LAB') return baseChoose.call(this, choice);

      // Freeze the current generated sizes/identities into the normal encounter fields.
      this.player = { ...this._devObjectA };
      this.other = { ...this._devObjectB };
      this.tierIndex = this.player.tier;
      this.growth = 0;
      this.craters = 0;
      this.encounters = 0;
      this.absorbs = 0;
      this.score = 0;
      this.regionId = 'hyperspace';
      this.actionHistory = [];
      this.collectedIdentityIds = [];
      this.collectionBonusScore = 0;
      this.runStarted = Date.now();

      this.other.gap = this.other.tier - this.player.tier;
      this.state = 'APPROACH';
      return baseChoose.call(this, choice);
    };
  })(GameScene.prototype.choose);

  function devResultTitle(pending) {
    if (!pending) return { title: 'RESULT', color: C.cyan };
    if (pending.choice === 'ABSORB') {
      if (pending.result === 'absorb' || pending.result === 'clean') return { title: 'ABSORBED', color: C.green };
      if (pending.result === 'merge') return { title: 'MERGED', color: C.cyan };
      if (pending.result === 'fragment' || pending.result === 'setback') return { title: 'FRAGMENTED', color: C.orange };
      return { title: 'OVERWHELMED', color: C.red };
    }
    if (pending.choice === 'DEFLECT') {
      if (pending.success === false || pending.result === 'catastrophic') return { title: 'DEFLECTION FAILED', color: C.red };
      if (pending.result === 'rough') return { title: 'ROUGH DEFLECTION', color: C.orange };
      return { title: 'CLEAN DEFLECTION', color: C.green };
    }
    return pending.success === false
      ? { title: 'AVOID FAILED', color: C.red }
      : { title: 'AVOIDED', color: C.green };
  }

  GameScene.prototype.showDevResult = function () {
    const pending = this.pending;
    const a = this.player;
    const b = this.other;
    const result = devResultTitle(pending);
    const ratio = b.radiusM / Math.max(a.radiusM, 1e-300);

    this.clearUI();
    this.state = 'DEV_RESULT';

    this.addText(W / 2, this.Y(38), 'DEV RESULT', 11, C.muted, { ox: .5, bold: true });
    this.addText(W / 2, this.Y(76), result.title, 18, result.color, { ox: .5, bold: true });
    this.addText(W / 2, this.Y(112), pending?.choice || '—', 9, C.white, { ox: .5, bold: true });

    const panel = this.add.graphics();
    panel.fillStyle(C.panel, .97).fillRoundedRect(16, this.Y(148), 388, 470, 10);
    panel.lineStyle(1.5, result.color, .62).strokeRoundedRect(16, this.Y(148), 388, 470, 10);
    this.ui.add(panel);

    const radii = relativePreviewRadii(a, b);
    this.drawObject(105, this.Y(292), Math.min(76, radii.a * 1.08), a, false, false);
    this.drawObject(315, this.Y(292), Math.min(76, radii.b * 1.08), b, false, false);

    this.addText(105, this.Y(390), a.realName, 8.8, C.green, { ox: .5, bold: true, align: 'center', width: 175 });
    this.addText(315, this.Y(390), b.realName, 8.8, C.orange, { ox: .5, bold: true, align: 'center', width: 175 });

    this.addText(35, this.Y(438), 'SIZE', 7.5, C.muted, { bold: true });
    this.addText(196, this.Y(438), this.sizeText(a.radiusM), 8.2, C.white, { ox: 1, bold: true });
    this.addText(224, this.Y(438), this.sizeText(b.radiusM), 8.2, C.white, { bold: true });

    this.addText(35, this.Y(474), 'MASS', 7.5, C.muted, { bold: true });
    this.addText(196, this.Y(474), this.massText(a.massKg), 8.2, C.white, { ox: 1, bold: true });
    this.addText(224, this.Y(474), this.massText(b.massKg), 8.2, C.white, { bold: true });

    this.addText(W / 2, this.Y(530), this.scaleRelation(ratio), 9, C.cyan, { ox: .5, bold: true, align: 'center', width: 360 });
    this.addText(W / 2, this.Y(568), 'NO PROGRESSION, SAVE OR COLLECTION DATA WAS CHANGED', 7.2, C.muted, {
      ox: .5, bold: true, align: 'center', width: 360
    });

    this.wideButton(W / 2, this.Y(682), 330, 52, 'NEXT', C.cyan, () => this.showDevLab());
    this.wideButton(W / 2, this.Y(750), 270, 42, 'BACK HOME', C.muted, () => this.exitDevLab());
  };

  GameScene.prototype.resolve = function () {
    if (this._devModeActive) return this.showDevResult();
    return baseResolve.call(this);
  };
})();
