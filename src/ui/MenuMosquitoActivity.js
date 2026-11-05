import Phaser from "phaser";
import { MOSQUITO_STATES } from "../entities/Mosquito.js";
import { selectWeighted } from "../progression/WeightedSelection.js";
import { MENU_PREVIEW_CONFIG } from "../progression/PhaseConfig.js";

export class MenuMosquitoActivity {
  constructor(scene, mosquitoManager) {
    this.scene = scene;
    this.mosquitoManager = mosquitoManager;
    this.mosquitoes = new Set();
    this.spawnTimer = null;
    this.active = false;

    this.mosquitoManager.environment = {
      getNearestLeg: () => "menu-exit",
      isValidLeg: (leg) => leg === "menu-exit",
      getLegCenter: () => this.getTarget(),
      getRandomSkinTarget: () => this.getTarget(),
      getRandomAttackPosition: () => this.getTarget(),
      addBiteMark: () => {},
    };
    this.mosquitoManager.menuMode = true;
    this.mosquitoManager.menuTargetFactory = () => this.getTarget();
    this.mosquitoManager.menuOnTargetReached = (mosquito) =>
      this.remove(mosquito);
    this.mosquitoManager.menuOnDeath = (mosquito) =>
      this.remove(mosquito);
  }

  start() {
    if (this.active) return;
    this.active = true;
    this.spawnTimer = this.scene.time.addEvent({
      delay: MENU_PREVIEW_CONFIG.spawnIntervalMs,
      loop: true,
      callback: () => this.spawn(),
    });
    this.spawn();
  }

  spawn() {
    if (
      !this.active ||
      this.mosquitoes.size >= MENU_PREVIEW_CONFIG.maxActiveMosquitoes
    ) {
      return;
    }

    const type = selectWeighted(MENU_PREVIEW_CONFIG.enemyWeights);
    if (!type) return;

    const mosquito = this.mosquitoManager.getAvailableMosquito(type);
    const spawnPos = {
      x: Phaser.Math.Between(
        Math.floor(this.scene.scale.width * 0.62),
        this.scene.scale.width - 70
      ),
      y: Phaser.Math.Between(-80, -30),
    };
    const targetPos = this.getTarget();
    const distance = Phaser.Math.Distance.Between(
      spawnPos.x,
      spawnPos.y,
      targetPos.x,
      targetPos.y
    );
    const diveDurationMs = Math.max(
      450,
      distance / mosquito.config.movementSpeed * 1000
    );
    const callbacks = this.mosquitoManager.getVariantCallbacks(mosquito, {
      menuTarget: targetPos,
      onTargetReached: (targetMosquito) => this.remove(targetMosquito),
    });

    mosquito.menuSpeedMultiplier = type === "zigzag" ? 0.6 : 1;
    this.mosquitoes.add(mosquito);
    mosquito.startAttack({
      spawnPos,
      targetPos,
      diveDurationMs,
      manager: this.mosquitoManager,
      callbacks,
    });
  }

  getTarget() {
    return {
      x: Phaser.Math.Between(
        Math.floor(this.scene.scale.width * 0.55),
        this.scene.scale.width - 35
      ),
      y: this.scene.scale.height + 70,
    };
  }

  trySwat(x, y, hitRadius) {
    return this.mosquitoManager.trySwat(x, y, hitRadius);
  }

  remove(mosquito) {
    this.mosquitoes.delete(mosquito);
    mosquito.menuSpeedMultiplier = null;
    if (mosquito.state !== MOSQUITO_STATES.INACTIVE) {
      mosquito.deactivate();
    }
  }

  stop() {
    this.active = false;
    this.spawnTimer?.remove();
    this.spawnTimer = null;
    for (const mosquito of [...this.mosquitoes]) {
      this.remove(mosquito);
    }
  }

  destroy() {
    this.stop();
  }
}
