// Home LOAD SAVE reliability fix.
// Replaces the legacy Home load button after Home renders. The replacement is added last/on top,
// calls the final protected loader directly, and shows the checkpoint description inside the button.
(() => {
  const baseShowHome = GameScene.prototype.showHome;

  function textOf(child) {
    return typeof child?.text === 'string' ? child.text : '';
  }

  function findButtonContainer(scene, label) {
    for (const child of scene.ui?.list || []) {
      if (!Array.isArray(child?.list)) continue;
      if (child.list.some(grand => textOf(grand) === label)) return child;
    }
    return null;
  }

  function removeStandaloneCheckpointText(scene) {
    for (const child of [...(scene.ui?.list || [])]) {
      const text = textOf(child);
      if (text.startsWith('CHECKPOINT •') || text === 'NO MANUAL CHECKPOINT') {
        try { child.destroy(); } catch (e) {}
      }
    }
  }

  function checkpointSubtitle() {
    const info = window.CometCheckpoint?.describe?.();
    if (!info) return 'NO MANUAL CHECKPOINT';
    const tier = TIERS[info.tierIndex]?.name || `TIER ${Number(info.tierIndex) + 1}`;
    const round = Math.max(1, Math.floor(Number(info.encounters) || 0) + 1);
    const target = info.target ? ` • VS ${String(info.target).toUpperCase()}` : '';
    return `${tier} • R${round}${target}`;
  }

  function directProtectedLoad(scene) {
    // Clear any stale LAB flags before entering the protected load function. This Home button is
    // explicitly the player's real-run recovery path, never a sandbox action.
    scene._labSandboxRun = false;
    scene._labSandboxPhase = null;
    scene._devModeActive = false;
    scene._devPhase4Test = false;
    scene._labExperimentRunning = false;
    scene._labExperimentResult = false;

    // Use the same direct protected-checkpoint restore API as the game-over recovery button.
    // This avoids later gameplay/Phase-4 load wrappers changing the restore behaviour.
    return window.CometCheckpoint?.loadInto?.(scene) === true;
  }

  function drawLoadButton(scene, x, y, width = 326, height = 58) {
    const container = scene.add.container(x, y);
    const g = scene.add.graphics();
    g.fillStyle(C.blue, .15).fillRoundedRect(-width / 2, -height / 2, width, height, 9);
    g.lineStyle(2, C.blue, .95).strokeRoundedRect(-width / 2, -height / 2, width, height, 9);

    const title = scene.add.text(0, -10, 'LOAD SAVE', {
      fontFamily: FONT,
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#ffffff',
      align: 'center'
    }).setOrigin(.5);

    const hasSave = !!window.CometCheckpoint?.exists?.();
    const subtitle = scene.add.text(0, 13, checkpointSubtitle(), {
      fontFamily: FONT,
      fontSize: '7.2px',
      fontStyle: 'bold',
      color: `#${(hasSave ? C.green : C.muted).toString(16).padStart(6, '0')}`,
      align: 'center',
      wordWrap: { width: width - 24, useAdvancedWrap: true }
    }).setOrigin(.5);

    [title, subtitle].forEach(t => {
      if (t.setResolution) t.setResolution(Math.min(window.devicePixelRatio || 1, 3));
    });

    const hit = scene.add.rectangle(0, 0, width, height, 0xffffff, .001)
      .setInteractive({ useHandCursor: true });

    let pressed = false;
    hit.on('pointerdown', () => {
      if (pressed) return;
      pressed = true;
      container.setScale(.985);
      scene.time.delayedCall(55, () => {
        if (container.active) container.setScale(1);
        directProtectedLoad(scene);
      });
    });

    container.add([g, title, subtitle, hit]);
    scene.ui.add(container); // Added last so its hit area sits above all legacy Home controls.
    return container;
  }

  GameScene.prototype.showHome = function () {
    const result = baseShowHome.call(this);
    if (this.state !== 'HOME') return result;

    removeStandaloneCheckpointText(this);

    // Locate the legacy Home button so the replacement occupies exactly the same slot regardless
    // of whether RETURN TO GAME is also visible above it.
    const oldLoad = findButtonContainer(this, 'LOAD SAVE');
    const x = Number(oldLoad?.x) || W / 2;
    const y = Number(oldLoad?.y) || (this.runActive && this.player && this.other ? 699 : 632);
    if (oldLoad) {
      try { oldLoad.destroy(true); } catch (e) {}
    }

    drawLoadButton(this, x, y);
    return result;
  };

  window.CometHomeLoadFix = Object.freeze({ enabled: true });
})();
