import { MOSQUITO_TYPES } from "../entities/Mosquito.js";
import { selectWeighted } from "./WeightedSelection.js";

const FORMATIONS = {
  V: "V",
  COLUMN: "COLUMN",
  CIRCULAR: "CIRCULAR",
  OSCILLATING_SWARM: "OSCILLATING_SWARM",
};

const phase = (phaseId, durationMs, enemyWeights, formationWeights, normal, hordes) => ({
  phaseId,
  backgroundKey: `phase_${phaseId}_legs`,
  durationMs,
  initialSpawnDelayMs: 3000,
  normalSpawn: normal,
  enemyWeights,
  formationWeights,
  hordes: hordes.map((horde) => ({
    ...horde,
    triggerTimeMs:
      typeof horde.triggerTimeMs === "function"
        ? horde.triggerTimeMs(durationMs)
        : horde.triggerTimeMs,
  })),
});

export const PHASE_CONFIGS = [
  phase(
    1,
    60000,
    {
      [MOSQUITO_TYPES.STANDARD]: 100,
      [MOSQUITO_TYPES.COWARD]: 0,
      [MOSQUITO_TYPES.DRUNK]: 0,
      [MOSQUITO_TYPES.HEMATOPHAGE]: 0,
      [MOSQUITO_TYPES.INCUBATOR]: 0,
      [MOSQUITO_TYPES.ZIGZAG]: 0,
    },
    { individual: 100, [FORMATIONS.V]: 0, [FORMATIONS.COLUMN]: 0, [FORMATIONS.CIRCULAR]: 0, [FORMATIONS.OSCILLATING_SWARM]: 0 },
    { intervalMs: 4000, mosquitoesPerWave: 3 },
    [
      { triggerTimeMs: (duration) => duration / 2, preparationDurationMs: 5000, durationMs: 20000, intervalMs: 3000, mosquitoesPerWave: 5 },
      { triggerTimeMs: (duration) => duration - 5000, preparationDurationMs: 5000, durationMs: 20000, intervalMs: 2800, mosquitoesPerWave: 6 },
    ]
  ),
  phase(
    2,
    120000,
    {
      [MOSQUITO_TYPES.STANDARD]: 80,
      [MOSQUITO_TYPES.COWARD]: 0,
      [MOSQUITO_TYPES.DRUNK]: 0,
      [MOSQUITO_TYPES.HEMATOPHAGE]: 0,
      [MOSQUITO_TYPES.INCUBATOR]: 10,
      [MOSQUITO_TYPES.ZIGZAG]: 10,
    },
    { individual: 74, [FORMATIONS.V]: 10, [FORMATIONS.COLUMN]: 10, [FORMATIONS.CIRCULAR]: 6, [FORMATIONS.OSCILLATING_SWARM]: 0},
    { intervalMs: 3500, mosquitoesPerWave: 4 },
    [
      { triggerTimeMs: (duration) => duration / 2, preparationDurationMs: 5000, durationMs: 24000, intervalMs: 2700, mosquitoesPerWave: 7 },
      { triggerTimeMs: (duration) => duration - 5000, preparationDurationMs: 5000, durationMs: 24000, intervalMs: 2500, mosquitoesPerWave: 8 },
    ]
  ),
  phase(
    3,
    180000,
    {
      [MOSQUITO_TYPES.STANDARD]: 60,
      [MOSQUITO_TYPES.COWARD]: 10,
      [MOSQUITO_TYPES.DRUNK]: 5,
      [MOSQUITO_TYPES.HEMATOPHAGE]: 0,
      [MOSQUITO_TYPES.INCUBATOR]: 14,
      [MOSQUITO_TYPES.ZIGZAG]: 11,
    },
    { individual: 45, [FORMATIONS.V]: 17, [FORMATIONS.COLUMN]: 17, [FORMATIONS.CIRCULAR]: 16, [FORMATIONS.OSCILLATING_SWARM]: 5 },
    { intervalMs: 3000, mosquitoesPerWave: 5 },
    [
      { triggerTimeMs: (duration) => duration / 2, preparationDurationMs: 5000, durationMs: 28000, intervalMs: 2300, mosquitoesPerWave: 9 },
      { triggerTimeMs: (duration) => duration - 5000, preparationDurationMs: 5000, durationMs: 28000, intervalMs: 2100, mosquitoesPerWave: 10 },
    ]
  ),
  phase(
    4,
    210000,
    {
      [MOSQUITO_TYPES.STANDARD]: 40,
      [MOSQUITO_TYPES.COWARD]: 13,
      [MOSQUITO_TYPES.DRUNK]: 16,
      [MOSQUITO_TYPES.HEMATOPHAGE]: 6,
      [MOSQUITO_TYPES.INCUBATOR]: 13,
      [MOSQUITO_TYPES.ZIGZAG]: 12,
    },
    { individual: 10, [FORMATIONS.V]: 26, [FORMATIONS.COLUMN]: 26, [FORMATIONS.CIRCULAR]: 23, [FORMATIONS.OSCILLATING_SWARM]: 15 },
    { intervalMs: 2600, mosquitoesPerWave: 6 },
    [
      { triggerTimeMs: (duration) => duration / 2, preparationDurationMs: 5000, durationMs: 32000, intervalMs: 1900, mosquitoesPerWave: 11 },
      { triggerTimeMs: (duration) => duration - 5000, preparationDurationMs: 5000, durationMs: 32000, intervalMs: 1700, mosquitoesPerWave: 12 },
    ]
  ),
  phase(
    5,
    240000,
    {
      [MOSQUITO_TYPES.STANDARD]: 20,
      [MOSQUITO_TYPES.COWARD]: 17,
      [MOSQUITO_TYPES.DRUNK]: 19,
      [MOSQUITO_TYPES.HEMATOPHAGE]: 11,
      [MOSQUITO_TYPES.INCUBATOR]: 16,
      [MOSQUITO_TYPES.ZIGZAG]: 15,
    },
    { individual: 0, [FORMATIONS.V]: 28, [FORMATIONS.COLUMN]: 28, [FORMATIONS.CIRCULAR]: 24, [FORMATIONS.OSCILLATING_SWARM]: 20 },
    { intervalMs: 2200, mosquitoesPerWave: 8 },
    [
      { triggerTimeMs: (duration) => duration / 2, preparationDurationMs: 5000, durationMs: 36000, intervalMs: 1500, mosquitoesPerWave: 14 },
      { triggerTimeMs: (duration) => duration - 5000, preparationDurationMs: 5000, durationMs: 36000, intervalMs: 1300, mosquitoesPerWave: 16 },
    ]
  ),
];

export const MENU_PREVIEW_CONFIG = {
  enemyWeights: {
    [MOSQUITO_TYPES.STANDARD]: 25,
    [MOSQUITO_TYPES.COWARD]: 15,
    [MOSQUITO_TYPES.DRUNK]: 15,
    [MOSQUITO_TYPES.HEMATOPHAGE]: 10,
    [MOSQUITO_TYPES.INCUBATOR]: 20,
    [MOSQUITO_TYPES.ZIGZAG]: 15,
  },
  spawnIntervalMs: 1700,
  maxActiveMosquitoes: 6,
};

export function validatePhaseConfigs(configs = PHASE_CONFIGS) {
  if (configs.length !== 5) {
    throw new Error(`Expected exactly 5 phase configurations, received ${configs.length}.`);
  }
  for (const config of configs) {
    if (!Array.isArray(config.hordes) || config.hordes.length !== 2) {
      throw new Error(`Phase ${config.phaseId} must define exactly two hordes.`);
    }
    if (selectWeighted(config.enemyWeights) === null) {
      throw new Error(`Phase ${config.phaseId} has no valid enemy weights.`);
    }
  }
  return configs;
}

validatePhaseConfigs();

export { FORMATIONS };
