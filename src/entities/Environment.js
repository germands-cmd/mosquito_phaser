import Phaser from "phaser";
import legCollidersByPhase from "./legColliders.json";

/**
 * Environment.js
 * Renders the top-down first-person room view with phase-specific leg backgrounds and colliders:
 * - Exposed legs polygon colliders (left and right) with numbered point IDs for manual adjustments
 * - Rejection sampling ensuring mosquito attacks land strictly on exposed skin (with side selection support)
 * - Visual bite marks (red welts) on skin
 */
export class Environment {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} width
   * @param {number} height
   */
  constructor(scene, width = 1376, height = 768) {
    this.scene = scene;
    this.width = width;
    this.height = height;

    this.biteMarks = [];

    // Background Image
    this.background = this.scene.add
      .image(this.width / 2, this.height / 2, "background_legs")
      .setDepth(0);

    this.setPhase(4, "background_legs");
    this.biteGraphics = this.scene.add.graphics().setDepth(5);
  }

  setPhase(phaseId, backgroundKey) {
    const colliders = legCollidersByPhase[phaseId];
    if (!colliders) {
      throw new Error(`No leg colliders configured for phase ${phaseId}.`);
    }

    this.phaseId = phaseId;
    this.leftLegPoints = colliders.leftLegPoints;
    this.rightLegPoints = colliders.rightLegPoints;
    this.leftLegPolygon = new Phaser.Geom.Polygon(this.leftLegPoints);
    this.rightLegPolygon = new Phaser.Geom.Polygon(this.rightLegPoints);
    this.leftBounds = this.calculateBounds(this.leftLegPoints);
    this.rightBounds = this.calculateBounds(this.rightLegPoints);
    this.background.setTexture(backgroundKey).setDisplaySize(this.width, this.height);
  }

  calculateBounds(points) {
    return points.reduce((bounds, point) => ({
      minX: Math.min(bounds.minX, point.x),
      maxX: Math.max(bounds.maxX, point.x),
      minY: Math.min(bounds.minY, point.y),
      maxY: Math.max(bounds.maxY, point.y),
    }), { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });
  }

  /**
   * Returns a random target point guaranteed to be inside exposed skin on the chosen leg side.
   * @param {boolean|string} [targetSide] - false / 'left' for left leg, true / 'right' for right leg, or undefined for random
   * @returns {{x: number, y: number}}
   */
  getRandomSkinTarget(targetSide) {
    let isRight;
    if (typeof targetSide === "boolean") {
      isRight = targetSide;
    } else if (targetSide === "left") {
      isRight = false;
    } else if (targetSide === "right") {
      isRight = true;
    } else {
      isRight = Math.random() < 0.5;
    }

    const poly = isRight ? this.rightLegPolygon : this.leftLegPolygon;
    const bounds = isRight ? this.rightBounds : this.leftBounds;

    for (let attempt = 0; attempt < 80; attempt++) {
      const x = Phaser.Math.Between(bounds.minX, bounds.maxX);
      const y = Phaser.Math.Between(bounds.minY, bounds.maxY);
      if (Phaser.Geom.Polygon.Contains(poly, x, y)) {
        return { x, y };
      }
    }

    for (let y = bounds.minY; y <= bounds.maxY; y++) {
      for (let x = bounds.minX; x <= bounds.maxX; x++) {
        if (Phaser.Geom.Polygon.Contains(poly, x, y)) return { x, y };
      }
    }

    throw new Error(`No valid skin target found for phase ${this.phaseId}, ${isRight ? "right" : "left"} leg.`);
  }

  getNearestLeg(position) {
    const left = this.getLegCenter('left');
    const right = this.getLegCenter('right');
    return Phaser.Math.Distance.Between(position.x, position.y, left.x, left.y) <=
      Phaser.Math.Distance.Between(position.x, position.y, right.x, right.y) ? 'left' : 'right';
  }

  getLegCenter(legId) {
    const points = legId === 'right' ? this.rightLegPoints : this.leftLegPoints;
    const sum = points.reduce((result, point) => ({
      x: result.x + point.x,
      y: result.y + point.y
    }), { x: 0, y: 0 });
    return { x: sum.x / points.length, y: sum.y / points.length };
  }

  getOppositeLeg(legId) {
    return legId === 'right' ? 'left' : 'right';
  }

  isValidLeg(legId) {
    return legId === 'left' || legId === 'right';
  }

  getRandomAttackPosition(legId, config = {}) {
    const center = this.getLegCenter(legId);
    const radius = config.dispersionRadius || 0;
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const distance = Phaser.Math.FloatBetween(0, radius);
    const position = {
      x: center.x + Math.cos(angle) * distance,
      y: center.y + Math.sin(angle) * distance
    };
    return this.isPointOnLegs(position.x, position.y) ? position : this.getRandomSkinTarget(legId);
  }

  /**
   * Checks if a point lies within the exposed leg colliders.
   * @param {number} x
   * @param {number} y
   * @returns {boolean}
   */
  isPointOnLegs(x, y) {
    return (
      Phaser.Geom.Polygon.Contains(this.leftLegPolygon, x, y) ||
      Phaser.Geom.Polygon.Contains(this.rightLegPolygon, x, y)
    );
  }

  /**
   * Records and renders a bite mark / welt at the given coordinate.
   * @param {number} x
   * @param {number} y
   */
  addBiteMark(x, y) {
    this.biteMarks.push({ x, y });
    this.renderBiteMarks();
  }

  renderBiteMarks() {
    this.biteGraphics.clear();
    for (const b of this.biteMarks) {
      // Swollen reddish outer halo
      this.biteGraphics.fillStyle(0xd94444, 0.45);
      this.biteGraphics.fillCircle(b.x, b.y, 14);

      // Inflamed welt center
      this.biteGraphics.fillStyle(0xb31e2b, 0.9);
      this.biteGraphics.fillCircle(b.x, b.y, 7);

      // Puncture dot
      this.biteGraphics.fillStyle(0x5a0909, 1);
      this.biteGraphics.fillCircle(b.x, b.y, 2.5);

      // White speck highlight
      this.biteGraphics.fillStyle(0xffffff, 0.6);
      this.biteGraphics.fillCircle(b.x - 2, b.y - 2, 1.5);
    }
  }

  /**
   * Resets bite marks.
   */
  reset() {
    this.biteMarks = [];
    this.biteGraphics.clear();
  }

  /**
   * Cleanup
   */
  destroy() {
    this.biteGraphics.destroy();
    this.background.destroy();
  }
}
