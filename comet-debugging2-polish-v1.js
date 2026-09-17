// Debugging 2 polish pass.
// - Phase 3 successful MERGE actions never fall back to the legacy touch-only ABSORB animation.
// - Compact-object mergers converge, burst, and become one sprite; black holes accrete smaller
//   non-compact targets with an inward spiral before the target disappears.
// - Phase 3 result/reveal language uses MERGE instead of ABSORB.
// - Phase 3 trajectory colours map radial/low angular momentum to MERGE green and
//   tangential/high angular momentum to SLING orange.
// - Collision LAB uses Tier + Object selectors on each side and derives action art/labels from
//   the PLAYER (Object A), not from the target.
(() => {
  'use strict';
  if (typeof GameScene === 'undefined') return;

  const proto = GameScene.prototype;
  const baseAnimate = proto.animate;
  const baseDrawResult = proto.drawResult;
  const baseReveal = proto.reveal;
  const baseDrawPrompt = proto.drawPrompt;
  const baseUpdate = proto.update;
  const baseShowDevLab = proto.showDevLab;

  const PULSAR = Math.max(0, TIERS.findIndex(t => t.name === 'PULSAR'));
  const BLACK_HOLE = Math.max(PULSAR, TIERS.findIndex(t => t.name === 'BLACK HOLE'));
  const GALAXY = Number(window.CometPhase4?.galaxyTier ?? TIERS.findIndex(t => t.name === 'GALAXY'));
  const SUPERCLUSTER = Number(window.CometPhase4?.superclusterTier ?? TIERS.findIndex(t => t.name === 'SUPERCLUSTER'));
  const ORBITAL_UNLOCK = Math.max(0, TIERS.findIndex(t => t.name === 'DWARF PLANET'));
  const SELECT_CLASS = 'comet-dev-object-select';

  const hex = n => `#${Number(n || 0).toString(16).padStart(6, '0')}`;
  const randomFactor = logRange => Math.pow(10, Phaser.Math.FloatBetween(-logRange, logRange));

  function playerTier(scene) {
    if (scene?._devModeActive && !scene?._labSandboxRun && scene?._devObjectA) {
      return Number(scene._devObjectA.tier);
    }
    const p = Number(scene?.player?.tier);
    if (Number.isFinite(p)) return p;
    return Number(scene?.tierIndex);
  }

  function phase3Tier(tier) {
    const n = Number(tier);
    return Number.isFinite(n) && n >= PULSAR && (GALAXY < 0 || n < GALAXY);
  }

  function phase4Tier(tier) {
    const n = Number(tier);
    if (!Number.isFinite(n) || GALAXY < 0) return false;
    return n >= GALAXY && (SUPERCLUSTER < 0 || n <= SUPERCLUSTER);
  }

  function phase3Player(scene) { return phase3Tier(playerTier(scene)); }

  function compactObject(object) {
    const tier = Number(object?.tier);
    return phase3Tier(tier) || /PULSAR|BLACK HOLE/i.test(String(object?.name || ''));
  }

  function blackHoleObject(object) {
    return object?.kind === 'blackhole' || /BLACK HOLE/i.test(String(object?.name || '')) || Number(object?.tier) >= BLACK_HOLE;
  }

  function successfulPhase3Merge(scene, choice) {
    const p = scene?.pending;
    if (choice !== 'ABSORB' || !phase3Player(scene) || !p || p.success === false) return false;
    if (p.compactGravityReverse) return false;
    return !['fragment', 'catastrophic', 'setback', 'stripped'].includes(String(p.result || '').toLowerCase());
  }

  function mergedPreviewObject(scene) {
    const source = scene.player || {};
    const target = scene.other || {};
    return {
      ...source,
      realName: source.realName || source.name,
      massKg: Math.max(Number(source.massKg) || 0, 0) + Math.max(Number(target.massKg) || 0, 0),
      radiusM: Math.max(Number(source.radiusM) || 1, Number(target.radiusM) || 1),
      source: 'phase3-merge-preview'
    };
  }

  function burst(scene, x, y) {
    scene.flash?.(x, y, C.orange);
    scene.time.delayedCall(55, () => scene.flash?.(x, y, C.cyan));
    scene.time.delayedCall(105, () => scene.flash?.(x, y, C.purple));
    for (let i = 0; i < 18; i++) {
      const a = Math.PI * 2 * i / 18 + Phaser.Math.FloatBetween(-.10, .10);
      const d = Phaser.Math.Between(28, 76);
      const dot = scene.add.circle(x, y, Phaser.Math.FloatBetween(1.1, 2.7), i % 3 === 0 ? C.cyan : i % 3 === 1 ? C.orange : C.purple, .95);
      scene.ui.add(dot);
      scene.tweens.add({
        targets: dot,
        x: x + Math.cos(a) * d,
        y: y + Math.sin(a) * d,
        scale: .25,
        alpha: 0,
        duration: Phaser.Math.Between(360, 620),
        ease: 'Cubic.out',
        onComplete: () => dot.destroy()
      });
    }
  }

  function animateCompactMerge(scene, p, o, pr, or) {
    const cx = W / 2, cy = scene.Y(375);
    scene.tweens.killTweensOf(p); scene.tweens.killTweensOf(o);
    scene.tweens.add({ targets:p, x:cx, y:cy, scale:.80, angle:'+=55', duration:520, ease:'Cubic.in' });
    scene.tweens.add({ targets:o, x:cx, y:cy, scale:.80, angle:'-=55', duration:520, ease:'Cubic.in' });
    scene.time.delayedCall(485, () => burst(scene, cx, cy));
    scene.time.delayedCall(535, () => {
      p.setVisible?.(false); o.setVisible?.(false);
      const radius = clamp(Math.max(pr, or) * 1.08, 20, 62);
      const merged = scene.drawObject(cx, cy, radius, mergedPreviewObject(scene), false, true);
      merged.setScale?.(.18); merged.setAlpha?.(.15);
      scene.tweens.add({ targets:merged, scale:1.08, alpha:1, duration:370, ease:'Back.out' });
      scene.tweens.add({ targets:merged, scale:1, delay:390, duration:180, ease:'Sine.out' });
    });
    scene.time.delayedCall(1180, () => scene.resolve());
  }

  function animateBlackHoleAccretion(scene, p, o, pr, or) {
    const cx = W / 2, cy = scene.Y(375);
    const sx = Number(o.x), sy = Number(o.y);
    const dx = sx - cx, dy = sy - cy;
    const startR = Math.max(42, Math.hypot(dx, dy));
    const startAngle = Math.atan2(dy, dx);
    scene.tweens.killTweensOf(p); scene.tweens.killTweensOf(o);
    scene.tweens.add({ targets:p, x:cx, y:cy, duration:300, ease:'Sine.inOut' });

    let sparked = false;
    scene.tweens.addCounter({
      from:0, to:1, duration:980, ease:'Cubic.in',
      onUpdate: tw => {
        const t = tw.getValue();
        const r = startR * Math.pow(1 - t, 1.22);
        const a = startAngle + t * Math.PI * 5.2;
        o.x = cx + Math.cos(a) * r;
        o.y = cy + Math.sin(a) * r * .58;
        o.angle = (o.angle || 0) + 8;
        const shrink = Math.max(.035, 1 - Math.pow(t, 1.55) * .965);
        o.setScale?.(shrink);
        o.setAlpha?.(Math.max(.08, 1 - Math.pow(t, 3) * .92));
        if (!sparked && t > .76) { sparked = true; scene.flash?.(cx, cy, C.orange); }
      },
      onComplete: () => {
        o.setVisible?.(false);
        burst(scene, cx, cy);
        scene.tweens.add({ targets:p, scale:1.17, duration:150, yoyo:true, ease:'Sine.out' });
      }
    });
    scene.time.delayedCall(1180, () => scene.resolve());
  }

  proto.animate = function(choice, p, o, pr, or) {
    if (successfulPhase3Merge(this, choice)) {
      this.pending.result = 'merge';
      // Two compact remnants genuinely coalesce. A black hole swallowing a smaller ordinary object
      // reads better as accretion, so spiral that object into the event horizon instead.
      if (compactObject(this.other)) animateCompactMerge(this, p, o, pr, or);
      else if (blackHoleObject(this.player)) animateBlackHoleAccretion(this, p, o, pr, or);
      else animateCompactMerge(this, p, o, pr, or);
      return;
    }
    return baseAnimate.call(this, choice, p, o, pr, or);
  };

  proto.drawResult = function(res) {
    if (phase3Player(this) && this.pending?.choice === 'ABSORB') {
      const next = { ...res };
      if (next.survived) {
        const tierUp = /^TIER UP/i.test(String(next.title || ''));
        next.title = tierUp ? 'MERGED • TIER UP!' : 'MERGED';
        next.reason = blackHoleObject(this.player) && !compactObject(this.other)
          ? 'The smaller object spiralled inward and added its mass to your black hole.'
          : 'The two compact objects coalesced into one more massive remnant.';
      } else if (/ABSORB/i.test(String(next.title || ''))) {
        next.title = 'MERGE FAILED';
        next.reason = 'The merger trajectory was overwhelmed before you could form a stable combined remnant.';
      }
      return baseDrawResult.call(this, next);
    }
    return baseDrawResult.call(this, res);
  };

  function walk(node, fn) {
    if (!node) return;
    fn(node);
    if (Array.isArray(node.list)) node.list.forEach(child => walk(child, fn));
  }

  proto.reveal = function(choice) {
    const result = baseReveal.call(this, choice);
    if (phase3Player(this)) {
      const label = choice === 'ABSORB' ? 'MERGE' : choice === 'DEFLECT' ? 'SLING' : choice === 'AVOID' ? 'ESCAPE' : choice;
      walk(this.ui, node => {
        if (typeof node?.text === 'string' && node.text === `${choice} LOCKED IN`) node.setText(`${label} LOCKED IN`);
      });
    }
    return result;
  };

  function walk(node, fn) {
    if (!node) return;
    fn(node);
    if (Array.isArray(node.list)) node.list.forEach(child => walk(child, fn));
  }

  function captureTrajectoryLabels(scene) {
    scene._p3ColourLabels = { radial:null, tangential:null, momentum:null };
    if (!phase3Player(scene)) return;
    walk(scene.ui, node => {
      if (typeof node?.text !== 'string' || typeof node?.setColor !== 'function') return;
      const text = node.text.trim();
      if (text === 'RADIAL') scene._p3ColourLabels.radial = node;
      else if (text === 'TANGENTIAL') scene._p3ColourLabels.tangential = node;
      else if (text.startsWith('ANGULAR MOMENTUM:')) scene._p3ColourLabels.momentum = node;
    });
  }

  function paintTrajectoryLabels(scene) {
    const refs = scene?._p3ColourLabels;
    if (!refs) return;
    if (refs.radial?.active) refs.radial.setColor(hex(C.green));
    if (refs.tangential?.active) refs.tangential.setColor(hex(C.orange));
    if (refs.momentum?.active) {
      const text = String(refs.momentum.text || '');
      refs.momentum.setColor(text.includes('LOW') ? hex(C.green) : text.includes('HIGH') ? hex(C.orange) : hex(C.white));
    }
  }

  proto.drawPrompt = function(...args) {
    const result = baseDrawPrompt.apply(this, args);
    captureTrajectoryLabels(this);
    paintTrajectoryLabels(this);
    return result;
  };

  proto.update = function(...args) {
    const result = typeof baseUpdate === 'function' ? baseUpdate.apply(this, args) : undefined;
    paintTrajectoryLabels(this);
    return result;
  };

  function canvasRect(scene) {
    return scene.game?.canvas?.getBoundingClientRect?.() || { left:0, top:0, width:W, height:H };
  }

  function positionSelect(scene, node, x, y, width, height = 37) {
    if (!node) return;
    const rect = canvasRect(scene), sx = rect.width / W, sy = rect.height / H, uiShift = Number(scene.ui?.y || 0);
    node.style.left = `${Math.round(rect.left + x * sx)}px`;
    node.style.top = `${Math.round(rect.top + (y + uiShift) * sy)}px`;
    node.style.width = `${Math.round(width * sx)}px`;
    node.style.height = `${Math.max(30, Math.round(height * sy))}px`;
  }

  function styledSelect(scene, x, y, width, onChange, fontSize = 13) {
    const select = document.createElement('select');
    select.className = SELECT_CLASS;
    Object.assign(select.style, {
      position:'fixed', zIndex:'99999', background:'#071829', color:'#f7fbff', border:'1.5px solid #20d9ff',
      borderRadius:'7px', padding:'3px 5px', fontFamily:"-apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif",
      fontSize:`${fontSize}px`, fontWeight:'700', outline:'none', textOverflow:'ellipsis'
    });
    select.addEventListener('change', () => onChange(select.value));
    document.body.appendChild(select);
    positionSelect(scene, select, x, y, width, 37);
    return select;
  }

  function shortTierName(name) {
    return String(name || '')
      .replace('YELLOW DWARF STAR', 'YELLOW DWARF')
      .replace('BLUE GIANT STAR', 'BLUE GIANT')
      .replace('RED HYPERGIANT STAR', 'RED HYPERGIANT')
      .replace('SUPER MASSIVE BLACK HOLE', 'SMBH');
  }

  function fillTierSelect(select, value) {
    select.innerHTML = '';
    TIERS.forEach((tier, index) => {
      const option = document.createElement('option');
      option.value = String(index);
      option.textContent = shortTierName(tier.name);
      select.appendChild(option);
    });
    select.value = String(clamp(Number(value) || 0, 0, TIERS.length - 1));
  }

  function loadedVariant(variant) {
    const entry = typeof COMET_SPRITE_ASSETS !== 'undefined' ? COMET_SPRITE_ASSETS[variant] : null;
    return !!(entry && Array.isArray(entry.lods) && entry.lods.length);
  }

  function objectChoicesForTier(tierIndex) {
    const tier = TIERS[tierIndex];
    if (!tier) return [];
    const choices = [];
    const def = typeof getCometVisualDefinition === 'function'
      ? getCometVisualDefinition({ name:tier.name, tier:tierIndex })
      : null;
    const generic = [...new Set((def?.normalVariants || []).filter(loadedVariant))];
    generic.forEach((variant, i) => choices.push({ key:`variant:${variant}`, label:`GENERIC ${i + 1}`, variant }));
    if (!generic.length) choices.push({ key:'generic', label:'GENERIC' });

    if (typeof COMET_NAMED_IDENTITIES !== 'undefined') {
      COMET_NAMED_IDENTITIES
        .filter(identity => Array.isArray(identity.gameplayTiers) && identity.gameplayTiers.includes(tier.name))
        .forEach(identity => choices.push({ key:`identity:${identity.id}`, label:identity.name, identity }));
    }
    return choices;
  }

  function fillObjectSelect(select, tierIndex, preferredKey) {
    const choices = objectChoicesForTier(tierIndex);
    select.innerHTML = '';
    choices.forEach(choice => {
      const option = document.createElement('option');
      option.value = choice.key;
      option.textContent = choice.label;
      select.appendChild(option);
    });
    const keys = new Set(choices.map(c => c.key));
    const key = keys.has(preferredKey) ? preferredKey : choices[0]?.key || 'generic';
    select.value = key;
    return key;
  }

  function labObject(tierIndex, key) {
    tierIndex = clamp(Number(tierIndex) || 0, 0, TIERS.length - 1);
    const tier = TIERS[tierIndex];
    const choices = objectChoicesForTier(tierIndex);
    const choice = choices.find(c => c.key === key) || choices[0] || { key:'generic', label:'GENERIC' };
    const identity = choice.identity || null;
    const object = {
      name:tier.name,
      realName:identity?.name || (choice.variant ? `${choice.label} • ${shortTierName(tier.name)}` : `GENERIC ${tier.name}`),
      tier:tierIndex,
      radiusM:tier.r * randomFactor(.025),
      massKg:tier.m * randomFactor(.04),
      speedMS:tier.v * Phaser.Math.FloatBetween(.96, 1.04),
      kind:tier.kind, color:tier.color, solid:tier.solid, hint:tier.hint, gap:0,
      labObjectKey:choice.key
    };
    if (identity) {
      object.identityId = identity.id;
      object.namedSpriteBase = identity.spriteVariant;
      object.scienceClass = identity.scienceClass;
      object.identityStatus = identity.status;
    } else if (choice.variant) {
      object.identityId = `lab:${choice.variant}`;
      object.namedSpriteBase = choice.variant;
      object.scienceClass = 'LAB GENERIC VARIANT';
      object.identityStatus = 'lab';
    }
    return object;
  }

  function existingObjectKey(object) {
    if (object?.identityId && !String(object.identityId).startsWith('lab:')) return `identity:${object.identityId}`;
    if (object?.namedSpriteBase) return `variant:${object.namedSpriteBase}`;
    return object?.labObjectKey || null;
  }

  function baseCompatibleKey(object) {
    if (object?.identityId && !String(object.identityId).startsWith('lab:')) return `identity:${object.identityId}:${object.tier}`;
    return `tier:${object?.tier || 0}`;
  }

  const ACTION_PRESENTATION = Object.freeze({
    normal: {
      labels:{ABSORB:'ABSORB', DEFLECT:'DEFLECT', AVOID:'AVOID'},
      icons:{ABSORB:'action-absorb', DEFLECT:'action-deflect', AVOID:'action-avoid'}
    },
    phase3: {
      labels:{ABSORB:'MERGE', DEFLECT:'SLING', AVOID:'ESCAPE'},
      icons:{ABSORB:'phase3-icon-merge-final', DEFLECT:'phase3-icon-sling-final', AVOID:'phase3-icon-escape-final'}
    },
    phase4: {
      labels:{ABSORB:'CAPTURE', DEFLECT:'GRAZE', AVOID:'AVOID'},
      icons:{ABSORB:'action-absorb-phase4', DEFLECT:'action-deflect-phase4', AVOID:'action-avoid-phase4'}
    }
  });

  function actionPresentationForTier(tier) {
    return phase4Tier(tier) ? ACTION_PRESENTATION.phase4 : phase3Tier(tier) ? ACTION_PRESENTATION.phase3 : ACTION_PRESENTATION.normal;
  }

  function findActionContainers(scene) {
    const expectedY = scene.Y(642);
    return (scene.ui?.list || []).filter(node => Array.isArray(node?.list) &&
      Math.abs(Number(node.y) - expectedY) < 5 && [73, 210, 347].some(x => Math.abs(Number(node.x) - x) < 5));
  }

  function applyLabActionPresentation(scene) {
    if (!scene?._devModeActive || scene?._labSandboxRun || !scene?._devObjectA) return;
    const presentation = actionPresentationForTier(scene._devObjectA.tier);
    const canonicalByX = new Map([[73,'ABSORB'],[210,'DEFLECT'],[347,'AVOID']]);
    findActionContainers(scene).forEach(container => {
      const canonical = [...canonicalByX.entries()].sort((a,b)=>Math.abs(container.x-a[0])-Math.abs(container.x-b[0]))[0]?.[1];
      if (!canonical) return;
      const allLabels = ['ABSORB','DEFLECT','AVOID','MERGE','SLING','ESCAPE','CAPTURE','GRAZE'];
      const text = (container.list || []).find(child => typeof child?.setText === 'function' && allLabels.includes(String(child.text || '').trim()));
      const icon = (container.list || []).find(child => typeof child?.setTexture === 'function' && child?.texture);
      if (text) text.setText(presentation.labels[canonical]);
      const key = presentation.icons[canonical];
      if (icon && key && scene.textures?.exists?.(key)) {
        icon.setTexture(key); icon.setDisplaySize?.(54,54); icon.clearTint?.(); icon.setAlpha?.(1);
      }
    });
  }

  function removeBaseLabSelectors(scene) {
    if (scene._devSelectResizeHandler) {
      window.removeEventListener('resize', scene._devSelectResizeHandler);
      window.removeEventListener('orientationchange', scene._devSelectResizeHandler);
      scene._devSelectResizeHandler = null;
    }
    Array.from(document.querySelectorAll(`.${SELECT_CLASS}`)).forEach(node => node.remove());
    scene._devSelectA = null; scene._devSelectB = null;
  }

  function installTwoStageSelectors(scene) {
    if (scene.state !== 'DEV_LAB' || !scene._devModeActive || scene._labSandboxRun) return;
    const initialA = scene._devObjectA || { tier:0 };
    const initialB = scene._devObjectB || { tier:Math.min(1, TIERS.length - 1) };
    removeBaseLabSelectors(scene);

    scene._labTierA = clamp(Number(scene._labTierA ?? initialA.tier) || 0, 0, TIERS.length - 1);
    scene._labTierB = clamp(Number(scene._labTierB ?? initialB.tier) || 0, 0, TIERS.length - 1);
    scene._labObjectKeyA = scene._labObjectKeyA || existingObjectKey(initialA);
    scene._labObjectKeyB = scene._labObjectKeyB || existingObjectKey(initialB);

    const y = scene.Y(176);
    const tierA = styledSelect(scene,22,y,82,()=>{},12);
    const objectA = styledSelect(scene,108,y,94,()=>{},13);
    const tierB = styledSelect(scene,218,y,82,()=>{},12);
    const objectB = styledSelect(scene,304,y,94,()=>{},13);
    fillTierSelect(tierA, scene._labTierA); fillTierSelect(tierB, scene._labTierB);
    scene._labObjectKeyA = fillObjectSelect(objectA,scene._labTierA,scene._labObjectKeyA);
    scene._labObjectKeyB = fillObjectSelect(objectB,scene._labTierB,scene._labObjectKeyB);

    const refreshSide = side => {
      const isA = side === 'A';
      const tierSelect = isA ? tierA : tierB;
      const objectSelect = isA ? objectA : objectB;
      const tierKey = isA ? '_labTierA' : '_labTierB';
      const objectKey = isA ? '_labObjectKeyA' : '_labObjectKeyB';
      const objectSlot = isA ? '_devObjectA' : '_devObjectB';
      const selectedSlot = isA ? '_devSelectedA' : '_devSelectedB';
      scene[tierKey] = clamp(Number(tierSelect.value) || 0, 0, TIERS.length - 1);
      scene[objectKey] = fillObjectSelect(objectSelect,scene[tierKey],scene[objectKey]);
      scene[objectSlot] = labObject(scene[tierKey],scene[objectKey]);
      scene[selectedSlot] = baseCompatibleKey(scene[objectSlot]);
      if (scene[tierKey] < ORBITAL_UNLOCK) {
        if (isA) scene._labOrbitalsA = 0; else scene._labOrbitalsB = 0;
      }
      scene._labRefreshPreview?.();
      applyLabActionPresentation(scene);
    };

    tierA.onchange = () => { scene._labObjectKeyA = null; refreshSide('A'); };
    tierB.onchange = () => { scene._labObjectKeyB = null; refreshSide('B'); };
    objectA.onchange = () => {
      scene._labObjectKeyA = objectA.value;
      scene._devObjectA = labObject(scene._labTierA,scene._labObjectKeyA);
      scene._devSelectedA = baseCompatibleKey(scene._devObjectA);
      scene._labRefreshPreview?.(); applyLabActionPresentation(scene);
    };
    objectB.onchange = () => {
      scene._labObjectKeyB = objectB.value;
      scene._devObjectB = labObject(scene._labTierB,scene._labObjectKeyB);
      scene._devSelectedB = baseCompatibleKey(scene._devObjectB);
      scene._labRefreshPreview?.(); applyLabActionPresentation(scene);
    };

    scene._devObjectA = labObject(scene._labTierA,scene._labObjectKeyA);
    scene._devObjectB = labObject(scene._labTierB,scene._labObjectKeyB);
    scene._devSelectedA = baseCompatibleKey(scene._devObjectA);
    scene._devSelectedB = baseCompatibleKey(scene._devObjectB);
    if (scene._labTierA < ORBITAL_UNLOCK) scene._labOrbitalsA = 0;
    if (scene._labTierB < ORBITAL_UNLOCK) scene._labOrbitalsB = 0;
    scene._labRefreshPreview?.();
    applyLabActionPresentation(scene);

    scene._devSelectTierA = tierA; scene._devSelectObjectA = objectA;
    scene._devSelectTierB = tierB; scene._devSelectObjectB = objectB;
    const reposition = () => {
      positionSelect(scene,tierA,22,y,82); positionSelect(scene,objectA,108,y,94);
      positionSelect(scene,tierB,218,y,82); positionSelect(scene,objectB,304,y,94);
    };
    scene._devSelectResizeHandler = reposition;
    window.addEventListener('resize', reposition, {passive:true});
    window.addEventListener('orientationchange', reposition, {passive:true});
  }

  proto.showDevLab = function(...args) {
    const result = baseShowDevLab.apply(this, args);
    installTwoStageSelectors(this);
    return result;
  };

  window.CometDebugging2Polish = Object.freeze({
    enabled:true,
    phase3MergeAnimation:'coalesce-burst-single-sprite',
    blackHoleAccretion:'spiral-inward',
    phase3Language:'merge',
    trajectoryColours:{radial:'merge-green',tangential:'sling-orange'},
    labSelectors:'tier-then-object',
    labActionsFromPlayer:true
  });
})();