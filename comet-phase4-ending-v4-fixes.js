// Small state guards for Phase 4 ending v4.
(() => {
  if(!window.CometPhase4EndingV4||typeof GameScene==='undefined')return;
  const proto=GameScene.prototype;
  const baseStartUniverseFinale=proto.startUniverseFinale;
  const baseFinishUniverse=proto.finishUniverse;
  const baseContinueNextUniverse=proto.continueNextUniverse;

  proto.startUniverseFinale=function(){
    if(this.state==='PHASE4_EPILOGUE_TRANSITION'&&!this._phase4EpilogueStarted){
      this.finaleMergeCount=0;
      this._finalJoinedSuperclusters=[];
      this._phase4EpilogueStarted=true;
    }
    return baseStartUniverseFinale.call(this);
  };

  proto.finishUniverse=function(){
    const result=baseFinishUniverse.call(this);
    this.runActive=false;
    return result;
  };

  proto.continueNextUniverse=function(){
    this.runActive=true;
    this._phase4EpilogueStarted=false;
    this._finalJoinedSuperclusters=[];
    this.finaleMergeCount=0;
    return baseContinueNextUniverse.call(this);
  };

  window.CometPhase4EndingV4Fixes=Object.freeze({enabled:true,cleanEpilogueStart:true,gameCompleteEndsRun:true,continueStartsRun:true});
})();