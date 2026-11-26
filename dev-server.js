const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const page = path.join(__dirname, 'index.html');
const port = Number(process.env.PORT) || 4173;
const assets = {
  '/manifest.webmanifest': ['manifest.webmanifest', 'application/manifest+json; charset=utf-8'],
  '/service-worker.js': ['service-worker.js', 'text/javascript; charset=utf-8'],
  '/icons/icon-192.png': ['icons/icon-192.png', 'image/png'],
  '/icons/icon-512.png': ['icons/icon-512.png', 'image/png'],
  '/icons/icon-512-maskable.png': ['icons/icon-512-maskable.png', 'image/png']
};
const reloadScript = `<script>
  let lastVersion;
  async function checkForChanges() {
    try {
      const response = await fetch('/__version', { cache: 'no-store' });
      if (!response.ok) return;
      const version = await response.text();
      if (lastVersion && lastVersion !== version) location.reload();
      lastVersion = version;
    } catch (_) {}
  }
  checkForChanges();
  setInterval(checkForChanges, 1000);
</script>`;

http.createServer((request, response) => {
  if (request.method !== 'GET' || (!['/', '/index.html', '/__version'].includes(request.url) && !Object.hasOwn(assets, request.url))) {
    response.writeHead(404).end('Not found');
    return;
  }
  if (Object.hasOwn(assets, request.url)) {
    const [filename, contentType] = assets[request.url];
    fs.readFile(path.join(__dirname, filename), (error, data) => {
      if (error) return response.writeHead(404).end('Not found');
      response.setHeader('Content-Type', contentType);
      response.setHeader('Cache-Control', 'no-store');
      response.end(data);
    });
    return;
  }
  fs.readFile(page, (error, data) => {
    if (error) {
      response.writeHead(500).end('Could not read index.html');
      return;
    }
    response.setHeader('Cache-Control', 'no-store');
    if (request.url === '/__version') {
      response.setHeader('Content-Type', 'text/plain; charset=utf-8');
      response.end(crypto.createHash('sha256').update(data).digest('hex'));
      return;
    }
    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    const html = data.toString('utf8');
    response.end(html.includes('</body>') ? html.replace('</body>', reloadScript + '</body>') : html + reloadScript);
  });
}).listen(port, '127.0.0.1', () => {
  console.log(`Game available at http://127.0.0.1:${port}/`);
});

