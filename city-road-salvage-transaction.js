// Seed-scoped roadside salvage transaction. Uses the same revisioned voxel journal
// as construction so inventory credit and the consumed pickup marker commit together.
// Caller must derive the crate location from the canonical seeded world, not UI input.
import { createVoxelEditJournal, VOXEL_METRES } from './city-sandbox-mining.js';
import { validateBuildRecord } from './city-road-build-save-validation.js';

export function salvageRoadSupplies(state, { player, crate, expectedRevision }) {
  validateBuildRecord(state);
  if (expectedRevision !== state.revision) throw new Error('stale salvage action');
  if (state.revision >= Number.MAX_SAFE_INTEGER) throw new RangeError('revision exhausted');
  if (!player || !crate || ![player.x, player.y, player.z, crate.x, crate.y, crate.z]
      .every(Number.isFinite)) throw new Error('invalid salvage position');
  // Crate coordinates are voxel-space; player coordinates are world metres.
  if (![crate.x, crate.y, crate.z].every(Number.isSafeInteger))
    throw new Error('invalid crate voxel');
  const center = [crate.x, crate.y, crate.z].map(v => (v + .5) * VOXEL_METRES);
  if (Math.hypot(player.x-center[0], player.y-center[1], player.z-center[2]) > 4)
    throw new Error('salvage out of reach');
  const journal = createVoxelEditJournal(state.seed, state.journal);
  if (journal.revision !== state.revision) throw new Error('revision mismatch');
  if (journal.has(crate.x,crate.y,crate.z))
    throw new Error('road supplies already collected or voxel edited');
  if (state.inventory.supplies > Number.MAX_SAFE_INTEGER - 8)
    throw new RangeError('inventory capacity exceeded');
  journal.apply({x:crate.x,y:crate.y,z:crate.z,block:'salvaged-crate'},journal.revision);
  const next = {
    ...state, revision:state.revision+1,
    inventory:{...state.inventory,supplies:state.inventory.supplies+8},
    journal:journal.snapshot()
  };
  validateBuildRecord(next);
  return next;
}
