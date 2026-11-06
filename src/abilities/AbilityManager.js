import Phaser from "phaser";
import { PressureBombAbility } from "./PressureBombAbility.js";
import { ReverseTransfusionAbility } from "./ReverseTransfusionAbility.js";
import { ELECTROCUTION_APPLIED_EVENT } from "../effects/ElectrocutionStatusEffect.js";
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
 *   - Pressure Bomb triggers automatically on every third valid impact.
 *   - Reverse Transfusion triggers automatically on the next valid impact after a 2-second cooldown.
 *   - Impact Rain repeats one randomly selected equipped impact ability across three delayed impacts.
 *   - Frenzy mode is started with SPACE and makes every valid impact trigger both abilities.
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
    this.slotCooldownMs       = config.slotCooldownMs       || [0, 2000];

    // Ability instances - starts empty (acquired per phase)
    this.abilities = [];

    // Per-slot state — each slot is fully independent
    this.slotStates         = [];
    this.slotCooldownTimers = [];
    this.impactCount         = 0;
    this.reverseTransfusionReadyAt = 0;
    this.reverseTransfusionCooldownStartedAt = 0;

    // Frenzy tracking
    this.activeFrenzySlot  = -1;   // Legacy compatibility marker; frenzy applies to both slots
    this.frenzyActive      = false;
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
    this.electrocutionEventHandler = (enemy) => this.handleElectrocutionApplied(enemy);
    this.scene.events.on(ELECTROCUTION_APPLIED_EVENT, this.electrocutionEventHandler);
  }

  /**
   * Equips a new ability instance into the next available slot.
   * @param {import('./BaseAbility.js').BaseAbility} ability
   * @returns {number} Slot index where the ability was equipped
   */
  equipAbility(ability) {
    if (!ability) return -1;
    const existingIndex = this.abilities.findIndex(a => a.id === ability.id);
    if (existingIndex !== -1) return existingIndex;

    const slotIndex = this.abilities.length;
    this.abilities.push(ability);
    this.slotStates.push(ABILITY_STATES.READY);
    this.slotCooldownTimers.push(null);

    if (ability.id === "REVERSE_TRANSFUSION") {
      this.reverseTransfusionReadyAt = 0;
      this.reverseTransfusionCooldownStartedAt = 0;
    }

    this.ui.setAbilities(this.abilities);
    this.ui.updateSlotState(slotIndex, ABILITY_STATES.READY);
    this.ui.flashAbilityReady(slotIndex);
    if (ability.id === "LIGHTNING_PULSE") this.updateChargeDisplay(slotIndex, ability);

    return slotIndex;
  }

  /**
   * Returns array of IDs of currently equipped abilities.
   * @returns {string[]}
   */
  getEquippedAbilityIds() {
    return this.abilities.map(a => a.id);
  }

  handleElectrocutionApplied(enemy) {
    this.abilities.forEach((ability, index) => {
      if (ability.id !== "LIGHTNING_PULSE") return;
      ability.tryActivate(enemy, this.mosquitoManager);
      this.updateChargeDisplay(index, ability);
    });
  }

  updateChargeDisplay(slotIndex, ability) {
    this.ui.updateAbilityCharges(slotIndex, ability.charges, ability.maxCharges);
    this.ui.updateAbilityProgress(slotIndex, ability.getChargeProgress());
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
   * Returns true while frenzy is active.
   * @returns {boolean}
   */
  isFrenzyActive() {
    return this.frenzyActive;
  }

  // ---------------------------------------------------------------------------
  // Frenzy activation
  // ---------------------------------------------------------------------------

  /**
   * Starts frenzy when the stress gauge is full.
   */
  activateFrenzy() {
    if (this.frenzyActive || !this.stressSystem.isFull()) return false;
    this._enterFrenzy();
    return true;
  }

  // ---------------------------------------------------------------------------
  // Frenzy mode (FRENZY_ACTIVE)
  // ---------------------------------------------------------------------------

  /**
   * Consumes the full stress bar and begins a 5-second frenzy window.
   * @private
   */
  _enterFrenzy() {
    this.stressSystem.consumeForFrenzy();

    this.frenzyActive            = true;
    this.activeFrenzySlot        = 0;
    this.frenzyRemainingMs       = this.frenzyDurationMs;
    this.slotStates              = this.abilities.map(() => ABILITY_STATES.FRENZY_ACTIVE);

    this.ui.setStressFull(false);
    this.slotStates.forEach((state, index) => this.ui.updateSlotState(index, state));
    this.ui.updateStressBar(1, true);
    this.ui.showFrenzyFeedback(this.frenzyDurationMs);

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
   * Ends the frenzy window and restores normal ability availability.
   * @private
   */
  _endFrenzy() {
    this.stressSystem.endFrenzy();
    this.activeFrenzySlot  = -1;
    this.frenzyActive      = false;
    this.frenzyRemainingMs = 0;

    // Restore swatter speed
    if (this.swatter && this.swatter.setSpeedBoost) {
      this.swatter.setSpeedBoost(1.0);
    }

    // Camera zoom out
    this.zoomCamera(1.0);

    this.ui.hideFrenzyFeedback();
    this.ui.updateStressBar(0, false);

    this.slotStates.forEach((state, index) => {
      if (state === ABILITY_STATES.FRENZY_ACTIVE || state === ABILITY_STATES.EXECUTING_EFFECT) {
        this.slotStates[index] = ABILITY_STATES.READY;
        this.ui.updateSlotState(index, ABILITY_STATES.READY);
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Effect execution
  // ---------------------------------------------------------------------------

  /**
   * Intercepts fly-swatter strike impacts.
   * Called by GameScene when the swatter strikes the surface.
   *
   * Normal mode evaluates each ability independently. Frenzy bypasses both
   * automatic activation requirements and cooldowns, but uses normal effects.
   *
   * @param {number} impactX
   * @param {number} impactY
   * @param {number} hitRadius
   * @param {Array<import('../entities/Mosquito.js').Mosquito>} hitMosquitoes
   * @returns {boolean} Whether an ability effect was triggered
   */
  handleSwatImpact(impactX, impactY, hitRadius, hitMosquitoes = []) {
    const isHit = hitMosquitoes && hitMosquitoes.length > 0;

    if (!isHit || this.abilities.length === 0) return false;

    const now = this.scene.time.now;
    this.impactCount++;
    let triggered = false;

    if (this.frenzyActive) {
      this.abilities.forEach((ability, index) => {
        if (ability.activationType === "status") return;
        const extraContext = ability.id === "IMPACT_RAIN"
          ? { replicatedAbility: this.selectReplicatedAbility(ability) }
          : {};
        this._triggerEffect(
          index,
          false,
          impactX,
          impactY,
          hitRadius,
          hitMosquitoes,
          extraContext
        );
        triggered = true;
      });
      return triggered;
    }

    this.abilities.forEach((ability, index) => {
      if (this.slotStates[index] !== ABILITY_STATES.READY) return;

      if (ability.id === "PRESSURE_BOMB") {
        if (this.impactCount % ability.impactInterval === 0) {
          this._triggerEffect(index, false, impactX, impactY, hitRadius, hitMosquitoes);
          this.ui.updateAbilityProgress(index, 0);
          this.ui.flashAbilityReady(index);
          triggered = true;
        }
      } else if (ability.id === "REVERSE_TRANSFUSION") {
        if (now >= this.reverseTransfusionReadyAt) {
          this.reverseTransfusionReadyAt = now + ability.cooldownMs;
          this.reverseTransfusionCooldownStartedAt = now;
          this.ui.updateAbilityProgress(index, 0);
          this._triggerEffect(index, false, impactX, impactY, hitRadius, hitMosquitoes);
          triggered = true;
        }
      } else if (ability.id === "THUNDERSTORM") {
        if (now >= ability.cooldownReadyAt) {
          const strikeTargets = ability.selectStrikeTargets(
            this.mosquitoManager,
            this.scene.scale.width,
            this.scene.scale.height
          );
          if (strikeTargets.length > 0) {
            ability.cooldownReadyAt = now + ability.cooldownMs;
            this.ui.updateAbilityProgress(index, 0);
            this._triggerEffect(
              index,
              false,
              impactX,
              impactY,
              hitRadius,
              hitMosquitoes,
              { strikeTargets }
            );
            triggered = true;
          }
        }
      } else if (ability.id === "IMPACT_RAIN") {
        if (now >= ability.cooldownReadyAt) {
          ability.cooldownReadyAt = now + ability.cooldownMs;
          this.ui.updateAbilityProgress(index, 0);
          this._triggerEffect(
            index,
            false,
            impactX,
            impactY,
            hitRadius,
            hitMosquitoes,
            { replicatedAbility: this.selectReplicatedAbility(ability) }
          );
          triggered = true;
        }
      }
    });

    return triggered;
  }

  selectReplicatedAbility(excludedAbility) {
    const candidates = this.abilities.filter((ability) =>
      ability !== excludedAbility && ability.activationType === "impact"
    );
    if (candidates.length === 0) return null;
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  /**
   * Runs a normal effect. Frenzy deliberately uses the same normal effect
   * parameters; only the activation requirements are bypassed.
   *
   * @param {number}  slotIndex
   * @param {boolean} isEmpowered
   * @param {number}  impactX
   * @param {number}  impactY
   * @param {number}  hitRadius
   * @param {Array}   hitMosquitoes
   * @private
   */
  _triggerEffect(
    slotIndex,
    isEmpowered,
    impactX,
    impactY,
    hitRadius,
    hitMosquitoes,
    extraContext = {}
  ) {
    const ability = this.abilities[slotIndex];

    const context = {
      scene:           this.scene,
      impactX,
      impactY,
      hitRadius,
      hitMosquitoes,
      mosquitoManager: this.mosquitoManager,
      audioManager:    this.audioManager,
      onComplete:      () => this._endNormalEffect(slotIndex),
      ...extraContext,
    };

    this.slotStates[slotIndex] = ABILITY_STATES.EXECUTING_EFFECT;
    this.ui.updateSlotState(slotIndex, ABILITY_STATES.EXECUTING_EFFECT);
    ability.executeEffect(context);
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
    if (!this.frenzyActive) {
      this._startCooldown(slotIndex);
    } else {
      this.slotStates[slotIndex] = ABILITY_STATES.FRENZY_ACTIVE;
      this.ui.updateSlotState(slotIndex, ABILITY_STATES.FRENZY_ACTIVE);
    }
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
    const ability = this.abilities[slotIndex];
    const durationMs = ability && ability.id === "REVERSE_TRANSFUSION"
      ? Math.max(0, this.reverseTransfusionReadyAt - this.scene.time.now)
      : (ability?.cooldownReadyAt !== undefined
        ? Math.max(0, ability.cooldownReadyAt - this.scene.time.now)
        : (this.slotCooldownMs[slotIndex] ?? 0));

    this.slotStates[slotIndex] = ABILITY_STATES.COOLDOWN;
    this.ui.updateSlotState(slotIndex, ABILITY_STATES.COOLDOWN, { cooldownMs: durationMs });

    if (this.slotCooldownTimers[slotIndex]) {
      this.slotCooldownTimers[slotIndex].remove();
    }

    if (durationMs <= 0) {
      this.slotStates[slotIndex] = ABILITY_STATES.READY;
      this.ui.updateSlotState(slotIndex, ABILITY_STATES.READY);
      this.slotCooldownTimers[slotIndex] = null;
      return;
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
    if (this.frenzyActive) {
      this.ui.hideFrenzyFeedback();
      this.activeFrenzySlot  = -1;
      this.frenzyActive      = false;
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
    this.impactCount = 0;
    this.reverseTransfusionReadyAt = 0;
    this.reverseTransfusionCooldownStartedAt = 0;

    this.abilities.forEach((ability, index) => {
      ability.cancelPendingImpacts?.();
      if (ability.id === "THUNDERSTORM" || ability.id === "IMPACT_RAIN") {
        ability.cooldownReadyAt = 0;
      }
      this.ui.updateAbilityProgress(
        index,
        ability.id === "REVERSE_TRANSFUSION" ||
          ability.id === "THUNDERSTORM" ||
          ability.id === "IMPACT_RAIN"
          ? 1
          : 0
      );
    });

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

  /**
   * Resets all abilities and slots for a brand-new run.
   */
  resetRun() {
    this.reset();
    this.abilities = [];
    this.slotStates = [];
    this.slotCooldownTimers = [];
    this.ui.setAbilities([]);
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

    // Frenzy timer countdown; ability bars remain tied to availability below.
    if (this.frenzyActive) {
      this.frenzyRemainingMs -= delta;

      const ratio = Phaser.Math.Clamp(this.frenzyRemainingMs / this.frenzyDurationMs, 0, 1);

      // Drain stress bar visually in sync with the frenzy timer
      this.stressSystem.stress = ratio * this.stressSystem.maxStress;
      this.ui.updateStressBar(ratio, true);
      if (this.frenzyRemainingMs <= 0) {
        this._endFrenzy();
      }
    }

    this.abilities.forEach((ability, index) => {
      ability.update?.(delta);

      if (ability.id === "LIGHTNING_PULSE") {
        this.updateChargeDisplay(index, ability);
      } else if (ability.id === "THUNDERSTORM" || ability.id === "IMPACT_RAIN") {
        const cooldownStartedAt = ability.cooldownReadyAt - ability.cooldownMs;
        const progress = ability.cooldownReadyAt > 0
          ? Phaser.Math.Clamp(
            (this.scene.time.now - cooldownStartedAt) / ability.cooldownMs,
            0,
            1
          )
          : 1;
        this.ui.updateAbilityProgress(index, progress);
        if (progress >= 1 && this.slotStates[index] === ABILITY_STATES.READY) {
          if (ability.cooldownReadyAt > 0) this.ui.flashAbilityReady(index);
          ability.cooldownReadyAt = 0;
        }
      } else if (ability.id === "PRESSURE_BOMB") {
        const pressureProgress = (this.impactCount % ability.impactInterval) / ability.impactInterval;
        this.ui.updateAbilityProgress(index, pressureProgress);
      } else if (ability.id === "REVERSE_TRANSFUSION") {
        if (this.reverseTransfusionReadyAt > 0) {
          const cooldownDuration = ability.cooldownMs;
          const reverseProgress = Phaser.Math.Clamp(
            (this.scene.time.now - this.reverseTransfusionCooldownStartedAt) / cooldownDuration,
            0,
            1
          );
          this.ui.updateAbilityProgress(index, reverseProgress);
          if (reverseProgress >= 1 && this.slotStates[index] === ABILITY_STATES.READY) {
            this.ui.flashAbilityReady(index);
            this.reverseTransfusionReadyAt = 0;
          }
        } else {
          this.ui.updateAbilityProgress(index, 1);
        }
      }
    });

    // Stage 2 sequence countdown (inactive in Stage 1)
    if (this.slotStates.some(s => s === ABILITY_STATES.ENTERING_SEQUENCE)) {
      this.timerRemainingMs -= delta;

      const ratio = Phaser.Math.Clamp(this.timerRemainingMs / this.timeLimitMs, 0, 1);
      this.ui.updateTimerProgress(ratio);

      if (this.timerRemainingMs <= 0) {
        this.handleSequenceFail();
      }
    }

  }

  destroy() {
    this.reset();
    this.scene.events.off(ELECTROCUTION_APPLIED_EVENT, this.electrocutionEventHandler);
    if (this.ui) this.ui.destroy();
  }
}
