/**
 * Simple Canvas API proxy — bypasses CORS for local dev.
 * Run: node canvas-proxy.js
 * Forwards all requests to canvas.bellevuecollege.edu with CORS headers.
 */
const http = require('http');
const https = require('https');

const PORT = 3001;
const TARGET_HOST = 'canvas.bellevuecollege.edu';

const server = http.createServer((req, res) => {
  // Allow all origins (local dev only)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, Accept');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const options = {
    hostname: TARGET_HOST,
    port: 443,
    path: req.url,
    method: req.method,
    headers: {
      ...req.headers,
      host: TARGET_HOST,
    },
  };

  // Don't forward the origin/referer to avoid Canvas rejecting it
  delete options.headers['origin'];
  delete options.headers['referer'];

  const proxy = https.request(options, (proxyRes) => {
    const headers = { ...proxyRes.headers };
    // Override Canvas CORS headers with our permissive ones
    headers['access-control-allow-origin'] = '*';
    res.writeHead(proxyRes.statusCode, headers);
    proxyRes.pipe(res, { end: true });
  });

  proxy.on('error', (err) => {
    console.error('Proxy error:', err.message);
    res.writeHead(502);
    res.end(JSON.stringify({ error: err.message }));
  });

  req.pipe(proxy, { end: true });
});

server.listen(PORT, () => {
  console.log(`\n✅ Canvas proxy running at http://localhost:${PORT}`);
  console.log(`   Forwarding → https://${TARGET_HOST}\n`);
});
