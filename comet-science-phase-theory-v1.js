// Adds one concise "WHY?" science concept to Phase 1-3 opening cards without turning them into textbooks.
(() => {
  if(!window.CometPhaseIntros)return;
  const proto=GameScene.prototype,base=proto.showPhaseStartCard;
  const THEORY={
    1:['WHY?','Collisions and gravity build larger objects from smaller material.','GAME IDEA: compare apparent size before committing to a collision.'],
    2:['WHY?','Gravity does more than collide objects — it can hold them in stable orbital systems.','GAME IDEA: orbitals can protect the system you have built.'],
    3:['WHY?','A neutron star or black hole can pack enormous mass into a tiny region.','GAME IDEA: visible size is no longer enough — think mass, density and gravity.']
  };
  proto.showPhaseStartCard=function(phase){
    const result=base.call(this,phase),t=THEORY[Number(phase)];if(!t||this.state!=='PHASE_START_CARD')return result;
    // Compact strip between the object identity and action panel.
    const g=this.add.graphics();g.fillStyle(C.cyan,.055).fillRoundedRect(25,this.Y(404),370,24,5);this.ui.add(g);
    this.addText(36,this.Y(411),`${t[0]}  ${t[1]}`,6.25,C.cyan,{bold:true,width:350,align:'center'});
    return result;
  };
  window.CometSciencePhaseTheory=Object.freeze({enabled:true,principle:'SCIENCE EXPLAINS GAMEPLAY'});
})();
