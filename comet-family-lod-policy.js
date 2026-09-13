// Optional family-specific fixed-LOD policy layered on top of the generic visual renderer.
// Used when a family has intentionally different hidden/revealed art resolutions.
(() => {
  const baseDrawObject = GameScene.prototype.drawObject;
  const FAMILY_STATE = Symbol('cometFamilyVisualState');

  function randomFrom(list) {
    return Array.isArray(list) && list.length ? list[Math.floor(Math.random() * list.length)] : null;
  }

  function textureExists(scene, variant, lod) {
    return !!variant && !!lod && scene.textures.exists(cometSpriteTextureKey(variant, lod));
  }

  function chooseTint(def) {
    if (!def.tintEnabled) return null;
    return randomFrom(def.tintPalette || []);
  }

  function getState(scene, object, def, mystery) {
    let state = object?.[FAMILY_STATE];
    if (state) return state;

    const pool = def.sharedVariants || def.normalVariants || [];
    const initialLod = mystery ? def.fixedLods?.mystery : def.fixedLods?.normal;
    const loadable = pool.filter(variant => textureExists(scene, variant, initialLod));
    const variant = randomFrom(loadable.length ? loadable : pool);

    state = {
      variant,
      tint: chooseTint(def),
      rotation: def.allowRotation ? Math.random() * 360 : 0,
      flipX: def.allowFlip ? Math.random() < (def.flipChance ?? COMET_VISUAL_SETTINGS.defaultFlipChance) : false,
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

    const state = getState(this, object, def, mystery);
    const lod = mystery ? def.fixedLods.mystery : def.fixedLods.normal;
    const key = state.variant ? cometSpriteTextureKey(state.variant, lod) : null;

    if (!key || !this.textures.exists(key)) {
      return forceProceduralFallback(this, [x, y, radius, object, mystery, glow], def.sharedVariants);
    }

    const container = this.add.container(x, y);
    const back = this.add.container(0, 0);
    const front = this.add.container(0, 0);
    const image = this.add.image(0, 0, key);
    const diameter = Math.max(1, radius * 2);

    const texture = this.textures.get?.(key);
    if (texture?.setFilter && typeof Phaser !== 'undefined' && Phaser.Textures?.FilterMode) {
      texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    }

    image.setAngle(state.rotation);
    image.setFlipX(state.flipX);
    image.setAlpha(state.alpha);
    if (state.tint != null) image.setTint(state.tint);
    setDisplayDiameter(image, diameter);

    if (glow) {
      const legacyGlow = this.add.graphics();
      legacyGlow.fillStyle(C.orange, 0.10).fillCircle(0, 0, radius + 11);
      back.add(legacyGlow);
    }

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
