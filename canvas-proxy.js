/**
 * Local dev proxy — bypasses CORS for Canvas + Anthropic APIs.
 * Uses Google DNS (8.8.8.8) to avoid Windows DNS issues.
 * Run: node canvas-proxy.js
 *
 * Routes:
 *   /api/*        → https://bc.instructure.com
 *   /claude/*     → https://api.anthropic.com/v1/*
 */
const http = require('http');
const https = require('https');
const dns = require('dns');

const PORT = 3001;
const CANVAS_HOST = 'bc.instructure.com';
const CLAUDE_HOST = 'api.anthropic.com';

// Use Google DNS to avoid EAI_AGAIN on Windows
const resolver = new dns.Resolver();
resolver.setServers(['8.8.8.8', '8.8.4.4']);

let canvasIP = null;
let claudeIP = null;

function resolveHost(host, label, onDone) {
  resolver.resolve4(host, (err, addresses) => {
    if (err) {
      console.error(`⚠️  Cannot resolve ${host}: ${err.message}`);
    } else {
      console.log(`   ✓ ${label}: ${host} → ${addresses[0]} (Google DNS)`);
      onDone(addresses[0]);
    }
  });
}

resolveHost(CANVAS_HOST, 'Canvas ', (ip) => { canvasIP = ip; });
resolveHost(CLAUDE_HOST, 'Claude ', (ip) => { claudeIP = ip; });

const server = http.createServer((req, res) => {
  // CORS headers for every response
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, Accept, x-api-key, anthropic-version, anthropic-beta');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const path = req.url || '/';

  if (path.startsWith('/claude')) {
    // Forward to Anthropic API
    const anthropicPath = '/v1' + path.replace('/claude', '');
    console.log(`[Claude] ${req.method} ${anthropicPath}`);
    forwardTo(req, res, CLAUDE_HOST, claudeIP, anthropicPath, 'Claude');
  } else {
    // Forward to Canvas
    console.log(`[Canvas] ${req.method} ${path}`);
    forwardTo(req, res, CANVAS_HOST, canvasIP, path, 'Canvas');
  }
});

function forwardTo(req, res, targetHost, resolvedIP, path, label) {
  const doForward = (ip) => {
    const options = {
      host: ip,
      hostname: targetHost,
      servername: targetHost,
      port: 443,
      path: path,
      method: req.method,
      headers: {
        ...req.headers,
        host: targetHost,
      },
    };

    // Strip browser-only headers that confuse upstream APIs
    delete options.headers['origin'];
    delete options.headers['referer'];
    // Remove encoding headers that can cause issues with piping
    delete options.headers['accept-encoding'];
    delete options.headers['transfer-encoding'];

    const proxy = https.request(options, (proxyRes) => {
      const headers = { ...proxyRes.headers };
      headers['access-control-allow-origin'] = '*';
      res.writeHead(proxyRes.statusCode, headers);
      proxyRes.pipe(res, { end: true });
    });

    proxy.on('error', (err) => {
      console.error(`[${label}] Proxy error:`, err.message);
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    });

    req.pipe(proxy, { end: true });
  };

  if (resolvedIP) {
    doForward(resolvedIP);
  } else {
    // Re-resolve on demand if startup resolution failed
    resolver.resolve4(targetHost, (err, addresses) => {
      if (err) {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: `Cannot resolve ${targetHost}: ${err.message}` }));
        return;
      }
      doForward(addresses[0]);
    });
  }
}

server.listen(PORT, () => {
  console.log(`\n✅ Proxy running at http://localhost:${PORT}`);
  console.log(`   /api/*    → https://${CANVAS_HOST}`);
  console.log(`   /claude/* → https://${CLAUDE_HOST}/v1/*\n`);
});
