import Phaser from 'phaser';

export const UI_KEY_SYMBOLS = {
  Q: 'Q',
  W: 'W',
  E: 'E',
  R: 'R'
};

// Backwards compatibility alias
export const UI_ARROW_SYMBOLS = UI_KEY_SYMBOLS;

/**
 * AbilityUI.js
 * Renders and animates:
 * 1. Bottom Ability HUD cards just above the SWATS / BITES banner
 * 2. Stress gauge bar displayed between the ability cards and the banner
 * 3. Vertically and horizontally centered sequence input panel with immediate slots,
 *    staggered pop-in, 3D arcade keycaps, punch bounce feedback, and countdown bar.
 * 4. Frenzy feedback: screen vignette, frenzy timer arc on the active slot icon
 */
export class AbilityUI {
  /**
   * @param {Phaser.Scene} scene
   * @param {Array<import('./BaseAbility.js').BaseAbility>} abilities
   */
  constructor(scene, abilities = []) {
    this.scene = scene;
    this.abilities = abilities;

    this.hudContainer = null;
    this.slotViews = [];

    this.sequenceContainer = null;
    this.arrowViews = [];
    this.timerBarFill = null;

    // Stress bar references
    this.stressBarContainer = null;
    this.stressBarFill      = null;
    this.stressBarFullTween = null;
    this.isStressFull       = false;

    // Frenzy vignette
    this.frenzyVignette    = null;
    this.frenzyTimerArcs   = [];   // one per slot view
    this.frenzyVignetteTween = null;

    this.createHUD();
    this.createStressBar();
    this.createSequenceOverlay();
  }

  /**
   * 1. Creates Ability HUD cards placed directly above the bottom Swats/Bites banner.
   */
  createHUD() {
    this.hudContainer = this.scene.add.container(0, 0).setDepth(31);
    const width = this.scene.scale.width;
    const height = this.scene.scale.height;
    const cx = width / 2;

    // Swats/Bites banner is at y = height - 52 (height 40px)
    // Stress bar sits just above the banner; ability cards sit above the stress bar.
    // Layout (bottom → top): banner (40px) | gap(4) | stress bar (10px) | gap(6) | cards (38px)
    const cardY = height - 98 - 20; // shifted up 20px to make room for the stress bar
    const cardW = 152;
    const cardH = 38;
    const gap = 16;

    const totalWidth = 2 * cardW + gap;
    const startX = cx - totalWidth / 2;

    this.slotViews = this.abilities.map((ability, idx) => {
      const cardX = startX + idx * (cardW + gap);
      const container = this.scene.add.container(cardX, cardY);

      // Card background
      const bg = this.scene.add.graphics();
      container.add(bg);

      // Key slot badge [1] or [2]
      const badgeBg = this.scene.add.graphics();
      badgeBg.fillStyle(0x3d2817, 1);
      badgeBg.fillRoundedRect(6, 6, 26, 26, 4);
      badgeBg.lineStyle(1.5, 0x8c6d4f, 1);
      badgeBg.strokeRoundedRect(6, 6, 26, 26, 4);
      container.add(badgeBg);

      const keyText = this.scene.add.text(19, 19, ability.slotKey, {
        fontFamily: '"Impact", "Arial Black", sans-serif',
        fontSize: '15px',
        color: '#ffddaa'
      }).setOrigin(0.5);
      container.add(keyText);

      // Ability icon symbol
      const iconText = this.scene.add.text(46, 19, ability.iconSymbol, {
        fontSize: '18px'
      }).setOrigin(0.5);
      container.add(iconText);

      // Ability name
      const nameText = this.scene.add.text(64, 12, ability.name.toUpperCase(), {
        fontFamily: '"Arial Black", sans-serif',
        fontSize: '9px',
        color: '#f0dfce'
      }).setOrigin(0, 0.5);
      container.add(nameText);

      // Status text
      const statusText = this.scene.add.text(64, 25, 'READY', {
        fontFamily: 'monospace',
        fontSize: '9px',
        fontWeight: 'bold',
        color: '#55dd66'
      }).setOrigin(0, 0.5);
      container.add(statusText);

      // Cooldown progress bar (shown in COOLDOWN state)
      const cooldownBar = this.scene.add.graphics();
      container.add(cooldownBar);

      // Frenzy timer arc graphics (shown in FRENZY_ACTIVE state)
      const frenzyArc = this.scene.add.graphics();
      container.add(frenzyArc);

      this.hudContainer.add(container);

      return {
        ability,
        container,
        bg,
        statusText,
        cooldownBar,
        frenzyArc,
        cardW,
        cardH,
        state: 'READY',
        cooldownStartTime: 0,
        cooldownDurationMs: 5000,
      };
    });

    this.renderSlotViews();
  }

  /**
   * Updates visual appearance of HUD cards according to current ability state.
   * @param {number} slotIndex
   * @param {string} state
   * @param {Object} [options]
   * @param {number} [options.cooldownMs] - Total cooldown duration in ms (for COOLDOWN state)
   */
  updateSlotState(slotIndex, state, options = {}) {
    if (this.slotViews[slotIndex]) {
      const view = this.slotViews[slotIndex];
      view.state = state;
      if (state === 'COOLDOWN' && options.cooldownMs) {
        view.cooldownDurationMs  = options.cooldownMs;
        view.cooldownStartTime   = this.scene.time.now;
      }
      this.renderSlotViews();
    }
  }

  renderSlotViews() {
    for (const view of this.slotViews) {
      view.bg.clear();
      view.cooldownBar.clear();
      view.frenzyArc.clear();

      if (view.state === 'READY') {
        if (this.isStressFull) {
          view.bg.fillStyle(0x281a0e, 0.96);
          view.bg.fillRoundedRect(0, 0, view.cardW, view.cardH, 6);
          view.bg.lineStyle(2.5, 0xffcc00, 1); // Gold glowing border for full charge
          view.bg.strokeRoundedRect(0, 0, view.cardW, view.cardH, 6);
          view.statusText.setText('FRENZY RDY').setColor('#ffdd44');
        } else {
          view.bg.fillStyle(0x18100c, 0.9);
          view.bg.fillRoundedRect(0, 0, view.cardW, view.cardH, 6);
          view.bg.lineStyle(2, 0x4a3220, 0.9);
          view.bg.strokeRoundedRect(0, 0, view.cardW, view.cardH, 6);
          view.statusText.setText('READY').setColor('#66ee77');
        }
        view.container.setAlpha(1.0);
      } else if (view.state === 'ENTERING_SEQUENCE') {
        view.bg.fillStyle(0x2d1808, 0.95);
        view.bg.fillRoundedRect(0, 0, view.cardW, view.cardH, 6);
        view.bg.lineStyle(2.5, 0xffaa22, 1);
        view.bg.strokeRoundedRect(0, 0, view.cardW, view.cardH, 6);
        view.statusText.setText('INPUT...').setColor('#ffaa22');
        view.container.setAlpha(1.0);
      } else if (view.state === 'PREPARED') {
        view.bg.fillStyle(0x35120a, 0.98);
        view.bg.fillRoundedRect(0, 0, view.cardW, view.cardH, 6);
        view.bg.lineStyle(3, 0xff3322, 1);
        view.bg.strokeRoundedRect(0, 0, view.cardW, view.cardH, 6);
        view.statusText.setText('PREPARED!').setColor('#ff3322');
        view.container.setAlpha(1.0);
      } else if (view.state === 'EXECUTING_EFFECT') {
        view.bg.fillStyle(0x3f1505, 1);
        view.bg.fillRoundedRect(0, 0, view.cardW, view.cardH, 6);
        view.bg.lineStyle(3, 0xffffff, 1);
        view.bg.strokeRoundedRect(0, 0, view.cardW, view.cardH, 6);
        view.statusText.setText('STRIKING!').setColor('#ffffff');
      } else if (view.state === 'LOCKED') {
        view.bg.fillStyle(0x120c09, 0.65);
        view.bg.fillRoundedRect(0, 0, view.cardW, view.cardH, 6);
        view.bg.lineStyle(1.5, 0x2e1e14, 0.6);
        view.bg.strokeRoundedRect(0, 0, view.cardW, view.cardH, 6);
        view.statusText.setText('BUSY').setColor('#776655');
        view.container.setAlpha(0.5);
      } else if (view.state === 'COOLDOWN') {
        view.bg.fillStyle(0x12100e, 0.85);
        view.bg.fillRoundedRect(0, 0, view.cardW, view.cardH, 6);
        view.bg.lineStyle(1.5, 0x3a2a1a, 0.7);
        view.bg.strokeRoundedRect(0, 0, view.cardW, view.cardH, 6);
        view.statusText.setText('COOLDOWN').setColor('#887766');
        view.container.setAlpha(0.7);
        // Cooldown fill bar drawn across the bottom of the card
        const elapsed  = this.scene.time.now - view.cooldownStartTime;
        const ratio    = Phaser.Math.Clamp(1 - elapsed / view.cooldownDurationMs, 0, 1);
        const fillW    = view.cardW * ratio;
        view.cooldownBar.fillStyle(0x4a3010, 1);
        view.cooldownBar.fillRoundedRect(0, view.cardH - 5, fillW, 5, 2);
      } else if (view.state === 'FRENZY_ACTIVE') {
        // Ability color from the ability definition
        const abilityColor = Phaser.Display.Color.HexStringToColor(view.ability.color).color;
        view.bg.fillStyle(0x2a0e1e, 1);
        view.bg.fillRoundedRect(0, 0, view.cardW, view.cardH, 6);
        view.bg.lineStyle(3, abilityColor, 1);
        view.bg.strokeRoundedRect(0, 0, view.cardW, view.cardH, 6);
        view.statusText.setText('FRENZY!').setColor('#' + view.ability.color.replace('#', ''));
        view.container.setAlpha(1.0);
      }
    }
  }

  /**
   * 2. Stress gauge bar.
   * Positioned between the ability cards and the Swats/Bites banner.
   * Two visual states: normal (orange gradient) and FULL (bright gold + pulse).
   */
  createStressBar() {
    const width  = this.scene.scale.width;
    const height = this.scene.scale.height;
    const cx     = width / 2;

    // Place the bar just above the Swats/Bites banner (height - 52), with 4px gap
    const barW = 320;
    const barH = 8;
    const barX = cx - barW / 2;
    const barY = height - 52 - barH - 6;

    this.stressBarContainer = this.scene.add.container(0, 0).setDepth(31);

    // Background track
    const barBg = this.scene.add.graphics();
    barBg.fillStyle(0x1a100c, 1);
    barBg.fillRoundedRect(barX, barY, barW, barH, 4);
    barBg.lineStyle(1, 0x3d2817, 0.8);
    barBg.strokeRoundedRect(barX, barY, barW, barH, 4);
    this.stressBarContainer.add(barBg);

    // Stress fill (redrawn each update)
    this.stressBarFill = this.scene.add.graphics();
    this.stressBarContainer.add(this.stressBarFill);

    // "STRESS" label on the left
    const label = this.scene.add.text(barX, barY - 1, 'STRESS', {
      fontFamily: 'monospace',
      fontSize: '7px',
      color: '#7a5a3a'
    }).setOrigin(0, 1);
    this.stressBarContainer.add(label);

    this._stressBarX = barX;
    this._stressBarY = barY;
    this._stressBarW = barW;
    this._stressBarH = barH;

    this.updateStressBar(0);
  }

  /**
   * Redraws the stress fill according to the given ratio [0..1].
   * During frenzy the bar is bright crimson and drains right→left.
   * @param {number} ratio - 0 (empty) to 1 (full)
   * @param {boolean} [isFrenzy=false]
   */
  updateStressBar(ratio, isFrenzy = false) {
    if (!this.stressBarFill) return;
    this.stressBarFill.clear();

    const clampedRatio = Phaser.Math.Clamp(ratio, 0, 1);
    const fillW = Math.max(0, this._stressBarW * clampedRatio);

    let color;
    if (isFrenzy) {
      color = 0xff2244; // Crimson drain during frenzy
    } else if (clampedRatio >= 1) {
      color = 0xffdd00; // Bright gold when full
    } else if (clampedRatio > 0.6) {
      color = 0xff8800; // Orange
    } else {
      color = 0xcc5500; // Dark orange
    }

    this.stressBarFill.fillStyle(color, 1);
    this.stressBarFill.fillRoundedRect(
      this._stressBarX,
      this._stressBarY,
      fillW,
      this._stressBarH,
      4
    );
  }

  /**
   * Sets whether the stress bar is currently at 100% capacity.
   * When true, READY slot cards display glowing golden borders.
   * @param {boolean} isFull
   */
  setStressFull(isFull) {
    if (this.isStressFull !== isFull) {
      this.isStressFull = isFull;
      this.renderSlotViews();
    }
  }

  /**
   * Plays a brief pulse tween on the stress bar when it reaches 100%.
   * Also adds a glowing border to both ability card icons.
   */
  showStressFullFeedback() {
    this.setStressFull(true);
    if (!this.stressBarFill) return;

    // Cancel any lingering full-bar pulse
    if (this.stressBarFullTween) {
      this.stressBarFullTween.stop();
    }

    // Brief scale pulse on the bar container
    this.stressBarFullTween = this.scene.tweens.add({
      targets: this.stressBarContainer,
      scaleY: 1.6,
      yoyo: true,
      duration: 120,
      ease: 'Quad.easeOut',
      onComplete: () => { this.stressBarContainer.setScale(1); }
    });

    // Gold border flash on each slot card
    for (const view of this.slotViews) {
      this.scene.tweens.add({
        targets: view.container,
        alpha: 0.4,
        yoyo: true,
        repeat: 2,
        duration: 80,
        ease: 'Sine.easeInOut',
        onComplete: () => { view.container.setAlpha(1); }
      });
    }
  }

  /**
   * Activates frenzy UI on the given slot:
   * - Screen vignette overlay
   * - FRENZY_ACTIVE card state (handled via updateSlotState)
   * @param {number} slotIndex
   * @param {number} durationMs - Total frenzy duration for the timer arc
   */
  showFrenzyFeedback(slotIndex, durationMs) {
    // Screen vignette — deep red semi-transparent overlay at edges
    if (!this.frenzyVignette) {
      const w = this.scene.scale.width;
      const h = this.scene.scale.height;
      this.frenzyVignette = this.scene.add.graphics().setDepth(29).setAlpha(0);
      this.frenzyVignette.fillGradientStyle(0xff0033, 0xff0033, 0x000000, 0x000000, 0.35, 0.35, 0, 0);
      this.frenzyVignette.fillRect(0, 0, w, h / 2);
      this.frenzyVignette.fillGradientStyle(0x000000, 0x000000, 0xff0033, 0xff0033, 0, 0, 0.35, 0.35);
      this.frenzyVignette.fillRect(0, h / 2, w, h / 2);
    }

    if (this.frenzyVignetteTween) this.frenzyVignetteTween.stop();
    this.frenzyVignetteTween = this.scene.tweens.add({
      targets: this.frenzyVignette,
      alpha: 1,
      duration: 220,
      ease: 'Quad.easeIn'
    });
  }

  /**
   * Updates the frenzy timer display.
   * Redraws the cooldown bar on the active frenzy slot and pulses the vignette.
   * @param {number} ratio - 1 (full) → 0 (expired)
   * @param {number} slotIndex
   */
  updateFrenzyTimer(ratio, slotIndex) {
    const view = this.slotViews[slotIndex];
    if (!view) return;

    view.frenzyArc.clear();
    const abilityColor = Phaser.Display.Color.HexStringToColor(view.ability.color).color;
    const fillW = view.cardW * ratio;

    // Frenzy countdown bar along the bottom of the card
    view.frenzyArc.fillStyle(abilityColor, 0.9);
    view.frenzyArc.fillRoundedRect(0, view.cardH - 5, fillW, 5, 2);
  }

  /**
   * Removes frenzy vignette and clears the timer arc.
   * @param {number} slotIndex
   */
  hideFrenzyFeedback(slotIndex) {
    if (this.frenzyVignetteTween) this.frenzyVignetteTween.stop();
    if (this.frenzyVignette) {
      this.frenzyVignetteTween = this.scene.tweens.add({
        targets: this.frenzyVignette,
        alpha: 0,
        duration: 350,
        ease: 'Quad.easeOut'
      });
    }

    const view = this.slotViews[slotIndex];
    if (view) view.frenzyArc.clear();
  }

  /**
   * Ticks the cooldown bar fill for slots currently in COOLDOWN state.
   * Must be called every frame from AbilityManager.update().
   */
  tickCooldownBars() {
    for (const view of this.slotViews) {
      if (view.state !== 'COOLDOWN') continue;
      const elapsed = this.scene.time.now - view.cooldownStartTime;
      const ratio   = Phaser.Math.Clamp(1 - elapsed / view.cooldownDurationMs, 0, 1);
      view.cooldownBar.clear();
      view.cooldownBar.fillStyle(0x4a3010, 1);
      view.cooldownBar.fillRoundedRect(0, view.cardH - 5, view.cardW * ratio, 5, 2);
    }
  }

  /**
   * 3. Directional sequence input interface.
   * Positioned strictly at center horizontally and vertically.
   */
  createSequenceOverlay() {
    this.sequenceContainer = this.scene.add.container(0, 0).setDepth(42).setVisible(false);
    const width = this.scene.scale.width;
    const height = this.scene.scale.height;
    const cx = width / 2;
    const cy = height / 2; // Center vertically!

    const panelW = 340;
    const panelH = 110;

    // Panel background
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x110a08, 0.94);
    bg.fillRoundedRect(cx - panelW / 2, cy - panelH / 2, panelW, panelH, 12);
    bg.lineStyle(2.5, 0x4a2e1d, 1);
    bg.strokeRoundedRect(cx - panelW / 2, cy - panelH / 2, panelW, panelH, 12);
    this.sequenceContainer.add(bg);

    // Title label
    this.seqTitleText = this.scene.add.text(cx, cy - 35, 'SEQUENCE: [ Q - W - E - R ]', {
      fontFamily: '"Arial Black", sans-serif',
      fontSize: '11px',
      color: '#ffcc77',
      letterSpacing: 2
    }).setOrigin(0.5);
    this.sequenceContainer.add(this.seqTitleText);

    // Countdown timer progress bar background
    const barBg = this.scene.add.graphics();
    barBg.fillStyle(0x271912, 1);
    barBg.fillRoundedRect(cx - 130, cy + 35, 260, 8, 4);
    this.sequenceContainer.add(barBg);

    // Countdown timer fill bar
    this.timerBarFill = this.scene.add.graphics();
    this.sequenceContainer.add(this.timerBarFill);

    this.panelCenterX = cx;
    this.panelCenterY = cy;
  }

  /**
   * Begins sequence presentation with immediate slots and real-time staggered keycap reveal.
   * 
   * @param {Array<string>} sequence - Array of key inputs: ['Q', 'W', 'E', 'R']
   * @param {number} totalRevealMs - Total time to reveal all keys in real-world milliseconds (~140ms)
   */
  showSequence(sequence, totalRevealMs = 140) {
    // Clear any existing arrow views
    for (const v of this.arrowViews) {
      v.container.destroy();
      if (v.slotBg) v.slotBg.destroy();
    }
    this.arrowViews = [];

    const cx = this.panelCenterX;
    const cy = this.panelCenterY;
    const count = sequence.length;
    const itemW = 54;
    const totalW = count * itemW;
    const startX = cx - totalW / 2 + itemW / 2;

    const delayPerKey = totalRevealMs / Math.max(1, count);
    const unscaledMultiplier = 20; // 1 / 0.05 slow-mo scale

    this.arrowViews = sequence.map((keyName, idx) => {
      const ax = startX + idx * itemW;
      const ay = cy + 1;

      // 1. Static slot placeholder base (immediately visible)
      const slotBg = this.scene.add.graphics();
      slotBg.fillStyle(0x1a100d, 0.85);
      slotBg.fillRoundedRect(ax - 22, ay - 22, 44, 44, 8);
      slotBg.lineStyle(1.5, 0x3d2516, 0.9);
      slotBg.strokeRoundedRect(ax - 22, ay - 22, 44, 44, 8);
      this.sequenceContainer.add(slotBg);

      // 2. Animated 3D arcade keycap container
      const container = this.scene.add.container(ax, ay);
      container.setScale(0.5).setAlpha(0);

      const bg = this.scene.add.graphics();
      container.add(bg);

      const symbol = UI_KEY_SYMBOLS[keyName] || keyName;
      const text = this.scene.add.text(0, -1, symbol, {
        fontFamily: '"Impact", "Arial Black", sans-serif',
        fontSize: '22px',
        color: '#ffffff'
      }).setOrigin(0.5);
      container.add(text);

      this.sequenceContainer.add(container);

      // Progressive pop-in tween uncoupled from slow-motion timeScale
      const popTween = this.scene.tweens.add({
        targets: container,
        scale: 1,
        alpha: 1,
        duration: 70,
        delay: idx * delayPerKey,
        ease: 'Back.easeOut'
      });
      popTween.setTimeScale(unscaledMultiplier);

      return {
        slotBg,
        container,
        bg,
        text,
        direction: keyName,
        isCompleted: false,
        isCurrent: idx === 0
      };
    });

    this.sequenceContainer.setVisible(true);
    this.updateArrowStates(0);
    this.updateTimerProgress(1.0);
  }

  /**
   * Updates 3D tactile arcade styling of keycaps:
   * - Completed: emerald green with bottom bevel
   * - Current: pulsing amber/gold border, elevated scale
   * - Pending: dark tactile chassis
   */
  updateArrowStates(currentIndex) {
    this.arrowViews.forEach((view, idx) => {
      view.bg.clear();

      if (idx < currentIndex) {
        // Correctly completed keycap (3D emerald)
        // Bevel drop-shadow bottom
        view.bg.fillStyle(0x0e2812, 1);
        view.bg.fillRoundedRect(-22, -20, 44, 44, 8);

        // Keycap top
        view.bg.fillStyle(0x1a5223, 1);
        view.bg.fillRoundedRect(-22, -22, 44, 42, 8);
        view.bg.lineStyle(2, 0x44dd66, 1);
        view.bg.strokeRoundedRect(-22, -22, 44, 42, 8);

        view.text.setColor('#44dd66');
        view.text.setY(-2);
        view.container.setScale(1);
      } else if (idx === currentIndex) {
        // Current active target keycap (3D gold/amber)
        view.bg.fillStyle(0x271908, 1);
        view.bg.fillRoundedRect(-24, -22, 48, 48, 8);

        view.bg.fillStyle(0x4a3212, 1);
        view.bg.fillRoundedRect(-24, -24, 48, 46, 8);
        view.bg.lineStyle(3, 0xffbb22, 1);
        view.bg.strokeRoundedRect(-24, -24, 48, 46, 8);

        view.text.setColor('#ffffff');
        view.text.setY(-2);
        view.container.setScale(1.14);
      } else {
        // Pending keycap (3D dark arcade chassis)
        view.bg.fillStyle(0x140c09, 0.9);
        view.bg.fillRoundedRect(-20, -18, 40, 40, 7);

        view.bg.fillStyle(0x2b1c15, 0.9);
        view.bg.fillRoundedRect(-20, -20, 40, 38, 7);
        view.bg.lineStyle(1.5, 0x5a3928, 0.8);
        view.bg.strokeRoundedRect(-20, -20, 40, 38, 7);

        view.text.setColor('#a89280');
        view.text.setY(-2);
        view.container.setScale(0.96);
      }
    });
  }

  /**
   * Punch feedback animation on successful keystroke.
   * Plays a crisp scale bounce and bright flash.
   */
  animateKeyPunch(index) {
    const view = this.arrowViews[index];
    if (!view) return;

    const punchTween = this.scene.tweens.add({
      targets: view.container,
      scale: 1.32,
      yoyo: true,
      duration: 45,
      ease: 'Quad.easeOut'
    });
    punchTween.setTimeScale(20);
  }

  /**
   * Updates real-time countdown progress bar.
   * @param {number} progressRatio - Between 1.0 (full) and 0.0 (empty)
   */
  updateTimerProgress(progressRatio) {
    if (!this.timerBarFill) return;
    this.timerBarFill.clear();

    const cx = this.panelCenterX;
    const cy = this.panelCenterY;
    const totalW = 260;
    const currentW = Math.max(0, totalW * progressRatio);

    // Color gradient based on urgency
    let color = 0x44dd66;
    if (progressRatio < 0.3) {
      color = 0xff2222;
    } else if (progressRatio < 0.6) {
      color = 0xffaa22;
    }

    this.timerBarFill.fillStyle(color, 1);
    this.timerBarFill.fillRoundedRect(cx - 130, cy + 35, currentW, 8, 4);
  }

  /**
   * Plays quick error shake and red flash on mistaken input or timeout.
   */
  showErrorFeedback(onComplete) {
    for (const view of this.arrowViews) {
      view.bg.clear();
      view.bg.fillStyle(0x661111, 1);
      view.bg.fillRoundedRect(-22, -22, 44, 44, 8);
      view.bg.lineStyle(2, 0xff2222, 1);
      view.bg.strokeRoundedRect(-22, -22, 44, 44, 8);
      view.text.setColor('#ff4444');
    }

    const shakeTween = this.scene.tweens.add({
      targets: this.sequenceContainer,
      x: '+=10',
      yoyo: true,
      repeat: 3,
      duration: 40,
      onComplete: () => {
        this.sequenceContainer.setX(0);
        this.hideSequence();
        if (onComplete) onComplete();
      }
    });
    shakeTween.setTimeScale(20);
  }

  hideSequence() {
    this.sequenceContainer.setVisible(false);
  }

  destroy() {
    if (this.hudContainer) this.hudContainer.destroy();
    if (this.stressBarContainer) this.stressBarContainer.destroy();
    if (this.frenzyVignette) this.frenzyVignette.destroy();
    if (this.sequenceContainer) this.sequenceContainer.destroy();
  }
}
