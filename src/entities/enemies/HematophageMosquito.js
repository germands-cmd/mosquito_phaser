import { MOSQUITO_TYPES } from '../Mosquito.js';
import { VariantMosquito, VARIANT_STATES, moveTowards, reachTarget } from './VariantMosquito.js';

export class HematophageMosquito extends VariantMosquito {
  constructor(scene) {
    super(scene);
    this.type = MOSQUITO_TYPES.HEMATOPHAGE;
  }

  startAttack({ spawnPos, targetPos, callbacks }) {
    this.callbacks = callbacks;
    this.onDeath = callbacks.onDeath;
    this.attackTarget = targetPos;
    this.x = spawnPos.x;
    this.y = spawnPos.y;
    this.state = VARIANT_STATES.NORMAL;
    this.container.setVisible(true);
  }

  update(delta) {
    if (this.state !== VARIANT_STATES.NORMAL) return;
    if (moveTowards(this, this.attackTarget, this.config.movementSpeed * delta / 1000) < 18) {
      if (reachTarget(this, this.callbacks)) {
        return;
      }
      this.beginFeeding(this.attackTarget, this.callbacks.onDamage);
      this.callbacks.onBite?.(this);
    }
  }

}
