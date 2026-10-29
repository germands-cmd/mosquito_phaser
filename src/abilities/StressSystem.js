/**
 * StressSystem.js
 * Manages the stress gauge, hit streak multiplier, and frenzy gate.
 *
 * Stress sources:
 *   - Valid mosquito hit: baseHitStress × streakMultiplier
 *   - Mosquito bite received: biteStress (fixed, no multiplier)
 *
 * Streak rules:
 *   - Each valid hit increments the streak and increases the multiplier by streakIncrement.
 *   - A missed swat resets the streak to 0 and the multiplier to 1.0×.
 *   - Bites do not affect the streak.
 *   - Multiplier is capped at streakCap.
 *
 * Frenzy gate:
 *   - While isFrenzy is true, no stress is gained from hits or bites.
 *   - consumeForFrenzy() locks the gate and sets stress to maxStress
 *     so the UI can drain it visually over the frenzy duration.
 *   - endFrenzy() unlocks the gate and zeroes stress.
 */
export class StressSystem {
  /**
   * @param {Object} [config]
   * @param {number} [config.maxStress=100]
   * @param {number} [config.baseHitStress=6]   - Base stress per valid hit
   * @param {number} [config.biteStress=3]       - Stress per mosquito bite (no streak)
   * @param {number} [config.streakIncrement=0.1] - Multiplier increase per consecutive hit after the first
   * @param {number} [config.streakCap=2.0]      - Maximum streak multiplier
   */
  constructor(config = {}) {
    this.maxStress       = config.maxStress       ?? 100;
    this.baseHitStress   = config.baseHitStress   ?? 6;
    this.biteStress      = config.biteStress      ?? 3;
    this.streakIncrement = config.streakIncrement ?? 0.1;
    this.streakCap       = config.streakCap       ?? 2.0;

    this.stress     = 0;
    this.streak     = 0;
    this.multiplier = 1.0;
    this.isFrenzy   = false;
  }

  /**
   * Call on every valid mosquito hit.
   * Updates streak and multiplier, then adds stress.
   * @returns {number} Stress actually gained (0 if frenzy is active).
   */
  onHit() {
    if (this.isFrenzy) return 0;

    // Increment streak first, then compute multiplier
    this.streak++;
    this.multiplier = Math.min(
      1.0 + (this.streak - 1) * this.streakIncrement,
      this.streakCap
    );

    const raw    = this.baseHitStress * this.multiplier;
    const gained = Math.min(raw, this.maxStress - this.stress);
    this.stress  = Math.min(this.stress + gained, this.maxStress);
    return gained;
  }

  /**
   * Call when the player misses a swat (no mosquito hit).
   * Resets streak and multiplier.
   */
  onMiss() {
    this.streak     = 0;
    this.multiplier = 1.0;
  }

  /**
   * Call when the player receives a mosquito bite.
   * Adds fixed stress without affecting the streak.
   * @returns {number} Stress actually gained (0 if frenzy is active).
   */
  onBite() {
    if (this.isFrenzy) return 0;
    const gained = Math.min(this.biteStress, this.maxStress - this.stress);
    this.stress  = Math.min(this.stress + gained, this.maxStress);
    return gained;
  }

  /**
   * Returns true when the stress bar is at maximum capacity.
   * @returns {boolean}
   */
  isFull() {
    return this.stress >= this.maxStress;
  }

  /**
   * Consumes the stress bar to trigger frenzy.
   * Locks the frenzy gate (no further stress gain).
   * Stress is kept at maxStress so the UI can drain it over the frenzy timer.
   */
  consumeForFrenzy() {
    this.isFrenzy   = true;
    this.stress     = this.maxStress;
    this.streak     = 0;
    this.multiplier = 1.0;
  }

  /**
   * Called when the frenzy window expires.
   * Unlocks stress gain and zeroes the bar and streak.
   */
  endFrenzy() {
    this.isFrenzy   = false;
    this.stress     = 0;
    this.streak     = 0;
    this.multiplier = 1.0;
  }

  /**
   * Returns the stress ratio in [0, 1] for UI rendering.
   * @returns {number}
   */
  getRatio() {
    return this.stress / this.maxStress;
  }

  /**
   * Full reset — call on game restart / main menu return.
   */
  reset() {
    this.stress     = 0;
    this.streak     = 0;
    this.multiplier = 1.0;
    this.isFrenzy   = false;
  }
}
