/**
 * editor.js - Mosquito Legs Collider Visual Editor
 */

// Original points from src/entities/Environment.js
const DEFAULT_LEFT_POINTS = [
  { id: 0, x: 260, y: 680 },
  { id: 1, x: 215, y: 620 },
  { id: 2, x: 185, y: 520 },
  { id: 3, x: 180, y: 420 },
  { id: 4, x: 190, y: 340 },
  { id: 5, x: 230, y: 290 },
  { id: 6, x: 310, y: 280 },
  { id: 7, x: 360, y: 290 },
  { id: 8, x: 385, y: 335 },
  { id: 9, x: 390, y: 400 },
  { id: 10, x: 460, y: 520 },
  { id: 11, x: 530, y: 610 },
  { id: 12, x: 620, y: 680 },
  { id: 13, x: 480, y: 700 },
  { id: 14, x: 350, y: 700 },
];

const DEFAULT_RIGHT_POINTS = [
  { id: 0, x: 750, y: 680 },
  { id: 1, x: 840, y: 610 },
  { id: 2, x: 910, y: 520 },
  { id: 3, x: 985, y: 400 },
  { id: 4, x: 990, y: 335 },
  { id: 5, x: 1015, y: 290 },
  { id: 6, x: 1065, y: 280 },
  { id: 7, x: 1145, y: 290 },
  { id: 8, x: 1185, y: 340 },
  { id: 9, x: 1195, y: 420 },
  { id: 10, x: 1190, y: 520 },
  { id: 11, x: 1160, y: 620 },
  { id: 12, x: 1115, y: 680 },
  { id: 13, x: 1020, y: 700 },
  { id: 14, x: 890, y: 700 },
];

class ColliderEditor {
  constructor() {
    this.canvas = document.getElementById('collider-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.wrapper = document.getElementById('canvas-wrapper');
    this.viewport = document.getElementById('viewport');

    this.leftPoints = JSON.parse(JSON.stringify(DEFAULT_LEFT_POINTS));
    this.rightPoints = JSON.parse(JSON.stringify(DEFAULT_RIGHT_POINTS));

    this.activeLeg = 'left'; // 'left' | 'right'
    this.viewFilter = 'both'; // 'both' | 'left' | 'right'

    this.selectedPoint = null; // { leg: 'left'|'right', index: number }
    this.hoverPoint = null;
    this.hoverEdge = null; // { leg: 'left'|'right', index: number, insertX: number, insertY: number }

    this.isDragging = false;
    this.dragStartPos = null;
    this.hasMovedDuringDrag = false;

    this.zoom = 1;
    this.testSamples = [];
    this.isServerConnected = false;

    // History for undo/redo
    this.history = [];
    this.historyIndex = -1;

    // Load background image
    this.bgImage = new Image();
    this.bgLoaded = false;
    this.loadBackgroundImage();

    this.initEvents();
    this.pushHistory();
    this.checkServerConnection();
    this.updateUI();
    this.render();
  }

  loadBackgroundImage() {
    const candidatePaths = [
      '../assets/background_legs.jpg',
      '/assets/background_legs.jpg',
      'assets/background_legs.jpg'
    ];
    let candidateIndex = 0;

    const tryNext = () => {
      if (candidateIndex >= candidatePaths.length) {
        console.warn('Could not load legs image, using fallback backdrop.');
        this.render();
        return;
      }
      this.bgImage.src = candidatePaths[candidateIndex++];
    };

    this.bgImage.onload = () => {
      this.bgLoaded = true;
      this.render();
    };
    this.bgImage.onerror = tryNext;
    tryNext();
  }

  async checkServerConnection() {
    const badge = document.getElementById('server-status');
    const saveBtn = document.getElementById('btn-save-file');
    try {
      const res = await fetch('/api/colliders', { cache: 'no-cache' });
      if (res.ok) {
        const data = await res.json();
        this.isServerConnected = true;
        badge.textContent = '● Conectado a Environment.js';
        badge.classList.add('online');
        saveBtn.textContent = '💾 Guardar en Environment.js';

        if (data.leftLegPoints && data.leftLegPoints.length > 0) {
          this.leftPoints = data.leftLegPoints;
        }
        if (data.rightLegPoints && data.rightLegPoints.length > 0) {
          this.rightPoints = data.rightLegPoints;
        }
        this.pushHistory();
        this.updateUI();
        this.render();
        this.showToast('Datos cargados directamente desde Environment.js', 'success');
      }
    } catch {
      this.isServerConnected = false;
      badge.textContent = 'Modo Navegador';
      badge.classList.remove('online');
      saveBtn.textContent = '💾 Guardar (Descargar / Copiar)';
    }
  }

  pushHistory() {
    // Truncate future states if we performed an action
    if (this.historyIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyIndex + 1);
    }
    const state = {
      left: JSON.parse(JSON.stringify(this.leftPoints)),
      right: JSON.parse(JSON.stringify(this.rightPoints))
    };
    this.history.push(state);
    this.historyIndex = this.history.length - 1;
    this.updateUndoRedoButtons();
  }

  undo() {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      this.applyHistoryState(this.history[this.historyIndex]);
      this.showToast('Deshecho');
    }
  }

  redo() {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      this.applyHistoryState(this.history[this.historyIndex]);
      this.showToast('Rehecho');
    }
  }

  applyHistoryState(state) {
    this.leftPoints = JSON.parse(JSON.stringify(state.left));
    this.rightPoints = JSON.parse(JSON.stringify(state.right));
    this.selectedPoint = null;
    this.updateUI();
    this.render();
    this.updateUndoRedoButtons();
  }

  updateUndoRedoButtons() {
    document.getElementById('btn-undo').disabled = this.historyIndex <= 0;
    document.getElementById('btn-redo').disabled = this.historyIndex >= this.history.length - 1;
  }

  getActivePoints() {
    return this.activeLeg === 'left' ? this.leftPoints : this.rightPoints;
  }

  calculateBounds(points) {
    if (!points || points.length === 0) {
      return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
    }
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const pt of points) {
      if (pt.x < minX) minX = pt.x;
      if (pt.x > maxX) maxX = pt.x;
      if (pt.y < minY) minY = pt.y;
      if (pt.y > maxY) maxY = pt.y;
    }
    return { minX, maxX, minY, maxY };
  }

  reindexPoints(points) {
    points.forEach((pt, idx) => {
      pt.id = idx;
    });
  }

  getCanvasCoords(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: Math.round((e.clientX - rect.left) * scaleX),
      y: Math.round((e.clientY - rect.top) * scaleY)
    };
  }

  distSq(x1, y1, x2, y2) {
    const dx = x1 - x2;
    const dy = y1 - y2;
    return dx * dx + dy * dy;
  }

  distToSegment(p, v, w) {
    const l2 = this.distSq(v.x, v.y, w.x, w.y);
    if (l2 === 0) return { dist: Math.sqrt(this.distSq(p.x, p.y, v.x, v.y)), x: v.x, y: v.y };
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    const projX = v.x + t * (w.x - v.x);
    const projY = v.y + t * (w.y - v.y);
    return { dist: Math.sqrt(this.distSq(p.x, p.y, projX, projY)), x: Math.round(projX), y: Math.round(projY) };
  }

  findPointAt(pos, maxDist = 14) {
    const checkLeg = (leg, points) => {
      for (let i = 0; i < points.length; i++) {
        if (Math.sqrt(this.distSq(pos.x, pos.y, points[i].x, points[i].y)) <= maxDist) {
          return { leg, index: i };
        }
      }
      return null;
    };

    if (this.viewFilter === 'left') return checkLeg('left', this.leftPoints);
    if (this.viewFilter === 'right') return checkLeg('right', this.rightPoints);

    // If active leg matches first, prioritize it
    const activeFirst = checkLeg(this.activeLeg, this.getActivePoints());
    if (activeFirst) return activeFirst;

    const otherLeg = this.activeLeg === 'left' ? 'right' : 'left';
    const otherPoints = this.activeLeg === 'left' ? this.rightPoints : this.leftPoints;
    return checkLeg(otherLeg, otherPoints);
  }

  findEdgeAt(pos, maxDist = 8) {
    const checkLegEdges = (leg, points) => {
      for (let i = 0; i < points.length; i++) {
        const p1 = points[i];
        const p2 = points[(i + 1) % points.length];
        const proj = this.distToSegment(pos, p1, p2);
        if (proj.dist <= maxDist) {
          return { leg, index: i, insertX: proj.x, insertY: proj.y };
        }
      }
      return null;
    };

    if (this.viewFilter === 'left') return checkLegEdges('left', this.leftPoints);
    if (this.viewFilter === 'right') return checkLegEdges('right', this.rightPoints);

    const activeEdge = checkLegEdges(this.activeLeg, this.getActivePoints());
    if (activeEdge) return activeEdge;

    const otherLeg = this.activeLeg === 'left' ? 'right' : 'left';
    const otherPoints = this.activeLeg === 'left' ? this.rightPoints : this.leftPoints;
    return checkLegEdges(otherLeg, otherPoints);
  }

  initEvents() {
    // Window resize & shortcuts
    window.addEventListener('keydown', (e) => {
      // Ctrl+Z / Ctrl+Y
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) this.redo();
        else this.undo();
        e.preventDefault();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        this.redo();
        e.preventDefault();
        return;
      }

      // Arrow keys fine tuning for selected point
      if (this.selectedPoint) {
        const points = this.selectedPoint.leg === 'left' ? this.leftPoints : this.rightPoints;
        const pt = points[this.selectedPoint.index];
        const step = e.shiftKey ? 10 : 1;
        let moved = false;

        if (e.key === 'ArrowLeft') { pt.x = Math.max(0, pt.x - step); moved = true; }
        if (e.key === 'ArrowRight') { pt.x = Math.min(1376, pt.x + step); moved = true; }
        if (e.key === 'ArrowUp') { pt.y = Math.max(0, pt.y - step); moved = true; }
        if (e.key === 'ArrowDown') { pt.y = Math.min(768, pt.y + step); moved = true; }

        if (moved) {
          e.preventDefault();
          this.pushHistory();
          this.updateUI();
          this.render();
          return;
        }

        // Delete key
        if (e.key === 'Delete' || e.key === 'Backspace') {
          if (document.activeElement.tagName !== 'INPUT') {
            this.deletePoint(this.selectedPoint.leg, this.selectedPoint.index);
            e.preventDefault();
          }
        }
      }
    });

    // Canvas Mouse Events
    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return; // Left click only
      const pos = this.getCanvasCoords(e);
      const hitPoint = this.findPointAt(pos);

      if (hitPoint) {
        this.selectedPoint = hitPoint;
        this.activeLeg = hitPoint.leg;
        this.isDragging = true;
        this.dragStartPos = { x: pos.x, y: pos.y };
        this.hasMovedDuringDrag = false;
        this.updateUI();
        this.render();
      } else {
        // Deselect if clicked outside any point
        if (this.selectedPoint) {
          this.selectedPoint = null;
          this.updateUI();
          this.render();
        }
      }
    });

    this.canvas.addEventListener('mousemove', (e) => {
      const pos = this.getCanvasCoords(e);

      if (this.isDragging && this.selectedPoint) {
        const points = this.selectedPoint.leg === 'left' ? this.leftPoints : this.rightPoints;
        const pt = points[this.selectedPoint.index];
        pt.x = Math.max(0, Math.min(1376, pos.x));
        pt.y = Math.max(0, Math.min(768, pos.y));
        this.hasMovedDuringDrag = true;
        this.updateUI(false); // Update inputs without full rebuild
        this.render();
      } else {
        // Hover detection
        const prevHoverPt = this.hoverPoint;
        const prevHoverEdge = this.hoverEdge;

        this.hoverPoint = this.findPointAt(pos);
        this.hoverEdge = this.hoverPoint ? null : this.findEdgeAt(pos);

        if (this.hoverPoint !== prevHoverPt || this.hoverEdge !== prevHoverEdge) {
          this.canvas.style.cursor = this.hoverPoint ? 'grab' : (this.hoverEdge ? 'copy' : 'crosshair');
          this.render();
        }
      }
    });

    const finishDrag = () => {
      if (this.isDragging) {
        this.isDragging = false;
        if (this.hasMovedDuringDrag) {
          this.pushHistory();
          this.updateUI();
        }
        this.render();
      }
    };

    window.addEventListener('mouseup', finishDrag);

    // Double click to insert vertex on edge
    this.canvas.addEventListener('dblclick', (e) => {
      const pos = this.getCanvasCoords(e);
      const edge = this.findEdgeAt(pos, 12);
      if (edge) {
        const points = edge.leg === 'left' ? this.leftPoints : this.rightPoints;
        const newPoint = { id: 0, x: edge.insertX, y: edge.insertY };
        points.splice(edge.index + 1, 0, newPoint);
        this.reindexPoints(points);
        this.activeLeg = edge.leg;
        this.selectedPoint = { leg: edge.leg, index: edge.index + 1 };
        this.pushHistory();
        this.updateUI();
        this.render();
        this.showToast(`Vértice insertado en Pierna ${edge.leg === 'left' ? 'Izquierda' : 'Derecha'}`);
      }
    });

    // Right-click context menu on vertex to delete
    this.canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const pos = this.getCanvasCoords(e);
      const hitPoint = this.findPointAt(pos);
      if (hitPoint) {
        this.deletePoint(hitPoint.leg, hitPoint.index);
      }
    });

    // View filter buttons
    const btnBoth = document.getElementById('btn-select-both');
    const btnLeft = document.getElementById('btn-select-left');
    const btnRight = document.getElementById('btn-select-right');

    const setFilter = (filter) => {
      this.viewFilter = filter;
      btnBoth.classList.toggle('active', filter === 'both');
      btnLeft.classList.toggle('active', filter === 'left');
      btnRight.classList.toggle('active', filter === 'right');
      if (filter === 'left') this.setActiveLeg('left');
      if (filter === 'right') this.setActiveLeg('right');
      this.render();
    };

    btnBoth.addEventListener('click', () => setFilter('both'));
    btnLeft.addEventListener('click', () => setFilter('left'));
    btnRight.addEventListener('click', () => setFilter('right'));

    // Tabs
    const tabLeft = document.getElementById('tab-left');
    const tabRight = document.getElementById('tab-right');
    const tabCode = document.getElementById('tab-code');
    const pointsView = document.getElementById('sidebar-points-view');
    const codeView = document.getElementById('sidebar-code-view');

    tabLeft.addEventListener('click', () => {
      this.setActiveLeg('left');
      pointsView.classList.remove('hidden');
      codeView.classList.add('hidden');
    });

    tabRight.addEventListener('click', () => {
      this.setActiveLeg('right');
      pointsView.classList.remove('hidden');
      codeView.classList.add('hidden');
    });

    tabCode.addEventListener('click', () => {
      tabLeft.className = 'tab-btn';
      tabRight.className = 'tab-btn';
      tabCode.className = 'tab-btn active';
      pointsView.classList.add('hidden');
      codeView.classList.remove('hidden');
      this.updateCodePreview();
    });

    // Undo / Redo buttons
    document.getElementById('btn-undo').addEventListener('click', () => this.undo());
    document.getElementById('btn-redo').addEventListener('click', () => this.redo());

    // Zoom Controls
    document.getElementById('btn-zoom-in').addEventListener('click', () => this.setZoom(this.zoom * 1.15));
    document.getElementById('btn-zoom-out').addEventListener('click', () => this.setZoom(this.zoom / 1.15));
    document.getElementById('btn-zoom-reset').addEventListener('click', () => this.setZoom(1));
    document.getElementById('btn-zoom-fit').addEventListener('click', () => this.zoomFit());

    // Action buttons
    document.getElementById('btn-add-point').addEventListener('click', () => this.addPointAtEnd());
    document.getElementById('btn-reset-leg').addEventListener('click', () => this.resetActiveLeg());
    document.getElementById('btn-test-sample').addEventListener('click', () => this.runSamplingTest());
    document.getElementById('btn-copy-code').addEventListener('click', () => this.copyCodeToClipboard());
    document.getElementById('btn-copy-code-tab').addEventListener('click', () => this.copyCodeToClipboard());
    document.getElementById('btn-save-file').addEventListener('click', () => this.saveColliders());

    // JSON export/import
    document.getElementById('btn-export-json').addEventListener('click', () => this.exportJSON());
    const fileImport = document.getElementById('file-import-json');
    document.getElementById('btn-import-json').addEventListener('click', () => fileImport.click());
    fileImport.addEventListener('change', (e) => this.importJSON(e));
  }

  setZoom(zoom) {
    this.zoom = Math.max(0.35, Math.min(2.5, zoom));
    this.wrapper.style.transform = `scale(${this.zoom})`;
    document.getElementById('zoom-label').textContent = `${Math.round(this.zoom * 100)}%`;
  }

  zoomFit() {
    const pad = 40;
    const availW = this.viewport.clientWidth - pad;
    const availH = this.viewport.clientHeight - pad;
    const fitW = availW / 1376;
    const fitH = availH / 768;
    this.setZoom(Math.min(fitW, fitH, 1));
  }

  setActiveLeg(leg) {
    this.activeLeg = leg;
    const tabLeft = document.getElementById('tab-left');
    const tabRight = document.getElementById('tab-right');
    const tabCode = document.getElementById('tab-code');

    tabCode.className = 'tab-btn';
    if (leg === 'left') {
      tabLeft.className = 'tab-btn active-cyan';
      tabRight.className = 'tab-btn';
    } else {
      tabLeft.className = 'tab-btn';
      tabRight.className = 'tab-btn active-magenta';
    }
    this.updateUI();
    this.render();
  }

  deletePoint(leg, index) {
    const points = leg === 'left' ? this.leftPoints : this.rightPoints;
    if (points.length <= 3) {
      this.showToast('Un polígono debe tener al menos 3 vértices', 'error');
      return;
    }
    points.splice(index, 1);
    this.reindexPoints(points);
    this.selectedPoint = null;
    this.pushHistory();
    this.updateUI();
    this.render();
    this.showToast(`Vértice ${index} eliminado`);
  }

  addPointAtEnd() {
    const points = this.getActivePoints();
    const last = points[points.length - 1];
    const prev = points[points.length - 2] || last;
    const newPt = {
      id: points.length,
      x: Math.round((last.x + prev.x) / 2) + 20,
      y: Math.round((last.y + prev.y) / 2) + 20
    };
    points.push(newPt);
    this.reindexPoints(points);
    this.selectedPoint = { leg: this.activeLeg, index: points.length - 1 };
    this.pushHistory();
    this.updateUI();
    this.render();
    this.showToast('Vértice añadido al final');
  }

  resetActiveLeg() {
    if (confirm(`¿Restaurar los vértices originales de la Pierna ${this.activeLeg === 'left' ? 'Izquierda' : 'Derecha'}?`)) {
      if (this.activeLeg === 'left') {
        this.leftPoints = JSON.parse(JSON.stringify(DEFAULT_LEFT_POINTS));
      } else {
        this.rightPoints = JSON.parse(JSON.stringify(DEFAULT_RIGHT_POINTS));
      }
      this.selectedPoint = null;
      this.pushHistory();
      this.updateUI();
      this.render();
      this.showToast('Vértices restaurados a los valores por defecto');
    }
  }

  pointInPolygon(pt, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i].x, yi = poly[i].y;
      const xj = poly[j].x, yj = poly[j].y;
      const intersect = ((yi > pt.y) !== (yj > pt.y)) &&
        (pt.x < (xj - xi) * (pt.y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  runSamplingTest() {
    this.testSamples = [];
    const legs = this.viewFilter === 'left' ? ['left'] : (this.viewFilter === 'right' ? ['right'] : ['left', 'right']);

    let total = 0;
    let successful = 0;

    for (const leg of legs) {
      const points = leg === 'left' ? this.leftPoints : this.rightPoints;
      const bounds = this.calculateBounds(points);

      for (let i = 0; i < 40; i++) {
        total++;
        let hit = false;
        let testPt = null;
        for (let attempt = 0; attempt < 80; attempt++) {
          const rx = Math.floor(bounds.minX + Math.random() * (bounds.maxX - bounds.minX));
          const ry = Math.floor(bounds.minY + Math.random() * (bounds.maxY - bounds.minY));
          if (this.pointInPolygon({ x: rx, y: ry }, points)) {
            hit = true;
            testPt = { x: rx, y: ry, hit: true, leg };
            break;
          }
        }
        if (!hit) {
          testPt = {
            x: Math.floor(bounds.minX + Math.random() * (bounds.maxX - bounds.minX)),
            y: Math.floor(bounds.minY + Math.random() * (bounds.maxY - bounds.minY)),
            hit: false,
            leg
          };
        } else {
          successful++;
        }
        this.testSamples.push(testPt);
      }
    }

    this.render();
    const rate = Math.round((successful / total) * 100);
    this.showToast(`Muestreo completado: ${successful}/${total} puntos dentro del collider (${rate}%)`, rate >= 90 ? 'success' : 'error');
  }

  generateCode() {
    const formatPoints = (pts) => {
      return pts.map(p => `      { id: ${p.id}, x: ${p.x}, y: ${p.y} },`).join('\n');
    };

    const leftBounds = this.calculateBounds(this.leftPoints);
    const rightBounds = this.calculateBounds(this.rightPoints);

    return `// Exact Polygon Colliders for exposed leg skin with numeric IDs for manual tweaking
    this.leftLegPoints = [
${formatPoints(this.leftPoints)}
    ];

    this.rightLegPoints = [
${formatPoints(this.rightPoints)}
    ];

    this.leftLegPolygon = new Phaser.Geom.Polygon(this.leftLegPoints);
    this.rightLegPolygon = new Phaser.Geom.Polygon(this.rightLegPoints);

    // Bounding boxes for efficient rejection sampling
    this.leftBounds = { minX: ${leftBounds.minX}, maxX: ${leftBounds.maxX}, minY: ${leftBounds.minY}, maxY: ${leftBounds.maxY} };
    this.rightBounds = { minX: ${rightBounds.minX}, maxX: ${rightBounds.maxX}, minY: ${rightBounds.minY}, maxY: ${rightBounds.maxY} };`;
  }

  updateCodePreview() {
    const pre = document.getElementById('code-preview');
    pre.textContent = this.generateCode();
  }

  async copyCodeToClipboard() {
    const code = this.generateCode();
    try {
      await navigator.clipboard.writeText(code);
      this.showToast('¡Código copiado al portapapeles! Listo para pegar en Environment.js', 'success');
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = code;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      this.showToast('¡Código copiado al portapapeles!', 'success');
    }
  }

  async saveColliders() {
    const payload = {
      leftLegPoints: this.leftPoints,
      rightLegPoints: this.rightPoints,
      leftBounds: this.calculateBounds(this.leftPoints),
      rightBounds: this.calculateBounds(this.rightPoints)
    };

    if (this.isServerConnected) {
      try {
        const res = await fetch('/api/colliders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          this.showToast('¡Guardado exitoso directamente en src/entities/Environment.js!', 'success');
          return;
        }
      } catch (err) {
        console.error('Error saving to server:', err);
      }
    }

    // Fallback if server is not connected
    this.copyCodeToClipboard();
    this.showToast('Servidor no activo. Código copiado al portapapeles. (Ejecuta "node tools/server.js" para guardar con 1 clic)', 'warning');
  }

  exportJSON() {
    const data = {
      leftLegPoints: this.leftPoints,
      rightLegPoints: this.rightPoints,
      leftBounds: this.calculateBounds(this.leftPoints),
      rightBounds: this.calculateBounds(this.rightPoints)
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mosquito_leg_colliders.json';
    a.click();
    URL.revokeObjectURL(url);
    this.showToast('Archivo JSON exportado');
  }

  importJSON(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (Array.isArray(data.leftLegPoints)) {
          this.leftPoints = data.leftLegPoints;
          this.reindexPoints(this.leftPoints);
        }
        if (Array.isArray(data.rightLegPoints)) {
          this.rightPoints = data.rightLegPoints;
          this.reindexPoints(this.rightPoints);
        }
        this.selectedPoint = null;
        this.pushHistory();
        this.updateUI();
        this.render();
        this.showToast('Archivo JSON cargado con éxito', 'success');
      } catch (err) {
        this.showToast('Error al procesar el archivo JSON', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  showToast(message, type = '') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast show ${type ? 'toast-' + type : ''}`;
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      toast.className = 'toast';
    }, 3200);
  }

  updateUI(rebuildTable = true) {
    document.getElementById('count-left').textContent = this.leftPoints.length;
    document.getElementById('count-right').textContent = this.rightPoints.length;

    const points = this.getActivePoints();
    const bounds = this.calculateBounds(points);
    const title = this.activeLeg === 'left' ? 'Pierna Izquierda (Cian)' : 'Pierna Derecha (Magenta)';

    document.getElementById('active-leg-title').textContent = title;
    document.getElementById('bounds-info').textContent =
      `Bounds: minX: ${bounds.minX}, maxX: ${bounds.maxX}, minY: ${bounds.minY}, maxY: ${bounds.maxY}`;

    this.updateCodePreview();

    if (!rebuildTable) {
      // Just update values without DOM rebuild to maintain focus during drag
      const tbody = document.getElementById('points-tbody');
      const rows = tbody.querySelectorAll('tr');
      rows.forEach((row, idx) => {
        if (points[idx]) {
          const inputs = row.querySelectorAll('input');
          if (inputs[0] && document.activeElement !== inputs[0]) inputs[0].value = points[idx].x;
          if (inputs[1] && document.activeElement !== inputs[1]) inputs[1].value = points[idx].y;
          row.classList.toggle('selected', this.selectedPoint && this.selectedPoint.leg === this.activeLeg && this.selectedPoint.index === idx);
        }
      });
      return;
    }

    const tbody = document.getElementById('points-tbody');
    tbody.innerHTML = '';

    points.forEach((pt, idx) => {
      const tr = document.createElement('tr');
      if (this.selectedPoint && this.selectedPoint.leg === this.activeLeg && this.selectedPoint.index === idx) {
        tr.classList.add('selected');
      }

      const tdId = document.createElement('td');
      const badge = document.createElement('span');
      badge.className = `point-badge ${this.activeLeg === 'left' ? 'badge-cyan' : 'badge-magenta'}`;
      badge.textContent = pt.id;
      tdId.appendChild(badge);

      const tdX = document.createElement('td');
      const inputX = document.createElement('input');
      inputX.type = 'number';
      inputX.value = pt.x;
      inputX.addEventListener('change', () => {
        pt.x = Math.max(0, Math.min(1376, parseInt(inputX.value) || 0));
        this.pushHistory();
        this.updateUI(false);
        this.render();
      });
      tdX.appendChild(inputX);

      const tdY = document.createElement('td');
      const inputY = document.createElement('input');
      inputY.type = 'number';
      inputY.value = pt.y;
      inputY.addEventListener('change', () => {
        pt.y = Math.max(0, Math.min(768, parseInt(inputY.value) || 0));
        this.pushHistory();
        this.updateUI(false);
        this.render();
      });
      tdY.appendChild(inputY);

      const tdDel = document.createElement('td');
      const btnDel = document.createElement('button');
      btnDel.className = 'btn-del-pt';
      btnDel.innerHTML = '✕';
      btnDel.title = 'Eliminar vértice';
      btnDel.addEventListener('click', (e) => {
        e.stopPropagation();
        this.deletePoint(this.activeLeg, idx);
      });
      tdDel.appendChild(btnDel);

      tr.addEventListener('click', () => {
        this.selectedPoint = { leg: this.activeLeg, index: idx };
        this.updateUI();
        this.render();
      });

      tr.appendChild(tdId);
      tr.appendChild(tdX);
      tr.appendChild(tdY);
      tr.appendChild(tdDel);
      tbody.appendChild(tr);
    });
  }

  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, 1376, 768);

    // 1. Background image
    if (this.bgLoaded) {
      ctx.drawImage(this.bgImage, 0, 0, 1376, 768);
    } else {
      // Dark stylized grid fallback
      ctx.fillStyle = '#0f1118';
      ctx.fillRect(0, 0, 1376, 768);
      ctx.strokeStyle = '#1e2433';
      ctx.lineWidth = 1;
      for (let x = 0; x < 1376; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 768);
        ctx.stroke();
      }
      for (let y = 0; y < 768; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(1376, y);
        ctx.stroke();
      }
    }

    // Dimming overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.fillRect(0, 0, 1376, 768);

    // 2. Draw Legs Polygons
    if (this.viewFilter === 'both' || this.viewFilter === 'left') {
      this.drawPolygon('left', this.leftPoints, '#00ffff', 'rgba(0, 255, 255, 0.22)');
    }
    if (this.viewFilter === 'both' || this.viewFilter === 'right') {
      this.drawPolygon('right', this.rightPoints, '#ff00ff', 'rgba(255, 0, 255, 0.22)');
    }

    // 3. Draw Edge Insertion indicator if hovering near edge
    if (this.hoverEdge) {
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(this.hoverEdge.insertX, this.hoverEdge.insertY, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText('+ Doble clic', this.hoverEdge.insertX, this.hoverEdge.insertY - 8);
    }

    // 4. Draw Test Samples if any
    if (this.testSamples.length > 0) {
      for (const s of this.testSamples) {
        ctx.fillStyle = s.hit ? 'rgba(52, 211, 153, 0.85)' : 'rgba(239, 68, 68, 0.9)';
        ctx.beginPath();
        ctx.arc(s.x, s.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  }

  drawPolygon(leg, points, strokeColor, fillColor) {
    if (!points || points.length === 0) return;
    const ctx = this.ctx;

    // Fill & Stroke Polygon Path
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.closePath();

    ctx.fillStyle = fillColor;
    ctx.fill();

    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = this.activeLeg === leg ? 3.5 : 2;
    ctx.stroke();

    // Vertices badges
    points.forEach((pt, idx) => {
      const isSelected = this.selectedPoint && this.selectedPoint.leg === leg && this.selectedPoint.index === idx;
      const isHovered = this.hoverPoint && this.hoverPoint.leg === leg && this.hoverPoint.index === idx;

      // Glow / Selection ring
      if (isSelected || isHovered) {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, isSelected ? 17 : 14, 0, Math.PI * 2);
        ctx.strokeStyle = isSelected ? '#f59e0b' : '#ffffff';
        ctx.lineWidth = isSelected ? 3 : 2;
        ctx.stroke();
      }

      // Badge circle background
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 11, 0, Math.PI * 2);
      ctx.fillStyle = leg === 'left' ? '#072833' : '#330728';
      ctx.fill();
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 2;
      ctx.stroke();

      // ID Number text
      ctx.fillStyle = strokeColor;
      ctx.font = 'bold 11px "Impact", "Arial Black", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(pt.id, pt.x, pt.y + 0.5);

      // Coordinate tooltip when selected
      if (isSelected) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(pt.x - 36, pt.y - 32, 72, 18);
        ctx.fillStyle = '#f59e0b';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${pt.x}, ${pt.y}`, pt.x, pt.y - 23);
      }
    });
  }
}

// Instantiate editor on page load
window.addEventListener('DOMContentLoaded', () => {
  window.editor = new ColliderEditor();
});
