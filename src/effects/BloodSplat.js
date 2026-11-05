import Phaser from "phaser";

export function createBloodSplat(scene, splatters, x, y) {
  const splat = scene.add.graphics().setDepth(4);
  splat.fillStyle(0x780d16, 0.85);
  splat.fillCircle(x, y, Phaser.Math.Between(6, 11));
  const droplets = Phaser.Math.Between(4, 8);
  for (let i = 0; i < droplets; i++) {
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const distance = Phaser.Math.Between(10, 24);
    splat.fillCircle(
      x + Math.cos(angle) * distance,
      y + Math.sin(angle) * distance,
      Phaser.Math.Between(2, 4)
    );
  }

  splatters.push(splat);
  const lifespanMs = Phaser.Math.Between(3000, 5000);
  splat.fadeTween = scene.tweens.add({
    targets: splat,
    alpha: 0,
    delay: lifespanMs,
    duration: 600,
    ease: "Linear",
    onComplete: () => {
      const index = splatters.indexOf(splat);
      if (index !== -1) splatters.splice(index, 1);
      splat.destroy();
    },
  });
}
