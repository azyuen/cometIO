const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'comet-dev-phase4-v1.js'), 'utf8');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

assert(index.includes('comet-dev-phase4-v1.js?v=1'), 'DEV Phase 4 harness must be loaded');
assert(
  index.indexOf('comet-dev-phase4-v1.js?v=1') > index.indexOf('comet-phase4-tuning-v1.js?v=1'),
  'DEV Phase 4 harness must load after Phase 4 and compatibility tuning'
);

assert(source.includes("'PHASE 4 TEST'"), 'collision lab must expose a Phase 4 test entry');
assert(source.includes("'SMBH SYSTEM'"), 'test menu must jump to SMBH system gameplay');
assert(source.includes("'GALAXY'"), 'test menu must jump to Galaxy gameplay');
assert(source.includes("'GALAXY CLUSTER'"), 'test menu must jump to Galaxy Cluster gameplay');
assert(source.includes("'SUPERCLUSTER'"), 'test menu must jump to the Supercluster finale');
assert(source.includes("'MERGE 1'"), 'test menu must expose merge 1');
assert(source.includes("'MERGE 2'"), 'test menu must expose merge 2');
assert(source.includes("'MERGE 3'"), 'test menu must expose merge 3');
assert(source.includes("'UNIVERSE FORMS'"), 'test menu must expose universe formation');
assert(source.includes("'ATOM ENCOUNTER'"), 'test menu must expose the final atom encounter');
assert(source.includes("'ENDING SCREEN'"), 'test menu must expose the completion screen');

assert(source.includes('scene._devModeActive = false'), 'playable Phase 4 tests must enable the real Phase 4 rules');
assert(source.includes('scene._devPhase4Test = true'), 'test state must be explicitly isolated');
assert(source.includes("'DEV TEST • SAVE DISABLED'"), 'test mode must block save writes');
assert(source.includes("'DEV TEST • LOAD DISABLED'"), 'test mode must block loads');
assert(source.includes('if (this._devPhase4Test) return this.showDevPhase4Completion()'), 'test ending must intercept the real universe completion/high-score path');
assert(source.includes('restoreState(this, snapshot)'), 'returning to collision lab must restore the temporary pre-test state');
assert(source.includes('if (typeof this.exitDevLab === \'function\') return this.exitDevLab()'), 'returning home must use DEV Lab restoration of the real run');

console.log('DEV Phase 4 regression checks passed.');
