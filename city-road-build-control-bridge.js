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
    try { if (!disposed) onStatus?.({ kind, message }); } catch { /* UI failure cannot change save */ }
  }
  async function run(kind) {
    // Paused scenes, menus and inactive game views must not spend supplies.
    // Sample activity at action time, including touch actions.
    if (disposed || active || interaction.busy) return false;
    active = true;
    try {
      if (!isGameplayActive()) return false;
      // Sample the live player pose only on explicit input; never cache a
      // position from before travel or a previous scene.
      const pose = getPlayerPose();
      if (!pose || ![pose.x, pose.y, pose.z].every(Number.isFinite))
        throw new TypeError('Current player position unavailable');
      let placement;
      if (kind === 'place') {
        placement = getPlacement();
        if (!placement || !placement.position ||
            ![placement.position.x, placement.position.z, placement.groundHeight].every(Number.isFinite) ||
            typeof placement.isOccupied !== 'function')
          throw new TypeError('Canonical placement query unavailable');
      }
      const result = kind === 'collect'
        ? await interaction.collect(pose)
        : await interaction.place({ ...placement, player: pose });
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
  function isEditingTarget(node) {
    // Keyboard events can originate inside nested editable widgets or shadow DOM.
    // Do not consume construction shortcuts while an ancestor owns text input.
    for (let current = node, depth = 0; current && depth < 32; depth++) {
      if (current.isContentEditable ||
          ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A'].includes(current.tagName))
        return true;
      current = current.parentElement || current.parentNode || current.host;
    }
    return false;
  }
  const onKey = event => {
    if (disposed || event.repeat || event.defaultPrevented ||
        event.altKey || event.ctrlKey || event.metaKey || event.isComposing || event.keyCode === 229 ||
        (isEditingTarget(event.target) ||
         (typeof event.composedPath === 'function' && event.composedPath().some(isEditingTarget))))
      return;
    const key = event.key?.toLowerCase();
    if (key !== 'e' && key !== 'b') return;
    // Do not intercept ordinary E/B keys while the game is paused or inactive.
    // run() independently rechecks activity before any durable command.
    try { if (!isGameplayActive()) return; }
    catch { return; }
    if (disposed || active || interaction.busy) return;
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
