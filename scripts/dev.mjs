import http from 'node:http';
import path from 'node:path';
import { promises as fs, existsSync } from 'node:fs';
import chokidar from 'chokidar';

const root = process.cwd();
const preferredPort = Number(process.env.PORT) || 9999;
const reloadClients = new Set();

const CONTENT_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.js': 'text/javascript; charset=UTF-8',
  '.mjs': 'text/javascript; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.wasm': 'application/wasm',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.mp4': 'video/mp4',
  '.ogg': 'audio/ogg',
  '.mp3': 'audio/mpeg',
};

const reloadSnippet = `
<!-- purrbeat-dev-reload -->
<script>
  (function () {
    const isLocalHost = ['localhost', '127.0.0.1', '::1'].includes(location.hostname);
    if (!isLocalHost) return;
    const source = new EventSource('/__purrbeat_reload');
    source.addEventListener('reload', () => location.reload());
    source.addEventListener('message', () => location.reload());
    source.addEventListener('error', () => source.close());
  })();
</script>
`;

const getContentType = (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  return CONTENT_TYPES[ext] ?? 'application/octet-stream';
};

const injectReload = (html) => {
  if (html.includes('purrbeat-dev-reload')) return html;
  if (html.includes('</body>')) {
    return html.replace('</body>', `${reloadSnippet}</body>`);
  }
  return `${html}${reloadSnippet}`;
};

const broadcastReload = () => {
  if (!reloadClients.size) {
    return;
  }
  for (const client of reloadClients) {
    client.write('event: reload\ndata: 1\n\n');
  }
};

const watcherPaths = ['index.html', 'engine.html', 'src', 'assets']
  .map((relativePath) => path.join(root, relativePath))
  .filter((target) => existsSync(target));

const watcher = chokidar.watch(watcherPaths, {
  ignoreInitial: true,
  ignored: /node_modules/,
  persistent: true,
});

watcher.on('all', (event, changed) => {
  const rel = path.relative(root, changed);
  console.log(`[dev] ${event} -> ${rel}`);
  broadcastReload();
});
watcher.on('error', (error) => {
  console.error('[dev] watcher error', error);
});

const handleSse = (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.write('event: connected\ndata: ok\n\n');
  reloadClients.add(res);
  req.on('close', () => reloadClients.delete(res));
};

const sendError = (res, status, message) => {
  res.writeHead(status, {
    'Content-Type': 'text/plain; charset=UTF-8',
  });
  res.end(message);
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  const requestedPath = decodeURIComponent(url.pathname);

  if (requestedPath === '/__purrbeat_reload') {
    handleSse(req, res);
    return;
  }

  const safeSegment = path.normalize(requestedPath);
  let filePath = path.join(root, `.${safeSegment}`);
  if (!filePath.startsWith(root)) {
    sendError(res, 403, 'Forbidden');
    return;
  }

  try {
    let stats = await fs.stat(filePath);
    if (stats.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
      stats = await fs.stat(filePath);
    }
    if (!stats.isFile()) {
      sendError(res, 404, 'Not found');
      return;
    }
  } catch (error) {
    sendError(res, 404, 'Not found');
    return;
  }

  try {
    const data = await fs.readFile(filePath);
    const isHtml = filePath.endsWith('.html');
    const body = isHtml ? injectReload(data.toString('utf8')) : data;
    const headers = {
      'Content-Type': getContentType(filePath),
      'Cache-Control': isHtml ? 'no-store' : 'public, max-age=0',
    };
    res.writeHead(200, headers);
    res.end(body);
  } catch (error) {
    console.error('[dev] failed to serve', filePath, error);
    sendError(res, 500, 'Server error');
  }
});

const MAX_PORT_ATTEMPTS = 20;

const listenOnPort = (port) =>
  new Promise((resolve, reject) => {
    const cleanup = () => {
      server.removeListener('listening', onListening);
      server.removeListener('error', onError);
    };

    const onListening = () => {
      cleanup();
      resolve(port);
    };

    const onError = (error) => {
      cleanup();
      reject(error);
    };

    server.once('listening', onListening);
    server.once('error', onError);
    server.listen(port);
  });

const startServer = async () => {
  let port = preferredPort;
  for (let attempt = 0; attempt <= MAX_PORT_ATTEMPTS; attempt += 1) {
    try {
      const boundPort = await listenOnPort(port);
      return boundPort;
    } catch (error) {
      if (error && error.code === 'EADDRINUSE') {
        console.warn(`[dev] port ${port} already in use, trying ${port + 1}`);
        port += 1;
        continue;
      }
      throw error;
    }
  }
  throw new Error(`Unable to bind to a port starting from ${preferredPort}`);
};

startServer()
  .then((boundPort) => {
    console.log(`PurrBeat dev server running at http://localhost:${boundPort}`);
    if (watcherPaths.length) {
      console.log('Watching for changes:', watcherPaths.map((target) => path.relative(root, target)).join(', '));
    } else {
      console.log('Watching for changes: (nothing configured)');
    }
  })
  .catch((error) => {
    console.error('[dev] failed to start server', error);
    process.exit(1);
  });

const shutdown = () => {
  console.log('Shutting down dev server...');
  watcher.close().catch(() => {});
  server.close(() => process.exit(0));
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
