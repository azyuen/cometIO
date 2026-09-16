// Small state guards for Phase 4 ending v4.
(() => {
  if(!window.CometPhase4EndingV4||typeof GameScene==='undefined')return;
  const proto=GameScene.prototype;
  const baseStartUniverseFinale=proto.startUniverseFinale;
  const baseShowJoinedSuperclusterResult=proto.showJoinedSuperclusterResult;
  const baseCompleteUniverseAssembly=proto.completeUniverseAssembly;
  const baseFinishUniverse=proto.finishUniverse;
  const baseContinueNextUniverse=proto.continueNextUniverse;

  function addLabReturn(scene){
    if(scene._labSandboxRun&&typeof scene.returnFromLabPhase==='function')scene.miniButton(49,scene.Y(18),76,24,'LAB',C.purple,()=>scene.returnFromLabPhase());
  }

  proto.startUniverseFinale=function(){
    if(this.state==='PHASE4_EPILOGUE_TRANSITION'&&!this._phase4EpilogueStarted){
      this.finaleMergeCount=0;
      this._finalJoinedSuperclusters=[];
      this._phase4EpilogueStarted=true;
    }
    const result=baseStartUniverseFinale.call(this);
    addLabReturn(this);
    return result;
  };

  if(typeof baseShowJoinedSuperclusterResult==='function'){
    proto.showJoinedSuperclusterResult=function(){
      const result=baseShowJoinedSuperclusterResult.call(this);
      addLabReturn(this);
      return result;
    };
  }

  if(typeof baseCompleteUniverseAssembly==='function'){
    proto.completeUniverseAssembly=function(){
      const result=baseCompleteUniverseAssembly.call(this);
      addLabReturn(this);
      return result;
    };
  }

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

  window.CometPhase4EndingV4Fixes=Object.freeze({enabled:true,cleanEpilogueStart:true,labExitThroughoutEpilogue:true,gameCompleteEndsRun:true,continueStartsRun:true});
})();