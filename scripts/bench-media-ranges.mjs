// Reproducible local-only media range benchmark. Node >=22.
// Run on main and the PR branch with: node scripts/bench-media-ranges.mjs
// This is a process RSS/latency probe, NOT a browser or Android GPU benchmark.
import {spawn} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {once} from 'node:events';
import {performance} from 'node:perf_hooks';
import {setTimeout as delay} from 'node:timers/promises';

const requests = Number(process.env.MEDIA_BENCH_REQUESTS || 64);
const concurrency = Number(process.env.MEDIA_BENCH_CONCURRENCY || 16);
if (!Number.isSafeInteger(requests) || requests < 1 || requests > 1000 ||
    !Number.isSafeInteger(concurrency) || concurrency < 1 || concurrency > 128) {
  throw new Error('Requests must be 1..1000 and concurrency 1..128');
}
// Isolate server allocations from the benchmark's HTTP clients.
// Linux /proc RSS measures only the server child, not the parent client process.
if (process.platform !== 'linux') throw new Error('Server-only RSS sampling requires Linux /proc');
const childCode = `
import {createCityServer} from './server/city-server.mjs';
const {server} = createCityServer();
server.listen(0, '127.0.0.1', () => process.stdout.write(String(server.address().port) + '\\n'));
process.on('SIGTERM', () => server.close(() => process.exit(0)));
`;
const child = spawn(process.execPath, ['--input-type=module', '-e', childCode], {
  cwd: new URL('..', import.meta.url), stdio: ['ignore', 'pipe', 'pipe'],
});
let stderr = '';
child.stderr.setEncoding('utf8');
child.stderr.on('data', chunk => { stderr = (stderr + chunk).slice(-4096); });
const port = await new Promise((resolve, reject) => {
  let buffer = '';
  child.once('error', reject);
  child.once('exit', code => reject(new Error(`Server exited before ready (${code}): ${stderr}`)));
  child.stdout.setEncoding('utf8');
  child.stdout.on('data', chunk => {
    buffer += chunk;
    const line = buffer.split('\n')[0];
    if (buffer.includes('\n')) {
      const value = Number(line);
      if (!Number.isInteger(value) || value < 1) reject(new Error(`Invalid server port: ${line}`));
      else resolve(value);
    }
  });
});
const url = `http://127.0.0.1:${port}/assets/media/meme-city-trailer.mp4`;
const serverRss = () => {
  const status = readFileSync(`/proc/${child.pid}/status`, 'utf8');
  const kb = Number(status.match(/^VmRSS:\s+(\d+) kB/m)?.[1]);
  if (!Number.isFinite(kb)) throw new Error('Missing server VmRSS');
  return kb * 1024;
};
const latencies = [];
let peakRss = serverRss();
const baselineRss = peakRss;
const sample = setInterval(() => { peakRss = Math.max(peakRss, serverRss()); }, 5);
const started = performance.now();
let next = 0;
let completed = 0;
const errors = [];
try {
  await Promise.all(Array.from({length: Math.min(concurrency, requests)}, async () => {
    while (next < requests) {
      const index = next++;
      const t = performance.now();
      try {
        const response = await fetch(url, {
          headers: {Range: `bytes=${index % 32}-${index % 32 + 1023}`},
          cache: 'no-store',
        });
        const body = await response.arrayBuffer();
        if (response.status !== 206 || body.byteLength !== 1024 ||
            !response.headers.get('content-range')?.startsWith('bytes ')) {
          throw new Error(`Unexpected response ${response.status}, ${body.byteLength} bytes`);
        }
        latencies.push(performance.now() - t);
        completed++;
      } catch (error) {
        errors.push(String(error));
      }
    }
  }));
  await delay(10);
} finally {
  clearInterval(sample);
  peakRss = Math.max(peakRss, serverRss());
  child.kill('SIGTERM');
  await once(child, 'exit');
}
latencies.sort((a,b)=>a-b);
const percentile = p => latencies.length ? Number(latencies[Math.ceil(p*latencies.length)-1].toFixed(2)) : null;
const report = {
  benchmark: 'media-range-server-only-rss-v2', node: process.version,
  requests, concurrency, completed, failures: errors.length,
  sampleMs: 5, serverPid: child.pid, elapsedMs: Number((performance.now()-started).toFixed(2)),
  baselineRssMiB: Number((baselineRss/1048576).toFixed(2)),
  peakRssMiB: Number((peakRss/1048576).toFixed(2)),
  observedRssDeltaMiB: Number(((peakRss-baselineRss)/1048576).toFixed(2)),
  p50LatencyMs: percentile(.5), p95LatencyMs: percentile(.95),
  firstErrors: errors.slice(0,3),
  caveat: 'Linux /proc server-child RSS sampled every 5ms can miss short spikes; repeat on the same host/Node version.',
};
console.log(JSON.stringify(report,null,2));
if (errors.length) process.exitCode = 1;
