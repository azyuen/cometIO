// Final Collection scroll polish.
// Keep scrolling cards comfortably inside the rounded panel border, with matching top/bottom
// breathing room, and attach science-fact taps to the actual scrolling object cards.
(() => {
  const proto = GameScene.prototype;
  const baseShowCollection = proto.showCollection;

  const ROW_HEIGHT = 104;
  const CARD_HEIGHT = 94;
  const CARD_TOP_PADDING = 14;
  const CARD_BOTTOM_PADDING = 14;
  const ORIGINAL_CARD_TOP = 8;
  const CONTENT_SHIFT = CARD_TOP_PADDING - ORIGINAL_CARD_TOP;

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

  function shiftContentForSymmetricPadding(content) {
    if (!content || content._collectionPaddingShifted) return;
    content._collectionPaddingShifted = true;
    for (const child of content.list || []) {
      child.y = Number(child.y || 0) + CONTENT_SHIFT;
    }
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

  function findDragSurface(scene, viewportTop, viewportBottom) {
    const viewportHeight = viewportBottom - viewportTop;
    return (scene.ui?.list || []).find(child =>
      child?.input &&
      Math.abs((Number(child.width) || 0) - 388) < 2 &&
      Math.abs((Number(child.height) || 0) - viewportHeight) < 3 &&
      Math.abs((Number(child.y) || 0) - (viewportTop + viewportHeight / 2)) < 4
    ) || null;
  }

  function findScrollBar(scene, content) {
    const list = scene.ui?.list || [];
    const index = list.indexOf(content);
    if (index < 0) return null;
    const candidate = list[index + 1];
    return candidate && typeof candidate.clear === 'function' && !candidate.input ? candidate : null;
  }

  function installSymmetricScroller(scene, content, sprites, viewportTop, viewportBottom) {
    if (!content || !sprites.length) return;

    const viewportHeight = viewportBottom - viewportTop;
    const contentHeight = CARD_TOP_PADDING + (sprites.length - 1) * ROW_HEIGHT + CARD_HEIGHT + CARD_BOTTOM_PADDING;
    const maxScroll = Math.max(0, contentHeight - viewportHeight);
    const dragSurface = findDragSurface(scene, viewportTop, viewportBottom);
    const scrollBar = findScrollBar(scene, content);
    if (!dragSurface) return;

    // Replace the original scroll closures so the newly enlarged top/bottom padding is included in
    // the scroll range. This guarantees the first and last visible cards both sit 14px from the panel.
    dragSurface.removeAllListeners('pointerdown');
    dragSurface.removeAllListeners('pointermove');
    dragSurface.removeAllListeners('pointerup');
    dragSurface.removeAllListeners('pointerout');

    if (scene._collectionWheelHandler && scene.input) {
      scene.input.off('wheel', scene._collectionWheelHandler);
      scene._collectionWheelHandler = null;
    }

    let scrollOffset = 0;
    let dragStartY = 0;
    let dragStartOffset = 0;
    let dragging = false;
    let tapStartY = null;

    const drawBar = () => {
      if (!scrollBar) return;
      scrollBar.clear();
      if (maxScroll <= 0) return;
      const trackX = 397;
      const trackY = viewportTop + 12;
      const trackH = viewportHeight - 24;
      const thumbH = Math.max(44, trackH * (viewportHeight / contentHeight));
      const thumbY = trackY + (trackH - thumbH) * (scrollOffset / maxScroll);
      scrollBar.fillStyle(C.cyan, .16).fillRoundedRect(trackX, trackY, 3, trackH, 2);
      scrollBar.fillStyle(C.cyan, .7).fillRoundedRect(trackX, thumbY, 3, thumbH, 2);
    };

    const setScroll = next => {
      scrollOffset = Math.max(0, Math.min(maxScroll, Number(next) || 0));
      content.y = viewportTop - scrollOffset;
      drawBar();
    };

    dragSurface.on('pointerdown', pointer => {
      dragging = true;
      tapStartY = Number(pointer.y);
      dragStartY = Number(pointer.y);
      dragStartOffset = scrollOffset;
    });

    dragSurface.on('pointermove', pointer => {
      if (!dragging || !pointer.isDown) return;
      setScroll(dragStartOffset - (Number(pointer.y) - dragStartY));
    });

    dragSurface.on('pointerup', pointer => {
      const endY = Number(pointer.y);
      const moved = Number.isFinite(tapStartY) ? Math.abs(endY - tapStartY) : Infinity;
      dragging = false;
      tapStartY = null;
      if (moved > 9 || typeof scene.showScienceObject !== 'function') return;

      const localY = endY - Number(content.y || 0);
      const index = Math.floor((localY - CARD_TOP_PADDING) / ROW_HEIGHT);
      if (index < 0 || index >= sprites.length) return;
      const rowTop = CARD_TOP_PADDING + index * ROW_HEIGHT;
      if (localY < rowTop || localY > rowTop + CARD_HEIGHT) return;

      const identityId = sprites[index]?.cometVisual?.object?.identityId;
      if (identityId) scene.time.delayedCall(0, () => scene.showScienceObject(identityId));
    });

    dragSurface.on('pointerout', pointer => {
      if (!pointer.isDown) {
        dragging = false;
        tapStartY = null;
      }
    });

    const onWheel = (pointer, gameObjects, deltaX, deltaY) => {
      if (pointer.y < viewportTop || pointer.y > viewportBottom) return;
      setScroll(scrollOffset + deltaY * .7);
    };
    scene.input.on('wheel', onWheel);
    scene._collectionWheelHandler = onWheel;
    setScroll(0);
  }

  proto.showCollection = function (options = {}) {
    const result = baseShowCollection.call(this, options);
    if (this.state !== 'COLLECTION') return result;

    const viewportTop = this.Y(122);
    const viewportBottom = this.Y(716);
    const insetX = 9;
    const insetY = 12;

    // Slightly larger inset than before. The actual card layout uses 14px top and bottom padding,
    // while the mask ends 12px inside the panel so neither edge is ever clipped by the cyan border.
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

    // Remove science-learning-v2's obsolete fixed-position controls. The final indicators below
    // belong to the real scrolling cards, so they move and clip with the object they describe.
    destroyDirect(this, child => typeof child?.text === 'string' && (
      child.text === 'FACT ✓' || child.text.startsWith('TAP A COLLECTED OBJECT TO OPEN ITS SCIENCE FACT')
    ));
    destroyDirect(this, child =>
      child?.input && Math.round(Number(child.width) || 0) === 368 && Math.round(Number(child.height) || 0) === 43
    );

    const content = scrollContent(this);
    if (content) {
      shiftContentForSymmetricPadding(content);
      const sprites = content.list
        .filter(item => item?.cometVisual?.object?.identityId)
        .sort((a, b) => Number(a.y) - Number(b.y));
      sprites.forEach(sprite => addFactBadge(this, content, sprite, sprite.cometVisual.object.identityId));
      installSymmetricScroller(this, content, sprites, viewportTop, viewportBottom);
    }

    // Move the instruction closer to the Collection panel and farther from the Back button.
    this.addText(W / 2, this.Y(729), 'TAP AN OBJECT OR  i  TO OPEN ITS SCIENCE FACT', 6.2, C.cyan, {
      ox: .5,
      bold: true,
      width: 370,
      align: 'center'
    });

    return result;
  };

  window.CometCollectionScrollPolish = Object.freeze({
    cardTopPaddingPx: CARD_TOP_PADDING,
    cardBottomPaddingPx: CARD_BOTTOM_PADDING,
    maskInsetPx: 12,
    scienceHintY: 729,
    scienceTapTarget: 'scrolling-card-through-drag-surface',
    dragThresholdPx: 9,
    fixedScienceRowsRemoved: true
  });
})();
