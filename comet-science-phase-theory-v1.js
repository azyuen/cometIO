// Adds one concise science explanation beneath the phase subtitle.
// No separate WHY box: the explanation is part of the main title-card hierarchy.
(() => {
  if(!window.CometPhaseIntros)return;
  const proto=GameScene.prototype,base=proto.showPhaseStartCard;
  const THEORY={
    1:'Collisions and gravity build larger objects from smaller material.',
    2:'Gravity does more than collide objects — it can hold them in stable orbital systems.',
    3:'A neutron star or black hole can pack enormous mass into a tiny region.'
  };
  proto.showPhaseStartCard=function(phase){
    const result=base.call(this,phase),explanation=THEORY[Number(phase)];
    if(!explanation||this.state!=='PHASE_START_CARD')return result;
    this.addText(W/2,this.Y(126),explanation,6.65,C.cyan,{
      ox:.5,bold:true,width:360,align:'center'
    });
    return result;
  };
  window.CometSciencePhaseTheory=Object.freeze({
    enabled:true,
    principle:'SCIENCE EXPLAINS GAMEPLAY',
    presentation:'INLINE UNDER SUBTITLE'
  });
})();