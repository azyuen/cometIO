// DEV password gate refinement.
// Replaces the old four-digit keypad with a masked text password so the access code can be alphabetic.
(() => {
  const DEV_PASSWORD = 'uniatom';
  const DOM_CLASS = 'comet-dev-password-ui';
  const baseClearUI = GameScene.prototype.clearUI;

  function removePasswordDom() {
    document.querySelectorAll(`.${DOM_CLASS}`).forEach(node => node.remove());
  }

  function canvasRect(scene) {
    return scene?.game?.canvas?.getBoundingClientRect?.() || { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
  }

  function place(scene, element, gameX, gameY, gameWidth, gameHeight) {
    const rect = canvasRect(scene);
    const sx = rect.width / W;
    const sy = rect.height / H;
    const uiShift = Number(scene.ui?.y || 0);
    element.style.left = `${Math.round(rect.left + gameX * sx)}px`;
    element.style.top = `${Math.round(rect.top + (gameY + uiShift) * sy)}px`;
    element.style.width = `${Math.round(gameWidth * sx)}px`;
    element.style.height = `${Math.max(42, Math.round(gameHeight * sy))}px`;
  }

  GameScene.prototype.clearUI = function () {
    removePasswordDom();
    if (this._devPasswordResizeHandler) {
      window.removeEventListener('resize', this._devPasswordResizeHandler);
      window.removeEventListener('orientationchange', this._devPasswordResizeHandler);
      this._devPasswordResizeHandler = null;
    }
    return baseClearUI.call(this);
  };

  GameScene.prototype.showDevPinGate = function () {
    this.clearUI();
    this.state = 'DEV_PASSWORD';

    const bg = this.add.graphics();
    bg.fillStyle(C.bg, .90).fillRect(0, SAFE_TOP, W, H - SAFE_TOP);
    this.ui.add(bg);

    this.addText(W / 2, this.Y(112), 'DEV ACCESS', 20, C.white, { ox: .5, bold: true });
    this.addText(W / 2, this.Y(154), 'ENTER PASSWORD', 9, C.muted, { ox: .5, bold: true });
    const status = this.addText(W / 2, this.Y(292), '', 9, C.red, { ox: .5, bold: true });

    const input = document.createElement('input');
    input.className = DOM_CLASS;
    input.type = 'password';
    input.autocomplete = 'off';
    input.autocapitalize = 'none';
    input.spellcheck = false;
    input.enterKeyHint = 'go';
    input.placeholder = 'Password';
    Object.assign(input.style, {
      position: 'fixed',
      zIndex: '99999',
      background: '#071829',
      color: '#f7fbff',
      border: '2px solid #20d9ff',
      borderRadius: '9px',
      padding: '7px 13px',
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif",
      fontSize: '18px',
      fontWeight: '700',
      letterSpacing: '2px',
      textAlign: 'center',
      outline: 'none'
    });

    const unlock = document.createElement('button');
    unlock.className = DOM_CLASS;
    unlock.type = 'button';
    unlock.textContent = 'UNLOCK DEV';
    Object.assign(unlock.style, {
      position: 'fixed',
      zIndex: '99999',
      background: '#0c2136',
      color: '#ffffff',
      border: '2px solid #9c6cff',
      borderRadius: '9px',
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif",
      fontSize: '15px',
      fontWeight: '800'
    });

    document.body.appendChild(input);
    document.body.appendChild(unlock);

    const reposition = () => {
      place(this, input, 65, this.Y(196), 290, 50);
      place(this, unlock, 95, this.Y(330), 230, 48);
    };
    reposition();
    this._devPasswordResizeHandler = reposition;
    window.addEventListener('resize', reposition, { passive: true });
    window.addEventListener('orientationchange', reposition, { passive: true });

    const submit = () => {
      if (String(input.value || '').trim().toLowerCase() === DEV_PASSWORD) {
        status.setColor('#25f29a');
        status.setText('ACCESS GRANTED');
        input.disabled = true;
        unlock.disabled = true;
        this.time.delayedCall(180, () => {
          if (this.state === 'DEV_PASSWORD') this.enterDevLab();
        });
        return;
      }
      status.setColor('#ff5368');
      status.setText('INCORRECT PASSWORD');
      input.value = '';
      this.cameras.main.shake(110, .004);
      input.focus({ preventScroll: true });
    };

    unlock.addEventListener('click', submit);
    input.addEventListener('keydown', event => {
      if (event.key === 'Enter') submit();
    });

    this.wideButton(W / 2, this.Y(430), 280, 46, 'CANCEL', C.muted, () => this.showHome());

    this.time.delayedCall(100, () => {
      if (this.state === 'DEV_PASSWORD' && input.isConnected) input.focus({ preventScroll: true });
    });
  };

  window.CometDevAccess = Object.freeze({ passwordType: 'text' });
})();
