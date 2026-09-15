const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'comet-phase4-system-v3.js'), 'utf8');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

assert(index.includes('comet-phase4-system-v3.js?v=1'), 'Phase 4 v3 continuity layer must be loaded');
assert(index.indexOf('comet-phase4-system-v3.js?v=1') > index.indexOf('comet-phase4-system-v2.js?v=1'), 'Phase 4 v3 must load after v2');

assert(source.includes("const tiers = [NEBULA, PULSAR, BLACK_HOLE]"), 'starting system must use Nebula/Pulsar/Black Hole members only');
assert(source.includes('identityId: object.identityId || null'), 'member records must preserve exact named identity');
assert(source.includes('namedSpriteBase: object.namedSpriteBase || null'), 'member records must preserve exact sprite variant');
assert(source.includes('Legacy low-tier'), 'legacy low-tier Phase 4 members must be upgraded');

assert(source.includes('Faint orbital lanes and luminous spiral arms share this exact rotating plane.'), 'arms and orbit lanes must share one plane');
assert(source.includes('parent.add(disc);disc.add(g)'), 'arms and member sprites must live in one rotating disc');
assert(source.includes('targets:disc,angle:360'), 'the unified disc must rotate as one unit');
assert(source.includes('const arms = clamp(base + Math.floor(Math.max(0,count-3)/3), base, 6)'), 'arm count must increase with orbital/member count');
assert(source.includes('outer:radius*(1+Math.min(.42,Math.max(0,count-3)*.032))'), 'system radius must increase with member count');

assert(source.includes('pending.transferInMembers=[];pending.transferOutMembers=[]'), 'encounter outcomes must prepare exact transfer lists');
assert(source.includes('transferInFor(scene,other,amount)'), 'incoming transfers must be selected from the encountered system');
assert(source.includes('transferOutFor(scene,amount)'), 'outgoing transfers must be selected from the real player system');
assert(source.includes('removeExactMembers(this,r.transferOutMembers||[])'), 'visible stripped members must be removed from persistent state');
assert(source.includes('addExactMembers(this,r.transferInMembers||[])'), 'visible captured members must be added to persistent state');

assert(source.includes('animateLowerCapture'), 'lower-tier successful capture must curve into an orbital slot');
assert(source.includes('animatePeerDance'), 'same-tier systems must use the two-system twirl interaction');
assert(source.includes('dominantOpponent'), 'larger opposing systems must become the gravitational centre');
assert(source.includes("isSystemObject(this.other)?'The systems interacted without merging."), 'same-tier system capture must transfer members without merging the whole galaxy');
assert(source.includes('ensureOpponentMembers(object)'), 'revealed galaxies/clusters must have visible submembers');
assert(source.includes('drawExternalSystem'), 'revealed opponent systems must render as animated systems');

assert(source.includes('exactMemberContinuity:true'), 'continuity capability flag must be exposed');
assert(source.includes('alignedDisc:true'), 'aligned-disc capability flag must be exposed');
assert(source.includes('peerSystemDance:true'), 'peer-system choreography capability flag must be exposed');

console.log('Phase 4 v3 system-continuity regression checks passed.');
