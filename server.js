import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 5500;
const DIRECTORY = __dirname;

const MIME_MAP = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon'
};

const server = http.createServer(async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const urlPath = req.url.split('?')[0].split('#')[0];

  // API Proxy Endpoints (matching server.py)
  if (req.method === 'POST' && urlPath === '/api/kick-token') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const reqData = JSON.parse(body);
        const code = reqData.code;
        const clientId = reqData.client_id || '01M0VT0JC58YQEVGRHM8JFXQX3';
        const clientSecret = reqData.client_secret || 'ee10e46fccf83a105e86834973db23cabcad279f33acf48bd4f6b5749884bb20';
        const redirectUri = reqData.redirect_uri || `http://localhost:${PORT}/`;
        const codeVerifier = reqData.code_verifier;

        const tokenParams = new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: clientId,
          client_secret: clientSecret,
          code: code,
          redirect_uri: redirectUri
        });
        if (codeVerifier) tokenParams.append('code_verifier', codeVerifier);

        const response = await fetch('https://id.kick.com/oauth/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
          },
          body: tokenParams.toString()
        });

        const data = await response.text();
        res.writeHead(response.status, { 'Content-Type': 'application/json' });
        res.end(data);
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // Static File Serving
  let filePath = urlPath === '/' ? '/index.html' : urlPath;
  const safePath = path.normalize(path.join(DIRECTORY, filePath));

  // Security Check: prevent directory traversal
  if (!safePath.startsWith(DIRECTORY)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Access Denied');
    return;
  }

  fs.stat(safePath, (err, stats) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end(`File Not Found: ${urlPath}`);
      return;
    }

    let targetFile = safePath;
    if (stats.isDirectory()) {
      targetFile = path.join(safePath, 'index.html');
    }

    fs.readFile(targetFile, (err, data) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end(`File Not Found: ${urlPath}`);
        return;
      }

      const ext = path.extname(targetFile).toLowerCase();
      const contentType = MIME_MAP[ext] || 'application/octet-stream';

      res.writeHead(200, {
        'Content-Type': contentType,
        'Content-Length': data.length,
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      });
      res.end(data);
    });
  });
});

server.listen(PORT, () => {
  console.log(`[*] ORBIMOD — HTTP Server active on http://localhost:${PORT}`);
});
