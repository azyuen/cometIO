// Attach a stable named identity to generated opponents without changing encounter physics.
(() => {
  const basePickOpponent = GameScene.prototype.pickOpponent;

  GameScene.prototype.pickOpponent = function () {
    const object = basePickOpponent.call(this);
    const identity = pickCometNamedIdentity(object.name);
    if (!identity) return object;

    object.identityId = identity.id;
    object.realName = identity.name;
    object.namedSpriteBase = identity.spriteVariant;
    object.scienceClass = identity.scienceClass;
    object.identityStatus = identity.status;
    return object;
  };
})();
