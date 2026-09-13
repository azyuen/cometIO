const W=420,H=880,SAFE_TOP=(typeof window!=='undefined'&&window.COMET_STANDALONE)?14:56,G=6.67430e-11;
const C={bg:0x020a19,panel:0x071829,panel2:0x0b2238,cyan:0x20d9ff,white:0xf7fbff,muted:0x8db7ca,green:0x25f29a,orange:0xff9d3d,blue:0x45c6ff,red:0xff5368,purple:0x8e55d8,rock:0xa79d9a,rockDark:0x4f4c57,star:0xc6e9ff,black:0x000000};
const FONT="-apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif";
const TIERS=[
{name:'ATOM',zone:'QUANTUM DRIFT',r:1e-10,m:1.67e-27,v:12000,kind:'matter',color:0x77e6ff,solid:false,need:1.4,hint:'A tiny building block',examples:['HYDROGEN ATOM']},
{name:'DUST PARTICLE',zone:'THE DUST RUN',r:5e-6,m:1e-12,v:9000,kind:'dust',color:0xd1c4a3,solid:true,need:1.6,hint:'Dry, light and easily moved',examples:['INTERPLANETARY DUST']},
{name:'TINY METEORITE',zone:'MICRO IMPACTS',r:.08,m:4,v:12000,kind:'rock',color:0xa89b91,solid:true,need:1.8,hint:'A small dense rocky fragment',examples:['2008 TC3 FRAGMENT']},
{name:'LARGE METEORITE',zone:'THE FALLING FIELD',r:12,m:2e7,v:17000,kind:'rock',color:0x927c70,solid:true,need:2,hint:'A fast rocky body',examples:['CHELYABINSK METEOROID']},
{name:'SMALL COMET',zone:'THE ICE ROAD',r:1500,m:1e12,v:30000,kind:'ice',color:0xa6e5ef,solid:true,need:2.2,hint:'Icy and volatile',examples:['COMET 2P/ENCKE','COMET 67P']},
{name:'LARGER COMET',zone:'BRIGHT TAILS',r:7000,m:4e14,v:42000,kind:'ice',color:0x8edbe9,solid:true,need:2.4,hint:'A large active icy body',examples:["HALLEY'S COMET",'HALE–BOPP']},
{name:'ASTEROID',zone:'THE SHATTERED BELT',r:30000,m:2e18,v:18000,kind:'rock',color:0x8d7769,solid:true,need:2.6,hint:'An airless minor body',examples:['VESTA','EROS','BENNU','APOPHIS']},
{name:'DWARF PLANET',zone:'OUTER ORBITS',r:9e5,m:1.3e22,v:7000,kind:'world',color:0xc4b9ae,solid:true,need:2.8,hint:'Rounded by its own gravity',examples:['CERES','PLUTO','ERIS','MAKEMAKE']},
{name:'ROCKY PLANET',zone:'BIGGER WORLDS',r:6.4e6,m:6e24,v:30000,kind:'world',color:0x68a6ff,solid:true,need:3,hint:'A dense terrestrial world',examples:['MERCURY','VENUS','EARTH','MARS']},
{name:'GAS PLANET',zone:'DEEP GRAVITY',r:6e7,m:5.7e26,v:10000,kind:'gas',color:0xf3d79b,solid:false,need:3.2,hint:'Mostly hydrogen and helium',examples:['JUPITER','SATURN','URANUS','NEPTUNE']},
{name:'YELLOW DWARF STAR',zone:'STELLAR SPACE',r:7e8,m:2e30,v:220000,kind:'star',color:0xffe77e,solid:false,need:3.4,hint:'A main-sequence star',examples:['THE SUN','ALPHA CENTAURI A','TAU CETI']},
{name:'BLUE GIANT STAR',zone:'HOT GIANTS',r:6e9,m:2e31,v:260000,kind:'star',color:0x8fc9ff,solid:false,need:3.6,hint:'Massive, bright and extremely hot',examples:['RIGEL','SPICA']},
{name:'RED HYPERGIANT STAR',zone:'THE GREAT GIANTS',r:7e11,m:4e31,v:180000,kind:'star',color:0xff775c,solid:false,need:3.8,hint:'An enormous evolved star',examples:['VY CANIS MAJORIS','NML CYGNI']},
{name:'NEBULA',zone:'THE STAR NURSERY',r:4e16,m:2e33,v:30000,kind:'nebula',color:0xb16cff,solid:false,need:4,hint:'A vast cloud of gas and dust',examples:['ORION NEBULA','CARINA NEBULA','EAGLE NEBULA']},
{name:'PULSAR',zone:'DEAD STAR BEACONS',r:12000,m:2.8e30,v:350000,kind:'pulsar',color:0xd5f4ff,solid:false,need:4.2,hint:'An ultra-dense rotating neutron star',examples:['CRAB PULSAR','VELA PULSAR','PSR B1919+21']},
{name:'BLACK HOLE',zone:'NO RETURN',r:3e4,m:2e31,v:250000,kind:'blackhole',color:0x2e3150,solid:false,need:4.5,hint:'Gravity strong enough to trap light',examples:['CYGNUS X-1','GAIA BH1','V404 CYGNI']},
{name:'SUPER MASSIVE BLACK HOLE',zone:'COSMIC ENDGAME',r:1e12,m:1e39,v:500000,kind:'blackhole',color:0x11111c,solid:false,need:999,hint:'A galactic-scale gravitational monster',examples:['SAGITTARIUS A*','M87*','TON 618']}
];
const REGIONS=[
{id:'outer-heliosphere',name:'OUTER HELIOSPHERE',short:'OUTER HELIOSPHERE',science:'Solar-wind frontier',common:'atoms • dust • stray comets',chance:.24,pool:[0,0,1,1,1,4,5]},
{id:'oort-cloud',name:'OORT CLOUD',short:'OORT CLOUD',science:'Distant spherical comet reservoir',common:'small & large comets',chance:.34,pool:[4,4,4,5,5,5,6]},
{id:'scattered-disk',name:'SCATTERED DISK',short:'SCATTERED DISK',science:'Eccentric trans-Neptunian orbits',common:'comets • asteroids • dwarf planets',chance:.34,pool:[5,5,6,6,7,7,7]},
{id:'kuiper-belt',name:'KUIPER BELT',short:'KUIPER BELT',science:'Icy belt beyond Neptune',common:'icy bodies • dwarf planets',chance:.36,pool:[4,5,5,6,7,7,7]},
{id:'asteroid-belt',name:'ASTEROID BELT',short:'ASTEROID BELT',science:'Rocky debris between Mars & Jupiter',common:'meteorites • asteroids',chance:.38,pool:[2,2,3,3,6,6,6,7]},
{id:'inner-solar',name:'INNER SOLAR SYSTEM',short:'INNER SOLAR SYSTEM',science:'Sunward rocky-planet zone',common:'dust • rocks • rocky planets',chance:.32,pool:[1,2,3,6,8,8,8,10]},
{id:'outer-solar',name:'OUTER SOLAR SYSTEM',short:'OUTER SOLAR SYSTEM',science:'Giant planets & icy populations',common:'comets • dwarf & gas planets',chance:.36,pool:[4,5,7,7,9,9,9]},
{id:'hyperspace',name:'HYPERSPACE',short:'HYPERSPACE',science:'Fictional deep-space shortcut',common:'anything — high variance',chance:.58,pool:[0,2,4,6,8,9,10,11,12,13,14,15,16,16]}
];
const SAVE_KEY='cometio-save-v2',SCORES_KEY='cometio-highscores-v1';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const logRatio=(a,b)=>Math.log10(Math.max(a,1e-300)/Math.max(b,1e-300));
const escapeVelocity=o=>Math.sqrt(2*G*o.massKg/Math.max(o.radiusM,1e-20));
const relativeSpeed=(a,b)=>a.speedMS+b.speedMS;
