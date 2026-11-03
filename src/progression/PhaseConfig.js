import { MOSQUITO_TYPES } from "../entities/Mosquito.js";
import { selectWeighted } from "./WeightedSelection.js";

const FORMATIONS = {
  V: "V",
  COLUMN: "COLUMN",
  CIRCULAR: "CIRCULAR",
  OSCILLATING_SWARM: "OSCILLATING_SWARM",
};

const phase = (phaseId, enemyWeights, formationWeights, normal, hordes) => ({
  phaseId,
  durationMs: 300000,
  initialSpawnDelayMs: 3000,
  normalSpawn: normal,
  enemyWeights,
  formationWeights,
  hordes,
});

export const PHASE_CONFIGS = [
  phase(
    1,
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
      { triggerTimeMs: 150000, preparationDurationMs: 5000, durationMs: 20000, intervalMs: 3000, mosquitoesPerWave: 5 },
      { triggerTimeMs: 255000, preparationDurationMs: 5000, durationMs: 20000, intervalMs: 2800, mosquitoesPerWave: 6 },
    ]
  ),
  phase(
    2,
    {
      [MOSQUITO_TYPES.STANDARD]: 75,
      [MOSQUITO_TYPES.COWARD]: 8,
      [MOSQUITO_TYPES.DRUNK]: 6,
      [MOSQUITO_TYPES.HEMATOPHAGE]: 4,
      [MOSQUITO_TYPES.INCUBATOR]: 5,
      [MOSQUITO_TYPES.ZIGZAG]: 2,
    },
    { individual: 90, [FORMATIONS.V]: 4, [FORMATIONS.COLUMN]: 3, [FORMATIONS.CIRCULAR]: 2, [FORMATIONS.OSCILLATING_SWARM]: 1 },
    { intervalMs: 3500, mosquitoesPerWave: 4 },
    [
      { triggerTimeMs: 150000, preparationDurationMs: 5000, durationMs: 24000, intervalMs: 2700, mosquitoesPerWave: 7 },
      { triggerTimeMs: 255000, preparationDurationMs: 5000, durationMs: 24000, intervalMs: 2500, mosquitoesPerWave: 8 },
    ]
  ),
  phase(
    3,
    {
      [MOSQUITO_TYPES.STANDARD]: 45,
      [MOSQUITO_TYPES.COWARD]: 12,
      [MOSQUITO_TYPES.DRUNK]: 12,
      [MOSQUITO_TYPES.HEMATOPHAGE]: 10,
      [MOSQUITO_TYPES.INCUBATOR]: 12,
      [MOSQUITO_TYPES.ZIGZAG]: 9,
    },
    { individual: 70, [FORMATIONS.V]: 8, [FORMATIONS.COLUMN]: 8, [FORMATIONS.CIRCULAR]: 8, [FORMATIONS.OSCILLATING_SWARM]: 6 },
    { intervalMs: 3000, mosquitoesPerWave: 5 },
    [
      { triggerTimeMs: 150000, preparationDurationMs: 5000, durationMs: 28000, intervalMs: 2300, mosquitoesPerWave: 9 },
      { triggerTimeMs: 255000, preparationDurationMs: 5000, durationMs: 28000, intervalMs: 2100, mosquitoesPerWave: 10 },
    ]
  ),
  phase(
    4,
    {
      [MOSQUITO_TYPES.STANDARD]: 25,
      [MOSQUITO_TYPES.COWARD]: 20,
      [MOSQUITO_TYPES.DRUNK]: 20,
      [MOSQUITO_TYPES.HEMATOPHAGE]: 20,
      [MOSQUITO_TYPES.INCUBATOR]: 20,
      [MOSQUITO_TYPES.ZIGZAG]: 20,
    },
    { individual: 0, [FORMATIONS.V]: 12, [FORMATIONS.COLUMN]: 12, [FORMATIONS.CIRCULAR]: 11, [FORMATIONS.OSCILLATING_SWARM]: 10 },
    { intervalMs: 2600, mosquitoesPerWave: 6 },
    [
      { triggerTimeMs: 150000, preparationDurationMs: 5000, durationMs: 32000, intervalMs: 1900, mosquitoesPerWave: 11 },
      { triggerTimeMs: 255000, preparationDurationMs: 5000, durationMs: 32000, intervalMs: 1700, mosquitoesPerWave: 12 },
    ]
  ),
  phase(
    5,
    {
      [MOSQUITO_TYPES.STANDARD]: 20,
      [MOSQUITO_TYPES.COWARD]: 18,
      [MOSQUITO_TYPES.DRUNK]: 20,
      [MOSQUITO_TYPES.HEMATOPHAGE]: 22,
      [MOSQUITO_TYPES.INCUBATOR]: 20,
      [MOSQUITO_TYPES.ZIGZAG]: 20,
    },
    { individual: 0, [FORMATIONS.V]: 15, [FORMATIONS.COLUMN]: 15, [FORMATIONS.CIRCULAR]: 13, [FORMATIONS.OSCILLATING_SWARM]: 12 },
    { intervalMs: 2200, mosquitoesPerWave: 8 },
    [
      { triggerTimeMs: 150000, preparationDurationMs: 5000, durationMs: 36000, intervalMs: 1500, mosquitoesPerWave: 14 },
      { triggerTimeMs: 255000, preparationDurationMs: 5000, durationMs: 36000, intervalMs: 1300, mosquitoesPerWave: 16 },
    ]
  ),
];

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
