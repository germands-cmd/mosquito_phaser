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
const COLLIDERS_PATH = path.join(ROOT_DIR, 'src', 'entities', 'legColliders.json');

function normalizePoints(points, name) {
  if (!Array.isArray(points) || points.length < 3) {
    throw new Error(`${name} debe contener al menos 3 vértices.`);
  }
  return points.map((point, index) => {
    const x = Number(point.x);
    const y = Number(point.y);
    if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || x > 1376 || y < 0 || y > 768) {
      throw new Error(`${name}[${index}] tiene coordenadas inválidas.`);
    }
    return { id: index, x, y };
  });
}

function readColliders() {
  return JSON.parse(fs.readFileSync(COLLIDERS_PATH, 'utf8'));
}

function savePhaseColliders(data) {
  const phaseId = Number(data.phaseId);
  if (!Number.isInteger(phaseId) || phaseId < 1 || phaseId > 5) {
    throw new Error('La fase debe ser un número entre 1 y 5.');
  }

  const phaseColliders = readColliders();
  phaseColliders[phaseId] = {
    leftLegPoints: normalizePoints(data.leftLegPoints, 'leftLegPoints'),
    rightLegPoints: normalizePoints(data.rightLegPoints, 'rightLegPoints'),
  };
  fs.writeFileSync(COLLIDERS_PATH, `${JSON.stringify(phaseColliders, null, 2)}\n`, 'utf8');
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

  if (req.method === 'GET' && urlPath === '/api/colliders') {
    try {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ phaseColliders: readColliders() }));
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
        savePhaseColliders(data);
        console.log(`[OK] Colliders de la fase ${Number(data.phaseId)} guardados en ${COLLIDERS_PATH}`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (err) {
        console.error('[Error al guardar]:', err);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

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
