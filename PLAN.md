# Mosquito Prototype — Implementation Plan

> Based on the specifications defined in [DESIGN.md](DESIGN.md) (including **VERSION 1.1**).

## 1. High Concept & Mechanics Summary

- **Title**: Mosquito
- **Engine**: Phaser 3 (ES Modules + Vite)
- **Genre**: 2D First-Person Audio-Anticipation Survival Action
- **Perspective**: Top-down view looking down at player's exposed legs (thighs at foreground bottom, feet at top).
- **Core Mechanic**: Directional audio anticipation (with visual anticipation option in v1.1).
- **Modes (v1.1)**:
  - **Audio Mode**: Directional 3D spatial buzzing (2–4s warning before diving).
  - **No-Audio Mode**: Silent audio warning with a "little red help" visual indicator pulsing on the screen edge to indicate incoming direction.
- **Speeds (v1.1)**: 5 selectable options:
  - *Very Slow* (1400–1800ms)
  - *Slow* (1000–1300ms)
  - *Normal* (750–1000ms)
  - *Fast* (480–800ms, baseline)
  - *Super Fast* (280–420ms)
- **Fail Condition**: 3 bites = Game Over.

---

## 2. Architecture & Modules

### 2.1 Audio Engine (`src/audio/AudioManager.js`)
- Web Audio API integration:
  - User-gesture unlock on title/ready click.
  - Procedural mosquito buzz synthesizer (dual oscillators with frequency jitter for realistic wing buzz).
  - Spatial audio positioning via `PannerNode` (HRTF) mapping 5 approach directions (Left, Top-Left, Top, Top-Right, Right).
  - Procedural sound effects: Swat hit slap, miss whoosh, and bite sting.
  - Immediate audio cleanup upon swat or game restart.

### 2.2 Visuals & Scene Composition (`src/entities/Environment.js`)
- Procedural / comic-book styled Graphics:
  - Wooden floorboard background.
  - Worn rug under the legs.
  - Two player legs rendered from first-person view:
    - Thighs in lower foreground, knees, calves, and feet at top.
    - Gritty outlines, warm skin tones, and cel-shaded contour.
    - Defined skin target hit regions for mosquito AI.
    - Bite welt / red bump graphics on bitten spots.

### 2.3 Fly Swatter Controller (`src/entities/Swatter.js`)
- Mouse tracking:
  - Fly swatter shadow: semi-transparent grid/oval showing exact strike impact point.
  - Fly swatter handle & head: follows cursor with subtle elevation offset.
- Click action:
  - Instantaneous swat evaluation within a circular hit radius (~36px).
  - Visual slam animation tween with squash & stretch.
  - Miss vs. hit audio-visual dispatch.

### 2.4 Mosquito Entity & Spawner (`src/entities/Mosquito.js`, `src/managers/MosquitoManager.js`)
- Mosquito visual: top-down body with wings, legs, and proboscis.
- Rotation: proboscis dynamically faces movement direction.
- States:
  - `WARNING`: Audio buzz active (Audio Mode) OR visual red alert beacon (No-Audio Mode); sprite offscreen.
  - `DIVING`: Aggressive dive scaled to selected speed towards target skin point.
  - `BITING`: Hits skin; triggers bite sound, welt visual, increments bite counter.
  - `DEAD`: Swatted; stops audio, triggers screen shake & wine-colored blood particles.
- Attack Scheduler: Single source of truth synchronizing angle, edge, and visual indicator.

### 2.5 Game Loop & HUD (`src/scenes/GameScene.js`)
- Main Menu / Ready Overlay:
  - Mode selector: `[🎧 Audio Mode]` vs `[👁️ No Audio (Help)]`
  - Speed selector: 5 options (`Very Slow`, `Slow`, `Normal`, `Fast`, `Super Fast`) with `[◀]` and `[▶]` controls.
- Minimalist HUD:
  - Bites count (e.g. `BITES: 0 / 3`)
  - Swat score (e.g. `SWATS: 0`)
  - Mode and speed indicator (`🎧 AUDIO | SPEED: FAST`)
- Visual Indicator ("Little Red Help"):
  - Pulsing red beacon appearing on the edge of incoming mosquito attack in No-Audio mode.
- Debug mode (Keys `1`–`5` to force directional attacks, `D` for hitbox/direction overlay).

---

## 3. Execution Status

- [x] **Step 1**: Clean up project configuration & install dependencies (`npm.cmd i`, test Vite dev server).
- [x] **Step 2**: Implement `AudioManager.js` with Web Audio API procedural synthesis (buzz, swat, miss, bite) and 3D spatial panning.
- [x] **Step 3**: Implement `Environment.js` with comic-style first-person legs, skin bounding zones, and floor/rug visuals.
- [x] **Step 4**: Implement `Swatter.js` with mouse-following shadow, strike animation, and collision check radius.
- [x] **Step 5**: Implement `Mosquito.js` and `MosquitoManager.js` with state lifecycle, wing flutter, directional dive, and synchronized spatial audio.
- [x] **Step 6**: Assemble `GameScene.js` with ready screen, HUD, blood particle burst, screen shake, game-over flow, and developer debug controls (`1`–`5`, `D`).
- [x] **Step 7**: Update `src/game.js` configuration (aspect ratio, responsive scaling, scene registry).
- [x] **Step 8**: Verify build, test directional audio in stereo, validate swat collisions, bite counts, and game reset.
- [x] **Step 9 (v1.1)**: Implement No-Audio mode with edge "little red help" visual indicator.
- [x] **Step 10 (v1.1)**: Implement 5-level speed selector ("Very Slow", "Slow", "Normal", "Fast", "Super Fast") in main menu.
