// Phase 4 v4 timing guard.
// The v4 galaxy jackpot can transfer many real members; keep resolve/result behind the last visible transfer.
(() => {
  if (!window.CometPhase4SystemV4) return;
  const proto = GameScene.prototype;
  const baseAnimate = proto.animate;
  const baseResolve = proto.resolve;

  proto.animate = function(choice, p, o, pr, or) {
    if (this.pending?.v4SystemInteraction && choice !== 'AVOID') {
      const count = Math.max(
        Array.isArray(this.pending.transferInMembers) ? this.pending.transferInMembers.length : 0,
        Array.isArray(this.pending.transferOutMembers) ? this.pending.transferOutMembers.length : 0
      );
      const extra = Math.max(0, count - 3) * 115;
      this._p4v4ResolveNotBefore = Date.now() + (this.pending.v4ClusterInteraction ? 2350 : 2150) + extra;
      this._p4v4ResolveDeferred = false;
    }
    return baseAnimate.call(this, choice, p, o, pr, or);
  };

  proto.resolve = function() {
    if (this.pending?.v4SystemInteraction && this._p4v4ResolveNotBefore) {
      const remaining = this._p4v4ResolveNotBefore - Date.now();
      if (remaining > 20) {
        if (!this._p4v4ResolveDeferred) {
          this._p4v4ResolveDeferred = true;
          this.time.delayedCall(remaining + 25, () => {
            this._p4v4ResolveDeferred = false;
            this.resolve();
          });
        }
        return;
      }
      this._p4v4ResolveNotBefore = 0;
      this._p4v4ResolveDeferred = false;
    }
    return baseResolve.call(this);
  };

  window.CometPhase4SystemV4Timing = Object.freeze({ enabled:true });
})();
