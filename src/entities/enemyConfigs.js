import { MOSQUITO_TYPES } from './Mosquito.js';

const range = (min, max) => ({ min, max });

export const ENEMY_CONFIGS = {
  [MOSQUITO_TYPES.STANDARD]: {
    type: MOSQUITO_TYPES.STANDARD,
    maxHealth: 1,
    movementSpeed: 260,
    attackDamagePerSecond: 1,
    visualScale: 1.3
  },
  [MOSQUITO_TYPES.INCUBATOR]: {
    type: MOSQUITO_TYPES.INCUBATOR,
    maxHealth: 1,
    movementSpeed: 220,
    attackDamagePerSecond: 1,
    minBabiesSpawned: 3,
    maxBabiesSpawned: 7,
    babyLaunchSpeed: 260,
    babyLaunchConeAngle: Math.PI / 3,
    babyActivationDelay: range(0.2, 0.3),
    abdomenScale: 1.55,
    visualScale: 1.35
  },
  [MOSQUITO_TYPES.BABY]: {
    type: MOSQUITO_TYPES.BABY,
    maxHealth: 1,
    movementSpeed: 180,
    groupMovementSpeed: 150,
    attackDamagePerSecond: 1,
    groupingRadius: 115,
    groupFormationSpacing: 28,
    dispersionTriggerDistance: 150,
    dispersionRadius: 112,
    minimumAttackPositionSpacing: 34,
    visualScale: 0.85
  },
  [MOSQUITO_TYPES.COWARD]: {
    type: MOSQUITO_TYPES.COWARD,
    maxHealth: 3,
    movementSpeed: 150,
    escapeSpeed: 310,
    attackDamagePerSecond: 3,
    escapeDistance: 900,
    reappearanceDelay: 1.4,
    reappearanceEntryMargin: 30,
    bloodExplosionRadius: 130,
    bloodExplosionDamage: 1,
    bloodExplosionAffectsPlayer: false,
    visualScale: 1.55
  },
  [MOSQUITO_TYPES.PARASITE]: {
    type: MOSQUITO_TYPES.PARASITE,
    maxHealth: 1,
    searchMovementSpeed: 210,
    movementSpeed: 180,
    attackDamagePerSecond: 2,
    hostDetectionRange: 600,
    attachmentRange: 22,
    attachmentPositionOffset: { x: 0, y: 10 },
    searchRetryInterval: 0.3,
    visualScale: 1.0
  },
  [MOSQUITO_TYPES.ZIGZAG]: {
    type: MOSQUITO_TYPES.ZIGZAG,
    maxHealth: 2,
    movementSpeed: 150,
    fastMovementSpeed: 230,
    attackDamagePerSecond: 2,
    zigzagAmplitude: 45,
    zigzagSegmentDuration: 0.45,
    pauseDuration: range(0.2, 0.5),
    forwardProgressFactor: 0.85,
    targetReevaluationInterval: 0.2,
    visualScale: 1.3
  }
};

export function getEnemyConfig(type) {
  const config = ENEMY_CONFIGS[type] || ENEMY_CONFIGS[MOSQUITO_TYPES.STANDARD];
  return {
    ...config,
    pauseDuration: config.pauseDuration && { ...config.pauseDuration },
    babyActivationDelay: config.babyActivationDelay && { ...config.babyActivationDelay }
  };
}

