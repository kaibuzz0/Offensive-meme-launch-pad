// Canonical first-person UI boundary for the durable road construction ledger.
// No localStorage writes, speculative inventory credits, or optimistic voxel edits.
// #43/#46 wire onCommitted to the shared scene and both renderers.
export function createRoadBuildInteraction(commands, { onCommitted, onFeedback } = {}) {
  if (!commands || typeof commands.read !== 'function' ||
      typeof commands.collectRoadSupplies !== 'function' ||
      typeof commands.placeWorkbench !== 'function')
    throw new TypeError('durable road commands required');
  if (onCommitted !== undefined && typeof onCommitted !== 'function')
    throw new TypeError('onCommitted must be a function');
  if (onFeedback !== undefined && typeof onFeedback !== 'function')
    throw new TypeError('onFeedback must be a function');
  let busy = false;
  let last = null;
  const feedback = (kind, message) => {
    try { onFeedback?.({ kind, message }); } catch { /* presentation cannot undo commit */ }
  };
  async function displayCommitted(record) {
    // Only a validated committed snapshot may be presented. Never treat an
    // animation/render failure as a failed durable transaction to be retried.
    last = structuredClone(record);
    try { await onCommitted?.(structuredClone(last)); }
    catch { feedback('render-error', 'Saved action succeeded; refresh the scene'); }
    return structuredClone(last);
  }
  async function perform(action) {
    if (busy) { feedback('busy', 'Action already in progress'); return null; }
    busy = true;
    try {
      const result = await action();
      await displayCommitted(result);
      feedback('success', 'Saved');
      return structuredClone(result);
    } catch (error) {
      feedback('error', error instanceof Error ? error.message : 'Action failed');
      return null;
    } finally { busy = false; }
  }
  return Object.freeze({
    get busy() { return busy; },
    get snapshot() { return last === null ? null : structuredClone(last); },
    async restore() {
      if (busy) return null;
      busy = true;
      try {
        const record = await commands.read();
        if (record !== null && record !== undefined) return await displayCommitted(record);
        return null;
      } catch (error) {
        feedback('error', error instanceof Error ? error.message : 'Save unavailable');
        return null;
      } finally { busy = false; }
    },
    collect(playerPose) {
      // The command resolves the crate from the seeded world; UI never chooses it.
      const player = playerPose && { x: playerPose.x, y: playerPose.y, z: playerPose.z };
      return perform(() => commands.collectRoadSupplies(player));
    },
    place({ player, position, groundHeight, isOccupied } = {}) {
      // Pass canonical world occupancy through to the existing reducer.
      const input = {
        player: player && { x: player.x, y: player.y, z: player.z },
        position: position && { x: position.x, z: position.z },
        groundHeight, isOccupied
      };
      return perform(() => commands.placeWorkbench(input));
    }
  });
}
