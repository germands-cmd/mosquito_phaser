import Phaser from "phaser";

/**
 * Environment.js
 * Renders the top-down first-person room view with background image assets/background_legs.jpg:
 * - Exposed legs polygon colliders (left and right) with numbered point IDs for manual adjustments
 * - Visual numeric IDs rendered on screen at each vertex point in debug mode (D key)
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

    // Exact Polygon Colliders for exposed leg skin with numeric IDs for manual tweaking
    this.leftLegPoints = [
      { id: 0, x: 366, y: 669 },
      { id: 1, x: 315, y: 604 },
      { id: 2, x: 283, y: 540 },
      { id: 3, x: 260, y: 438 },
      { id: 4, x: 264, y: 313 },
      { id: 5, x: 292, y: 264 },
      { id: 6, x: 354, y: 241 },
      { id: 7, x: 403, y: 271 },
      { id: 8, x: 445, y: 320 },
      { id: 9, x: 493, y: 375 },
      { id: 10, x: 530, y: 431 },
      { id: 11, x: 584, y: 473 },
      { id: 12, x: 621, y: 550 },
      { id: 13, x: 547, y: 624 },
      { id: 14, x: 456, y: 660 },
    ];

    this.rightLegPoints = [
      { id: 0, x: 748, y: 540 },
      { id: 1, x: 782, y: 484 },
      { id: 2, x: 833, y: 433 },
      { id: 3, x: 880, y: 369 },
      { id: 4, x: 919, y: 320 },
      { id: 5, x: 979, y: 269 },
      { id: 6, x: 1028, y: 239 },
      { id: 7, x: 1090, y: 283 },
      { id: 8, x: 1106, y: 352 },
      { id: 9, x: 1109, y: 431 },
      { id: 10, x: 1095, y: 523 },
      { id: 11, x: 1051, y: 607 },
      { id: 12, x: 1000, y: 672 },
      { id: 13, x: 893, y: 648 },
      { id: 14, x: 808, y: 602 },
    ];

    this.leftLegPolygon = new Phaser.Geom.Polygon(this.leftLegPoints);
    this.rightLegPolygon = new Phaser.Geom.Polygon(this.rightLegPoints);

    // Bounding boxes for efficient rejection sampling
    this.leftBounds = { minX: 260, maxX: 621, minY: 241, maxY: 669 };
    this.rightBounds = { minX: 748, maxX: 1109, minY: 239, maxY: 672 };

    this.biteGraphics = this.scene.add.graphics().setDepth(5);

    // Create debug visuals with numbered vertex badges
    this.createDebugVisuals();
  }

  /**
   * Initializes debug visualization for polygon colliders and their numbered points.
   */
  createDebugVisuals() {
    this.debugContainer = this.scene.add
      .container(0, 0)
      .setDepth(34)
      .setVisible(false);

    const g = this.scene.add.graphics();
    this.debugContainer.add(g);

    // 1. Semi-transparent polygon fills & outlines
    // Left leg - Cyan
    g.fillStyle(0x00ffff, 0.22);
    g.fillPoints(this.leftLegPolygon.points, true);
    g.lineStyle(3, 0x00ffff, 0.9);
    g.strokePoints(this.leftLegPolygon.points, true);

    // Right leg - Magenta
    g.fillStyle(0xff00ff, 0.22);
    g.fillPoints(this.rightLegPolygon.points, true);
    g.lineStyle(3, 0xff00ff, 0.9);
    g.strokePoints(this.rightLegPolygon.points, true);

    // 2. Vertex markers with numeric ID badges
    const renderNumberedPoints = (points, strokeHex, badgeFill, textColor) => {
      points.forEach((pt) => {
        // Vertex center dot
        g.fillStyle(0xffffff, 1);
        g.fillCircle(pt.x, pt.y, 3);

        // Circular badge for the ID
        g.fillStyle(badgeFill, 0.92);
        g.fillCircle(pt.x, pt.y, 11);
        g.lineStyle(2, strokeHex, 1);
        g.strokeCircle(pt.x, pt.y, 11);

        // Text displaying the point ID number
        const idText = this.scene.add
          .text(pt.x, pt.y, `${pt.id}`, {
            fontFamily: '"Impact", "Arial Black", Arial, sans-serif',
            fontSize: "12px",
            fontWeight: "bold",
            color: textColor,
          })
          .setOrigin(0.5, 0.5);

        this.debugContainer.add(idText);
      });
    };

    renderNumberedPoints(this.leftLegPoints, 0x00ffff, 0x072833, "#00ffff");
    renderNumberedPoints(this.rightLegPoints, 0xff00ff, 0x330728, "#ff55ff");
  }

  /**
   * Toggles visibility of the collider debug visualization.
   * @param {boolean} visible
   */
  setDebugVisible(visible) {
    if (this.debugContainer) {
      this.debugContainer.setVisible(visible);
    }
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

    // Centroid fallbacks in case sampling loop exceeds attempts
    return isRight ? { x: 1060, y: 480 } : { x: 300, y: 480 };
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
    if (this.debugContainer) {
      this.debugContainer.destroy();
    }
    this.biteGraphics.destroy();
    this.background.destroy();
  }
}
