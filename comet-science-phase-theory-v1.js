// Phase science is now folded directly into the grey subtitle sentence on each opening card.
// Keep the feature marker for regression checks, but do not draw a separate explanation line.
(() => {
  if(!window.CometPhaseIntros)return;
  window.CometSciencePhaseTheory=Object.freeze({
    enabled:true,
    principle:'SCIENCE EXPLAINS GAMEPLAY',
    presentation:'CONTINUED IN PHASE SUBTITLE'
  });
})();