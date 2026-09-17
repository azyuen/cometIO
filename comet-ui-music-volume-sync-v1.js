// Keep Home/Lab UI themes synchronized with the shared Music 0-100 setting.
(() => {
  'use strict';
  let last=-1;
  const sync=()=>{
    if(!window.CometUIMusic)return;
    let v=.84;
    try{const n=Number(localStorage.getItem('cometio-music-volume-v1'));if(Number.isFinite(n))v=Math.max(0,Math.min(100,n))/100;}catch(e){}
    if(Math.abs(v-last)<.001)return;
    last=v;
    try{window.CometUIMusic.setVolume(v);}catch(e){}
  };
  sync();
  setInterval(sync,180);
})();
