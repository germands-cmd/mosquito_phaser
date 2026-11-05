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
 * 1. Bottom ability icon containers above the health/stress bars
 * 2. Stress gauge rendered behind and around the health bar
 * 3. Vertically and horizontally centered sequence input panel with immediate slots,
 *    staggered pop-in, 3D arcade keycaps, punch bounce feedback, and countdown bar.
 * 4. Frenzy feedback: screen vignette and availability progress on each slot
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
   * 1. Creates square ability icon containers above the health/stress bars.
   */
  createHUD() {
    this.hudContainer = this.scene.add.container(0, 0).setDepth(31);
    const width = this.scene.scale.width;
    const height = this.scene.scale.height;
    const cx = width / 2;

    const healthBar = this.scene.bloodHealthBar;
    const cardW = 48;
    const cardH = 48;
    const gap = 14;
    const barMargin = 10;
    const cardY = healthBar
      ? healthBar.y - cardH - barMargin
      : height - 49 - cardH - barMargin;

    const totalWidth = 2 * cardW + gap;
    const startX = cx - totalWidth / 2;

    this.slotViews = this.abilities.map((ability, idx) => {
      const cardX = startX + idx * (cardW + gap);
      const container = this.scene.add.container(cardX, cardY);

      // Outer square state container
      const bg = this.scene.add.graphics();
      container.add(bg);

      // Inner square icon container
      const iconBg = this.scene.add.graphics();
      iconBg.fillStyle(0x3d2817, 1);
      iconBg.fillRect(7, 7, cardW - 14, cardH - 14);
      iconBg.lineStyle(1.5, 0x8c6d4f, 1);
      iconBg.strokeRect(7, 7, cardW - 14, cardH - 14);
      container.add(iconBg);

      const iconText = this.scene.add.text(cardW / 2, cardH / 2, ability.iconSymbol, {
        fontSize: '21px'
      }).setOrigin(0.5);
      container.add(iconText);

      // Cooldown progress bar (shown in COOLDOWN state)
      const cooldownBar = this.scene.add.graphics();
      container.add(cooldownBar);

      const readyFlash = this.scene.add.graphics().setAlpha(0);
      container.add(readyFlash);

      this.hudContainer.add(container);

      return {
        ability,
        container,
        bg,
        iconBg,
        iconText,
        cooldownBar,
        readyFlash,
        cardW,
        cardH,
        state: 'READY',
        progressRatio: idx === 1 ? 1 : 0,
        cooldownStartTime: 0,
        cooldownDurationMs: 2000,
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

      if (view.state === 'READY') {
        if (this.isStressFull) {
          view.bg.fillStyle(0x281a0e, 0.96);
          view.bg.fillRect(0, 0, view.cardW, view.cardH);
          view.bg.lineStyle(2.5, 0xffcc00, 1); // Gold glowing border for full charge
          view.bg.strokeRect(0, 0, view.cardW, view.cardH);
        } else {
          view.bg.fillStyle(0x18100c, 0.9);
          view.bg.fillRect(0, 0, view.cardW, view.cardH);
          view.bg.lineStyle(2, 0x4a3220, 0.9);
          view.bg.strokeRect(0, 0, view.cardW, view.cardH);
        }
        view.container.setAlpha(1.0);
      } else if (view.state === 'ENTERING_SEQUENCE') {
        view.bg.fillStyle(0x2d1808, 0.95);
        view.bg.fillRect(0, 0, view.cardW, view.cardH);
        view.bg.lineStyle(2.5, 0xffaa22, 1);
        view.bg.strokeRect(0, 0, view.cardW, view.cardH);
        view.container.setAlpha(1.0);
      } else if (view.state === 'PREPARED') {
        view.bg.fillStyle(0x35120a, 0.98);
        view.bg.fillRect(0, 0, view.cardW, view.cardH);
        view.bg.lineStyle(3, 0xff3322, 1);
        view.bg.strokeRect(0, 0, view.cardW, view.cardH);
        view.container.setAlpha(1.0);
      } else if (view.state === 'EXECUTING_EFFECT') {
        view.bg.fillStyle(0x3f1505, 1);
        view.bg.fillRect(0, 0, view.cardW, view.cardH);
        view.bg.lineStyle(3, 0xffffff, 1);
        view.bg.strokeRect(0, 0, view.cardW, view.cardH);
      } else if (view.state === 'LOCKED') {
        view.bg.fillStyle(0x120c09, 0.65);
        view.bg.fillRect(0, 0, view.cardW, view.cardH);
        view.bg.lineStyle(1.5, 0x2e1e14, 0.6);
        view.bg.strokeRect(0, 0, view.cardW, view.cardH);
        view.container.setAlpha(0.5);
      } else if (view.state === 'COOLDOWN') {
        view.bg.fillStyle(0x12100e, 0.85);
        view.bg.fillRect(0, 0, view.cardW, view.cardH);
        view.bg.lineStyle(1.5, 0x3a2a1a, 0.7);
        view.bg.strokeRect(0, 0, view.cardW, view.cardH);
        view.container.setAlpha(0.7);
      } else if (view.state === 'FRENZY_ACTIVE') {
        // Ability color from the ability definition
        const abilityColor = Phaser.Display.Color.HexStringToColor(view.ability.color).color;
        view.bg.fillStyle(0x2a0e1e, 1);
        view.bg.fillRect(0, 0, view.cardW, view.cardH);
        view.bg.lineStyle(3, abilityColor, 1);
        view.bg.strokeRect(0, 0, view.cardW, view.cardH);
        view.container.setAlpha(1.0);
      }

      this.updateAbilityProgress(this.slotViews.indexOf(view), view.progressRatio);

    }
  }

  /**
   * Updates the white availability bar for a slot. The bar represents the
   * next automatic activation, not the remaining frenzy duration.
   * @param {number} slotIndex
   * @param {number} ratio
   */
  updateAbilityProgress(slotIndex, ratio) {
    const view = this.slotViews[slotIndex];
    if (!view) return;

    const clampedRatio = Phaser.Math.Clamp(ratio, 0, 1);
    view.progressRatio = clampedRatio;
    view.cooldownBar.clear();
    view.cooldownBar.fillStyle(0xffffff, 1);
    view.cooldownBar.fillRect(
      3,
      view.cardH - 8,
      (view.cardW - 6) * clampedRatio,
      5
    );
  }

  /**
   * Flashes the outer border when an ability becomes available.
   * @param {number} slotIndex
   */
  flashAbilityReady(slotIndex) {
    const view = this.slotViews[slotIndex];
    if (!view) return;

    view.readyFlash.clear();
    view.readyFlash.lineStyle(5, 0xffffff, 1);
    view.readyFlash.strokeRect(1, 1, view.cardW - 2, view.cardH - 2);
    view.readyFlash.setAlpha(1);
    if (view.readyFlashTween) view.readyFlashTween.stop();
    view.readyFlashTween = this.scene.tweens.add({
      targets: view.readyFlash,
      alpha: 0,
      duration: 260,
      ease: 'Quad.easeOut'
    });
  }

  /**
   * 2. Stress gauge bar.
   * Positioned below the ability icons, behind the health bar and slightly
   * larger than it.
   * Two visual states: normal (orange) and FULL (bright gold + pulse).
   */
  createStressBar() {
    const healthBar = this.scene.bloodHealthBar;
    const barW = (healthBar?.width || 340) + 12;
    const barH = (healthBar?.height || 24) + 10;
    const barX = (healthBar?.x || (this.scene.scale.width - barW) / 2) - 6;
    const barY = (healthBar?.y || this.scene.scale.height - 49) - 5;

    this.stressBarContainer = this.scene.add.container(0, 0).setDepth(29);

    // Background track
    const barBg = this.scene.add.graphics();
    barBg.fillStyle(0x1a100c, 1);
    barBg.fillRoundedRect(barX, barY, barW, barH, 8);
    barBg.lineStyle(1, 0x3d2817, 0.8);
    barBg.strokeRoundedRect(barX, barY, barW, barH, 8);
    this.stressBarContainer.add(barBg);

    // Stress fill (redrawn each update)
    this.stressBarFill = this.scene.add.graphics();
    this.stressBarContainer.add(this.stressBarFill);

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
      8
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
   */
  showFrenzyFeedback(durationMs) {
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
  /**
   * Removes frenzy vignette.
   */
  hideFrenzyFeedback() {
    if (this.frenzyVignetteTween) this.frenzyVignetteTween.stop();
    if (this.frenzyVignette) {
      this.frenzyVignetteTween = this.scene.tweens.add({
        targets: this.frenzyVignette,
        alpha: 0,
        duration: 350,
        ease: 'Quad.easeOut'
      });
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
