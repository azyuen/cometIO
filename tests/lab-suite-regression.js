const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'comet-lab-suite-v1.js'), 'utf8');
const fixes = fs.readFileSync(path.join(root, 'comet-lab-suite-fixes-v1.js'), 'utf8');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

assert(index.includes('comet-lab-suite-v1.js?v=1'), 'LAB suite must be loaded');
assert(index.includes('comet-lab-suite-fixes-v1.js?v=1'), 'LAB integration fixes must be loaded');
assert(index.indexOf('comet-lab-suite-v1.js?v=1') > index.indexOf('comet-phase4-dev-reward-v1.js?v=1'), 'LAB suite must load after prior DEV/phase layers');
assert(index.indexOf('comet-lab-suite-fixes-v1.js?v=1') > index.indexOf('comet-lab-suite-v1.js?v=1'), 'LAB fixes must load last');

assert(source.includes("['LAB','EXP','PHS2','PHS3','PHS4']"), 'LAB must expose five requested tabs');
assert(source.includes("'COLLISION LAB'"), 'collision tab title must be COLLISION LAB');
assert(source.includes("fillRoundedRect(14,this.Y(216),392,330,10)"), 'collision preview box must use the taller layout');
assert(source.includes("const TAB_Y = 83"), 'tab row must be shifted below the title/header');
assert(source.includes("'COLLISION EXPERIMENT'"), 'EXP tab must expose collision experiment mode');
assert(source.includes("label:'MASS'"), 'EXP must expose mass sliders');
assert(source.includes("label:'SPEED'"), 'EXP must expose speed sliders');
assert(source.includes("label:'ORBITALS'"), 'EXP must expose orbital sliders');
assert(source.includes('massFromSlider'), 'EXP mass control must be logarithmic across the game scale');
assert(source.includes('speedFromSlider'), 'EXP speed control must be logarithmic');
assert(source.includes('applyLabOrbitals'), 'player orbitals must feed the existing orbital-risk formula in LAB/EXP');
assert(source.includes('B orbitals are visual only'), 'LAB/EXP must not invent opponent orbital defence mechanics');

assert(source.includes("TIERS.findIndex(t => t.name === 'DWARF PLANET')"), 'PHS2 must start at Dwarf Planet');
assert(source.includes("TIERS.findIndex(t => t.name === 'PULSAR')"), 'PHS3 must start at Pulsar');
assert(source.includes("window.CometPhase4?.firstTier"), 'PHS4 must start at the real Phase 4 boundary');
assert(source.includes("this._labSandboxRun=true"), 'phase starts must run inside a sandbox');
assert(source.includes("SAVE DISABLED"), 'sandbox phase runs must block saves');
assert(source.includes("LOAD DISABLED"), 'sandbox phase runs must block loads');
assert(source.includes('if(this._labSandboxRun)return false'), 'sandbox runs must not qualify for high scores');
assert(source.includes('if(this._labSandboxRun)return;return previousRecordScore.call(this)'), 'sandbox runs must block score recording');
assert(source.includes('returnFromLabPhase'), 'sandbox Home must return to LAB rather than alter the real run');

assert(fixes.includes("'LAB MODE UNLOCKED'"), 'visible completion reward must be renamed LAB MODE');
assert(fixes.includes("'FINISH PHS4 TEST'"), 'PHS4 sandbox final card must not offer the real unlock reward');
assert(fixes.includes('if (this._labSandboxRun && config?.final)'), 'PHS4 sandbox must intercept the real final reward flow');
assert(fixes.includes('refreshesOrbitalControlsOnTierChange: true'), 'orbital +/- controls must refresh when selectors cross eligible tiers');

console.log('LAB suite regression checks passed.');
