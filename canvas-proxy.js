/**
 * Workspace proxy server — bypasses CORS for Canvas LMS + Anthropic APIs.
 *
 * Routes:
 *   /api/*    /login/*    → Canvas school (from X-Canvas-Base header, default bc.instructure.com)
 *   /claude/*             → https://api.anthropic.com/v1/*
 *
 * Deploy to Railway / Render / Fly.io as a Node.js service.
 * Set PORT env var if needed (defaults to 3001).
 */
const http  = require('http');
const https = require('https');
const dns   = require('dns');

const PORT         = parseInt(process.env.PORT || '3001', 10);
const DEFAULT_CANVAS_HOST = 'bc.instructure.com';
const CLAUDE_HOST  = 'api.anthropic.com';

// Use Google DNS — avoids EAI_AGAIN on some hosts
const resolver = new dns.Resolver();
resolver.setServers(['8.8.8.8', '8.8.4.4']);

// DNS cache: host → IP
const ipCache = {};

function resolveHost(host, cb) {
  if (ipCache[host]) { cb(null, ipCache[host]); return; }
  resolver.resolve4(host, (err, addrs) => {
    if (!err && addrs?.length) ipCache[host] = addrs[0];
    cb(err, addrs?.[0]);
  });
}

function forwardTo(req, res, targetHost, targetPath) {
  resolveHost(targetHost, (err, ip) => {
    if (err || !ip) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: `Cannot resolve ${targetHost}: ${err?.message}` }));
      return;
    }

    const headers = { ...req.headers, host: targetHost };
    // Strip headers that break proxying
    delete headers['origin'];
    delete headers['referer'];
    delete headers['accept-encoding'];
    delete headers['transfer-encoding'];
    delete headers['x-canvas-base']; // don't forward our internal header

    const options = {
      host: ip, hostname: targetHost, servername: targetHost,
      port: 443, path: targetPath, method: req.method, headers,
    };

    const proxy = https.request(options, (proxyRes) => {
      const out = { ...proxyRes.headers, 'access-control-allow-origin': '*' };
      res.writeHead(proxyRes.statusCode, out);
      proxyRes.pipe(res, { end: true });
    });

    proxy.on('error', (e) => {
      console.error(`[proxy error → ${targetHost}]`, e.message);
      if (!res.headersSent) {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });

    req.pipe(proxy, { end: true });
  });
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers',
    'Authorization, Content-Type, Accept, x-api-key, anthropic-version, anthropic-beta, X-Canvas-Base');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const path = req.url || '/';

  if (path === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }

  if (path.startsWith('/claude')) {
    const apiPath = '/v1' + path.replace('/claude', '');
    console.log(`[Claude] ${req.method} ${apiPath}`);
    forwardTo(req, res, CLAUDE_HOST, apiPath);
  } else {
    // Determine Canvas host: use X-Canvas-Base header if provided, strip https://
    const rawBase = req.headers['x-canvas-base'] || '';
    const canvasHost = rawBase.replace(/^https?:\/\//, '') || DEFAULT_CANVAS_HOST;
    console.log(`[Canvas → ${canvasHost}] ${req.method} ${path}`);
    forwardTo(req, res, canvasHost, path);
  }
});

server.listen(PORT, () => {
  console.log(`\n✅ Proxy running at http://localhost:${PORT}`);
  console.log(`   /api/* /login/* → Canvas (per X-Canvas-Base header, default: ${DEFAULT_CANVAS_HOST})`);
  console.log(`   /claude/*       → https://${CLAUDE_HOST}/v1/*\n`);
});
