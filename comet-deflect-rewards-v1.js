// Deflect reward refinement.
// Orbitals are a reward for successfully handling a meaningful threat, not for batting away tiny
// objects. The underlying deflect physics/speed consequences are unchanged; only orbital progress
// scales with the target's gameplay tier relative to the player.
(() => {
  const baseDrawResult = GameScene.prototype.drawResult;

  function chargePerOrbital() {
    return Math.max(1, Number(window.CometOrbitals?.deflectsPerOrbital) || 3);
  }

  function deflectChargePoints(scene, pending) {
    const gap = Number.isFinite(Number(pending?.gap))
      ? Number(pending.gap)
      : (Number(scene.other?.tier) || 0) - (Number(scene.player?.tier) || 0);

    // Smaller targets: no orbital progress at all.
    if (gap < 0) return 0;
    // Similar-sized/same-tier targets: modest progress.
    if (gap === 0) return 1;
    // One tier larger: meaningfully harder, so reward twice the charge.
    if (gap === 1) return 2;
    // Two or more tiers larger: maximum useful charge; one successful deflect can form an orbital.
    return 3;
  }

  function stripLegacyCraterReward(detail) {
    return String(detail || '')
      .replace(/\s*•\s*CRATERS\s*\+\d+/ig, '')
      .replace(/CRATERS\s*\+\d+\s*•\s*/ig, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  function correctAutomaticOrbitalCharge(scene, pending) {
    if (!pending || pending._sizeScaledOrbitalRewardApplied) return;
    pending._sizeScaledOrbitalRewardApplied = true;

    // comet-orbitals-v1 awards one unit before the underlying resolver draws the result screen.
    // If it did not award a unit (locked tier, failed deflect, DEV, etc.), leave the state alone.
    if (!pending.orbitalChargeEarned) {
      pending.orbitalChargePoints = 0;
      return;
    }

    const step = chargePerOrbital();
    const afterAutomaticTotal = Math.max(0,
      (Number(scene.orbitalCount) || 0) * step + (Number(scene.orbitalProgress) || 0));
    const beforeTotal = Math.max(0, afterAutomaticTotal - 1);
    const reward = deflectChargePoints(scene, pending);
    const desiredTotal = beforeTotal + reward;
    const beforeCount = Math.floor(beforeTotal / step);
    const desiredCount = Math.floor(desiredTotal / step);

    scene.orbitalCount = desiredCount;
    scene.orbitalProgress = desiredTotal % step;
    scene.craters = desiredCount; // compatibility alias used by older result/save layers

    pending.orbitalChargePoints = reward;
    pending.orbitalChargeEarned = reward > 0;
    pending.orbitalFormed = desiredCount > beforeCount;
  }

  GameScene.prototype.drawResult = function (result) {
    const pending = this.pending;
    const eligibleDeflect = pending?.choice === 'DEFLECT' &&
      pending.success !== false && pending.result !== 'catastrophic';

    if (!eligibleDeflect) return baseDrawResult.call(this, result);

    correctAutomaticOrbitalCharge(this, pending);

    result = { ...result, detail: stripLegacyCraterReward(result?.detail) };
    const reward = Number(pending.orbitalChargePoints) || 0;
    const step = chargePerOrbital();

    if (reward > 0) {
      if (pending.orbitalFormed) {
        result.detail = `${result.detail || 'DEFLECTED'} • ORBITAL FORMED • ${this.orbitalCount} AVAILABLE`;
      } else {
        result.detail = `${result.detail || 'DEFLECTED'} • ORBITAL CHARGE +${reward} • ${this.orbitalProgress}/${step}`;
      }
    }
    // reward === 0 deliberately adds nothing: a smaller target gives no orbital progression.

    // Suppress comet-orbitals-v1's original fixed +1 messaging; its sacrifice messaging still runs.
    const earned = pending.orbitalChargeEarned;
    const formed = pending.orbitalFormed;
    pending.orbitalChargeEarned = false;
    pending.orbitalFormed = false;
    try {
      return baseDrawResult.call(this, result);
    } finally {
      pending.orbitalChargeEarned = earned;
      pending.orbitalFormed = formed;
    }
  };

  window.CometDeflectRewards = Object.freeze({
    pointsForGap(gap) {
      if (gap < 0) return 0;
      if (gap === 0) return 1;
      if (gap === 1) return 2;
      return 3;
    }
  });
})();
