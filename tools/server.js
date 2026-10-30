import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { exec } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3333;
const ROOT_DIR = path.resolve(__dirname, '..');
const TOOLS_DIR = path.resolve(__dirname);
const ENV_PATH = path.join(ROOT_DIR, 'src', 'entities', 'Environment.js');

function parseLegPoints(content, varName) {
  const regex = new RegExp(`this\\.${varName}\\s*=\\s*\\[([\\s\\S]*?)\\];`);
  const match = content.match(regex);
  if (!match) return null;
  const arrayBody = match[1];
  const points = [];
  const ptRegex = /\{\s*id:\s*(\d+),\s*x:\s*(\d+),\s*y:\s*(\d+)\s*\}/g;
  let ptMatch;
  while ((ptMatch = ptRegex.exec(arrayBody)) !== null) {
    points.push({
      id: parseInt(ptMatch[1], 10),
      x: parseInt(ptMatch[2], 10),
      y: parseInt(ptMatch[3], 10)
    });
  }
  return points;
}

function updateEnvironmentFile(leftPoints, rightPoints, leftBounds, rightBounds) {
  let content = fs.readFileSync(ENV_PATH, 'utf8');

  const formatPoints = (pts) => {
    return pts.map(p => `      { id: ${p.id}, x: ${p.x}, y: ${p.y} },`).join('\n');
  };

  const replacementBlock = `    // Exact Polygon Colliders for exposed leg skin with numeric IDs for manual tweaking
    this.leftLegPoints = [
${formatPoints(leftPoints)}
    ];

    this.rightLegPoints = [
${formatPoints(rightPoints)}
    ];

    this.leftLegPolygon = new Phaser.Geom.Polygon(this.leftLegPoints);
    this.rightLegPolygon = new Phaser.Geom.Polygon(this.rightLegPoints);

    // Bounding boxes for efficient rejection sampling
    this.leftBounds = { minX: ${leftBounds.minX}, maxX: ${leftBounds.maxX}, minY: ${leftBounds.minY}, maxY: ${leftBounds.maxY} };
    this.rightBounds = { minX: ${rightBounds.minX}, maxX: ${rightBounds.maxX}, minY: ${rightBounds.minY}, maxY: ${rightBounds.maxY} };`;

  const regexTarget = /\/\/\s*Exact Polygon Colliders[\s\S]*?this\.rightBounds\s*=\s*\{[^}]*\};/;
  if (!regexTarget.test(content)) {
    throw new Error('No se encontró el bloque de polígonos en Environment.js');
  }

  content = content.replace(regexTarget, replacementBlock.trim());
  fs.writeFileSync(ENV_PATH, content, 'utf8');
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.json': 'application/json'
};

const server = http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0];

  // API endpoints
  if (req.method === 'GET' && urlPath === '/api/colliders') {
    try {
      const content = fs.readFileSync(ENV_PATH, 'utf8');
      const left = parseLegPoints(content, 'leftLegPoints');
      const right = parseLegPoints(content, 'rightLegPoints');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ leftLegPoints: left, rightLegPoints: right }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  if (req.method === 'POST' && urlPath === '/api/colliders') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        updateEnvironmentFile(
          data.leftLegPoints,
          data.rightLegPoints,
          data.leftBounds,
          data.rightBounds
        );
        console.log(`[OK] Colliders guardados con éxito en ${ENV_PATH}`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (err) {
        console.error('[Error al guardar]:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // Static files serving
  let filePath;
  if (urlPath === '/' || urlPath === '/index.html') {
    filePath = path.join(TOOLS_DIR, 'index.html');
  } else if (urlPath.startsWith('/assets/')) {
    filePath = path.join(ROOT_DIR, urlPath);
  } else {
    filePath = path.join(TOOLS_DIR, urlPath);
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  const url = `http://localhost:${PORT}`;
  console.log(`\n======================================================`);
  console.log(`🦟 Editor Visual de Colliders de Piernas`);
  console.log(`Servidor activo en: ${url}`);
  console.log(`Presiona Ctrl+C para detener el servidor.`);
  console.log(`======================================================\n`);

  if (process.platform === 'win32') {
    exec(`start ${url}`);
  }
});
