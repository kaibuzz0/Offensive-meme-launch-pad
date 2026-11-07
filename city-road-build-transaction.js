// One-record inventory + voxel edit transition. Caller persists the returned
// state as ONE record; this pure reducer does not claim localStorage CAS safety.
import { createVoxelEditJournal } from './city-sandbox-mining.js';
import { roadWorkbenchVoxel } from './city-road-voxel-placement.js';
export const BUILD_STATE_VERSION = 1;
export function buildWorkbenchState(state, action) {
  if (!state || state.version !== BUILD_STATE_VERSION || typeof state.seed !== 'string' ||
      !state.seed || !Number.isSafeInteger(state.revision) || state.revision < 0 ||
      !state.inventory || !Number.isSafeInteger(state.inventory.supplies) ||
      state.inventory.supplies < 0 || !state.journal) throw new Error('invalid building state');
  if (!action || action.kind !== 'place-workbench' ||
      !Number.isSafeInteger(action.expectedRevision) ||
      action.expectedRevision !== state.revision) throw new Error('stale building action');
  if (state.inventory.supplies < 8) throw new Error('insufficient supplies');
  if (!action.player || !action.position ||
      !Number.isFinite(action.player.x) || !Number.isFinite(action.player.z) ||
      !Number.isFinite(action.position.x) || !Number.isFinite(action.position.z) ||
      Math.hypot(action.player.x-action.position.x,action.player.z-action.position.z) >= 10)
    throw new Error('workbench out of reach');
  const target = roadWorkbenchVoxel(action.position,action.groundHeight);
  const journal = createVoxelEditJournal(state.seed,state.journal);
  // Never spend against a snapshot from a different transaction revision.
  if (journal.revision !== state.revision) throw new Error('building/journal revision mismatch');\n  // Journal.has only detects player edits; generated terrain must be checked too.
  // A caller without a canonical occupancy query must not place blindly.
  if (typeof action.isOccupied !== 'function') throw new Error('world occupancy query required');
  if (journal.has(target.x,target.y,target.z) || action.isOccupied(target.x,target.y,target.z) !== false)
    throw new Error('occupied voxel');
  const result = journal.apply({...target,block:'workbench'},journal.revision);
  if (!result.changed) throw new Error('unchanged placement');
  return {
    ...state,
    revision: state.revision + 1,
    inventory: {...state.inventory,supplies:state.inventory.supplies-8},
    journal: journal.snapshot()
  };
}
