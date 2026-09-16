// Final Collection scroll polish.
// Keep scrolling cards inside the rounded panel border and attach science-fact taps to the actual
// scrolling object sprite instead of fixed legacy row coordinates.
(() => {
  const proto = GameScene.prototype;
  const baseShowCollection = proto.showCollection;

  function destroyDirect(scene, predicate) {
    for (const child of [...(scene.ui?.list || [])]) {
      if (!predicate(child)) continue;
      try { scene.ui.remove(child, false); } catch (e) {}
      try { child.destroy(true); } catch (e) {}
    }
  }

  function scrollContent(scene) {
    return (scene.ui?.list || []).find(child =>
      Array.isArray(child?.list) && child.list.some(item => item?.cometVisual?.object?.identityId)
    ) || null;
  }

  function addFactBadge(scene, content, sprite, identityId) {
    if (!content || !sprite || !identityId || typeof scene.showScienceObject !== 'function') return;

    sprite.setSize?.(70, 70);
    sprite.setInteractive?.({ useHandCursor: true });
    sprite.on?.('pointerdown', () => scene.showScienceObject(identityId));

    const badge = scene.add.container(99, Number(sprite.y) - 27);
    const circle = scene.add.circle(0, 0, 9, C.cyan, .94);
    const label = scene.add.text(0, -.5, 'i', {
      fontFamily: FONT,
      fontSize: '10px',
      fontStyle: 'bold',
      color: '#00131f'
    }).setOrigin(.5);
    const hit = scene.add.circle(0, 0, 14, 0xffffff, .001).setInteractive({ useHandCursor: true });
    hit.on('pointerdown', () => scene.showScienceObject(identityId));
    badge.add([circle, label, hit]);
    content.add(badge);
  }

  function attachTapRouting(scene, content, sprites, viewportTop, viewportBottom) {
    if (!content || !sprites.length || typeof scene.showScienceObject !== 'function') return;
    const viewportHeight = viewportBottom - viewportTop;
    const dragSurface = (scene.ui?.list || []).find(child =>
      child?.input &&
      Math.abs((Number(child.width) || 0) - 388) < 2 &&
      Math.abs((Number(child.height) || 0) - viewportHeight) < 3 &&
      Math.abs((Number(child.y) || 0) - (viewportTop + viewportHeight / 2)) < 4
    );
    if (!dragSurface) return;

    let tapStartY = null;
    dragSurface.on('pointerdown', pointer => { tapStartY = Number(pointer.y); });
    dragSurface.on('pointerup', pointer => {
      if (!Number.isFinite(tapStartY)) return;
      const endY = Number(pointer.y);
      const moved = Math.abs(endY - tapStartY);
      tapStartY = null;
      if (moved > 9) return; // real drag: scroll only

      // content.y already includes the current scroll offset, so convert the tap directly into the
      // list's local coordinates. Cards are 94px high on a 104px row pitch, beginning at local y=8.
      const localY = endY - Number(content.y || 0);
      const index = Math.floor((localY - 8) / 104);
      if (index < 0 || index >= sprites.length) return;
      const rowTop = 8 + index * 104;
      if (localY < rowTop || localY > rowTop + 94) return;

      const identityId = sprites[index]?.cometVisual?.object?.identityId;
      if (!identityId) return;
      scene.time.delayedCall(0, () => scene.showScienceObject(identityId));
    });
  }

  proto.showCollection = function (options = {}) {
    const result = baseShowCollection.call(this, options);
    if (this.state !== 'COLLECTION') return result;

    const viewportTop = this.Y(122);
    const viewportBottom = this.Y(716);
    const insetX = 7;
    const insetY = 8;

    // The old mask reached exactly to the cyan border. Inset it so scrolling cards disappear before
    // they reach the rounded outline rather than visually sliding underneath the bottom line.
    if (this._collectionMaskGraphics) {
      this._collectionMaskGraphics.clear();
      this._collectionMaskGraphics
        .fillStyle(0xffffff, 1)
        .fillRect(
          16 + insetX,
          viewportTop + insetY,
          388 - insetX * 2,
          Math.max(1, viewportBottom - viewportTop - insetY * 2)
        );
    }

    // science-learning-v2 originally added FACT controls using the obsolete paged catalogue y-values.
    // Remove those direct overlays; badges below are children of the real scrolling content instead.
    destroyDirect(this, child => typeof child?.text === 'string' && (
      child.text === 'FACT ✓' || child.text.startsWith('TAP A COLLECTED OBJECT TO OPEN ITS SCIENCE FACT')
    ));
    destroyDirect(this, child =>
      child?.input && Math.round(Number(child.width) || 0) === 368 && Math.round(Number(child.height) || 0) === 43
    );

    const content = scrollContent(this);
    if (content) {
      const sprites = content.list
        .filter(item => item?.cometVisual?.object?.identityId)
        .sort((a, b) => Number(a.y) - Number(b.y));
      sprites.forEach(sprite => addFactBadge(this, content, sprite, sprite.cometVisual.object.identityId));
      attachTapRouting(this, content, sprites, viewportTop, viewportBottom);
    }

    // Put the instruction outside the scrolling panel, in the intentional gap above the Back button.
    this.addText(W / 2, this.Y(741), 'TAP AN OBJECT OR  i  TO OPEN ITS SCIENCE FACT', 6.2, C.cyan, {
      ox: .5,
      bold: true,
      width: 370,
      align: 'center'
    });

    return result;
  };

  window.CometCollectionScrollPolish = Object.freeze({
    borderInsetPx: 8,
    scienceTapTarget: 'scrolling-card-through-drag-surface',
    dragThresholdPx: 9,
    fixedScienceRowsRemoved: true
  });
})();
