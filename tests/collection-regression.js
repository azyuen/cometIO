const fs = require('fs');

const collection = fs.readFileSync('comet-collection-v1.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');
const identities = fs.readFileSync('comet-identities.js', 'utf8');

function assert(ok, message) { if (!ok) throw new Error(message); }

assert(collection.includes('const UNIQUE_COLLECTION_BONUS = 200;'), 'unique collection bonus must remain modest and explicit');
assert(collection.includes("pending?.success && pending.choice === 'ABSORB'"), 'collection must only register successful absorbs');
assert(collection.includes("!collected.includes(identityId)"), 'collection must only score first-time identities');
assert(collection.includes('this.score = numberOrZero(this.score) + UNIQUE_COLLECTION_BONUS;'), 'first-time collection bonus must affect score');

assert(collection.includes('cometIdentityPoolForTier(object.name).filter(identity => !collected.has(identity.id))'), 'collected identities must be excluded from future named encounters');
assert(collection.includes('return stripNamedIdentity(object);'), 'exhausted named pools must fall back to generic encounters');
assert(collection.includes('object.realName = object.name;'), 'generic fallback must not reuse a named tier example');

assert(collection.includes('data.collectedIdentityIds = [...sceneCollection(scene)];'), 'save file must persist collection ids');
assert(collection.includes('data.collectionBonusScore = integerOrZero(scene.collectionBonusScore);'), 'save file must persist collection bonus');
assert(collection.includes('data.version = Math.max(5'), 'collection save schema must advance to v5');
assert(collection.includes('this.collectedIdentityIds = savedIds;'), 'load must restore collection before encounter generation');
assert(collection.includes('function savedCollectionSnapshot()'), 'home must be able to inspect collection without loading the save first');
assert(collection.includes('const saved = !this.runActive ? savedCollectionSnapshot() : null;'), 'fresh-launch home must use saved collection state');

assert(collection.includes('collection,'), 'high-score entry must snapshot collection');
assert(collection.includes('collectionBonusScore: integerOrZero(this.collectionBonusScore)'), 'high-score entry must snapshot collection bonus');
assert(collection.includes("'TAP A SCORE TO VIEW ITS COLLECTION'"), 'high-score UI must advertise collection drill-down');
assert(collection.includes("hit.on('pointerdown', () => this.showCollection({ score, returnTo }))"), 'high-score cards must open their collection snapshot');
assert(collection.includes('GameScene.prototype.showCollection'), 'collection screen must exist');
assert(collection.includes('COLLECTION ${ids.length}/${TOTAL_UNIQUE_OBJECTS}'), 'home must expose collection tab/count');

assert(identities.includes('const COMET_NAMED_IDENTITIES = ['), 'collection source of truth must be named identity registry');
assert(index.includes('<script src="comet-collection-v1.js?v=1"></script>'), 'collection module must load');
assert(index.indexOf('comet-collection-v1.js?v=1') > index.indexOf('comet-sprite-stability.js?v=3'), 'collection wrapper must load after existing gameplay/UI wrappers');

console.log('unique collection regression checks passed');
