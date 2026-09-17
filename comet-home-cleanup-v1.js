// Home-screen cleanup: Collection remains available from gameplay/high-score flows, but the top-right
// Home shortcut is removed because it competes with the main navigation hierarchy.
(() => {
  const proto = GameScene.prototype;
  const baseShowHome = proto.showHome;

  function containsCollectionLabel(node) {
    if (!node) return false;
    if (typeof node.text === 'string' && /^COLLECTION\b/.test(node.text)) return true;
    return Array.isArray(node.list) && node.list.some(containsCollectionLabel);
  }

  proto.showHome = function () {
    const value = baseShowHome.call(this);
    for (const child of [...(this.ui?.list || [])]) {
      if (!containsCollectionLabel(child)) continue;
      try { this.ui.remove(child, false); } catch (e) {}
      try { child.destroy(true); } catch (e) {}
    }
    return value;
  };

  window.CometHomeCleanup = Object.freeze({ collectionShortcutRemoved: true });
})();
