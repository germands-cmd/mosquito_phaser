import Phaser from "phaser";
import { PressureBombAbility } from "./PressureBombAbility.js";
import { ReverseTransfusionAbility } from "./ReverseTransfusionAbility.js";
import { StressSystem } from "./StressSystem.js";
import { AbilityUI } from "./AbilityUI.js";

export const ABILITY_STATES = {
  READY:             "READY",
  ENTERING_SEQUENCE: "ENTERING_SEQUENCE", // Reserved for Stage 2 (finishing move)
  PREPARED:          "PREPARED",
  FRENZY_ACTIVE:     "FRENZY_ACTIVE",
  EXECUTING_EFFECT:  "EXECUTING_EFFECT",
  FAILED:            "FAILED",
  COOLDOWN:          "COOLDOWN",
};

export const INPUTS_LIST = ["Q", "W", "E", "R"];
export const DIRECTIONS_LIST = INPUTS_LIST; // Compatibility alias

/**
 * AbilityManager.js
 * Central coordinator of the active abilities system:
 *
 * Stage 1 (current):
 *   - Manages two independent ability slots (1: Pressure Bomb, 2: Reverse Transfusion)
 *   - Normal mode (stress < 100): pressing a key prepares the slot; next valid hit triggers
 *     the effect once, then the slot enters cooldown.
 *   - Frenzy mode (stress = 100): pressing a key starts a 5-second frenzy window; every
 *     valid hit during that window triggers the empowered effect; cooldown starts at end.
 *   - Stress / streak system via StressSystem.
 *   - Independent per-slot cooldowns.
 *   - Camera zoom during frenzy, slow-motion transitions.
 *
 * Stage 2 (preserved, not yet wired):
 *   - Button-sequence system (ENTERING_SEQUENCE state, Q/W/E/R inputs, countdown timer)
 *     remains intact for the finishing-move mechanic.
 */
export class AbilityManager {
  /**
   * @param {Phaser.Scene} scene
   * @param {import('../audio/AudioManager.js').AudioManager} audioManager
   * @param {import('../managers/MosquitoManager.js').MosquitoManager} mosquitoManager
   * @param {import('../entities/Swatter.js').Swatter} swatter
   * @param {Object} [config]
   * @param {number} [config.slowMoScale=0.05]
   * @param {number} [config.transitionDurationMs=150]
   * @param {number} [config.abilityZoom=1.08]
   * @param {number} [config.timeLimitMs=3000]      - Sequence input time limit (Stage 2)
   * @param {number} [config.frenzyDurationMs=5000]
   * @param {number} [config.attackSpeedBoost=2.0]  - Swatter speed multiplier during frenzy
   * @param {number[]} [config.slotCooldownMs]       - Cooldown per slot in ms [slot0, slot1]
   * @param {Object} [config.stress]                 - Forwarded to StressSystem constructor
   */
  constructor(scene, audioManager, mosquitoManager, swatter, config = {}) {
    this.scene          = scene;
    this.audioManager   = audioManager;
    this.mosquitoManager = mosquitoManager;
    this.swatter        = swatter;

    // Configurable mechanics
    this.slowMoScale          = config.slowMoScale         !== undefined ? config.slowMoScale : 0.05;
    this.transitionDurationMs = config.transitionDurationMs || 150;
    this.abilityZoom          = config.abilityZoom          !== undefined ? config.abilityZoom : 1.0;
    this.timeLimitMs          = config.timeLimitMs          || 3000;  // Stage 2 sequence timer
    this.frenzyDurationMs     = config.frenzyDurationMs     || 5000;
    this.attackSpeedBoost     = config.attackSpeedBoost     !== undefined ? config.attackSpeedBoost : 1.25;
    this.slotCooldownMs       = config.slotCooldownMs       || [5000, 5000];

    // Ability instances
    this.abilities = [
      new PressureBombAbility(),
      new ReverseTransfusionAbility(),
    ];

    // Per-slot state — each slot is fully independent
    this.slotStates         = [ABILITY_STATES.READY, ABILITY_STATES.READY];
    this.slotCooldownTimers = [null, null];

    // Frenzy tracking
    this.activeFrenzySlot  = -1;   // Index of the currently active frenzy slot (-1 = none)
    this.frenzyRemainingMs = 0;

    // Stage 2: button-sequence tracking (preserved, not wired in Stage 1)
    this.activeSlotIndex  = -1;
    this.currentSequence  = [];
    this.sequenceIndex    = 0;
    this.timerRemainingMs = 0;
    this.zoomTween        = null;

    // Stress / streak system
    this.stressSystem = new StressSystem(config.stress || {});

    // HUD
    this.ui = new AbilityUI(this.scene, this.abilities);
  }

  // ---------------------------------------------------------------------------
  // Public query helpers
  // ---------------------------------------------------------------------------

  /**
   * Returns whether the player is currently invulnerable to mosquito bites.
   * True strictly while entering the directional sequence (Stage 2).
   * @returns {boolean}
   */
  isInvulnerable() {
    return this.slotStates.some(s => s === ABILITY_STATES.ENTERING_SEQUENCE);
  }

  /**
   * Returns true when at least one slot is in FRENZY_ACTIVE state.
   * @returns {boolean}
   */
  isFrenzyActive() {
    return this.activeFrenzySlot !== -1;
  }

  // ---------------------------------------------------------------------------
  // Slot activation
  // ---------------------------------------------------------------------------

  /**
   * Called when the player presses the key for a given slot (0 = key '1', 1 = key '2').
   *
   * Rules:
   * - Frenzy already active → ignore completely.
   * - Another slot already PREPARED → ignore (no cancel / queue).
   * - Target slot not READY → ignore (COOLDOWN or other non-READY state).
   * - Stress full → enter frenzy on this slot.
   * - Stress not full → prepare this slot normally.
   *
   * @param {number} slotIndex
   */
  activateSlot(slotIndex) {
    // Block if frenzy is running
    if (this.activeFrenzySlot !== -1) return;

    // Block if any slot is already PREPARED
    if (this.slotStates.some(s => s === ABILITY_STATES.PREPARED)) return;

    // Block if this specific slot is not READY
    if (this.slotStates[slotIndex] !== ABILITY_STATES.READY) return;

    const ability = this.abilities[slotIndex];
    if (!ability) return;

    if (this.stressSystem.isFull()) {
      this._enterFrenzy(slotIndex);
    } else {
      this._enterPrepared(slotIndex);
    }
  }

  // ---------------------------------------------------------------------------
  // Normal mode (PREPARED)
  // ---------------------------------------------------------------------------

  /**
   * Sets a slot to the PREPARED state without a button sequence.
   * @param {number} slotIndex
   * @private
   */
  _enterPrepared(slotIndex) {
    this.slotStates[slotIndex] = ABILITY_STATES.PREPARED;
    this.activeSlotIndex       = slotIndex;

    this.ui.updateSlotState(slotIndex, ABILITY_STATES.PREPARED);

    if (this.swatter && this.swatter.setPreparedVisual) {
      this.swatter.setPreparedVisual(true, this.abilities[slotIndex].color);
    }

    if (this.audioManager && this.audioManager.playAbilityActivate) {
      this.audioManager.playAbilityActivate();
    }
  }

  // ---------------------------------------------------------------------------
  // Frenzy mode (FRENZY_ACTIVE)
  // ---------------------------------------------------------------------------

  /**
   * Consumes the full stress bar and begins a 5-second frenzy window on the given slot.
   * @param {number} slotIndex
   * @private
   */
  _enterFrenzy(slotIndex) {
    this.stressSystem.consumeForFrenzy();

    this.activeFrenzySlot        = slotIndex;
    this.frenzyRemainingMs       = this.frenzyDurationMs;
    this.slotStates[slotIndex]   = ABILITY_STATES.FRENZY_ACTIVE;

    this.ui.setStressFull(false);
    this.ui.updateSlotState(slotIndex, ABILITY_STATES.FRENZY_ACTIVE);
    this.ui.updateStressBar(1, true);
    this.ui.showFrenzyFeedback(slotIndex, this.frenzyDurationMs);

    // Camera zoom in without slowing time or muffling sound
    this.zoomCamera(this.abilityZoom);

    // Speed boost on swatter
    if (this.swatter && this.swatter.setSpeedBoost) {
      this.swatter.setSpeedBoost(this.attackSpeedBoost);
    }

    if (this.audioManager && this.audioManager.playFrenzyStart) {
      this.audioManager.playFrenzyStart();
    }
  }

  /**
   * Ends the frenzy window, restores speed, starts cooldown.
   * @private
   */
  _endFrenzy() {
    const slotIndex = this.activeFrenzySlot;

    this.stressSystem.endFrenzy();
    this.activeFrenzySlot  = -1;
    this.frenzyRemainingMs = 0;

    // Restore swatter speed
    if (this.swatter && this.swatter.setSpeedBoost) {
      this.swatter.setSpeedBoost(1.0);
    }

    // Camera zoom out
    this.zoomCamera(1.0);

    this.ui.hideFrenzyFeedback(slotIndex);
    this.ui.updateStressBar(0, false);

    this._startCooldown(slotIndex);
  }

  // ---------------------------------------------------------------------------
  // Effect execution
  // ---------------------------------------------------------------------------

  /**
   * Intercepts fly-swatter strike impacts.
   * Called by GameScene when the swatter strikes the surface.
   *
   * Priority:
   *   1. If a slot is PREPARED and there's a valid hit → trigger normal effect (×1).
   *   2. If frenzy is active and there's a valid hit → trigger empowered effect (stays active).
   *
   * @param {number} impactX
   * @param {number} impactY
   * @param {number} hitRadius
   * @param {Array<import('../entities/Mosquito.js').Mosquito>} hitMosquitoes
   * @returns {boolean} Whether an ability effect was triggered
   */
  handleSwatImpact(impactX, impactY, hitRadius, hitMosquitoes = []) {
    const isHit = hitMosquitoes && hitMosquitoes.length > 0;

    // --- Normal PREPARED mode ---
    const preparedSlot = this.slotStates.findIndex(s => s === ABILITY_STATES.PREPARED);
    if (preparedSlot !== -1) {
      if (!isHit) return false; // Miss — ability stays prepared
      this._triggerEffect(preparedSlot, false, impactX, impactY, hitRadius, hitMosquitoes);
      return true;
    }

    // --- Frenzy mode ---
    if (this.activeFrenzySlot !== -1 && isHit) {
      this._triggerEffect(this.activeFrenzySlot, true, impactX, impactY, hitRadius, hitMosquitoes);
      return true;
    }

    return false;
  }

  /**
   * Runs the normal or empowered effect for the given slot.
   * In normal mode, calls ability.executeEffect() then starts cooldown.
   * In frenzy mode, calls ability.executeEmpoweredEffect() and leaves the slot in FRENZY_ACTIVE.
   *
   * @param {number}  slotIndex
   * @param {boolean} isEmpowered
   * @param {number}  impactX
   * @param {number}  impactY
   * @param {number}  hitRadius
   * @param {Array}   hitMosquitoes
   * @private
   */
  _triggerEffect(slotIndex, isEmpowered, impactX, impactY, hitRadius, hitMosquitoes) {
    const ability = this.abilities[slotIndex];

    const context = {
      scene:           this.scene,
      impactX,
      impactY,
      hitRadius,
      hitMosquitoes,
      mosquitoManager: this.mosquitoManager,
      audioManager:    this.audioManager,
      onComplete:      isEmpowered
        ? () => {} // Frenzy: effect completes but slot stays FRENZY_ACTIVE
        : () => this._endNormalEffect(slotIndex),
    };

    if (isEmpowered) {
      ability.executeEmpoweredEffect(context);
    } else {
      this.slotStates[slotIndex] = ABILITY_STATES.EXECUTING_EFFECT;
      this.ui.updateSlotState(slotIndex, ABILITY_STATES.EXECUTING_EFFECT);
      ability.executeEffect(context);
    }
  }

  /**
   * Cleans up after a normal (non-frenzy) effect completes.
   * @param {number} slotIndex
   * @private
   */
  _endNormalEffect(slotIndex) {
    if (this.swatter && this.swatter.setPreparedVisual) {
      this.swatter.setPreparedVisual(false);
    }
    this.activeSlotIndex = -1;
    this._startCooldown(slotIndex);
  }

  // ---------------------------------------------------------------------------
  // Cooldown
  // ---------------------------------------------------------------------------

  /**
   * Puts a slot into COOLDOWN and schedules its return to READY.
   * @param {number} slotIndex
   * @private
   */
  _startCooldown(slotIndex) {
    const durationMs = this.slotCooldownMs[slotIndex] ?? 5000;

    this.slotStates[slotIndex] = ABILITY_STATES.COOLDOWN;
    this.ui.updateSlotState(slotIndex, ABILITY_STATES.COOLDOWN, { cooldownMs: durationMs });

    if (this.slotCooldownTimers[slotIndex]) {
      this.slotCooldownTimers[slotIndex].remove();
    }

    this.slotCooldownTimers[slotIndex] = this.scene.time.delayedCall(durationMs, () => {
      this.slotStates[slotIndex] = ABILITY_STATES.READY;
      this.ui.updateSlotState(slotIndex, ABILITY_STATES.READY);
      this.slotCooldownTimers[slotIndex] = null;
    });
  }

  // ---------------------------------------------------------------------------
  // Camera zoom
  // ---------------------------------------------------------------------------

  /**
   * Centers and tweens the main camera zoom smoothly.
   * Keeps the center of the world anchored to the screen center.
   * @param {number} targetZoom
   */
  zoomCamera(targetZoom) {
    if (this.zoomTween) this.zoomTween.stop();

    const w = this.scene.scale.width;
    const h = this.scene.scale.height;
    const z = targetZoom;
    const targetScrollX = z > 1 ? (w / 2) * (1 - 1 / z) : 0;
    const targetScrollY = z > 1 ? (h / 2) * (1 - 1 / z) : 0;

    this.zoomTween = this.scene.tweens.add({
      targets: this.scene.cameras.main,
      zoom: z,
      scrollX: targetScrollX,
      scrollY: targetScrollY,
      duration: this.transitionDurationMs,
      ease: "Quad.easeInOut",
    });
  }

  // ---------------------------------------------------------------------------
  // Stage 2 — Button sequence (preserved, not wired in Stage 1)
  // ---------------------------------------------------------------------------

  /**
   * Enters slow motion, bullet-time audio damping and eases camera zoom in.
   */
  enterSlowMotion() {
    this.scene.time.timeScale   = this.slowMoScale;
    this.scene.tweens.timeScale = this.slowMoScale;

    if (this.zoomTween) this.zoomTween.stop();

    // Tween camera zoom using real-time unscaled timescale
    // scrollX/Y computed so the world centre stays anchored to the screen centre
    const w = this.scene.scale.width;
    const h = this.scene.scale.height;
    const z = this.abilityZoom;
    this.zoomTween = this.scene.tweens.add({
      targets: this.scene.cameras.main,
      zoom:    z,
      scrollX: (w / 2) * (1 - 1 / z),
      scrollY: (h / 2) * (1 - 1 / z),
      duration: this.transitionDurationMs,
      ease: "Quad.easeInOut",
    });
    this.zoomTween.setTimeScale(10);

    // Bullet-time audio transition
    if (this.audioManager && this.audioManager.enterSlowMotionAudio) {
      this.audioManager.enterSlowMotionAudio(this.transitionDurationMs / 1000);
    }
  }

  /**
   * Exits slow motion and restores camera zoom & audio back to normal.
   */
  exitSlowMotion() {
    this.scene.time.timeScale   = 1.0;
    this.scene.tweens.timeScale = 1.0;

    if (this.zoomTween) this.zoomTween.stop();

    this.zoomTween = this.scene.tweens.add({
      targets: this.scene.cameras.main,
      zoom:    1.0,
      scrollX: 0,
      scrollY: 0,
      duration: this.transitionDurationMs,
      ease: "Quad.easeInOut",
    });

    if (this.audioManager && this.audioManager.exitSlowMotionAudio) {
      this.audioManager.exitSlowMotionAudio(this.transitionDurationMs / 1000);
    }
  }

  /**
   * Processes input key (Q, W, E, R) — Stage 2 sequence system.
   * Has no effect in Stage 1 (no slot will be in ENTERING_SEQUENCE).
   * @param {string} direction
   */
  handleDirectionInput(direction) {
    if (!this.slotStates.some(s => s === ABILITY_STATES.ENTERING_SEQUENCE)) return;

    const inputKey = (direction || "").toUpperCase();
    const expected = this.currentSequence[this.sequenceIndex];
    if (inputKey === expected) {
      if (this.ui && this.ui.animateKeyPunch) {
        this.ui.animateKeyPunch(this.sequenceIndex);
      }

      this.sequenceIndex++;

      if (this.audioManager && this.audioManager.playSequenceStep) {
        this.audioManager.playSequenceStep();
      }

      this.ui.updateArrowStates(this.sequenceIndex);

      if (this.sequenceIndex >= this.currentSequence.length) {
        this.handleSequenceSuccess();
      }
    } else {
      this.handleSequenceFail();
    }
  }

  /**
   * Handles successful sequence completion (Stage 2).
   */
  handleSequenceSuccess() {
    this.exitSlowMotion();
    this.ui.hideSequence();

    if (this.audioManager && this.audioManager.playAbilityPrepared) {
      this.audioManager.playAbilityPrepared();
    }

    const slot = this.activeSlotIndex;
    this.slotStates[slot] = ABILITY_STATES.PREPARED;
    this.ui.updateSlotState(slot, ABILITY_STATES.PREPARED);

    if (this.swatter && this.swatter.setPreparedVisual) {
      this.swatter.setPreparedVisual(true, this.abilities[slot].color);
    }
  }

  /**
   * Handles sequence failure (wrong key or timeout) (Stage 2).
   */
  handleSequenceFail() {
    const slot = this.activeSlotIndex;
    if (slot !== -1) {
      this.slotStates[slot] = ABILITY_STATES.FAILED;
    }
    this.exitSlowMotion();

    if (this.audioManager && this.audioManager.playSequenceFail) {
      this.audioManager.playSequenceFail();
    }

    this.ui.showErrorFeedback(() => {
      this.resetToReady();
    });
  }

  // ---------------------------------------------------------------------------
  // Reset helpers
  // ---------------------------------------------------------------------------

  /**
   * Resets a single slot back to READY, cancelling any pending cooldown timer.
   * @param {number} slotIndex
   */
  resetSlotToReady(slotIndex) {
    this.slotStates[slotIndex] = ABILITY_STATES.READY;
    if (this.slotCooldownTimers[slotIndex]) {
      this.slotCooldownTimers[slotIndex].remove();
      this.slotCooldownTimers[slotIndex] = null;
    }
    this.ui.updateSlotState(slotIndex, ABILITY_STATES.READY);
  }

  /**
   * Resets all slot states back to READY.
   */
  resetToReady() {
    for (let i = 0; i < this.abilities.length; i++) {
      this.resetSlotToReady(i);
    }
    this.activeSlotIndex  = -1;
    this.currentSequence  = [];
    this.sequenceIndex    = 0;
    this.timerRemainingMs = 0;

    if (this.swatter && this.swatter.setPreparedVisual) {
      this.swatter.setPreparedVisual(false);
    }
  }

  /**
   * Complete reset on pause, game over, restart, or scene shutdown.
   */
  reset() {
    // Cancel active frenzy
    if (this.activeFrenzySlot !== -1) {
      this.ui.hideFrenzyFeedback(this.activeFrenzySlot);
      this.activeFrenzySlot  = -1;
      this.frenzyRemainingMs = 0;
      if (this.swatter && this.swatter.setSpeedBoost) {
        this.swatter.setSpeedBoost(1.0);
      }
    }

    this.zoomCamera(1.0);
    this.exitSlowMotion();
    this.ui.hideSequence();
    this.ui.setStressFull(false);
    this.resetToReady();
    this.stressSystem.reset();
    this.ui.updateStressBar(0, false);
    this.scene.cameras.main.setScroll(0, 0);
    this.scene.cameras.main.setZoom(1.0);
    this.scene.time.timeScale = 1.0;
    this.scene.tweens.timeScale = 1.0;

    if (this.audioManager && this.audioManager.exitSlowMotionAudio) {
      this.audioManager.exitSlowMotionAudio(0.05);
    }
  }

  // ---------------------------------------------------------------------------
  // Frame update
  // ---------------------------------------------------------------------------

  /**
   * Frame update loop.
   * @param {number} time
   * @param {number} delta - Milliseconds elapsed since last frame
   */
  update(time, delta) {
    // Dynamic counter-scale for UI pinning: keeps UI visually unzoomed at 1.0x in screen space
    const currentZoom = this.scene.cameras.main.zoom;
    if (currentZoom > 0 && this.ui && this.ui.sequenceContainer) {
      this.ui.sequenceContainer.setScale(1 / currentZoom);
    }

    // Frenzy timer countdown
    if (this.activeFrenzySlot !== -1) {
      this.frenzyRemainingMs -= delta;

      const ratio = Phaser.Math.Clamp(this.frenzyRemainingMs / this.frenzyDurationMs, 0, 1);

      // Drain stress bar visually in sync with the frenzy timer
      this.stressSystem.stress = ratio * this.stressSystem.maxStress;
      this.ui.updateStressBar(ratio, true);
      this.ui.updateFrenzyTimer(ratio, this.activeFrenzySlot);

      if (this.frenzyRemainingMs <= 0) {
        this._endFrenzy();
      }
    }

    // Stage 2 sequence countdown (inactive in Stage 1)
    if (this.slotStates.some(s => s === ABILITY_STATES.ENTERING_SEQUENCE)) {
      this.timerRemainingMs -= delta;

      const ratio = Phaser.Math.Clamp(this.timerRemainingMs / this.timeLimitMs, 0, 1);
      this.ui.updateTimerProgress(ratio);

      if (this.timerRemainingMs <= 0) {
        this.handleSequenceFail();
      }
    }

    // Tick cooldown bar fills
    this.ui.tickCooldownBars();
  }

  destroy() {
    this.reset();
    if (this.ui) this.ui.destroy();
  }
}
