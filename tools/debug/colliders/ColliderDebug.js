export class ColliderDebug {
  constructor(scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0).setDepth(34).setVisible(false);
    const graphics = scene.add.graphics();
    this.container.add(graphics);
    this.drawPolygon(graphics, scene.environment.leftLegPolygon, 0x00ffff);
    this.drawPolygon(graphics, scene.environment.rightLegPolygon, 0xff00ff);
    for (const [points, color, textColor] of [
      [scene.environment.leftLegPoints, 0x072833, "#00ffff"],
      [scene.environment.rightLegPoints, 0x330728, "#ff55ff"],
    ]) {
      for (const point of points) {
        graphics.fillStyle(0xffffff, 1).fillCircle(point.x, point.y, 3);
        graphics.fillStyle(color, 0.92).fillCircle(point.x, point.y, 11);
        graphics.lineStyle(2, textColor === "#00ffff" ? 0x00ffff : 0xff00ff, 1);
        graphics.strokeCircle(point.x, point.y, 11);
        this.container.add(scene.add.text(point.x, point.y, `${point.id}`, {
          fontFamily: '"Impact", "Arial Black", Arial, sans-serif',
          fontSize: "12px",
          fontWeight: "bold",
          color: textColor,
        }).setOrigin(0.5));
      }
    }
  }

  drawPolygon(graphics, polygon, color) {
    graphics.fillStyle(color, 0.22).fillPoints(polygon.points, true);
    graphics.lineStyle(3, color, 0.9).strokePoints(polygon.points, true);
  }

  setVisible(visible) {
    this.container.setVisible(visible);
  }

  destroy() {
    this.container.destroy();
  }
}
