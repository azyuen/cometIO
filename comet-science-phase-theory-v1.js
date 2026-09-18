// Opening phase cards intentionally omit the old grey explanatory copy.
// Keep only a feature marker for regression checks; this file draws nothing.
(() => {
  if(!window.CometPhaseIntros)return;
  window.CometSciencePhaseTheory=Object.freeze({
    enabled:true,
    principle:'SCIENCE EXPLAINS GAMEPLAY',
    presentation:'REMOVED FROM OPENING CARD'
  });
})();