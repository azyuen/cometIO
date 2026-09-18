// Phase 4 orbitals v2.
// Extends the orbital visual system beyond SMBHs so Galaxies, Clusters and Superclusters
// keep readable orbital companions. Cosmetic only: orbital counts/protection mechanics are unchanged.
(() => {
  if (typeof GameScene === 'undefined' || !window.CometPhase4) return;

  const proto = GameScene.prototype;
  const baseDrawArena = proto.drawArena;
  const baseUpdate = proto.update;
  const GALAXY = TIERS.findIndex(t => t.name === 'GALAXY');
  const CLUSTER = TIERS.findIndex(t => t.name === 'GALAXY CLUSTER');
  const SUPERCLUSTER = TIERS.findIndex(t => t.name === 'SUPERCLUSTER');
  const SMBH = TIERS.findIndex(t => t.name === 'SUPER MASSIVE BLACK HOLE');
  const BLACK_HOLE = TIERS.findIndex(t => t.name === 'BLACK HOLE');
  const PULSAR = TIERS.findIndex(t => t.name === 'PULSAR');
  const RED_HYPERGIANT = TIERS.findIndex(t => t.name === 'RED HYPERGIANT');
  const BLUE_GIANT = TIERS.findIndex(t => t.name === 'BLUE GIANT');
  const MAX_VISIBLE = 6;

  function whole(v) { return Math.max(0, Math.floor(Number(v) || 0)); }

  function inPhase4(scene) {
    return GALAXY >= 0 && scene.tierIndex >= GALAXY && scene.tierIndex <= SUPERCLUSTER;
  }

  function poolFor(scene) {
    if (scene.tierIndex === GALAXY) {
      return [SMBH, BLACK_HOLE, PULSAR, RED_HYPERGIANT, BLUE_GIANT].filter(i => i >= 0);
    }
    if (scene.tierIndex === CLUSTER) return [GALAXY];
    if (scene.tierIndex === SUPERCLUSTER) return [CLUSTER];
    return [];
  }

  function orbitalObject(scene, slot) {
    const pool = poolFor(scene);
    if (!pool.length) return null;
    const tierIndex = pool[(slot + scene.tierIndex) % pool.length];
    const tier = TIERS[tierIndex];
    const examples = Array.isArray(tier.examples) ? tier.examples : [];
    return {
      name: tier.name,
      realName: examples[(slot * 2 + scene.tierIndex) % Math.max(1, examples.length)] || tier.name,
      tier: tierIndex,
      radiusM: tier.r,
      massKg: tier.m,
      speedMS: tier.v,
      kind: tier.kind,
      color: tier.color,
      solid: tier.solid,
      orbitalVisual: true,
      phase4OrbitalVisual: true
    };
  }

  function tierScale(scene) {
    if (scene.tierIndex === SUPERCLUSTER) return 1.72;
    if (scene.tierIndex === CLUSTER) return 1.50;
    return 1.28;
  }

  function bodyRadius(scene, object, slot) {
    if (scene.tierIndex === SUPERCLUSTER) return 19 + (slot % 2) * 2.2;
    if (scene.tierIndex === CLUSTER) return 15.5 + (slot % 3) * 1.6;
    const high = object?.tier >= SMBH ? 13.5 : 11.5;
    return high + (slot % 3) * 1.1;
  }

  function clearOld(scene) {
    if (scene._phase4OrbitalSystem?.active) {
      try { scene._phase4OrbitalSystem.destroy(true); } catch (_) {}
    }
    scene._phase4OrbitalSystem = null;
    scene._phase4OrbitalBodies = [];
  }

  function renderPhase4Orbitals(scene) {
    clearOld(scene);
    if (!inPhase4(scene) || !scene.youSprite?.active) return;

    const count = Math.min(whole(scene.orbitalCount), MAX_VISIBLE);
    const pool = poolFor(scene);
    if (!count || !pool.length) return;

    const scale = tierScale(scene);
    const system = scene.add.container(scene.youSprite.x, scene.youSprite.y);
    const rings = scene.add.graphics();
    const colours = [C.cyan, C.purple, 0xffd38a];

    for (let slot = 0; slot < count; slot++) {
      const radiusX = (61 + slot * 10.5) * scale;
      const radiusY = (23 + slot * 3.7) * scale;
      rings.lineStyle(1, colours[slot % colours.length], .095 + (slot % 2) * .025)
        .strokeEllipse(0, 0, radiusX * 2, radiusY * 2);
    }
    system.add(rings);

    const playerIndex = scene.ui.getIndex(scene.youSprite);
    scene.ui.addAt(system, Math.max(0, playerIndex));
    scene._phase4OrbitalSystem = system;
    scene._phase4OrbitalBodies = [];

    for (let slot = 0; slot < count; slot++) {
      const object = orbitalObject(scene, slot);
      if (!object) continue;
      const radiusX = (61 + slot * 10.5) * scale;
      const radiusY = (23 + slot * 3.7) * scale;
      const phase = (Math.PI * 2 * slot / count) + (scene.tierIndex % 5) * .19;
      const periodMs = 11200 + slot * 1450 + (slot % 2) * 900;
      const radius = bodyRadius(scene, object, slot);
      const body = scene.drawObject(0, 0, radius, object, false, false);
      if (!body) continue;
      scene.ui.remove(body, false);
      system.add(body);
      scene._phase4OrbitalBodies.push({
        body, radiusX, radiusY, phase, periodMs,
        direction: slot % 3 === 2 ? -1 : 1
      });
    }
  }

  proto.drawArena = function() {
    const result = baseDrawArena.call(this);
    if (inPhase4(this)) renderPhase4Orbitals(this);
    return result;
  };

  proto.update = function(time, delta) {
    if (typeof baseUpdate === 'function') baseUpdate.call(this, time, delta);
    const system = this._phase4OrbitalSystem;
    if (!system?.active || !this.youSprite?.active || !Array.isArray(this._phase4OrbitalBodies)) return;

    system.setPosition(this.youSprite.x, this.youSprite.y);
    for (const orbital of this._phase4OrbitalBodies) {
      if (!orbital.body?.active) continue;
      const angle = orbital.phase + orbital.direction * (time / orbital.periodMs) * Math.PI * 2;
      const depth = (Math.sin(angle) + 1) / 2;
      orbital.body.setPosition(Math.cos(angle) * orbital.radiusX, Math.sin(angle) * orbital.radiusY);
      orbital.body.setScale(.88 + .20 * depth);
      orbital.body.setAlpha(.76 + .24 * depth);
    }
  };

  window.CometPhase4OrbitalsV2 = Object.freeze({
    enabled: true,
    phase4Only: true,
    largerReadableOrbitals: true,
    galaxyOrbitalPool: ['SMBH','BLACK_HOLE','PULSAR','RED_HYPERGIANT','BLUE_GIANT'],
    clusterOrbitalPool: ['GALAXY'],
    superclusterOrbitalPool: ['GALAXY_CLUSTER'],
    mechanicsUnchanged: true
  });
})();