import { MOSQUITO_TYPES } from './Mosquito.js';

const range = (min, max) => ({ min, max });

export const ENEMY_CONFIGS = {
  [MOSQUITO_TYPES.STANDARD]: {
    type: MOSQUITO_TYPES.STANDARD,
    maxHealth: 1,
    movementSpeed: 200,
    attackDamagePerSecond: 1,
    visualScale: 1.3
  },
  [MOSQUITO_TYPES.INCUBATOR]: {
    type: MOSQUITO_TYPES.INCUBATOR,
    maxHealth: 1,
    movementSpeed: 190,
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
    movementSpeed: 130,
    escapeSpeed: 300,
    attackDamagePerSecond: 3,
    escapeDistance: 900,
    reappearanceDelay: 1.4,
    reappearanceEntryMargin: 30,
    minBabiesSpawned: 1,
    maxBabiesSpawned: 3,
    babyLaunchSpeed: 260,
    babyLaunchConeAngle: Math.PI / 3,
    babyActivationDelay: range(0.2, 0.3),
    visualScale: 1.55
  },
  [MOSQUITO_TYPES.DRUNK]: {
    type: MOSQUITO_TYPES.DRUNK,
    maxHealth: 2,
    movementSpeed: 145,
    oscillationSpeed: 155,
    oscillationFrequency: 3.8,
    attackDamagePerSecond: 2,
    visualScale: 1,
    explosionRadius: 130,
    explosionColor: 0x7067d8,
    minBabiesSpawned: 1,
    maxBabiesSpawned: 3,
    minimumExplosionVictims: 3,
    babyLaunchSpeed: 260,
    babyLaunchConeAngle: Math.PI / 3,
    babyActivationDelay: range(0.2, 0.3)
  },
  [MOSQUITO_TYPES.HEMATOPHAGE]: {
    type: MOSQUITO_TYPES.HEMATOPHAGE,
    maxHealth: 3,
    movementSpeed: 80,
    attackDamagePerSecond: 5,
    visualScale: 1.8,
    babyLaunchSpeed: 260,
    babyLaunchConeAngle: Math.PI / 3,
    babyActivationDelay: range(0.2, 0.3),
    minBabiesSpawned: 2,
    maxBabiesSpawned: 2
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

export const FORMATION_CONFIGS = {
  V: {
    groupSizeOptions: [5, 7, 9],
    spacing: 28,
    arrivalDistance: 170
  },
  COLUMN: {
    minGroupSize: 3,
    maxGroupSize: 9,
    spacing: 46,
    arrivalDistance: 170
  },
  CIRCULAR: {
    groupSizeOptions: [6, 8, 10],
    radius: 45,
    arrivalDistance: 220
  },
  OSCILLATING_SWARM: {
    groupSizeOptions: [4, 8, 12],
    initialSpacing: 18,
    minSpeedMultiplier: 0.88,
    maxSpeedMultiplier: 1.12,
    minOscillationAmplitude: 22,
    maxOscillationAmplitude: 58,
    minOscillationFrequency: 0.7,
    maxOscillationFrequency: 1.8,
    minimumTravelDurationMs: 900,
    arrivalWindowMs: 260,
    finalAttackDurationMs: 450
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
