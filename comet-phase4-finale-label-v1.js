// Final visible handoff cleanup: remove the old "final assembly" wording from the Supercluster result.
(() => {
  if(!window.CometPhase4FinaleV2)return;
  const proto=GameScene.prototype,base=proto.drawResult;
  function walk(node,fn){if(!node)return;fn(node);if(Array.isArray(node.list))node.list.forEach(c=>walk(c,fn));}
  proto.drawResult=function(result){
    const value=base.call(this,result);
    if(this.tierIndex>=window.CometPhase4.superclusterTier){
      walk(this.ui,n=>{if(typeof n?.text==='string'&&n.text==='BEGIN FINAL ASSEMBLY'&&typeof n.setText==='function')n.setText('FINAL PHASE?');});
    }
    return value;
  };
})();
