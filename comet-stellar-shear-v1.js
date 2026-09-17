// Stellar+ survivable fragmentation becomes GRAVITY SHEARING.
// Below Yellow Dwarf Star, the existing physical FRAGMENTED collision remains unchanged.
// From Yellow Dwarf Star upward, a failed ABSORB that survives is visualised as a close gravity pass:
// stretch -> material stripped toward the other body -> smaller remnant curves away.
(() => {
  const proto = GameScene.prototype;
  const baseAnimate = proto.animate;
  const baseDrawResult = proto.drawResult;
  const baseShortOutcomeReason = proto.shortOutcomeReason;

  const STELLAR_TIER = Math.max(0, TIERS.findIndex(t => t.name === 'YELLOW DWARF STAR'));
  const PULSAR_TIER = Math.max(STELLAR_TIER, TIERS.findIndex(t => t.name === 'PULSAR'));

  function stellarPlayer(scene) {
    const tier = Number(scene?.player?.tier ?? scene?.tierIndex);
    return Number.isFinite(tier) && tier >= STELLAR_TIER;
  }

  function compactEncounter(scene) {
    const playerTier = Number(scene?.player?.tier ?? -1);
    const otherTier = Number(scene?.other?.tier ?? -1);
    return playerTier >= PULSAR_TIER || otherTier >= PULSAR_TIER ||
      scene?.player?.kind === 'pulsar' || scene?.player?.kind === 'blackhole' ||
      scene?.other?.kind === 'pulsar' || scene?.other?.kind === 'blackhole';
  }

  function isShearOutcome(scene, choice) {
    return choice === 'ABSORB' && stellarPlayer(scene) && scene?.pending?.result === 'fragment' &&
      !scene.pending?.highTierGlance;
  }

  function renderedSnapshot(object, container) {
    if (!object) return null;
    const snapshot = { ...object };
    const handle = container?.cometVisual;
    const image = handle?.image;
    if (handle?.variant) snapshot.cometVisualVariant = handle.variant;
    if (image) {
      const angle = Number(image.angle);
      if (Number.isFinite(angle)) snapshot.cometVisualRotation = angle;
      snapshot.cometVisualFlipX = !!image.flipX;
      snapshot.cometVisualAlpha = Number.isFinite(Number(image.alpha)) ? Number(image.alpha) : 1;
      if (Object.prototype.hasOwnProperty.call(handle, 'tint')) snapshot.cometVisualTint = handle.tint ?? null;
    }
    return snapshot;
  }

  function freezeComparison(scene, p, o) {
    scene._resultComparisonPlayer = renderedSnapshot(scene.player, p);
    scene._resultComparisonOther = renderedSnapshot(scene.other, o);
  }

  function setVisualScale(container, sx, sy) {
    if (!container) return;
    container.setScale?.(sx, sy);
  }

  function strippedMaterial(scene, fromX, fromY, targetX, targetY, compact) {
    const color = compact ? C.purple : C.orange;
    const count = compact ? 14 : 11;

    for (let i = 0; i < count; i++) {
      const startX = fromX + Phaser.Math.Between(-8, 8);
      const startY = fromY + Phaser.Math.Between(-8, 8);
      const chip = scene.add.rectangle(
        startX, startY,
        Phaser.Math.Between(2, 4), Phaser.Math.Between(2, 5),
        i % 4 === 0 ? C.white : (i % 3 === 0 ? C.cyan : color),
        Phaser.Math.FloatBetween(.68, .96)
      );
      scene.ui.add(chip);

      const midX = (startX + targetX) / 2 + Phaser.Math.Between(-14, 14);
      const midY = (startY + targetY) / 2 + Phaser.Math.Between(-20, 20);
      const delay = i * 24;
      scene.tweens.addCounter({
        from:0,to:1,delay,duration:Phaser.Math.Between(380,610),ease:'Cubic.in',
        onUpdate:tween=>{
          const t=tween.getValue(),u=1-t;
          chip.x=u*u*startX + 2*u*t*midX + t*t*targetX;
          chip.y=u*u*startY + 2*u*t*midY + t*t*targetY;
          chip.alpha=Math.max(0,1-t*.95);
          chip.scale=.95-.7*t;
        },
        onComplete:()=>chip.destroy()
      });
    }
  }

  function shearPulse(scene, x, y, compact) {
    const color = compact ? C.purple : C.orange;
    const ring = scene.add.circle(x, y, 12, color, .03);
    ring.setStrokeStyle(2, color, .72);
    const flash = scene.add.circle(x, y, 4.5, C.white, .72);
    scene.ui.add([ring, flash]);
    scene.tweens.add({targets:ring,scale:3.4,alpha:0,duration:470,ease:'Cubic.out',onComplete:()=>ring.destroy()});
    scene.tweens.add({targets:flash,scale:2.2,alpha:0,duration:210,ease:'Quad.out',onComplete:()=>flash.destroy()});
  }

  function animateShear(scene, p, o, pr, or) {
    freezeComparison(scene, p, o);
    scene.tweens.killTweensOf(p);
    scene.tweens.killTweensOf(o);

    const compact = compactEncounter(scene);
    const sx = p.x, sy = p.y;
    const tx = o.x, ty = o.y;
    const side = Math.random() < .5 ? -1 : 1;
    const playerDiameter = Math.max(4, Number(pr || 24) * 2);
    const targetDiameter = Math.max(4, Number(or || 24) * 2);

    // Closest approach stays just outside the visible target rather than producing a head-on hit.
    const clearance = Math.max(18, targetDiameter * .42 + playerDiameter * .18);
    const grazeX = tx - Math.max(10, clearance * .64);
    const grazeY = ty + side * Math.max(12, clearance * .48);
    const endX = W + 54;
    const endY = Math.max(scene.Y(155), Math.min(scene.Y(575), ty + side * 150));

    // The gravity source barely shifts; the player is the body being distorted and redirected.
    scene.tweens.add({
      targets:o,
      x:tx + 2,
      y:ty - side * 2,
      duration:620,
      yoyo:true,
      ease:'Sine.inOut'
    });

    const c1x = sx + (grazeX - sx) * .58;
    const c1y = sy + side * 34;
    const c2x = grazeX - 24;
    const c2y = grazeY + side * 10;
    let stripped = false;

    scene.tweens.addCounter({
      from:0,to:1,duration:1240,ease:'Sine.inOut',
      onUpdate:tween=>{
        const t=tween.getValue();
        if (t <= .56) {
          const q=t/.56,u=1-q;
          p.x=u*u*u*sx + 3*u*u*q*c1x + 3*u*q*q*c2x + q*q*q*grazeX;
          p.y=u*u*u*sy + 3*u*u*q*c1y + 3*u*q*q*c2y + q*q*q*grazeY;
          // Tidal stretch peaks at closest approach.
          const stretch=Math.sin(Math.PI*q)*.16;
          setVisualScale(p,1+stretch,1-stretch*.72);
        } else {
          const q=(t-.56)/.44,u=1-q;
          const ec1x=grazeX+54, ec1y=grazeY+side*36;
          const ec2x=endX-92, ec2y=endY-side*30;
          p.x=u*u*u*grazeX + 3*u*u*q*ec1x + 3*u*q*q*ec2x + q*q*q*endX;
          p.y=u*u*u*grazeY + 3*u*u*q*ec1y + 3*u*q*q*ec2y + q*q*q*endY;
          // Remnant ends visibly smaller after material loss.
          const remnant=.84 + .16*(1-q);
          setVisualScale(p,remnant,remnant);
        }

        if (!stripped && t >= .48) {
          stripped=true;
          shearPulse(scene,p.x,p.y,compact);
          strippedMaterial(scene,p.x,p.y,tx,ty,compact);
        }
      }
    });

    scene.time.delayedCall(1310,()=>scene.resolve());
  }

  proto.animate = function(choice,p,o,pr,or) {
    if (isShearOutcome(this,choice)) return animateShear(this,p,o,pr,or);
    return baseAnimate.call(this,choice,p,o,pr,or);
  };

  function shearReason(scene) {
    if (compactEncounter(scene)) return 'Extreme tidal forces stripped material away, but you escaped.';
    const targetMass = Number(scene?.other?.massKg) || 0;
    const playerMass = Number(scene?.player?.massKg) || 0;
    if (targetMass > playerMass) return 'The target’s gravity stripped material away during the close pass, but you escaped.';
    return 'The close gravitational encounter sheared material away, but you escaped.';
  }

  function relabelProbabilityText(scene) {
    const visit = node => {
      if (!node) return;
      if (typeof node.text === 'string' && /\bFRAG\s+\d+%/.test(node.text)) {
        node.setText?.(node.text.replace(/\bFRAG(?=\s+\d+%)/g,'SHEAR'));
      }
      if (Array.isArray(node.list)) node.list.forEach(visit);
    };
    (scene.ui?.list || []).forEach(visit);
  }

  proto.drawResult = function(result) {
    const shear = stellarPlayer(this) && this.pending?.choice === 'ABSORB' &&
      this.pending?.result === 'fragment' && !this.pending?.highTierGlance;

    let finalResult = result;
    if (shear && result && typeof result === 'object') {
      finalResult = {
        ...result,
        title: compactEncounter(this) ? 'TIDALLY SHEARED' : 'SHEARED',
        reason: shearReason(this),
        color: C.orange
      };
    }

    const value = baseDrawResult.call(this,finalResult);
    if (shear) relabelProbabilityText(this);
    return value;
  };

  proto.shortOutcomeReason = function(pending,result) {
    if (stellarPlayer(this) && pending?.choice === 'ABSORB' && pending?.result === 'fragment' && !pending?.highTierGlance) {
      return shearReason(this);
    }
    return typeof baseShortOutcomeReason === 'function'
      ? baseShortOutcomeReason.call(this,pending,result)
      : '';
  };

  window.CometStellarShear = Object.freeze({
    enabled:true,
    startsAt:'YELLOW DWARF STAR',
    standardLabel:'SHEARED',
    compactLabel:'TIDALLY SHEARED',
    probabilityLabel:'SHEAR',
    animation:'gravity-graze-stretch-strip-escape',
    rockyFragmentationPreserved:true,
    labCompatible:true
  });
})();
