import { PressureBombAbility } from './PressureBombAbility.js';
import { ReverseTransfusionAbility } from './ReverseTransfusionAbility.js';
import { LightningPulseAbility } from './lightning-pulse/LightningPulseAbility.js';
import { ThunderstormAbility } from './thunderstorm/ThunderstormAbility.js';
import { ImpactRainAbility } from './impact-rain/ImpactRainAbility.js';

/**
 * AbilityRegistry.js
 * Central catalog of all active abilities in the game.
 * Allows adding new abilities cleanly in the future without touching scene or UI code.
 */
export const ABILITY_DEFINITIONS = [
  {
    id: 'PRESSURE_BOMB',
    name: 'Pressure Bomb',
    description: 'Unleashes a damaging shockwave every 3 hits.',
    iconSymbol: '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 512 512"><!-- Icon from Game Icons by GameIcons - https://github.com/game-icons/icons/blob/master/license.txt --><path fill="#c4c4c4" d="M298.428 20.486c-21.447 48.03-44.188 75.236-77.115 79.91c-28.136 3.99-64.568-29.074-105.614-75.998c23.366 46.372 31.96 83.573 16.204 92.762c-18.627 10.866-55.943-1.943-111.203-25.144v10.615c38.017 24.128 73.04 47.683 66.5 56.442c-5.742 7.687-31.92 6.356-66.5 1.682v27.383c50.014 25.265 77.116 51.172 77.116 75.437c0 20.872-41.68 63.48-77.115 97.233v16.207c31.98-10.475 71.2-14.545 84.382 8.94c13.445 23.952 4.417 57.878-12.853 107.292h29.618c31.378-42.384 61.21-76.374 77.113-74.88c11.266 1.066 6.004 35.664-1.675 74.88h8.942c27.94-77.643 62.367-125.236 113.437-123.498c44.812 1.533 87.334 46.643 134.113 78.793c-24.452-29.92-69.5-72.534-59.793-80.466c10.208-8.352 53.968 6.926 99.47 23.47v-14.53c-29.854-20.367-57.317-39.94-50.294-46.94c6.313-6.296 25.576-7.315 50.293-5.588V295.43c-53.67-21.397-85.278-41.364-94.998-73.203c-7.98-26.144 16.097-60.923 61.47-102.82c-47.4 25.978-82.294 43.625-96.116 18.997c-12.413-22.108 1.488-63.554 23.467-117.908H371.63c-17.527 27.747-32.458 48.79-38 43.588c-4.828-4.536-4.882-20.853-2.792-43.588h-32.412l.002-.008zm7.265 32.06c-5.53 42.43-16.73 95.59-9.834 102.063c5.165 4.85 26.22-34.356 42.462-59.31c-18.34 46.248-35.978 81.03-27.082 96.878c7.03 12.525 24.87 3.69 48.985-9.524c-23.083 21.316-35.483 38.987-31.424 52.285c8.057 26.395 45.79 36.738 113.22 60.353c-34.623-4.49-82.283-13.5-90.288-5.518c-5.37 5.358 28.182 25.277 47.38 39.08c-29.005-10.13-65.573-25.36-72.41-19.77c-4.938 4.04 17.957 25.693 30.396 40.92c-23.8-16.357-45.59-39.233-68.39-40c-33.52-1.14-52.724 39.145-69.282 100.686c4.352-29.214 17.456-74.98 8.045-75.858c-13.35-1.256-45.605 46.34-69.728 81.836c16.846-51.048 32.15-80.128 21.9-98.387c-9.252-16.482-43.968-6.46-59 2.3c17.71-16.713 55.245-50.34 55.245-64.498c0-20.606-37.184-43.794-105.752-63.314c41.22 6.498 94.365 18.422 100.57 10.115c4.85-6.494-35.124-29.052-59.45-45.055c42.82 18.364 69.956 30.773 82.087 23.697c8.015-4.675 3.556-23.55-8.332-47.144c20.882 23.872 39.604 40.68 53.918 38.647c30.2-4.283 43.242-44.233 66.765-120.482z"/></svg>',
    color: '#ff5522',
    createInstance: () => new PressureBombAbility(),
  },
  {
    id: 'REVERSE_TRANSFUSION',
    name: 'Reverse Transfusion',
    description: 'Emits a chain of lightning discharges among the mosquitoes every 2 seconds.',
    iconSymbol: '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 512 512"><!-- Icon from Game Icons by GameIcons - https://github.com/game-icons/icons/blob/master/license.txt --><path fill="#c4c4c4" d="M29.805 29.777L242.14 209.55H118.712l112.54 86.784H95.995l225.656 174.012l-81.537-116.05l66.487.143l179.185 138.175l-171.96-244.746h84.568L248.082 29.776z"/></svg>',
    color: '#e6194b',
    createInstance: () => new ReverseTransfusionAbility(),
  },
  {
    id: 'LIGHTNING_PULSE',
    name: 'Lightning Pulse',
    description: 'Electrocution triggers a charged electrical blast around its target.',
    iconSymbol: '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 512 512"><!-- Icon from Game Icons by GameIcons - https://github.com/game-icons/icons/blob/master/license.txt --><path fill="#c4c4c4" d="m54.184 19.512l116.02 144.838a103.3 103.3 0 0 0-27.923 36.095L20.493 142.73v62.993l113.983 19.172a102.6 102.6 0 0 0-1.707 18.67c0 3.502.177 6.965.52 10.378l-72.376 27.7l79.467.687a102.9 102.9 0 0 0 16.948 27.775L20.492 441.7v52.484h47.336l105.87-168.65c11.644 8.795 25.212 15.165 39.945 18.366l-23.7 150.284H294.22L253.25 344.69a101.8 101.8 0 0 0 24.744-7.7l37.262 42.268l-21.326-51.365a103.6 103.6 0 0 0 18.68-16.692l182.533 146.61V348.556L329.43 284.865a101.9 101.9 0 0 0 8.195-31.238l84.7-25.93l-86.78-7.008a102 102 0 0 0-10.852-27.825l170.452-87.398V23.924L311.918 175.15a103.6 103.6 0 0 0-17.912-15.86l15.533-38.382l-29.968 29.967a101.8 101.8 0 0 0-30.996-9.148L269.89 19.512h-40.12l1.27 121.478c-19.017.808-36.716 6.816-51.706 16.64L94.102 19.51H54.184z"/></svg>',
    color: '#13dff2',
    createInstance: () => new LightningPulseAbility(),
  },
  {
    id: 'THUNDERSTORM',
    name: 'Thunderstorm',
    description: 'Three simultaneous lightning strikes electrocute nearby mosquitoes.',
    iconSymbol: '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 512 512"><!-- Icon from Game Icons by GameIcons - https://github.com/game-icons/icons/blob/master/license.txt --><path fill="#c4c4c4" d="M140.2 23.414c15.085 32.345 32.656 63.74 52.378 93.875l5.117 6.558l-.023-34.914l71.494 120.16l12.21-30.672l62.49 111.574l10.792-23.053l46.98 65.72c28.694 19.943 58.638 37.808 89.563 53.27c-9.573-53.755-22.974-106.946-46.167-158.7l-15.385 36.853l-60.82-106.8l-7.33 21.812l-58.623-100.784l-9.523 36.104l-57.16-69.95l-8.792 27.077zM32.905 30.65c.498 1.085 1.01 2.16 1.512 3.24l128.55 182.686l-15.07 2.442l85.834 57.697l-31.3 9.924l138.322 85.465l-34.393 16.145l5.4 3.322c-.7-1.014-1.393-2.032-2.098-3.043a790 790 0 0 0 12.584 9.49l109.297 67.22a677 677 0 0 0 44.418 20.156c-10.046-21.494-21.62-43.198-34.51-64.898l-83.413-116.693l-12.685 27.093l-61.118-109.127l-11.734 29.474l-56.094-94.275l.014 21.255l-48.426-62.06C123.39 81.91 77.68 52.7 32.904 30.65zM19.557 136.71l29.308 61.67l-34.44-.745l81.34 67.69L60.59 275.1l123.84 95.517l-44.7 3.76l148.02 83.487l-32.973 12.033l117.977 27.077c-11.174-23.545-23.634-46.537-37.254-68.864l-68.41-42.074l34.47-16.183l-143.597-88.726l33.185-10.52L98.2 208.132l30.69-4.97C94.145 177.7 57.52 155.358 19.556 136.71z"/></svg>',
    color: '#397f90',
    createInstance: () => new ThunderstormAbility(),
  },
  {
    id: 'IMPACT_RAIN',
    name: 'Impact Rain',
    description: 'Creates three spaced impacts that repeat one of your impact abilities.',
    iconSymbol: '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 512 512"><!-- Icon from Game Icons by GameIcons - https://github.com/game-icons/icons/blob/master/license.txt --><path fill="#c4c4c4" d="M105.4 26.28C122.1 96.08 82.98 121 27 132.6c70.72 24.3 36.69 48.4 21.99 72.6c66.01-5.1 87.51 25.8 87.41 74.3c36.5-20.1 51.6-62.3 147.1-21.6c-23.4-43.1-31.9-75.3 20.3-118.5c-39.7-14.2-77-30.2-58.1-81.17c-56.3 37.85-98.9 5.52-140.3-31.95m66.9 67.89a62.23 62.23 0 0 1 62.2 62.23a62.23 62.23 0 0 1-62.2 62.2a62.23 62.23 0 0 1-62.2-62.2a62.23 62.23 0 0 1 62.2-62.23M318.9 218.2c17.3 81.3-25 98-89 91.2c30.9 31.9 50.2 68 16.1 123.1c45.3-11.2 88.5-13.6 113.9 49.8c22.5-46.1 64.8-52.4 116.7-38.7c-17.9-27.7-38-55.4 16.9-82.8c-37-25.5-74.3-50.7-49.4-124.5c-45.3 51-86.7 40.1-125.2-18.1m47.4 76.7a62.23 62.23 0 0 1 62.2 62.2a62.23 62.23 0 0 1-62.2 62.2a62.23 62.23 0 0 1-62.2-62.2a62.23 62.23 0 0 1 62.2-62.2"/></svg>',
    color: '#45b1ff',
    createInstance: () => new ImpactRainAbility(),
  },
];

/**
 * Returns array of ability definitions that are not currently equipped.
 * @param {string[]} equippedIds - Array of ability IDs currently equipped by the player
 * @returns {Array} Available ability definitions
 */
export function getAvailableAbilities(equippedIds = []) {
  return ABILITY_DEFINITIONS.filter(def => !equippedIds.includes(def.id));
}

/**
 * Picks up to `count` random distinct unequipped ability definitions.
 * @param {string[]} equippedIds - Array of ability IDs currently equipped
 * @param {number} [count=3] - Number of random options to select
 * @returns {Array} Selected ability definitions (up to `count`)
 */
export function getRandomAbilityOptions(equippedIds = [], count = 3) {
  const available = getAvailableAbilities(equippedIds);
  if (available.length <= count) {
    return [...available];
  }
  // Shuffle copy of available abilities
  const shuffled = [...available].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
