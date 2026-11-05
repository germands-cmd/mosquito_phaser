/**
 * BaseAbility.js
 * Abstract base class for active abilities in the Mosquito prototype.
 */
export class BaseAbility {
  /**
   * @param {Object} config
   * @param {string} config.id - Unique ability identifier
   * @param {string} config.name - Display name
   * @param {string} [config.slotKey] - Legacy slot key, reserved for the finishing move
   * @param {string} config.iconSymbol - Icon symbol or emoji for HUD display
   * @param {number} [config.sequenceLength=4] - Number of directional arrow inputs
   * @param {string} [config.color='#ff9900'] - Theme color for HUD and effects
   */
  constructor({ id, name, slotKey = '', iconSymbol, sequenceLength = 4, color = '#ff9900' }) {
    this.id = id;
    this.name = name;
    this.slotKey = slotKey;
    this.iconSymbol = iconSymbol;
    this.sequenceLength = sequenceLength;
    this.color = color;
  }

  /**
   * Executes the ability payoff effect upon a successful fly-swatter impact.
   * Must be overridden by subclasses.
   *
   * @param {Object} context
   * @param {Phaser.Scene} context.scene
   * @param {number} context.impactX - Fly-swatter impact X
   * @param {number} context.impactY - Fly-swatter impact Y
   * @param {number} context.hitRadius - Fly-swatter collision radius
   * @param {Array<import('../entities/Mosquito.js').Mosquito>} context.hitMosquitoes - Direct swat hits
   * @param {import('../managers/MosquitoManager.js').MosquitoManager} context.mosquitoManager
   * @param {import('../audio/AudioManager.js').AudioManager} context.audioManager
   * @param {Function} context.onComplete - Callback when effect animations finish
   */
  executeEffect(context) {
    throw new Error(`executeEffect() must be implemented by ability: ${this.id}`);
  }

  /**
   * Legacy hook reserved for the future finishing-move system.
   * Automatic frenzy uses the normal effect configuration.
   *
   * @param {number} [factor=1.5]
   * @returns {Object} Partial config with optional future overrides
   */
  getEmpoweredConfig(factor = 1.5) {  // eslint-disable-line no-unused-vars
    return {};
  }

  /**
   * Executes the legacy empowered variant. Current frenzy does not call this
   * method because frenzy only bypasses activation requirements.
   *
   * @param {Object} context - Same context object as executeEffect()
   */
  executeEmpoweredEffect(context) {
    const empowered = this.getEmpoweredConfig();
    this.executeEffect(context, empowered);
  }
}
