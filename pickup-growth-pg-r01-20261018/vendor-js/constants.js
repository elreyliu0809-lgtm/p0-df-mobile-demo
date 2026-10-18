export const TICKS_PER_SECOND = 60;
export const FIXED_DT_SECONDS = 1 / TICKS_PER_SECOND;
export const ARENA = Object.freeze({ width: 1152, height: 648 });
export const PLAYER = Object.freeze({
  radius: 14,
  speedPerSecond: 240,
  maxHealth: 5,
  invulnerabilityTicks: 30,
});
export const BASE_ENEMY = Object.freeze({
  radius: 13,
  health: 4,
  contactDamage: 1,
  speedPerSecond: 88,
});
