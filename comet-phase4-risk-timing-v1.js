// Keeps catastrophic Phase 4 capture visually continuous: all selected member-transfer animations
// get time to leave the player's system before the game-over panel replaces the encounter scene.
(() => {
  if(!window.CometPhase4RiskV1)return;
  const proto=GameScene.prototype,baseResolve=proto.resolve;
  proto.resolve=function(){
    const r=this.pending;
    if(r?.v7FatalCapture&&!r._v7FatalTimingReady){
      if(r._v7FatalTimingWaiting)return;
      r._v7FatalTimingWaiting=true;
      const count=Array.isArray(r.transferOutMembers)?r.transferOutMembers.length:0;
      const delay=Math.max(350,350+Math.max(0,count-3)*105);
      this.time.delayedCall(delay,()=>{r._v7FatalTimingWaiting=false;r._v7FatalTimingReady=true;this.resolve();});
      return;
    }
    return baseResolve.call(this);
  };
  window.CometPhase4RiskTimingV1=Object.freeze({enabled:true,waitsForFatalTransfers:true});
})();
