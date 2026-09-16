// Cluster-scale terminology: these are member galaxies, not orbitals.
(() => {
  if(!window.CometPhase4ClusterNetworkV1)return;
  const proto=GameScene.prototype,P4=window.CometPhase4,CLUSTER=P4.clusterTier;
  const baseHud=proto.drawHud,baseResult=proto.drawResult;
  function walk(node,fn){if(!node)return;fn(node);if(Array.isArray(node.list))node.list.forEach(c=>walk(c,fn));}
  function relabel(scene){
    if(scene.tierIndex<CLUSTER)return;
    walk(scene.ui,n=>{
      if(typeof n?.text!=='string'||typeof n.setText!=='function')return;
      if(n.text==='ORBITALS')n.setText('GALAXIES');
      else if(n.text.includes('ORBITALS'))n.setText(n.text.replace(/ORBITALS/g,'GALAXIES'));
    });
  }
  proto.drawHud=function(controls=false){const r=baseHud.call(this,controls);relabel(this);return r;};
  proto.drawResult=function(result){const r=baseResult.call(this,result);relabel(this);return r;};
  window.CometPhase4ClusterLabelsV1=Object.freeze({enabled:true,label:'GALAXIES'});
})();