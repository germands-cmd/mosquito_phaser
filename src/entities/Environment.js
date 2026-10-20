import Phaser from 'phaser';

/**
 * Environment.js
 * Renders the top-down first-person room view:
 * - Wooden floorboards
 * - Worn rug
 * - Player's exposed legs extending from bottom foreground to feet near the top
 * - Exposed skin target regions for mosquito attacks
 * - Visual bite marks (red welts) on skin
 */
export class Environment {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} width
   * @param {number} height
   */
  constructor(scene, width = 800, height = 700) {
    this.scene = scene;
    this.width = width;
    this.height = height;

    this.biteMarks = [];
    this.skinZones = [
      // Left leg zones [minX, maxX, minY, maxY]
      { name: 'left_foot', minX: 275, maxX: 340, minY: 115, maxY: 190 },
      { name: 'left_shin', minX: 260, maxX: 340, minY: 200, maxY: 410 },
      { name: 'left_thigh', minX: 220, maxX: 350, minY: 430, maxY: 670 },
      // Right leg zones
      { name: 'right_foot', minX: 460, maxX: 525, minY: 115, maxY: 190 },
      { name: 'right_shin', minX: 460, maxX: 540, minY: 200, maxY: 410 },
      { name: 'right_thigh', minX: 450, maxX: 580, minY: 430, maxY: 670 }
    ];

    this.createBackground();
    this.createLegs();
    this.biteGraphics = this.scene.add.graphics().setDepth(5);
  }

  createBackground() {
    const g = this.scene.add.graphics().setDepth(0);

    // 1. Wooden floor background
    g.fillStyle(0x3e2817, 1);
    g.fillRect(0, 0, this.width, this.height);

    // Plank lines & grain
    const plankHeight = 50;
    for (let y = 0; y < this.height; y += plankHeight) {
      g.lineStyle(2, 0x27190e, 0.9);
      g.lineBetween(0, y, this.width, y);

      // Vertical plank divisions
      const offset = (Math.floor(y / plankHeight) % 2) * 160;
      for (let x = offset; x < this.width; x += 320) {
        g.lineBetween(x, y, x, y + plankHeight);
        // Small nail dots
        g.fillStyle(0x1a110a, 0.7);
        g.fillCircle(x + 12, y + 8, 2);
        g.fillCircle(x + 12, y + plankHeight - 8, 2);
      }
    }

    // 2. Worn rug
    const rugX = 140;
    const rugY = 60;
    const rugW = 520;
    const rugH = 610;

    // Rug fringe (top & bottom)
    g.fillStyle(0xd9c5a3, 0.9);
    for (let x = rugX - 6; x < rugX + rugW + 6; x += 6) {
      g.fillRect(x, rugY - 8, 3, 9);
      g.fillRect(x, rugY + rugH, 3, 9);
    }

    // Rug base (deep muted burgundy)
    g.fillStyle(0x5a2323, 1);
    g.fillRect(rugX, rugY, rugW, rugH);

    // Rug borders & woven patterns
    g.lineStyle(4, 0x8a3c32, 1);
    g.strokeRect(rugX + 8, rugY + 8, rugW - 16, rugH - 16);
    g.lineStyle(2, 0xcaa368, 0.85);
    g.strokeRect(rugX + 18, rugY + 18, rugW - 36, rugH - 36);

    // Subtle rug center motif
    g.fillStyle(0x3f1818, 0.5);
    g.fillRect(rugX + 50, rugY + 50, rugW - 100, rugH - 100);

    // Gritty comic border outline for rug
    g.lineStyle(3, 0x220c0c, 1);
    g.strokeRect(rugX, rugY, rugW, rugH);
  }

  createLegs() {
    const g = this.scene.add.graphics().setDepth(2);

    // Skin tones
    const skinBase = 0xdeb093;
    const skinShadow = 0xc69375;
    const skinHighlight = 0xebd2bd;
    const outlineColor = 0x22130e;
    const outlineWidth = 4;

    // Shadow under legs on the rug
    g.fillStyle(0x240d0d, 0.45);
    g.fillEllipse(300, 420, 150, 460);
    g.fillEllipse(500, 420, 150, 460);

    // Function to draw one leg
    const drawLeg = (isRight) => {
      const sign = isRight ? 1 : -1;
      const cx = isRight ? 495 : 305;

      // Draw Main Leg Silhouette (Polygon)
      const points = [
        // Foot & Toes
        { x: cx - sign * 28, y: 110 },
        { x: cx + sign * 28, y: 110 },
        { x: cx + sign * 35, y: 135 },
        { x: cx + sign * 30, y: 190 }, // Ankle
        // Shin
        { x: cx + sign * 36, y: 300 },
        // Knee
        { x: cx + sign * 45, y: 420 },
        // Thigh
        { x: cx + sign * 75, y: 550 },
        { x: cx + sign * 95, y: 700 }, // Foreground bottom
        // Inner thigh
        { x: cx - sign * 50, y: 700 },
        { x: cx - sign * 45, y: 550 },
        // Inner knee
        { x: cx - sign * 32, y: 420 },
        // Inner calf
        { x: cx - sign * 28, y: 300 },
        // Inner ankle
        { x: cx - sign * 22, y: 190 },
        { x: cx - sign * 26, y: 140 }
      ];

      // Base skin fill
      g.fillStyle(skinBase, 1);
      g.fillPoints(points, true);

      // Comic shadow side (outer edge)
      g.fillStyle(skinShadow, 0.6);
      const shadowPoints = [
        { x: cx + sign * 20, y: 135 },
        { x: cx + sign * 35, y: 135 },
        { x: cx + sign * 30, y: 190 },
        { x: cx + sign * 36, y: 300 },
        { x: cx + sign * 45, y: 420 },
        { x: cx + sign * 75, y: 550 },
        { x: cx + sign * 95, y: 700 },
        { x: cx + sign * 55, y: 700 },
        { x: cx + sign * 40, y: 550 },
        { x: cx + sign * 25, y: 420 },
        { x: cx + sign * 18, y: 300 }
      ];
      g.fillPoints(shadowPoints, true);

      // Comic highlight down the shin
      g.fillStyle(skinHighlight, 0.45);
      g.fillRoundedRect(cx - sign * 6 - 8, 230, 16, 150, 8);

      // Knee contour lines
      g.lineStyle(3, outlineColor, 0.75);
      g.beginPath();
      g.arc(cx + sign * 4, 420, 18, Phaser.Math.DegToRad(30), Phaser.Math.DegToRad(150), false);
      g.strokePath();

      // Foot & Toe creases
      g.lineStyle(2, outlineColor, 0.8);
      g.lineBetween(cx - sign * 18, 125, cx + sign * 18, 125);
      g.lineBetween(cx - sign * 12, 110, cx - sign * 12, 122);
      g.lineBetween(cx - sign * 3, 110, cx - sign * 3, 122);
      g.lineBetween(cx + sign * 6, 110, cx + sign * 6, 122);
      g.lineBetween(cx + sign * 15, 110, cx + sign * 15, 122);

      // Gritty comic outline
      g.lineStyle(outlineWidth, outlineColor, 1);
      g.strokePoints(points, true);
    };

    // Draw left and right legs
    drawLeg(false);
    drawLeg(true);

    // 3. Shorts hemline at foreground bottom
    g.fillStyle(0x283b4a, 1);
    g.beginPath();
    g.moveTo(180, 700);
    g.lineTo(210, 640);
    g.lineTo(370, 645);
    g.lineTo(390, 700);
    g.closePath();
    g.fillPath();

    g.beginPath();
    g.moveTo(410, 700);
    g.lineTo(430, 645);
    g.lineTo(590, 640);
    g.lineTo(620, 700);
    g.closePath();
    g.fillPath();

    g.lineStyle(4, outlineColor, 1);
    g.lineBetween(210, 640, 370, 645);
    g.lineBetween(430, 645, 590, 640);
  }

  /**
   * Returns a random target point within exposed skin.
   * @returns {{x: number, y: number}}
   */
  getRandomSkinTarget() {
    const zone = Phaser.Math.RND.pick(this.skinZones);
    return {
      x: Phaser.Math.Between(zone.minX, zone.maxX),
      y: Phaser.Math.Between(zone.minY, zone.maxY)
    };
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
}
