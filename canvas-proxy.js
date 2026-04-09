/**
 * Canvas API proxy — bypasses CORS for local dev.
 * Uses Google DNS (8.8.8.8) to avoid Windows DNS issues.
 * Run: node canvas-proxy.js
 */
const http = require('http');
const https = require('https');
const dns = require('dns');
const net = require('net');

const PORT = 3001;
const TARGET_HOST = 'bc.instructure.com';

// Use Google DNS to avoid EAI_AGAIN on Windows
const resolver = new dns.Resolver();
resolver.setServers(['8.8.8.8', '8.8.4.4']);

// Resolve hostname once at startup, cache the IP
let resolvedIP = null;

resolver.resolve4(TARGET_HOST, (err, addresses) => {
  if (err) {
    console.error(`⚠️  Cannot resolve ${TARGET_HOST} even via Google DNS: ${err.message}`);
    console.error('   You may not be connected to the internet.\n');
  } else {
    resolvedIP = addresses[0];
    console.log(`   Resolved ${TARGET_HOST} → ${resolvedIP} (via Google DNS)\n`);
  }
});

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, Accept');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (!resolvedIP) {
    // Try to resolve again on-demand
    resolver.resolve4(TARGET_HOST, (err, addresses) => {
      if (err) {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: `Cannot resolve ${TARGET_HOST}. Check your internet connection.` }));
        return;
      }
      resolvedIP = addresses[0];
      forward(req, res);
    });
    return;
  }

  forward(req, res);
});

function forward(req, res) {
  const options = {
    host: resolvedIP,        // Use IP directly (bypasses DNS)
    hostname: TARGET_HOST,   // For SNI / TLS certificate validation
    servername: TARGET_HOST, // Explicit SNI
    port: 443,
    path: req.url,
    method: req.method,
    headers: {
      ...req.headers,
      host: TARGET_HOST,
    },
  };

  delete options.headers['origin'];
  delete options.headers['referer'];

  const proxy = https.request(options, (proxyRes) => {
    const headers = { ...proxyRes.headers };
    headers['access-control-allow-origin'] = '*';
    res.writeHead(proxyRes.statusCode, headers);
    proxyRes.pipe(res, { end: true });
  });

  proxy.on('error', (err) => {
    console.error('Proxy error:', err.message);
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message }));
  });

  req.pipe(proxy, { end: true });
}

server.listen(PORT, () => {
  console.log(`\n✅ Canvas proxy running at http://localhost:${PORT}`);
  console.log(`   Forwarding → https://${TARGET_HOST}`);
});
