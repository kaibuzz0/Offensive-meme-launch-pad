// Pure, non-destructive legacy import preparation. No storage writes here.
// The caller must keep the original localStorage keys, validate the result,
// and activate it only through a durable compare-and-swap/initialization gate.
import { createVoxelEditJournal } from './city-sandbox-mining.js';
import { validateBuildRecord } from './city-road-build-save-validation.js';

export function prepareLegacyWorkbenchImport(current, mapped) {
  validateBuildRecord(current);
  if (!mapped || mapped.status !== 'mapped' || !mapped.target)
    throw new Error('legacy mapping not approved');
  const { x, y, z } = mapped.target;
  if (![x, y, z].every(Number.isSafeInteger))
    throw new Error('invalid mapped workbench');
  const journal = createVoxelEditJournal(current.seed, current.journal);
  // Do not merge legacy ownership into an active journal without a separately
  // reviewed conflict-resolution policy; preserve both originals instead.
  if (current.revision !== 0 || journal.size !== 0)
    throw new Error('nonempty canonical save requires manual reconciliation');
  if (mapped.craftedTorch === true)
    throw new Error('legacy torch craft needs explicit inventory mapping');
  const applied = journal.apply({ x, y, z, block: 'workbench' }, 0);
  if (!applied.changed) throw new Error('legacy workbench not applied');
  // Already-built legacy structures must NOT debit eight supplies again.
  const next = {
    ...current,
    revision: 1,
    inventory: { ...current.inventory },
    journal: journal.snapshot()
  };
  validateBuildRecord(next);
  return next;
}
