// Final LAB access-screen wording/layout. Password validation remains in the existing gate.
(() => {
  const baseShowGate = GameScene.prototype.showDevPinGate;

  function walk(node, visitor) {
    if (!node) return;
    visitor(node);
    if (Array.isArray(node.list)) node.list.forEach(child => walk(child, visitor));
  }

  GameScene.prototype.showDevPinGate = function () {
    const result = baseShowGate.call(this);

    // Use LAB terminology consistently.
    walk(this.ui, child => {
      if (typeof child?.text !== 'string' || typeof child.setText !== 'function') return;
      if (child.text === 'DEV ACCESS') child.setText('LAB ACCESS');
      if (child.text === 'ENTER PASSWORD') child.setText('ENTER PASSWORD • PRESS GO');
    });

    // The native keyboard already submits with Go/Enter, so the separate UNLOCK DEV DOM button is
    // redundant. Keep only the masked password field.
    document.querySelectorAll('.comet-dev-password-ui').forEach(node => {
      if (node.tagName === 'BUTTON') node.remove();
    });

    return result;
  };

  window.CometLabAccessUI = Object.freeze({
    title: 'LAB ACCESS',
    separateUnlockButton: false,
    submitHint: 'PRESS GO'
  });
})();
