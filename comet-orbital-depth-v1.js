// Orbital depth v1.
// Creates a simple 3D visual: the upper half of each orbit passes behind the player's sprite,
// while the lower half and any orbital travelling through it pass in front.
(() => {
  'use strict';
  if (typeof GameScene === 'undefined') return;

  const proto = GameScene.prototype;
  const baseDrawArena = proto.drawArena;
  const baseUpdate = proto.update;

  function drawHalfEllipse(g, rx, ry, front, color, alpha) {
    const start = front ? 0 : Math.PI;
    const end = front ? Math.PI : Math.PI * 2;
    g.lineStyle(1, color, alpha);
    g.beginPath();
    for (let step = 0; step <= 36; step++) {
      const a = start + (end - start) * (step / 36);
      const x = Math.cos(a) * rx, y = Math.sin(a) * ry;
      if (!step) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.strokePath();
  }

  function safeMove(body, target) {
    if (!body?.active || !target?.active || body.parentContainer === target) return;
    try { body.parentContainer?.remove(body, false); } catch (_) {}
    try { target.add(body); } catch (_) {}
  }

  function installSplit(scene, systemKey, bodiesKey, phase4 = false) {
    const system = scene?.[systemKey];
    const bodies = scene?.[bodiesKey];
    if (!system?.active || !scene.youSprite?.active || !Array.isArray(bodies) || !bodies.length) return;

    const metaKey = phase4 ? '_phase4OrbitalDepthSplit' : '_orbitalDepthSplit';
    const prior = scene[metaKey];
    if (prior?.system === system && prior?.front?.active) return;

    if (prior?.front?.active) {
      try { prior.front.destroy(true); } catch (_) {}
    }

    const bodySet = new Set(bodies.map(entry => entry?.body).filter(Boolean));
    // The original renderer's only non-body child is the full ellipse-ring Graphics object.
    // Remove that ring and replace it with separate back/front semicircles.
    for (const child of [...(system.list || [])]) {
      if (bodySet.has(child)) continue;
      try { system.remove(child, false); } catch (_) {}
      try { child.destroy?.(true); } catch (_) {}
    }

    const backRings = scene.add.graphics();
    const frontRings = scene.add.graphics();
    bodies.forEach((orbital, index) => {
      if (!Number.isFinite(orbital?.radiusX) || !Number.isFinite(orbital?.radiusY)) return;
      const colors = phase4 ? [C.cyan, C.purple, 0xffd38a] : [C.cyan];
      const color = colors[index % colors.length];
      const alpha = phase4 ? .095 + (index % 2) * .025 : .10;
      drawHalfEllipse(backRings, orbital.radiusX, orbital.radiusY, false, color, alpha);
      drawHalfEllipse(frontRings, orbital.radiusX, orbital.radiusY, true, color, alpha);
    });

    try { system.addAt(backRings, 0); } catch (_) { system.add(backRings); }

    const front = scene.add.container(system.x, system.y);
    front.add(frontRings);

    const playerIndex = scene.ui?.getIndex?.(scene.youSprite) ?? -1;
    if (playerIndex >= 0 && typeof scene.ui?.addAt === 'function') {
      scene.ui.addAt(front, Math.min(scene.ui.length, playerIndex + 1));
    } else {
      scene.ui?.add?.(front);
    }

    scene[metaKey] = { system, front, bodies };

    // Put each body on the correct side immediately using its current local y.
    bodies.forEach(orbital => safeMove(orbital?.body, Number(orbital?.body?.y) >= 0 ? front : system));
  }

  function syncSplit(scene, metaKey) {
    const meta = scene?.[metaKey];
    if (!meta?.system?.active || !meta?.front?.active || !scene.youSprite?.active) return;
    meta.front.setPosition(scene.youSprite.x, scene.youSprite.y);

    for (const orbital of meta.bodies || []) {
      const body = orbital?.body;
      if (!body?.active) continue;
      // Canvas y increases downward: positive local y is the visually nearer/front half.
      safeMove(body, Number(body.y) >= 0 ? meta.front : meta.system);
    }
  }

  proto.drawArena = function(...args) {
    const result = baseDrawArena.apply(this, args);
    installSplit(this, '_orbitalSystem', '_orbitalBodies', false);
    installSplit(this, '_phase4OrbitalSystem', '_phase4OrbitalBodies', true);
    return result;
  };

  proto.update = function(...args) {
    const result = typeof baseUpdate === 'function' ? baseUpdate.apply(this, args) : undefined;
    // A later renderer can create a new orbital system after drawArena; detect it lazily too.
    installSplit(this, '_orbitalSystem', '_orbitalBodies', false);
    installSplit(this, '_phase4OrbitalSystem', '_phase4OrbitalBodies', true);
    syncSplit(this, '_orbitalDepthSplit');
    syncSplit(this, '_phase4OrbitalDepthSplit');
    return result;
  };

  window.CometOrbitalDepthV1 = Object.freeze({
    enabled:true,
    rearHalf:'upper',
    frontHalf:'lower',
    movingBodiesChangeLayer:true,
    labStaticPreviewsHandled:true
  });
})();