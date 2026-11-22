// QA-only live resource audit. Node >=22; no dependencies or browser claims.
const base = new URL(process.argv[2] || 'https://kaibuzz0.github.io/Offensive-meme-launch-pad/');
if (base.protocol !== 'https:' && base.hostname !== 'localhost') throw new Error('Use HTTPS or localhost');
const paths = ['','city.html','sw.js','offline.html'];
const timeoutMs = 12000;
for (const path of paths) {
  const url = new URL(path, base);
  if (url.origin !== base.origin) throw new Error('Cross-origin audit refused');
  const started = performance.now();
  try {
    const response = await fetch(url, {method:'GET', signal:AbortSignal.timeout(timeoutMs), cache:'no-store'});
    const reader = response.body?.getReader();
    let bytes = 0;
    const cap = 12 * 1024 * 1024;
    let capped = false;
    if (reader) {
      while (true) {
        const {done,value} = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > cap) { capped = true; await reader.cancel(); break; }
      }
    }
    const declared = response.headers.get('content-length');
    const record = {
      url:url.href, status:response.status, contentType:response.headers.get('content-type'),
      contentEncoding:response.headers.get('content-encoding'), declaredBytes:declared,
      measuredBytes:bytes, measurementCapped:capped,
      elapsedMs:Math.round(performance.now()-started),
      cacheControl:response.headers.get('cache-control'),
      serviceWorkerAllowed:response.headers.get('service-worker-allowed')
    };
    console.log(JSON.stringify(record));
    if (!response.ok || capped) process.exitCode = 1;
  } catch (error) {
    console.error(JSON.stringify({url:url.href,error:String(error)}));
    process.exitCode = 1;
  }
}
