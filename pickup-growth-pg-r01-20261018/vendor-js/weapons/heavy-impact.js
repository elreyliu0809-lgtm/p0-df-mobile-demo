                                                          
import { ARENA } from '../constants.js';
import { clampToArena, distanceSquared, normalize, scale, add, sub } from '../math.js';
                                           

export const HEAVY_IMPACT = Object.freeze({
  cooldownTicks: 66,
  radius: 82,
  damage: 2,
  knockbackPixels: 38,
});

export const fireHeavyImpact = (state            )                         => {
  if (state.weaponCooldownTicks > 0) return [];
  const targets = state.enemies.filter((enemy) => {
    const range = HEAVY_IMPACT.radius + enemy.radius;
    return distanceSquared(state.player.position, enemy.position) <= range * range;
  });
  if (targets.length === 0) return [];
  state.weaponCooldownTicks = HEAVY_IMPACT.cooldownTicks;
  const events                = [{
    tick: state.tick,
    type: 'ATTACK',
    sourceId: 'HEAVY_IMPACT',
    targetId: null,
    x: state.player.position.x,
    y: state.player.position.y,
  }];

  const killed = new Set        ();
  for (const enemy of targets) {
    enemy.health -= HEAVY_IMPACT.damage;
    events.push({
      tick: state.tick,
      type: 'HIT',
      sourceId: 'HEAVY_IMPACT',
      targetId: enemy.id,
      x: enemy.position.x,
      y: enemy.position.y,
    });
    if (enemy.health <= 0) {
      killed.add(enemy.id);
      state.kills += 1;
      events.push({
        tick: state.tick,
        type: 'KILL',
        sourceId: 'HEAVY_IMPACT',
        targetId: enemy.id,
        x: enemy.position.x,
        y: enemy.position.y,
      });
      continue;
    }
    const away = normalize(sub(enemy.position, state.player.position));
    enemy.position = clampToArena(
      add(enemy.position, scale(away, HEAVY_IMPACT.knockbackPixels)),
      enemy.radius,
    );
  }
  if (killed.size > 0) state.enemies = state.enemies.filter((enemy) => !killed.has(enemy.id));
  return events;
};
