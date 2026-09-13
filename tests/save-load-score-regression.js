const fs = require('fs');

const rules = fs.readFileSync('comet-save-score-v1.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');

function assert(ok, message) { if (!ok) throw new Error(message); }

assert(rules.includes('const MANUAL_SAVE_PENALTY = 10'), 'manual save penalty should remain 10 points');
assert(rules.includes('const SUCCESSFUL_LOAD_PENALTY = 25'), 'successful load penalty should remain 25 points');
assert(rules.includes('const manual = !silent'), 'only non-silent/manual saves should count');
assert(rules.includes('this.manualSaves = previous.manualSaves + 1'), 'manual save counter increment missing');
assert(rules.includes('this.manualLoads += 1'), 'successful load counter increment missing');
assert(rules.includes('this.score -= SUCCESSFUL_LOAD_PENALTY'), 'load score deduction missing');
assert(rules.includes('writeSave(this);\n\n      this.startEncounter()'), 'load counter/penalty must be persisted before play resumes');
assert(rules.includes('this.manualSaves = previous.manualSaves'), 'failed manual saves must restore the save counter');
assert(rules.includes('this.score = previous.score'), 'failed manual saves must restore score');
assert(rules.includes('manualSaves: integerOrZero(scene.manualSaves)'), 'save counter must persist in save file');
assert(rules.includes('manualLoads: integerOrZero(scene.manualLoads)'), 'load counter must persist in save file');
assert(rules.includes('scorePenalty: integerOrZero(scene.scorePenalty)'), 'total penalty must persist in save file');
assert(rules.includes('saves: integerOrZero(this.manualSaves)'), 'high scores must record saves');
assert(rules.includes('loads: integerOrZero(this.manualLoads)'), 'high scores must record loads');
assert(rules.includes('`SAVES ${saves} • LOADS ${loads} • PENALTY -${penalty}`'), 'leaderboard usage line missing');
assert(index.includes('comet-save-score-v1.js?v=1'), 'save/load scoring script should be loaded with cache bust');
assert(index.indexOf('comet-home-v4.js') < index.indexOf('comet-save-score-v1.js?v=1'), 'scoring patch must load after home-v4 save/leaderboard overrides');

console.log('save/load scoring regression checks passed');
