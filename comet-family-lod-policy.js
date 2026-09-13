// Optional family-specific fixed-LOD policy layered on top of the generic visual renderer.
// Used when a family has intentionally different hidden/revealed art resolutions.
(() => {
  const baseDrawObject = GameScene.prototype.drawObject;
  const FAMILY_STATE = Symbol('cometFamilyVisualState');

  function randomFrom(list) {
    return Array.isArray(list) && list.length ? list[Math.floor(Math.random() * list.length)] : null;
  }

  function textureReady(scene, variant, lod) {
    if (!variant || !lod) return false;
    const key = cometSpriteTextureKey(variant, lod);
    if (!scene.textures.exists(key)) return false;

    const texture = scene.textures.get?.(key);
    if (!texture || texture.key === '__MISSING') return false;

    try {
      const source = typeof texture.getSourceImage === 'function' ? texture.getSourceImage() : null;
      const frame = typeof texture.get === 'function' ? texture.get() : null;
      const width = frame?.realWidth || frame?.cutWidth || source?.naturalWidth || source?.width || null;
      const height = frame?.realHeight || frame?.cutHeight || source?.naturalHeight || source?.height || null;
      if ((width != null && width <= 0) || (height != null && height <= 0)) return false;
    } catch (e) {
      return false;
    }
    return true;
  }

  // Safari standalone mode has shown intermittent corruption when combining tiny transparent PNGs
  // with tint + flip + rotation. Keep the same artwork/variant there, but simplify the GPU path.
  function isStandaloneSafeMode() {
    return typeof window !== 'undefined' && window.COMET_STANDALONE === true;
  }

  // Atom art still contains partially-transparent edge pixels. On iOS Home Screen mode, rebuild
  // each loaded Atom texture once as a hard-alpha CanvasTexture. This preserves the sprite artwork
  // and dimensions while removing the semi-transparent pixels most associated with the rare
  // rainbow/black quad corruption. Normal Safari/browser rendering is untouched.
  function standaloneTextureKey(scene, def, key) {
    if (!isStandaloneSafeMode() || def.visualFamily !== 'atomic' || !key) return key;

    const safeKey = `${key}:standalone-hard-alpha`;
    if (scene.textures.exists(safeKey)) return safeKey;

    try {
      const sourceTexture = scene.textures.get(key);
      const source = sourceTexture?.getSourceImage?.();
      const width = source?.naturalWidth || source?.width || 0;
      const height = source?.naturalHeight || source?.height || 0;
      if (!source || width <= 0 || height <= 0) return key;

      const canvasTexture = scene.textures.createCanvas(safeKey, width, height);
      const ctx = canvasTexture.getContext();
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(source, 0, 0, width, height);

      const pixels = ctx.getImageData(0, 0, width, height);
      const data = pixels.data;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] < 128) {
          data[i] = 0;
          data[i + 1] = 0;
          data[i + 2] = 0;
          data[i + 3] = 0;
        } else {
          data[i + 3] = 255;
        }
      }
      ctx.putImageData(pixels, 0, 0);
      canvasTexture.refresh();

      if (canvasTexture.setFilter && typeof Phaser !== 'undefined' && Phaser.Textures?.FilterMode) {
        canvasTexture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
      return safeKey;
    } catch (e) {
      // If CanvasTexture creation is unavailable for any reason, use the already-loaded PNG.
      try { if (scene.textures.exists(safeKey)) scene.textures.remove(safeKey); } catch (_) {}
      return key;
    }
  }

  function chooseTint(def) {
    if (isStandaloneSafeMode() || !def.tintEnabled) return null;
    return randomFrom(def.tintPalette || []);
  }

  function chooseRotation(def) {
    if (isStandaloneSafeMode() || !def.allowRotation) return 0;
    const rotationStep = Number(def.rotationStep) || 0;
    if (rotationStep > 0) {
      const steps = Math.max(1, Math.round(360 / rotationStep));
      return Math.floor(Math.random() * steps) * rotationStep;
    }
    return Math.random() * 360;
  }

  function getState(scene, object, def, mystery) {
    let state = object?.[FAMILY_STATE];
    if (state) return state;

    const pool = def.sharedVariants || def.normalVariants || [];
    const initialLod = mystery ? def.fixedLods?.mystery : def.fixedLods?.normal;
    const loadable = pool.filter(variant => textureReady(scene, variant, initialLod));
    const variant = randomFrom(loadable.length ? loadable : pool);

    state = {
      variant,
      tint: chooseTint(def),
      rotation: chooseRotation(def),
      flipX: !isStandaloneSafeMode() && def.allowFlip
        ? Math.random() < (def.flipChance ?? COMET_VISUAL_SETTINGS.defaultFlipChance)
        : false,
      alpha: (def.alphaRange?.[0] ?? 1) + Math.random() * ((def.alphaRange?.[1] ?? 1) - (def.alphaRange?.[0] ?? 1))
    };

    try {
      Object.defineProperty(object, FAMILY_STATE, {
        value: state,
        enumerable: true,
        configurable: true
      });
    } catch (e) {
      // Normal encounter objects are extensible; this is only a defensive fallback.
    }
    return state;
  }

  function forceProceduralFallback(scene, args, variants) {
    const saved = [];
    for (const variant of variants || []) {
      const entry = COMET_SPRITE_ASSETS[variant];
      if (!entry) continue;
      saved.push([entry, entry.lods]);
      entry.lods = [];
    }
    try {
      return baseDrawObject.apply(scene, args);
    } finally {
      saved.forEach(([entry, lods]) => { entry.lods = lods; });
    }
  }

  function setDisplayDiameter(image, diameterPx) {
    const width = Math.max(image.width || 1, 1);
    const height = Math.max(image.height || width, 1);
    image.setDisplaySize(diameterPx, diameterPx * (height / width));
  }

  function selectLod(def, mystery, diameter) {
    if (!def.lodByDisplayedSize) return mystery ? def.fixedLods.mystery : def.fixedLods.normal;
    if (mystery) return def.fixedLods.mystery;
    return diameter <= COMET_VISUAL_SETTINGS.lodThresholds.smallMaxPx
      ? def.fixedLods.mystery
      : def.fixedLods.normal;
  }

  function addDebug(scene, container, object, def, state, lod, diameter, tint) {
    if (!COMET_VISUAL_SETTINGS.debug) return;
    const tintText = tint == null ? 'none' : `#${tint.toString(16).padStart(6, '0')}`;
    const label = scene.add.text(0, diameter / 2 + 8, [
      object.name,
      `${def.visualFamily} / ${def.collisionFamily}`,
      `${state.variant} @ ${lod}`,
      `${Math.round(diameter)}px / ${tintText}`
    ].join('\n'), {
      fontFamily: 'Menlo, Consolas, monospace',
      fontSize: '7px',
      color: '#ffffff',
      backgroundColor: '#000000cc',
      padding: { x: 3, y: 2 },
      align: 'center'
    }).setOrigin(0.5, 0);
    if (label.setResolution) label.setResolution(4);
    container.add(label);
  }

  GameScene.prototype.drawObject = function (x, y, radius, object, mystery = false, glow = false) {
    const def = getCometVisualDefinition(object);
    if (!def.fixedLods || !Array.isArray(def.sharedVariants) || !def.sharedVariants.length) {
      return baseDrawObject.call(this, x, y, radius, object, mystery, glow);
    }

    const diameter = Math.max(1, radius * 2);
    const state = getState(this, object, def, mystery);
    const lod = selectLod(def, mystery, diameter);
    const key = state.variant ? cometSpriteTextureKey(state.variant, lod) : null;

    // A real sprite should stay a real sprite at every game-calculated display size.
    // Only a genuinely missing/bad texture falls back to the legacy procedural renderer.
    if (!key || !textureReady(this, state.variant, lod)) {
      return forceProceduralFallback(this, [x, y, radius, object, mystery, glow], def.sharedVariants);
    }

    const renderKey = standaloneTextureKey(this, def, key);
    const container = this.add.container(x, y);
    const back = this.add.container(0, 0);
    const front = this.add.container(0, 0);
    const image = this.add.image(0, 0, renderKey);

    const texture = this.textures.get?.(renderKey);
    if (texture?.setFilter && typeof Phaser !== 'undefined' && Phaser.Textures?.FilterMode) {
      texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    }

    image.setAngle(state.rotation);
    image.setFlipX(state.flipX);
    image.setAlpha(state.alpha);
    if (state.tint != null) image.setTint(state.tint);
    if (image.setBlendMode && typeof Phaser !== 'undefined' && Phaser.BlendModes) {
      image.setBlendMode(Phaser.BlendModes.NORMAL);
    }
    setDisplayDiameter(image, diameter);

    container.add([back, image, front]);
    this.ui.add(container);

    const handle = {
      scene: this,
      container,
      object,
      mystery,
      visualState: { definition: def, ...state },
      variant: state.variant,
      lod,
      image,
      effectsBack: back,
      effectsFront: front,
      baseDisplayDiameterPx: diameter,
      tint: state.tint,
      fallback: false
    };

    container.cometVisual = handle;
    container.cometCollisionFamily = def.collisionFamily;
    container.setVisualDisplayDiameter = function (diameterPx) {
      handle.baseDisplayDiameterPx = Math.max(1, diameterPx);
      setDisplayDiameter(image, handle.baseDisplayDiameterPx);
      return container;
    };
    container.refreshVisualLOD = () => container;

    addDebug(this, container, object, def, state, lod, diameter, state.tint);
    return container;
  };
})();
