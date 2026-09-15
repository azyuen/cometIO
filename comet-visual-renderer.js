// Sprite/LOD renderer layered over the existing procedural drawObject renderer.
// It does not decide gameplay scale: the radius passed by existing game code remains authoritative.
(() => {
  const proceduralDrawObject = GameScene.prototype.drawObject;
  const previousPreload = GameScene.prototype.preload;
  const previousUpdate = GameScene.prototype.update;
  const effectRegistry = Object.create(null);
  const VISUAL_STATE = Symbol('cometVisualState');

  function randomFrom(list) {
    if (!Array.isArray(list) || !list.length) return null;
    return list[Math.floor(Math.random() * list.length)];
  }

  function randomBetween([min, max] = [1, 1]) {
    return min + Math.random() * (max - min);
  }

  function textureKey(variant, lod) {
    return cometSpriteTextureKey(variant, lod);
  }

  function declaredLods(variant) {
    const entry = COMET_SPRITE_ASSETS[variant];
    return entry && Array.isArray(entry.lods) ? [...entry.lods].sort((a, b) => a - b) : [];
  }

  function availableLods(scene, variant) {
    return declaredLods(variant).filter(lod => scene.textures.exists(textureKey(variant, lod)));
  }

  function variantHasTexture(scene, variant) {
    return availableLods(scene, variant).length > 0;
  }

  function pickVariant(scene, pool) {
    const variants = Array.isArray(pool) ? pool : [];
    const available = variants.filter(v => variantHasTexture(scene, v));
    return randomFrom(available.length ? available : variants);
  }

  function desiredLod(displayDiameterPx) {
    const thresholds = COMET_VISUAL_SETTINGS.lodThresholds;
    if (displayDiameterPx <= thresholds.smallMaxPx) return 32;
    if (displayDiameterPx <= thresholds.normalMaxPx) return 64;
    return 128;
  }

  function forceClean32ForKnownCorruptPack(variant, lods) {
    const entry = COMET_SPRITE_ASSETS[variant];
    if (!entry || !lods.includes(32)) return null;

    // Known bad 64px sources only. Do NOT blanket-downgrade whole planet families: doing so made
    // otherwise-clean planets lose detail. These variants stay on their stable 32px sources until
    // the original 64px PNGs are re-exported.
    const force32 =
      entry.family === 'atomic' ||
      variant.startsWith('rockyPlanet_') ||
      variant === 'dwarf_ceres' ||
      variant === 'dwarf_eris' ||
      variant.startsWith('gasPlanet_') ||
      variant === 'planet_saturn' ||
      variant === 'planet_neptune' ||
      variant.startsWith('yellowDwarf_');

    return force32 ? 32 : null;
  }

  function closestAvailableLod(scene, variant, displayDiameterPx) {
    const lods = availableLods(scene, variant);
    if (!lods.length) return null;

    const forcedCleanLod = forceClean32ForKnownCorruptPack(variant, lods);
    if (forcedCleanLod) return forcedCleanLod;

    const desired = desiredLod(displayDiameterPx);
    return lods.reduce((best, lod) => {
      const bestDistance = Math.abs(Math.log2(best / desired));
      const distance = Math.abs(Math.log2(lod / desired));
      return distance < bestDistance ? lod : best;
    }, lods[0]);
  }

  function chooseTint(def, mystery) {
    if (!def.tintEnabled) return null;
    const family = COMET_VISUAL_FAMILIES[def.visualFamily] || def;
    const palette = mystery ? family.mysteryTintPalette : def.tintPalette;
    return randomFrom(palette || []);
  }

  function ensureSceneVisualState(scene) {
    if (!scene._cometVisualStates) scene._cometVisualStates = new WeakMap();
    if (!scene._cometVisualHandles) scene._cometVisualHandles = new Set();
  }

  function ensureObjectVisualState(scene, object) {
    ensureSceneVisualState(scene);
    let state = object?.[VISUAL_STATE] || scene._cometVisualStates.get(object);
    if (state) {
      scene._cometVisualStates.set(object, state);
      return state;
    }

    const def = getCometVisualDefinition(object);
    state = {
      definition: def,
      normalVariant: pickVariant(scene, def.normalVariants),
      mysteryVariant: pickVariant(scene, def.mysteryVariants),
      normalTint: chooseTint(def, false),
      mysteryTint: chooseTint(def, true),
      rotation: def.allowRotation ? Math.random() * 360 : 0,
      flipX: def.allowFlip ? Math.random() < (def.flipChance ?? COMET_VISUAL_SETTINGS.defaultFlipChance) : false,
      alpha: randomBetween(def.alphaRange || [1, 1])
    };
    scene._cometVisualStates.set(object, state);
    try {
      Object.defineProperty(object, VISUAL_STATE, { value: state, enumerable: true, configurable: true });
    } catch (e) {}
    return state;
  }

  function applyNearestFilter(scene, key) {
    const texture = scene.textures.get?.(key);
    if (texture?.setFilter && typeof Phaser !== 'undefined' && Phaser.Textures?.FilterMode) {
      texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
  }

  function applyImageDisplayDiameter(image, displayDiameterPx) {
    const sourceWidth = Math.max(image.width || 1, 1);
    const sourceHeight = Math.max(image.height || sourceWidth, 1);
    const aspect = sourceHeight / sourceWidth;
    image.setDisplaySize(displayDiameterPx, displayDiameterPx * aspect);
  }

  function applyTexturePreservingSize(handle, lod) {
    if (!handle.image || !lod) return false;
    const key = textureKey(handle.variant, lod);
    if (!handle.scene.textures.exists(key)) return false;
    handle.image.setTexture(key);
    applyNearestFilter(handle.scene, key);
    applyImageDisplayDiameter(handle.image, handle.baseDisplayDiameterPx);
    handle.lod = lod;
    updateDebugLabel(handle);
    return true;
  }

  function effectiveDisplayDiameter(handle) {
    const scale = Math.max(Math.abs(handle.container.scaleX || 1), Math.abs(handle.container.scaleY || 1));
    return handle.baseDisplayDiameterPx * scale;
  }

  function updateDebugLabel(handle) {
    if (!handle.debugLabel) return;
    const state = handle.visualState;
    const tint = handle.tint === null || handle.tint === undefined ? 'none' : `#${handle.tint.toString(16).padStart(6, '0')}`;
    handle.debugLabel.setText([
      `${handle.object.name}`,
      `${state.definition.visualFamily} / ${state.definition.collisionFamily}`,
      `${handle.variant || 'fallback'} @ ${handle.lod || 'fallback'}`,
      `${Math.round(effectiveDisplayDiameter(handle))}px / ${tint}`
    ].join('\n'));
  }

  function addDebugLabel(scene, container, handle, radius) {
    if (!COMET_VISUAL_SETTINGS.debug) return null;
    const label = scene.add.text(0, radius + 10, '', {
      fontFamily: 'Menlo, Consolas, monospace', fontSize: '7px', color: '#ffffff',
      backgroundColor: '#000000cc', padding: { x: 3, y: 2 }, align: 'center'
    }).setOrigin(0.5, 0);
    if (label.setResolution) label.setResolution(4);
    container.add(label);
    handle.debugLabel = label;
    updateDebugLabel(handle);
    return label;
  }

  function invokeEffect(name, context) {
    if (!name) return;
    const fn = effectRegistry[name];
    if (typeof fn === 'function') fn(context);
  }

  function createSpriteObject(scene, x, y, radius, object, mystery, glow, state, variant, lod) {
    const container = scene.add.container(x, y);
    const effectsBack = scene.add.container(0, 0);
    const effectsFront = scene.add.container(0, 0);
    const key = textureKey(variant, lod);
    const image = scene.add.image(0, 0, key);
    const displayDiameterPx = Math.max(1, radius * 2);
    const tint = mystery ? state.mysteryTint : state.normalTint;

    applyNearestFilter(scene, key);
    image.setAngle(state.rotation);
    image.setFlipX(state.flipX);
    image.setAlpha(state.alpha);
    if (tint !== null && tint !== undefined) image.setTint(tint);
    applyImageDisplayDiameter(image, displayDiameterPx);

    if (glow) {
      const legacyGlow = scene.add.graphics();
      legacyGlow.fillStyle(C.orange, 0.10).fillCircle(0, 0, radius + 11);
      effectsBack.add(legacyGlow);
    }

    container.add([effectsBack, image, effectsFront]);
    scene.ui.add(container);

    const handle = {
      scene, container, object, mystery, visualState: state, variant, lod, image, effectsBack, effectsFront,
      baseDisplayDiameterPx: displayDiameterPx, tint, fallback: false, debugLabel: null
    };

    container.cometVisual = handle;
    container.cometCollisionFamily = state.definition.collisionFamily;
    container.setVisualDisplayDiameter = function (diameterPx) {
      handle.baseDisplayDiameterPx = Math.max(1, diameterPx);
      const nextLod = closestAvailableLod(scene, variant, effectiveDisplayDiameter(handle));
      if (nextLod && nextLod !== handle.lod) applyTexturePreservingSize(handle, nextLod);
      else applyImageDisplayDiameter(image, handle.baseDisplayDiameterPx);
      updateDebugLabel(handle);
      return container;
    };
    container.refreshVisualLOD = function () {
      const nextLod = closestAvailableLod(scene, variant, effectiveDisplayDiameter(handle));
      if (nextLod && nextLod !== handle.lod) applyTexturePreservingSize(handle, nextLod);
      updateDebugLabel(handle);
      return container;
    };

    if (!mystery) {
      invokeEffect(state.definition.effects?.back, { scene, handle, layer: effectsBack, object, definition: state.definition });
      invokeEffect(state.definition.effects?.front, { scene, handle, layer: effectsFront, object, definition: state.definition });
    }

    addDebugLabel(scene, container, handle, radius);
    scene._cometVisualHandles.add(handle);
    return container;
  }

  function attachFallbackMetadata(scene, container, object, radius, mystery, state) {
    const handle = {
      scene, container, object, mystery, visualState: state,
      variant: mystery ? state.mysteryVariant : state.normalVariant,
      lod: null, image: null, baseDisplayDiameterPx: Math.max(1, radius * 2),
      tint: mystery ? state.mysteryTint : state.normalTint, fallback: true, debugLabel: null
    };
    container.cometVisual = handle;
    container.cometCollisionFamily = state.definition.collisionFamily;
    container.setVisualDisplayDiameter = () => container;
    container.refreshVisualLOD = () => container;
    addDebugLabel(scene, container, handle, radius);
    return container;
  }

  GameScene.prototype.preload = function () {
    if (typeof previousPreload === 'function') previousPreload.call(this);
    Object.entries(COMET_SPRITE_ASSETS).forEach(([variant, entry]) => {
      (entry.lods || []).forEach(lod => {
        const path = cometSpriteAssetPath(variant, lod);
        if (path) this.load.image(textureKey(variant, lod), path);
      });
    });
  };

  GameScene.prototype.drawObject = function (x, y, radius, object, mystery = false, glow = false) {
    ensureSceneVisualState(this);
    const state = ensureObjectVisualState(this, object);
    const variant = mystery ? state.mysteryVariant : state.normalVariant;
    const displayDiameterPx = Math.max(1, radius * 2);
    const lod = variant ? closestAvailableLod(this, variant, displayDiameterPx) : null;

    if (!variant || !lod) {
      const fallback = proceduralDrawObject.call(this, x, y, radius, object, mystery, glow);
      return attachFallbackMetadata(this, fallback, object, radius, mystery, state);
    }
    return createSpriteObject(this, x, y, radius, object, mystery, glow, state, variant, lod);
  };

  GameScene.prototype.update = function (time, delta) {
    if (typeof previousUpdate === 'function') previousUpdate.call(this, time, delta);
    if (!this._cometVisualHandles || !this._cometVisualHandles.size) return;
    for (const handle of [...this._cometVisualHandles]) {
      if (!handle.container || !handle.container.active || !handle.image) {
        this._cometVisualHandles.delete(handle);
        continue;
      }
      const nextLod = closestAvailableLod(this, handle.variant, effectiveDisplayDiameter(handle));
      if (nextLod && nextLod !== handle.lod) applyTexturePreservingSize(handle, nextLod);
      else updateDebugLabel(handle);
    }
  };

  window.CometVisuals = {
    getDefinition: getCometVisualDefinition,
    getCollisionFamily(object) { return getCometVisualDefinition(object).collisionFamily; },
    registerEffect(name, fn) { if (typeof fn === 'function') effectRegistry[name] = fn; },
    unregisterEffect(name) { delete effectRegistry[name]; },
    setDebug(enabled) { COMET_VISUAL_SETTINGS.debug = !!enabled; },
    describe(object) { return getCometVisualDefinition(object); },
    desiredLod
  };
})();
