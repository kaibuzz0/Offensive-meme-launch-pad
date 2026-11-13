// DOM controls for the canonical first-person construction interaction.
// The game entry owns camera/world queries and must supply the same authoritative
// world collision data used by the renderer. Never create a second inventory store.
export function attachRoadBuildControls({
  interaction, target = document, collectButton, placeButton,
  getPlayerPose, getPlacement, isGameplayActive = () => true, onStatus
} = {}) {
  if (!interaction || typeof interaction.collect !== 'function' ||
      typeof interaction.place !== 'function' ||
      typeof getPlayerPose !== 'function' ||
      typeof getPlacement !== 'function')
    throw new TypeError('construction interaction and world queries required');
  if (!target || typeof target.addEventListener !== 'function' ||
      typeof target.removeEventListener !== 'function')
    throw new TypeError('event target required');
  if (typeof isGameplayActive !== 'function')
    throw new TypeError('isGameplayActive must be a function');
  let disposed = false;
  let active = false;
  const listeners = [];
  function listen(node, event, handler) {
    if (!node) return;
    node.addEventListener(event, handler);
    listeners.push(() => node.removeEventListener(event, handler));
  }
  function status(kind, message) {
    try { onStatus?.({ kind, message }); } catch { /* UI failure cannot change save */ }
  }
  async function run(kind) {
    // Paused scenes, menus and inactive game views must not spend supplies.
    // Sample activity at action time, including touch actions.
    if (disposed || active || interaction.busy || !isGameplayActive()) return false;
    active = true;
    try {
      // Sample the live player pose only on explicit input; never cache a
      // position from before travel or a previous scene.
      const pose = getPlayerPose();
      const result = kind === 'collect'
        ? await interaction.collect(pose)
        : await interaction.place({ ...getPlacement(), player: pose });
      if (!result || !Number.isSafeInteger(result.revision) || result.revision < 0) {
        status('error', 'Construction action not committed');
        return false;
      }
      // Durable commit is not proof that the renderer displayed the change.
      status('saved', kind === 'collect' ? 'Supplies saved; scene may need refresh' : 'Build saved; scene may need refresh');
      return true;
    } catch (error) {
      status('error', error instanceof Error ? error.message : 'Construction unavailable');
      return false;
    } finally {
      active = false;
    }
  }
  const onKey = event => {
    if (disposed || event.repeat || event.defaultPrevented ||
        event.altKey || event.ctrlKey || event.metaKey ||
        event.target?.isContentEditable ||
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target?.tagName))
      return;
    const key = event.key?.toLowerCase();
    if (key !== 'e' && key !== 'b') return;
    event.preventDefault?.();
    void run(key === 'e' ? 'collect' : 'place');
  };
  listen(target, 'keydown', onKey);
  listen(collectButton, 'click', () => { void run('collect'); });
  listen(placeButton, 'click', () => { void run('place'); });
  return Object.freeze({
    collect: () => run('collect'),
    place: () => run('place'),
    dispose() {
      disposed = true;
      for (const remove of listeners.splice(0)) remove();
    }
  });
}
