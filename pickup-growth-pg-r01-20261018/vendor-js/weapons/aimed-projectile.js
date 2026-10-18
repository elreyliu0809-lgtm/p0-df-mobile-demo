                                                          
import { FIXED_DT_SECONDS } from '../constants.js';
import { diversityActivityBounds } from '../diversity/enemies.js';
import { add, circleOverlapsCircle, distanceSquared, normalize, scale, sub } from '../math.js';
                                                            
                                                                                

export const AIMED_PROJECTILE = Object.freeze({
  cooldownTicks: 25,
  speedPerSecond: 520,
  radius: 7,
  damage: 1,
  pierce: 0,
});

const nearestEnemy = (
  state            ,
  acquireRangeWU = Number.POSITIVE_INFINITY,
) => state.enemies.filter((enemy) => enemy.health > 0)
  .filter((enemy) => distanceSquared(state.player.position, enemy.position) <= acquireRangeWU ** 2)
  .sort((a, b) => {
  const delta = distanceSquared(state.player.position, a.position) -
    distanceSquared(state.player.position, b.position);
  return delta === 0 ? a.id.localeCompare(b.id) : delta;
})[0];

const outsideActivityWindow = (projectile                 , state            )          => {
  const bounds = diversityActivityBounds(state.player.position, projectile.radius);
  return projectile.position.x < bounds.left || projectile.position.x > bounds.right ||
    projectile.position.y < bounds.top || projectile.position.y > bounds.bottom;
};

export const updateAimedProjectile = (
  state            ,
  runtime                                                        = null,
)                         => {
  const events                = [];
  if (state.weaponCooldownTicks === 0 &&
      (runtime === null || runtime === undefined || state.projectiles.length < runtime.maxInFlight)) {
    const target = nearestEnemy(state, runtime?.acquireRangeWU);
    if (target) {
      const direction = normalize(sub(target.position, state.player.position));
      state.projectiles.push({
        id: `projectile-${state.nextEntityId++}`,
        position: structuredClone(state.player.position),
        velocity: scale(direction, runtime?.speedWUPerSecond ?? AIMED_PROJECTILE.speedPerSecond),
        radius: runtime?.projectileRadiusWU ?? AIMED_PROJECTILE.radius,
        damage: runtime?.damage ?? AIMED_PROJECTILE.damage,
        pierceLeft: runtime?.pierce ?? AIMED_PROJECTILE.pierce,
        hitEnemyIds: [],
        ...(runtime === null || runtime === undefined ? {} : {
          configuredLaunchTick: state.tick,
          configuredOrigin: structuredClone(state.player.position),
          configuredTravelledWU: 0,
          configuredMaxTravelWU: runtime.maxTravelWU,
          configuredLifetimeTicks: runtime.lifetimeTicks,
        }),
      });
      state.weaponCooldownTicks = runtime?.cooldownTicks ?? AIMED_PROJECTILE.cooldownTicks;
      events.push({
        tick: state.tick,
        type: 'ATTACK',
        sourceId: 'AIMED_PROJECTILE',
        targetId: target.id,
        x: state.player.position.x,
        y: state.player.position.y,
      });
    }
  }

  const killed = new Set        ();
  const expired = new Set        ();
  for (const projectile of state.projectiles) {
    if (projectile.configuredLaunchTick !== undefined &&
        projectile.configuredLifetimeTicks !== undefined &&
        state.tick - projectile.configuredLaunchTick >= projectile.configuredLifetimeTicks) {
      expired.add(projectile.id);
      continue;
    }
    projectile.position = add(projectile.position, scale(projectile.velocity, FIXED_DT_SECONDS));
    if (projectile.configuredTravelledWU !== undefined &&
        projectile.configuredMaxTravelWU !== undefined) {
      projectile.configuredTravelledWU += Math.hypot(
        projectile.velocity.x * FIXED_DT_SECONDS,
        projectile.velocity.y * FIXED_DT_SECONDS,
      );
      if (projectile.configuredTravelledWU >= projectile.configuredMaxTravelWU) {
        expired.add(projectile.id);
        continue;
      }
    }
    if (outsideActivityWindow(projectile, state)) {
      expired.add(projectile.id);
      continue;
    }
    for (const enemy of state.enemies) {
      if (killed.has(enemy.id) || projectile.hitEnemyIds.includes(enemy.id)) continue;
      if (!circleOverlapsCircle(projectile.position, projectile.radius, enemy.position, enemy.radius)) continue;
      projectile.hitEnemyIds.push(enemy.id);
      projectile.pierceLeft -= 1;
      enemy.health -= projectile.damage;
      events.push({
        tick: state.tick,
        type: 'HIT',
        sourceId: projectile.id,
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
          sourceId: projectile.id,
          targetId: enemy.id,
          x: enemy.position.x,
          y: enemy.position.y,
        });
      }
      if (projectile.pierceLeft <= 0) {
        expired.add(projectile.id);
        break;
      }
    }
  }
  if (killed.size > 0) state.enemies = state.enemies.filter((enemy) => !killed.has(enemy.id));
  if (expired.size > 0) {
    state.projectiles = state.projectiles.filter((projectile) => !expired.has(projectile.id));
  }
  return events;
};
