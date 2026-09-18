// Global animated sprite LOD watcher.
// Any sprite-backed object can be enlarged by later animation code using container scale.
// This late overlay makes LOD follow the object's EFFECTIVE on-screen diameter regardless of
// which renderer (generic, family, named, phase-specific) created the sprite.
(() => {
  'use strict';
  if (typeof GameScene === 'undefined') return;

  const proto = GameScene.prototype;
  const baseDrawObject = proto.drawObject;
  const baseUpdate = proto.update;
  const TRACKED = Symbol('cometGlobalAnimatedLodTracked');

  function availableLods(handle) {
    const variant = handle?.variant;
    const entry = variant && typeof COMET_SPRITE_ASSETS !== 'undefined' ? COMET_SPRITE_ASSETS[variant] : null;
    return Array.isArray(entry?.lods) ? entry.lods.filter(Number.isFinite) : [];
  }

  function textureReady(scene, variant, lod) {
    if (!variant || !lod || typeof cometSpriteTextureKey !== 'function') return false;
    const key = cometSpriteTextureKey(variant, lod);
    return scene.textures?.exists?.(key) === true;
  }

  function desiredLod(lods, diameter) {
    if (!lods.length) return null;
    const settings = typeof COMET_VISUAL_SETTINGS !== 'undefined' ? COMET_VISUAL_SETTINGS : null;
    const small = Number(settings?.lodThresholds?.smallMaxPx) || 48;
    const normal = Number(settings?.lodThresholds?.normalMaxPx) || 96;
    const desired = diameter <= small ? 32 : diameter <= normal ? 64 : 128;
    return [...lods].sort((a,b) => {
      const da = Math.abs(Math.log2(a / desired));
      const db = Math.abs(Math.log2(b / desired));
      return da - db;
    })[0] || null;
  }

  function effectiveDiameter(container, handle) {
    const base = Math.max(1, Number(handle?.baseDisplayDiameterPx) || Number(handle?.image?.displayWidth) || 1);
    const sx = Math.abs(Number(container?.scaleX) || 1);
    const sy = Math.abs(Number(container?.scaleY) || 1);
    return base * Math.max(sx, sy);
  }

  function applyBaseSize(image, baseDiameter) {
    if (!image) return;
    const width = Math.max(1, Number(image.width) || Number(image.frame?.realWidth) || 1);
    const height = Math.max(1, Number(image.height) || Number(image.frame?.realHeight) || width);
    image.setDisplaySize(baseDiameter, baseDiameter * (height / width));
  }

  function refresh(scene, container) {
    const handle = container?.cometVisual;
    const image = handle?.image;
    const variant = handle?.variant;
    if (!container?.active || !handle || !image || !variant) return;

    const lods = availableLods(handle);
    if (!lods.length) return;

    const target = desiredLod(lods, effectiveDiameter(container, handle));
    if (!target || target === handle.lod || !textureReady(scene, variant, target)) return;

    const key = cometSpriteTextureKey(variant, target);
    image.setTexture(key);
    const texture = scene.textures.get?.(key);
    if (texture?.setFilter && typeof Phaser !== 'undefined' && Phaser.Textures?.FilterMode) {
      texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
    handle.lod = target;
    applyBaseSize(image, Math.max(1, Number(handle.baseDisplayDiameterPx) || Number(image.displayWidth) || 1));
  }

  function track(scene, container) {
    if (!container?.cometVisual?.image || container[TRACKED]) return container;
    container[TRACKED] = true;
    if (!scene._cometGlobalAnimatedLod) scene._cometGlobalAnimatedLod = new Set();
    scene._cometGlobalAnimatedLod.add(container);

    // Also refresh immediately after explicit display-diameter changes.
    const original = container.setVisualDisplayDiameter;
    if (typeof original === 'function' && !container._cometGlobalLodSetterWrapped) {
      container._cometGlobalLodSetterWrapped = true;
      container.setVisualDisplayDiameter = function(diameter) {
        const result = original.call(this, diameter);
        refresh(scene, this);
        return result;
      };
    }
    refresh(scene, container);
    return container;
  }

  proto.drawObject = function(...args) {
    return track(this, baseDrawObject.apply(this, args));
  };

  proto.update = function(time, delta) {
    if (typeof baseUpdate === 'function') baseUpdate.call(this, time, delta);
    const tracked = this._cometGlobalAnimatedLod;
    if (!tracked?.size) return;
    for (const container of [...tracked]) {
      if (!container?.active || !container?.cometVisual?.image) {
        tracked.delete(container);
        continue;
      }
      refresh(this, container);
    }
  };

  window.CometGlobalAnimatedLodV1 = Object.freeze({
    enabled: true,
    version: 1,
    followsEffectiveDisplaySize: true,
    coversScaleTweens: true
  });
})();
