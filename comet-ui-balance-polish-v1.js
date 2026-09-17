// UI + balance polish.
// - Gameplay gets a settings button aligned with SAVE / COLLECTION / HOME.
// - LAB PHASE 2/3/4 tab text is larger.
// - Phase 3 progression is moderately faster / less punishing.
// - Phase 4 progression returns closer to its original pacing.
(() => {
  if (typeof GameScene === 'undefined') return;

  const proto = GameScene.prototype;
  const baseDrawHud = proto.drawHud;
  const baseShowDevLab = proto.showDevLab;
  const baseShowLabExperiment = proto.showLabExperiment;
  const baseShowLabPhaseComplete = proto.showLabPhaseComplete;
  const baseGrowthPoints = proto.growthPoints;
  const baseOutcome = proto.outcome;

  const PULSAR = Math.max(0, TIERS.findIndex(t => t.name === 'PULSAR'));
  const SMBH = Math.max(PULSAR, TIERS.findIndex(t => t.name === 'SUPER MASSIVE BLACK HOLE'));
  const GALAXY = Number(window.CometPhase4?.galaxyTier ?? TIERS.findIndex(t => t.name === 'GALAXY'));
  const CLUSTER = Number(window.CometPhase4?.clusterTier ?? TIERS.findIndex(t => t.name === 'GALAXY CLUSTER'));
  const SUPERCLUSTER = Number(window.CometPhase4?.superclusterTier ?? TIERS.findIndex(t => t.name === 'SUPERCLUSTER'));

  // v4 intentionally accelerated Phase 4 to 4.35 / 5.20. Restore approximately the original
  // design requirements before adding the small growth-rate adjustment below.
  if (GALAXY >= 0 && TIERS[GALAXY]) TIERS[GALAXY].need = Math.max(Number(TIERS[GALAXY].need) || 0, 5.2);
  if (CLUSTER >= 0 && TIERS[CLUSTER]) TIERS[CLUSTER].need = Math.max(Number(TIERS[CLUSTER].need) || 0, 5.8);

  function walk(node, fn) {
    if (!node) return;
    fn(node);
    if (Array.isArray(node.list)) node.list.forEach(child => walk(child, fn));
  }

  function phase3(scene) {
    const tier = Number(scene?.tierIndex);
    return Number.isFinite(tier) && tier >= PULSAR && tier <= SMBH;
  }

  function phase4(scene) {
    const tier = Number(scene?.tierIndex);
    return Number.isFinite(tier) && GALAXY >= 0 && SUPERCLUSTER >= 0 && tier >= GALAXY && tier < SUPERCLUSTER;
  }

  // ---------- Gameplay settings ----------
  function hex(n) { return `#${Number(n || 0).toString(16).padStart(6, '0')}`; }

  function modalText(scene, parent, x, y, text, size, color = C.white, options = {}) {
    const t = scene.add.text(x, y, text, {
      fontFamily: FONT,
      fontSize: `${size}px`,
      fontStyle: options.bold ? 'bold' : 'normal',
      color: hex(color),
      align: options.align || 'left',
      wordWrap: options.width ? { width: options.width, useAdvancedWrap: true } : undefined
    }).setOrigin(options.ox ?? 0, options.oy ?? 0);
    if (t.setResolution) t.setResolution(Math.min(window.devicePixelRatio || 1, 3));
    parent.add(t);
    return t;
  }

  function modalButton(scene, parent, x, y, w, h, label, color, cb) {
    const c = scene.add.container(x, y), g = scene.add.graphics();
    g.fillStyle(color, .14).fillRoundedRect(-w/2, -h/2, w, h, 7);
    g.lineStyle(1.6, color, .9).strokeRoundedRect(-w/2, -h/2, w, h, 7);
    const t = scene.add.text(0, 0, label, { fontFamily:FONT, fontSize:'11px', fontStyle:'bold', color:'#fff' }).setOrigin(.5);
    const hit = scene.add.rectangle(0, 0, w, h, 0xffffff, .001).setInteractive({ useHandCursor:true });
    hit.on('pointerdown', cb);
    c.add([g, t, hit]); parent.add(c); return c;
  }

  function audioSlider(scene, parent, label, y, getValue, setValue, color) {
    const x0 = 80, x1 = 340, width = x1 - x0;
    modalText(scene, parent, 48, y - 38, label, 10, C.white, { bold:true });
    const valueText = modalText(scene, parent, 372, y - 38, `${Math.round(getValue())}%`, 10, color, { bold:true, ox:1 });
    const track = scene.add.graphics(), fill = scene.add.graphics(), thumb = scene.add.circle(0, y, 9, color, 1);
    parent.add([track, fill, thumb]);
    track.lineStyle(7, 0x183248, 1).lineBetween(x0, y, x1, y);
    const redraw = value => {
      const v = clamp(Number(value) || 0, 0, 100);
      fill.clear(); fill.lineStyle(7, color, .9).lineBetween(x0, y, x0 + width * v / 100, y);
      thumb.x = x0 + width * v / 100;
      valueText.setText(`${Math.round(v)}%`);
    };
    redraw(getValue());
    const hit = scene.add.rectangle((x0+x1)/2, y, width + 24, 44, 0xffffff, .001).setInteractive({ useHandCursor:true });
    parent.add(hit);
    const setFromPointer = pointer => {
      const value = clamp(((pointer.x - x0) / width) * 100, 0, 100);
      setValue(value); redraw(value);
    };
    hit.on('pointerdown', setFromPointer);
    hit.on('pointermove', pointer => { if (pointer.isDown) setFromPointer(pointer); });
  }

  function openGameplaySettings(scene) {
    if (scene._gameplaySettingsModal?.active) return;
    const audio = window.CometAudio;
    if (!audio?.getSettings) return;

    const root = scene.add.container(0, 0).setDepth?.(10000) || scene.add.container(0, 0);
    scene.ui.add(root); scene._gameplaySettingsModal = root;
    const shade = scene.add.rectangle(W/2, H/2, W, H, 0x000000, .72).setInteractive(); root.add(shade);
    const top = scene.Y(205), panel = scene.add.graphics();
    panel.fillStyle(C.panel, .995).fillRoundedRect(24, top, 372, 390, 12);
    panel.lineStyle(2, C.cyan, .88).strokeRoundedRect(24, top, 372, 390, 12); root.add(panel);
    modalText(scene, root, W/2, top + 31, 'SETTINGS', 19, C.white, { bold:true, ox:.5 });
    modalText(scene, root, W/2, top + 61, 'AUDIO', 8.5, C.cyan, { bold:true, ox:.5 });

    const music = () => Number(audio.getSettings()?.music) || 0;
    const sfx = () => Number(audio.getSettings()?.sfx) || 0;
    audioSlider(scene, root, 'MUSIC', top + 142, music, value => audio.setMusic?.(value), C.purple);
    audioSlider(scene, root, 'SOUND FX', top + 244, sfx, value => audio.setSFX?.(value), C.orange);
    modalText(scene, root, W/2, top + 285, 'CHANGES APPLY IMMEDIATELY', 7.2, C.muted, { bold:true, ox:.5 });
    modalButton(scene, root, W/2, top + 338, 286, 46, 'CLOSE', C.cyan, () => {
      try { root.destroy(true); } catch (e) {}
      scene._gameplaySettingsModal = null;
    });
  }

  proto.drawHud = function(controls = false) {
    const result = baseDrawHud.call(this, controls);
    if (controls && this.state === 'APPROACH' && typeof this.miniButton === 'function') {
      // SAVE / LOAD / HOME use SAFE_TOP + 15 in the active HUD; use the exact same baseline here.
      this.miniButton(W - 31, SAFE_TOP + 15, 54, 24, '⚙', C.purple, () => openGameplaySettings(this));
    }
    return result;
  };

  // ---------- LAB phase label sizing ----------
  function enlargePhaseTabs(scene) {
    walk(scene.ui, node => {
      if (typeof node?.text !== 'string' || typeof node.setFontSize !== 'function') return;
      if (/^PHASE [234]$/.test(node.text.trim())) {
        node.setFontSize('8.8px');
        node.setStyle?.({ fontStyle:'bold' });
      }
    });
  }

  if (typeof baseShowDevLab === 'function') {
    proto.showDevLab = function(...args) { const r = baseShowDevLab.apply(this, args); enlargePhaseTabs(this); return r; };
  }
  if (typeof baseShowLabExperiment === 'function') {
    proto.showLabExperiment = function(...args) { const r = baseShowLabExperiment.apply(this, args); enlargePhaseTabs(this); return r; };
  }
  if (typeof baseShowLabPhaseComplete === 'function') {
    proto.showLabPhaseComplete = function(...args) { const r = baseShowLabPhaseComplete.apply(this, args); enlargePhaseTabs(this); return r; };
  }

  // ---------- Phase pacing ----------
  proto.growthPoints = function(...args) {
    const base = Number(baseGrowthPoints?.apply(this, args)) || 0;
    if (phase3(this)) return base * 1.18;
    if (phase4(this)) return base * .88;
    return base;
  };

  proto.outcome = function(choice) {
    const pending = baseOutcome.call(this, choice);
    if (!pending || !phase3(this) || choice !== 'ABSORB' || !pending.compactGravityReverse) return pending;

    // Compact targets remain dangerous, but Phase 3 should not feel like a wall. Re-evaluate the
    // reverse-gravity result using an 84% version of the old fatal probability.
    const oldFatal = clamp(Number(pending.fatalChance) || 0, 0, 1);
    if (oldFatal <= 0) return pending;
    const fatal = clamp(oldFatal * .84, 0, .90);
    const survives = Math.random() >= fatal;
    pending.fatalChance = fatal;
    pending.fragmentChance = 1 - fatal;
    pending.chance = 1 - fatal;
    pending.result = survives ? 'fragment' : 'catastrophic';
    pending.success = survives;
    pending.phase3BalanceV1 = true;
    return pending;
  };

  window.CometUiBalancePolish = Object.freeze({
    gameplaySettingsButton:true,
    labPhaseFontPx:8.8,
    phase3GrowthMultiplier:1.18,
    phase3CompactFatalMultiplier:.84,
    phase4GrowthMultiplier:.88,
    phase4GalaxyNeed:GALAXY>=0?TIERS[GALAXY]?.need:null,
    phase4ClusterNeed:CLUSTER>=0?TIERS[CLUSTER]?.need:null
  });
})();