# 🦟 Editor Visual de Colliders de Piernas

Herramienta interactiva para calibrar, editar y probar los polígonos de colisión de las piernas (`Environment.js`) en tiempo real sobre la imagen original de fondo.

---

## 🚀 Formas de uso

### Opción 1: Con servidor interactivo (Recomendado - 1 clic para guardar)
Permite editar en el navegador y guardar automáticamente los cambios en `src/entities/Environment.js` pulsando un botón:

```bash
node tools/server.js
```
O con npm:
```bash
npm run tools:colliders
```
*Se abrirá automáticamente el navegador en `http://localhost:3333`.*

---

### Opción 2: Sin servidor (Standalone)
Puedes simplemente hacer doble clic en `tools/index.html` o abrirlo en cualquier navegador:
- Permite arrastrar vértices, añadir/quitar puntos y probar el muestreo.
- Usa el botón **"Copiar Código"** para copiar el código JS directamente al portapapeles y pegarlo en `src/entities/Environment.js`.
- O usa **"Exportar JSON"** para guardar tus cambios en un archivo.

---

## 🎮 Controles del Editor

| Acción | Control |
|---|---|
| **Mover vértice** | Clic izquierdo y arrastrar sobre cualquier círculo numerado |
| **Añadir vértice** | Doble clic en cualquier línea del borde del polígono |
| **Eliminar vértice** | Clic derecho sobre el vértice (mínimo 3 vértices) |
| **Ajuste fino (1px)** | Seleccionar vértice y pulsar flechas del teclado (o Shift+flechas para 10px) |
| **Deshacer / Rehacer** | `Ctrl + Z` / `Ctrl + Y` (o botones en la barra superior) |
| **Zoom y Vista** | Botones de Zoom en pantalla o rueda del ratón |
| **Probar Muestreo** | Botón **"🎯 Probar Muestreo"**: genera 80 puntos aleatorios para verificar que los mosquitos aterrizan exactamente en la piel |
| **Guardar** | Botón **"💾 Guardar en Proyecto"** (actualiza `Environment.js`) |

---

# 🧰 Debug del juego

La entrada independiente [debug/index.html](./debug/index.html) carga las
herramientas de desarrollo sin incluirlas en el código normal del juego.

```bash
npx vite --host
```

Después abre `http://localhost:5173/tools/debug/`.

Controles disponibles:

- `D`: HUD y visualización de colliders.
- `T`: pausar/reanudar el spawn automático.
- `Numpad 1-7`: generar variantes.
- `V`, `C`, `O`, `B`: generar formaciones.
- `F1-F5`: iniciar una fase concreta.
