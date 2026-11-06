# 🦟 Editor Visual de Colliders de Piernas

Herramienta interactiva para calibrar, editar y probar los polígonos de colisión de ambas piernas en cada fase, sobre el fondo correspondiente.

---

## 🚀 Formas de uso

### Opción 1: Con servidor interactivo (Recomendado - 1 clic para guardar)
Permite seleccionar una fase y guardar sus colliders directamente en `src/entities/legColliders.json`:

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
- Usa el botón **"Copiar JSON"** para copiar la configuración completa de las cinco fases.
- O usa **"Exportar JSON"** para guardar la configuración en un archivo.

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
| **Fase** | Selector de fase para cambiar entre imagen y colliders |
| **Guardar** | Botón **"💾 Guardar en Proyecto"** (actualiza los colliders de la fase seleccionada en `src/entities/legColliders.json`) |

Cada fase usa su propia imagen: `assets/phase_1_legs.jpg` hasta `assets/phase_5_legs.jpg`. Todas tienen colliders independientes.

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
