// Reproducible local-only media range benchmark. Node >=22.
// Run on main and the PR branch with: node scripts/bench-media-ranges.mjs
// This is a process RSS/latency probe, NOT a browser or Android GPU benchmark.
import {createCityServer} from '../server/city-server.mjs';
import {performance} from 'node:perf_hooks';
import {setTimeout as delay} from 'node:timers/promises';

const requests = Number(process.env.MEDIA_BENCH_REQUESTS || 64);
const concurrency = Number(process.env.MEDIA_BENCH_CONCURRENCY || 16);
if (!Number.isSafeInteger(requests) || requests < 1 || requests > 1000 ||
    !Number.isSafeInteger(concurrency) || concurrency < 1 || concurrency > 128) {
  throw new Error('Requests must be 1..1000 and concurrency 1..128');
}
const {server} = createCityServer();
await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', resolve);
});
const address = server.address();
const url = `http://127.0.0.1:${address.port}/assets/media/meme-city-trailer.mp4`;
const latencies = [];
let peakRss = process.memoryUsage().rss;
const baselineRss = peakRss;
const sample = setInterval(() => { peakRss = Math.max(peakRss, process.memoryUsage().rss); }, 5);
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
  peakRss = Math.max(peakRss, process.memoryUsage().rss);
  await new Promise(resolve => server.close(resolve));
}
latencies.sort((a,b)=>a-b);
const percentile = p => latencies.length ? Number(latencies[Math.ceil(p*latencies.length)-1].toFixed(2)) : null;
const report = {
  benchmark: 'media-range-rss-v1', node: process.version,
  requests, concurrency, completed, failures: errors.length,
  sampleMs: 5, elapsedMs: Number((performance.now()-started).toFixed(2)),
  baselineRssMiB: Number((baselineRss/1048576).toFixed(2)),
  peakRssMiB: Number((peakRss/1048576).toFixed(2)),
  observedRssDeltaMiB: Number(((peakRss-baselineRss)/1048576).toFixed(2)),
  p50LatencyMs: percentile(.5), p95LatencyMs: percentile(.95),
  firstErrors: errors.slice(0,3),
  caveat: 'RSS sampling can miss short spikes; compare fresh Node processes on the same host and repeat runs.',
};
console.log(JSON.stringify(report,null,2));
if (errors.length) process.exitCode = 1;
