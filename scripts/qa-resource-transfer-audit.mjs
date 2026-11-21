// Analyze a JSON export of PerformanceResourceTiming entries from a browser session.
// No browser instrumentation is installed into the game; captures are opt-in.
import { readFileSync } from 'node:fs';

export function auditTransfers(input) {
  if (!Array.isArray(input)) throw new TypeError('Expected a resource timing array');
  const byUrl = new Map();
  let totalTransfer = 0;
  let unknownSize = 0;
  for (const entry of input) {
    if (!entry || typeof entry.name !== 'string' || !/^https?:\/\//.test(entry.name)) throw new TypeError('Invalid resource URL');
    const bytes = entry.transferSize;
    if (!Number.isSafeInteger(bytes) || bytes < 0) { unknownSize++; continue; }
    const key = new URL(entry.name).href;
    const item = byUrl.get(key) || { url: key, requests: 0, transferredBytes: 0 };
    item.requests++;
    item.transferredBytes += bytes;
    totalTransfer += bytes;
    byUrl.set(key, item);
  }
  return {
    entries: input.length,
    measuredEntries: input.length - unknownSize,
    unknownSize,
    totalTransferBytes: totalTransfer,
    repeatedUrls: [...byUrl.values()].filter(x => x.requests > 1).sort((a,b) => b.transferredBytes - a.transferredBytes),
    note: 'Repeated URLs are diagnostic leads, not proof of duplicate downloads: cached requests may have zero transferSize. Cross-origin timing may be restricted.'
  };
}

if (process.argv[1] && import.meta.url === new URL('file://' + process.argv[1]).href) {
  try {
    const result = auditTransfers(JSON.parse(readFileSync(process.argv[2], 'utf8')));
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
