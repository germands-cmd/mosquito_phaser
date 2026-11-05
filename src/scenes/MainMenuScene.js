import Phaser from "phaser";
import mainMenuBackgroundImg from "../../assets/main_menu_background.jpg";
import { AudioManager } from "../audio/AudioManager.js";
import { Swatter } from "../entities/Swatter.js";
import { MosquitoManager } from "../managers/MosquitoManager.js";
import { MenuMosquitoActivity } from "../ui/MenuMosquitoActivity.js";
import { createBloodSplat } from "../effects/BloodSplat.js";

export default class MainMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: "main-menu" });
  }

  preload() {
    this.load.image("main_menu_background", mainMenuBackgroundImg);
  }

  create() {
    this.starting = false;
    this.input.enabled = true;
    const { width, height } = this.scale;
    this.audio = new AudioManager();
    this.audio.init();
    this.bloodSplatters = [];
    this.initBloodParticles();
    this.swatter = new Swatter(this, 36);

    this.background = this.add
      .image(width / 2, height / 2, "main_menu_background")
      .setDisplaySize(width, height)
      .setDepth(0);
    this.transitionOverlay = this.add
      .rectangle(0, 0, width, height, 0x000000)
      .setOrigin(0)
      .setDepth(100)
      .setAlpha(1);

    this.title = this.add
      .text(120, 185, "MOSQUITO", {
        fontFamily: '"Impact", "Arial Black", sans-serif',
        fontSize: "76px",
        color: "#d94b36",
        stroke: "#1a0806",
        strokeThickness: 8,
      })
      .setOrigin(0, 0.5)
      .setDepth(40);

    this.creatorTag = this.add
      .text(24, height - 20, "Germanchu", {
        fontFamily: "sans-serif",
        fontSize: "14px",
        fontWeight: "bold",
        color: "#8c7762",
        letterSpacing: 2,
      })
      .setOrigin(0, 1)
      .setDepth(40);

    const buttonBackground = this.add.graphics().setDepth(40);
    buttonBackground.fillStyle(0xc23b28, 1);
    buttonBackground.fillRoundedRect(120, 285, 240, 56, 10);
    buttonBackground.lineStyle(3, 0xffeedd, 1);
    buttonBackground.strokeRoundedRect(120, 285, 240, 56, 10);

    const buttonText = this.add
      .text(240, 313, "START GAME", {
        fontFamily: '"Impact", "Arial Black", sans-serif',
        fontSize: "26px",
        color: "#ffffff",
      })
      .setOrigin(0.5)
      .setDepth(41);

    const buttonHitZone = this.add
      .zone(240, 313, 240, 56)
      .setDepth(42)
      .setInteractive({ cursor: "pointer" });
    buttonHitZone.on("pointerdown", () => this.startGame());
    buttonHitZone.on("pointerup", () => this.startGame());

    this.tweens.add({
      targets: buttonText,
      scale: 1.05,
      yoyo: true,
      repeat: -1,
      duration: 650,
    });

    this.mosquitoManager = new MosquitoManager(
      this,
      this.audio,
      null,
      {
        onHit: (x, y) => this.showMenuMosquitoHit(x, y),
        onAreaEffect: (x, y, radius, color) =>
          this.showMosquitoExplosion(x, y, radius, color),
      }
    );
    this.menuMosquitoActivity = new MenuMosquitoActivity(
      this,
      this.mosquitoManager
    );
    this.menuMosquitoActivity.start();

    this.input.mouse?.disableContextMenu();
    this.input.on("pointermove", (pointer) => {
      this.swatter.updatePosition(pointer.worldX, pointer.worldY);
    });
    this.input.on("pointerdown", (pointer) => {
      if (pointer.button !== 0) return;
      this.audio.prime();
      if (
        pointer.worldX >= 120 &&
        pointer.worldX <= 360 &&
        pointer.worldY >= 285 &&
        pointer.worldY <= 341
      ) {
        this.startGame();
        return;
      }
      this.swatter.strike((impactX, impactY, hitRadius) => {
        const hit = this.menuMosquitoActivity.trySwat(
          impactX,
          impactY,
          hitRadius
        );
        if (!hit) this.audio.playSwatMiss();
      });
    });

    this.tweens.add({
      targets: this.transitionOverlay,
      alpha: 0,
      duration: 450,
      ease: "Sine.easeInOut",
    });
  }

  startGame() {
    if (this.starting) return;
    this.starting = true;
    this.audio.prime();
    this.menuMosquitoActivity.stop();
    this.tweens.add({
      targets: this.transitionOverlay,
      alpha: 1,
      duration: 450,
      ease: "Sine.easeInOut",
      onComplete: () => {
      this.scene.start("game");
      },
    });
  }

  showMenuMosquitoHit(x, y) {
    createBloodSplat(this, this.bloodSplatters, x, y);
    this.bloodEmitter.emitParticleAt(x, y, 16);
  }

  initBloodParticles() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x850d18, 1);
    g.fillCircle(4, 4, 4);
    g.generateTexture("menu_blood_dot", 8, 8);
    g.destroy();

    this.bloodEmitter = this.add
      .particles(0, 0, "menu_blood_dot", {
        speed: { min: 80, max: 240 },
        angle: { min: 0, max: 360 },
        scale: { start: 1.2, end: 0 },
        alpha: { start: 1, end: 0.2 },
        lifespan: { min: 250, max: 500 },
        gravityY: 120,
        emitting: false,
      })
      .setDepth(18);
  }

  showMosquitoExplosion(x, y, radius, color = 0xa51628) {
    const explosion = this.add.graphics().setDepth(22);
    const state = { radius: Math.max(12, radius * 0.2), alpha: 0.9 };
    this.bloodEmitter.emitParticleAt(x, y, 28);
    this.tweens.add({
      targets: state,
      radius,
      alpha: 0,
      duration: 260,
      ease: "Cubic.easeOut",
      onUpdate: () => {
        explosion.clear();
        explosion.fillStyle(color, state.alpha * 0.28);
        explosion.fillCircle(x, y, state.radius);
        explosion.lineStyle(7, color, state.alpha);
        explosion.strokeCircle(x, y, state.radius);
      },
      onComplete: () => explosion.destroy(),
    });
  }

  update(time, delta) {
    this.mosquitoManager?.update(time, delta);
  }

  shutdown() {
    for (const splat of this.bloodSplatters) {
      splat.fadeTween?.stop();
      splat.destroy();
    }
    this.bloodSplatters = [];
    this.starting = false;
    this.menuMosquitoActivity?.destroy();
    this.mosquitoManager?.destroy();
    this.bloodEmitter?.destroy();
    this.swatter?.destroy();
    this.audio?.destroy();
  }

  destroy() {
    this.shutdown();
  }
}
