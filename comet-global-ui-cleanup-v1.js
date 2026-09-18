// Global visual + settings cleanup.
// 1) Remove the old prototype "glow" disc from every object rendering path.
//    Intrinsic sprite/family effects (star glow, black-hole accretion, nebula drift, etc.) remain.
// 2) Use one settings popup everywhere, including LAB. Native LAB selectors are hidden while
//    the popup is open so they cannot sit above the Phaser modal.
// 3) Add RESET HIGH SCORES with an explicit second CONFIRM RESET press.
(() => {
  'use strict';
  if (typeof GameScene === 'undefined') return;

  const proto = GameScene.prototype;
  const baseDrawObject = proto.drawObject;
  const baseMiniButton = proto.miniButton;

  // ---------- Remove prototype backing discs ----------
  if (typeof baseDrawObject === 'function') {
    proto.drawObject = function(x, y, radius, object, mystery = false, glow = false) {
      // Deliberately force the old prototype highlight off. Renderers further down the chain
      // may still draw scientific/object-specific effects that do not depend on this flag.
      return baseDrawObject.call(this, x, y, radius, object, mystery, false);
    };
  }

  // ---------- Unified settings ----------
  const SELECTOR = '.comet-dev-object-select';
  const hiddenDom = new Map();

  function hex(n) {
    return `#${Number(n || 0).toString(16).padStart(6, '0')}`;
  }

  function hideLabDom() {
    document.querySelectorAll(SELECTOR).forEach(node => {
      if (hiddenDom.has(node)) return;
      hiddenDom.set(node, {
        visibility: node.style.visibility,
        pointerEvents: node.style.pointerEvents,
        zIndex: node.style.zIndex
      });
      node.style.visibility = 'hidden';
      node.style.pointerEvents = 'none';
      node.style.zIndex = '0';
    });
  }

  function restoreLabDom() {
    hiddenDom.forEach((old, node) => {
      if (!node?.isConnected) return;
      node.style.visibility = old.visibility;
      node.style.pointerEvents = old.pointerEvents;
      node.style.zIndex = old.zIndex;
    });
    hiddenDom.clear();
  }

  function text(scene, parent, x, y, value, size, color = C.white, options = {}) {
    const t = scene.add.text(x, y, value, {
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

  function button(scene, parent, x, y, w, h, label, color, cb, fontSize = 10.5) {
    const c = scene.add.container(x, y);
    const g = scene.add.graphics();
    g.fillStyle(color, .14).fillRoundedRect(-w / 2, -h / 2, w, h, 7);
    g.lineStyle(1.7, color, .92).strokeRoundedRect(-w / 2, -h / 2, w, h, 7);
    const t = scene.add.text(0, 0, label, {
      fontFamily: FONT,
      fontSize: `${fontSize}px`,
      fontStyle: 'bold',
      color: '#fff'
    }).setOrigin(.5);
    if (t.setResolution) t.setResolution(Math.min(window.devicePixelRatio || 1, 3));
    const hit = scene.add.rectangle(0, 0, w, h, 0xffffff, .001).setInteractive({ useHandCursor: true });
    hit.on('pointerdown', cb);
    c.add([g, t, hit]);
    parent.add(c);
    return { container: c, graphics: g, label: t, hit };
  }

  function slider(scene, parent, label, y, getValue, setValue, color) {
    const minusX = 58, plusX = 362, buttonW = 34;
    const x0 = 94, x1 = 326, width = x1 - x0;

    text(scene, parent, 52, y - 38, label, 10, C.white, { bold: true });
    const valueText = text(scene, parent, 368, y - 38, `${Math.round(getValue())}%`, 10, color, { bold: true, ox: 1 });

    const track = scene.add.graphics();
    const fill = scene.add.graphics();
    const thumb = scene.add.circle(0, y, 9, color, 1);
    parent.add([track, fill, thumb]);
    track.lineStyle(7, 0x183248, 1).lineBetween(x0, y, x1, y);
    track.lineStyle(1, C.cyan, .28).lineBetween(x0, y, x1, y);

    const redraw = value => {
      const v = Math.max(0, Math.min(100, Number(value) || 0));
      fill.clear();
      fill.lineStyle(7, color, .88).lineBetween(x0, y, x0 + width * v / 100, y);
      thumb.x = x0 + width * v / 100;
      valueText.setText(`${Math.round(v)}%`);
    };
    redraw(getValue());

    const hit = scene.add.rectangle((x0 + x1) / 2, y, width + 18, 42, 0xffffff, .001)
      .setInteractive({ useHandCursor: true });
    parent.add(hit);

    const setFromPointer = pointer => {
      const value = Math.max(0, Math.min(100, ((pointer.x - x0) / width) * 100));
      setValue(value);
      redraw(value);
    };
    hit.on('pointerdown', setFromPointer);
    hit.on('pointermove', pointer => {
      if (pointer.isDown) setFromPointer(pointer);
    });

    button(scene, parent, minusX, y, buttonW, 30, '−', color, () => {
      const v = Math.max(0, getValue() - 10);
      setValue(v);
      redraw(v);
    }, 13);
    button(scene, parent, plusX, y, buttonW, 30, '+', color, () => {
      const v = Math.min(100, getValue() + 10);
      setValue(v);
      redraw(v);
    }, 13);
  }

  function scoreCount(scene) {
    try {
      return Array.isArray(scene.getScores?.()) ? scene.getScores().length : 0;
    } catch (_) {
      return 0;
    }
  }

  function clearHighScores() {
    try {
      if (typeof SCORES_KEY !== 'undefined') localStorage.removeItem(SCORES_KEY);
      else localStorage.removeItem('cometio-highscores-v1');
      return true;
    } catch (_) {
      return false;
    }
  }

  function openSettings(scene) {
    if (scene._cometUnifiedSettingsModal?.active) return;

    const audio = window.CometAudio;
    if (!audio?.getSettings) return;

    hideLabDom();

    const root = scene.add.container(0, 0);
    root.setDepth?.(20000);
    scene.ui.add(root);
    scene._cometUnifiedSettingsModal = root;

    const close = () => {
      restoreLabDom();
      try { root.destroy(true); } catch (_) {}
      scene._cometUnifiedSettingsModal = null;
    };

    const shade = scene.add.rectangle(W / 2, H / 2, W, H, 0x000000, .78).setInteractive();
    root.add(shade);

    const top = scene.Y(150);
    const panel = scene.add.graphics();
    panel.fillStyle(C.panel, .998).fillRoundedRect(24, top, 372, 520, 12);
    panel.lineStyle(2, C.cyan, .9).strokeRoundedRect(24, top, 372, 520, 12);
    root.add(panel);

    text(scene, root, W / 2, top + 28, 'SETTINGS', 19, C.white, { bold: true, ox: .5 });
    text(scene, root, W / 2, top + 56, 'AUDIO', 8.5, C.cyan, { bold: true, ox: .5 });

    const music = () => Number(audio.getSettings()?.music) || 0;
    const sfx = () => Number(audio.getSettings()?.sfx) || 0;

    slider(scene, root, 'MUSIC', top + 126, music, value => audio.setMusic?.(value), C.purple);
    slider(scene, root, 'SOUND FX', top + 226, sfx, value => audio.setSFX?.(value), C.orange);

    const divider = scene.add.graphics();
    divider.lineStyle(1, C.cyan, .25).lineBetween(45, top + 283, 375, top + 283);
    root.add(divider);

    text(scene, root, W / 2, top + 301, 'HIGH SCORES', 8.5, C.cyan, { bold: true, ox: .5 });

    const countLabel = text(
      scene, root, W / 2, top + 326,
      scoreCount(scene) ? `${scoreCount(scene)} SAVED SCORE${scoreCount(scene) === 1 ? '' : 'S'}` : 'NO SAVED SCORES',
      7.4, C.muted, { bold: true, ox: .5 }
    );

    let confirming = false;
    let resetButton = null;

    const drawResetState = () => {
      if (!resetButton) return;
      resetButton.label.setText(confirming ? 'CONFIRM RESET' : 'RESET HIGH SCORES');
      resetButton.graphics.clear();
      const c = confirming ? C.red : C.orange;
      resetButton.graphics.fillStyle(c, .14).fillRoundedRect(-143, -23, 286, 46, 7);
      resetButton.graphics.lineStyle(1.7, c, .92).strokeRoundedRect(-143, -23, 286, 46, 7);
    };

    resetButton = button(scene, root, W / 2, top + 374, 286, 46, 'RESET HIGH SCORES', C.orange, () => {
      if (!confirming) {
        confirming = true;
        drawResetState();
        countLabel.setText('PRESS CONFIRM RESET TO DELETE ALL SCORES');
        countLabel.setColor(hex(C.red));
        return;
      }

      const ok = clearHighScores();
      confirming = false;
      drawResetState();
      countLabel.setText(ok ? 'ALL HIGH SCORES RESET' : 'RESET FAILED');
      countLabel.setColor(hex(ok ? C.green : C.red));
    });

    text(scene, root, W / 2, top + 414, 'THIS DOES NOT RESET YOUR CURRENT RUN OR COLLECTION.', 6.7, C.muted, {
      bold: true, ox: .5, width: 335, align: 'center'
    });

    button(scene, root, W / 2, top + 468, 286, 46, 'CLOSE', C.cyan, close);

    // If a scene transition destroys the popup rather than CLOSE being pressed, ensure native
    // controls are not accidentally left hidden.
    root.once?.('destroy', () => {
      restoreLabDom();
      if (scene._cometUnifiedSettingsModal === root) scene._cometUnifiedSettingsModal = null;
    });
  }

  // Intercept every settings button created anywhere in the game. This also catches LAB/Home
  // settings without needing to know which older wrapper created the button.
  if (typeof baseMiniButton === 'function') {
    proto.miniButton = function(x, y, w, h, label, color, cb) {
      const isSettings = String(label || '').trim() === '⚙' || String(label || '').trim().toUpperCase() === 'SETTINGS';
      return baseMiniButton.call(this, x, y, w, h, label, color, isSettings ? () => openSettings(this) : cb);
    };
  }

  window.CometGlobalUiCleanupV1 = Object.freeze({
    enabled: true,
    legacyPrototypeGlowRemoved: true,
    intrinsicObjectEffectsPreserved: true,
    unifiedSettings: true,
    labSelectorsBelowSettings: true,
    highScoreReset: 'two-press-confirmation'
  });
})();