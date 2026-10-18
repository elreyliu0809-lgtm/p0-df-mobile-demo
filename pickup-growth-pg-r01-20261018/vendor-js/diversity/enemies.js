                                                      
import { ARENA, BASE_ENEMY, FIXED_DT_SECONDS } from '../constants.js';
import { add, normalize, scale, sub } from '../math.js';
                                                             
import { CHARGE_PHASE_TICKS, INTERCEPT_REPLAN_TICKS } from './config.js';

export const DIVERSITY_RETENTION_RADIUS = Math.hypot(ARENA.width, ARENA.height);

export function diversityActivityBounds(center      , padding = 0) {
  return {
    left: center.x - ARENA.width / 2 - padding,
    right: center.x + ARENA.width / 2 + padding,
    top: center.y - ARENA.height / 2 - padding,
    bottom: center.y + ARENA.height / 2 + padding,
  };
}

export function outsideDiversityRetention(point      , center      )          {
  return Math.hypot(point.x - center.x, point.y - center.y) > DIVERSITY_RETENTION_RADIUS;
}

export function spawnDiversityEnemy(state            , role         , side        , offset        )             {
  const radius = BASE_ENEMY.radius;
  const bounds = diversityActivityBounds(state.player.position, -radius);
  let position       = { x: bounds.left, y: bounds.top };
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const edge = (side + attempt) % 4;
    position = edge === 0 ? { x: bounds.left + offset * (bounds.right - bounds.left), y: bounds.top }
      : edge === 1 ? { x: bounds.right, y: bounds.top + offset * (bounds.bottom - bounds.top) }
      : edge === 2 ? { x: bounds.left + offset * (bounds.right - bounds.left), y: bounds.bottom }
      : { x: bounds.left, y: bounds.top + offset * (bounds.bottom - bounds.top) };
    if (Math.hypot(position.x - state.player.position.x, position.y - state.player.position.y) >= 240) break;
  }
  return { id: `diversity-enemy-${state.nextEntityId++}`, role, position, velocity: { x: 0, y: 0 },
    health: BASE_ENEMY.health, mode: role === 'CHARGER' ? 'APPROACH' : role === 'INTERCEPTOR' ? 'INTERCEPT' : 'PRESS',
    modeTicks: 0, lockedDirection: { x: 0, y: 0 }, radius };
}

export function stepDiversityEnemy(enemy            , state            )       {
  if (enemy.health <= 0) return;
  const player = state.player;
  if (enemy.role === 'INTERCEPTOR') {
    if (enemy.modeTicks <= 0) {
      const predicted = add(player.position, scale(player.velocity, 0.6));
      enemy.lockedDirection = normalize(sub(predicted, enemy.position));
      enemy.modeTicks = INTERCEPT_REPLAN_TICKS;
    }
    enemy.modeTicks -= 1;
    enemy.velocity = scale(enemy.lockedDirection, BASE_ENEMY.speedPerSecond);
  } else if (enemy.role === 'CHARGER') {
    if (enemy.mode === 'APPROACH' && Math.hypot(player.position.x - enemy.position.x, player.position.y - enemy.position.y) <= 240) {
      enemy.mode = 'TELEGRAPH';
      enemy.modeTicks = CHARGE_PHASE_TICKS.TELEGRAPH;
      enemy.lockedDirection = normalize(sub(player.position, enemy.position));
    }
    if (enemy.mode === 'TELEGRAPH' || enemy.mode === 'RECOVER') {
      enemy.velocity = { x: 0, y: 0 };
      enemy.modeTicks -= 1;
      if (enemy.modeTicks === 0) {
        if (enemy.mode === 'TELEGRAPH') { enemy.mode = 'CHARGE'; enemy.modeTicks = CHARGE_PHASE_TICKS.CHARGE; }
        else enemy.mode = 'APPROACH';
      }
      return;
    }
    enemy.velocity = scale(enemy.mode === 'CHARGE' ? enemy.lockedDirection : normalize(sub(player.position, enemy.position)),
      enemy.mode === 'CHARGE' ? 300 : BASE_ENEMY.speedPerSecond);
  } else {
    enemy.velocity = scale(normalize(sub(player.position, enemy.position)), BASE_ENEMY.speedPerSecond);
  }
  enemy.position = add(enemy.position, scale(enemy.velocity, FIXED_DT_SECONDS));
  if (enemy.role === 'CHARGER' && enemy.mode === 'CHARGE') {
    enemy.modeTicks -= 1;
    if (enemy.modeTicks <= 0) {
      enemy.mode = 'RECOVER'; enemy.modeTicks = CHARGE_PHASE_TICKS.RECOVER; enemy.velocity = { x: 0, y: 0 };
    }
  }
}
