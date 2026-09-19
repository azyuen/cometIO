// Phase 4 action-language guard.
// Phase 3 legitimately uses ESCAPE; Phase 4 always uses AVOID for the same canonical AVOID action.
(() => {
  'use strict';
  if (typeof GameScene === 'undefined' || !window.CometPhase4) return;

  const proto=GameScene.prototype;
  const baseDrawPrompt=proto.drawPrompt;
  const baseReveal=proto.reveal;
  const GALAXY=Number(window.CometPhase4.galaxyTier ?? TIERS.findIndex(t=>t.name==='GALAXY'));
  const SUPERCLUSTER=Number(window.CometPhase4.superclusterTier ?? TIERS.findIndex(t=>t.name==='SUPERCLUSTER'));

  function active(scene){
    const tier=Number(scene?.tierIndex);
    if(!Number.isFinite(tier)||tier<GALAXY||tier>=SUPERCLUSTER)return false;
    if(scene?._labSandboxRun===true&&String(scene?._labSandboxPhase||'').toUpperCase()==='PHS4')return true;
    return !scene?._devModeActive||scene?._devPhase4Test===true;
  }

  function walk(node,fn){
    if(!node)return;
    fn(node);
    if(Array.isArray(node.list))node.list.forEach(child=>walk(child,fn));
  }

  function enforceAvoid(scene){
    if(!active(scene))return;
    walk(scene.ui,node=>{
      if(typeof node?.text==='string'&&typeof node.setText==='function'){
        const s=node.text.trim();
        if(s==='ESCAPE')node.setText('AVOID');
        else if(s==='ESCAPE LOCKED IN')node.setText('AVOID LOCKED IN');
      }
    });

    // If a Phase-3 icon wrapper ever leaks into a Phase-4 button, restore the approved Phase-4 icon.
    if(scene.textures?.exists?.('action-avoid-phase4')){
      for(const child of scene.ui?.list||[]){
        if(!Array.isArray(child?.list))continue;
        const label=child.list.find(x=>typeof x?.text==='string'&&x.text.trim()==='AVOID');
        if(!label)continue;
        const image=child.list.find(x=>typeof x?.setTexture==='function'&&x?.texture);
        const key=String(image?.texture?.key||'');
        if(image&&/escape|phase3/i.test(key)){
          image.setTexture('action-avoid-phase4');
          image.setDisplaySize?.(54,54);
          image.clearTint?.();
        }
      }
    }
  }

  proto.drawPrompt=function(...args){
    const out=baseDrawPrompt.apply(this,args);
    enforceAvoid(this);
    return out;
  };

  proto.reveal=function(...args){
    const out=baseReveal.apply(this,args);
    enforceAvoid(this);
    return out;
  };

  window.CometPhase4AvoidLabelV1=Object.freeze({
    enabled:true,
    canonical:'AVOID',
    preventsPhase3EscapeLeak:true
  });
})();