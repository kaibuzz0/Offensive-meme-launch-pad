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
    let rendered = true;
    try { await onCommitted?.(structuredClone(last)); }
    catch { rendered = false; feedback('render-error', 'Saved action succeeded; refresh the scene'); }
    return { record: structuredClone(last), rendered };
  }
  async function publishIfCurrent(record) {
    // Conflict recovery must obey the same monotonic revision rule as restore.
    if (last && Number.isSafeInteger(last.revision) &&
        Number.isSafeInteger(record?.revision) && record.revision < last.revision)
      return null;
    return displayCommitted(record);
  }
  async function perform(action) {
    if (busy) { feedback('busy', 'Action already in progress'); return null; }
    busy = true;
    try {
      const result = await action();
      // A command must return its committed record; null/undefined is not a save.
      // Never publish a success or replace the visible snapshot for an empty result.
      if (result === null || result === undefined) {
        feedback('error', 'No committed construction record returned');
        return null;
      }
      // A delayed command response must never roll the scene back behind a
      // newer committed snapshot (for example, after another session refresh).
      if (last && Number.isSafeInteger(last.revision) &&
          Number.isSafeInteger(result.revision) && result.revision < last.revision) {
        feedback('error', 'Stale construction result; refresh the scene');
        return null;
      }
      const presentation = await displayCommitted(result);
      if (presentation.rendered) feedback('success', 'Saved');
      return structuredClone(result);
    } catch (error) {
      // A second tab may have won the durable compare-and-swap. Re-read the
      // committed state instead of leaving the visible inventory/edits stale.
      // Never retry the action automatically: pickup and spending are not
      // safe to replay without fresh player intent and world validation.
      if (error instanceof Error && /changed in another session/.test(error.message)) {
        try {
          const current = await commands.read();
          if (current != null) await publishIfCurrent(current);
        } catch { /* preserve the original transaction error */ }
      }
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
        if (record === null || record === undefined) return null;
        // A delayed IndexedDB read (or a cross-tab change) cannot replace a
        // newer committed snapshot already presented by another interaction.
        if (last && Number.isSafeInteger(last.revision) &&
            Number.isSafeInteger(record.revision) && record.revision < last.revision) {
          feedback('error', 'Stale saved construction state; refresh again');
          return structuredClone(last);
        }
        return (await displayCommitted(record)).record;
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
