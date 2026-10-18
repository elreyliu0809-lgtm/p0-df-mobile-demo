                                                          
import { add, circleOverlapsCircle, distancePointToSegment, distanceSquared, normalize, scale, sub } from '../math.js';
                                     
import { HEAVY_IMPACT } from '../weapons/heavy-impact.js';
import { SPELL_CARRIER } from '../weapons/spell-carrier.js';
                                                                                 
                                                                     

export const WEAPON_FEEL = Object.freeze({ heavyRadius: 123, heavyHalfAngle: Math.PI / 4, spellDistance: 204, spellFlightTicks: 30 });
export const V030B5TestOnlyW01AdmissionThreshold = (
  reachState                                                               ,
  baseCeilingWU        , actualRadiusWU        , targetRadiusWU        ,
)         => {
  if (![baseCeilingWU, actualRadiusWU, targetRadiusWU].every((value) =>
    Number.isFinite(value) && value > 0)) throw new Error('B5T_W01_ADMISSION_INPUT_INVALID');
  return reachState === 'REACH_NOT_APPLIED'
    ? Math.min(baseCeilingWU, actualRadiusWU + targetRadiusWU)
    : actualRadiusWU + targetRadiusWU;
};
const facing = (direction      )       => direction.x === 0 && direction.y === 0 ? { x: 0, y: -1 } : normalize(direction);
const validDirection = (value             )                => value !== null &&
  Number.isFinite(value.x) && Number.isFinite(value.y) &&
  Number.isFinite(Math.hypot(value.x, value.y)) && Math.hypot(value.x, value.y) > 0;
const validW01Target = (enemy                                            )          =>
  enemy.health > 0 && enemy.mode !== 'DEAD' && typeof enemy.id === 'string' && enemy.id.length > 0 &&
  Number.isFinite(enemy.position.x) && Number.isFinite(enemy.position.y) &&
  Number.isFinite(enemy.radius) && enemy.radius > 0;
// JavaScript string order is UTF-16 code-unit ordinal order, including prefix order.
const compareW01Ids = (left        , right        )         =>
  left < right ? -1 : left > right ? 1 : 0;
const nearestLivingEnemy = (world                , acquireRangeWU = Number.POSITIVE_INFINITY) => [...world.state.enemies]
  .filter(enemy => enemy.health > 0)
  .filter(enemy => distanceSquared(world.state.player.position, enemy.position) <= acquireRangeWU ** 2)
  .sort((left, right) => distanceSquared(world.state.player.position, left.position) - distanceSquared(world.state.player.position, right.position) || left.id.localeCompare(right.id))[0];

// Minimum distance to the closed sector: interior, arc, or either radial segment.
export function distanceToHeavySector(point      , sector             )         {
  const offset = sub(point, sector.origin);
  const d = facing(sector.direction);
  const along = offset.x * d.x + offset.y * d.y;
  const across = offset.x * -d.y + offset.y * d.x;
  const angle = Math.abs(Math.atan2(across, along));
  if (angle <= sector.halfAngle) return Math.max(0, Math.hypot(along, across) - sector.radius);
  const edge = (sign        )       => add(sector.origin, scale({
    x: d.x * Math.cos(sector.halfAngle) - sign * d.y * Math.sin(sector.halfAngle),
    y: d.y * Math.cos(sector.halfAngle) + sign * d.x * Math.sin(sector.halfAngle),
  }, sector.radius));
  return Math.min(distancePointToSegment(point, sector.origin, edge(-1)), distancePointToSegment(point, sector.origin, edge(1)));
}

export const finalizeW01TargetingAttempt = (
  observation                     ,
  attackCommitted         ,
)                      => {
  if (attackCommitted) return { ...observation, reason: 'COMMITTED' };
  if (observation.reason === 'COMMITTED') return { ...observation, reason: 'OTHER_REJECTION' };
  return observation;
};

export function fireDiversityHeavy(
  world                ,
  runtime                                                        = null,
  observeTargeting                                             ,
)                         {
  const state = world.state;
  if (state.weaponCooldownTicks > 0) return [];
  const acquireRangeWU = runtime?.acquireRangeWU ?? Number.POSITIVE_INFINITY;
  const sectorRadiusWU = runtime?.radiusWU ?? WEAPON_FEEL.heavyRadius;
  const stateAware = runtime !== null && runtime !== undefined &&
    (runtime.reachState !== undefined || runtime.baseAcquireCeilingWU !== undefined);
  const baseCeilingWU = runtime?.baseAcquireCeilingWU ?? acquireRangeWU;
  const livingEnemies = state.enemies.filter(validW01Target);
  const livingDistances = livingEnemies.map(enemy =>
    Math.sqrt(distanceSquared(state.player.position, enemy.position)));
  const thresholdFor = (targetRadiusWU        )         => stateAware
    ? Math.min(baseCeilingWU, sectorRadiusWU + targetRadiusWU)
    : acquireRangeWU;
  const eligibleEnemies = livingEnemies.filter(enemy => {
    const threshold = thresholdFor(enemy.radius);
    return Number.isFinite(threshold) &&
      distanceSquared(state.player.position, enemy.position) <= threshold ** 2 ||
      !stateAware && threshold === Number.POSITIVE_INFINITY;
  });
  const eligibleDistances = eligibleEnemies.map(enemy =>
    Math.sqrt(distanceSquared(state.player.position, enemy.position)));
  const nearestLivingDistanceWU = livingDistances.length === 0 ? null : Math.min(...livingDistances);
  const nearestEligibleDistanceWU = eligibleDistances.length === 0 ? null : Math.min(...eligibleDistances);
  const duplicateIds = new Set        ();
  let hasDuplicateId = false;
  for (const enemy of livingEnemies) {
    if (duplicateIds.has(enemy.id)) hasDuplicateId = true;
    duplicateIds.add(enemy.id);
  }
  const target = [...eligibleEnemies].sort((left, right) =>
    distanceSquared(state.player.position, left.position) -
      distanceSquared(state.player.position, right.position) ||
      compareW01Ids(left.id, right.id))[0];
  const observe = (
    reason                               ,
    selectedTargetRadiusWU                = null,
  )       => observeTargeting?.({
    attemptTick: state.tick,
    livingEnemyCount: livingEnemies.length,
    inRangeEnemyCount: eligibleEnemies.length,
    nearestLivingDistanceWU,
    nearestEligibleDistanceWU,
    acquireRangeWU,
    sectorRadiusWU,
    selectedTargetRadiusWU,
    centerReachThresholdWU: selectedTargetRadiusWU === null
      ? null
      : stateAware ? thresholdFor(selectedTargetRadiusWU) : sectorRadiusWU + selectedTargetRadiusWU,
    reason,
  });
  if (stateAware && (runtime?.reachState !== 'REACH_NOT_APPLIED' ||
    !Number.isFinite(baseCeilingWU) || !Number.isFinite(sectorRadiusWU) ||
    baseCeilingWU <= 0 || sectorRadiusWU <= 0)) {
    observe('OTHER_REJECTION');
    return [];
  }
  if (hasDuplicateId) {
    observe('OTHER_REJECTION');
    return [];
  }
  if (!target) {
    observe(livingEnemies.length === 0
      ? 'NO_LIVING_ENEMY'
      : eligibleEnemies.length === 0
        ? 'OUTSIDE_ACQUIRE_RANGE'
        : 'OTHER_REJECTION');
    return [];
  }
  const origin = { ...state.player.position };
  const offset = sub(target.position, origin);
  const coLocated = offset.x === 0 && offset.y === 0;
  const aimInput = coLocated
    ? validDirection(world.lastValidW01AimDirection)
      ? world.lastValidW01AimDirection
      : world.w01BaselineFacingRef
    : offset;
  if (!validDirection(aimInput)) {
    observe('OTHER_REJECTION', target.radius);
    return [];
  }
  const sector              = {
    origin,
    direction: normalize(aimInput),
    radius: sectorRadiusWU,
    halfAngle: runtime === null || runtime === undefined
      ? WEAPON_FEEL.heavyHalfAngle
      : runtime.sectorAngleDegrees * Math.PI / 360,
    tick: state.tick,
  };
  if (distanceToHeavySector(target.position, sector) > target.radius + 1e-9) {
    observe('OUTSIDE_REACH', target.radius);
    return [];
  }
  observe('COMMITTED', target.radius);
  const targets = state.enemies.filter(enemy => validW01Target(enemy) &&
    distanceToHeavySector(enemy.position, sector) <= enemy.radius + 1e-9);
  world.heavySector = sector;
  state.weaponCooldownTicks = runtime?.cooldownTicks ?? HEAVY_IMPACT.cooldownTicks;
  if (!coLocated) world.lastValidW01AimDirection = { ...sector.direction };
  const events                = [{ type: 'ATTACK', tick: state.tick, sourceId: 'HEAVY_IMPACT', targetId: target.id, ...sector.origin }];
  const killed = new Set        ();
  for (const enemy of targets) {
    enemy.health -= runtime?.damage ?? HEAVY_IMPACT.damage;
    events.push({ type: 'HIT', tick: state.tick, sourceId: 'HEAVY_IMPACT', targetId: enemy.id, ...enemy.position });
    if (enemy.health <= 0) {
      killed.add(enemy.id); state.kills += 1;
      events.push({ type: 'KILL', tick: state.tick, sourceId: 'HEAVY_IMPACT', targetId: enemy.id, ...enemy.position });
    } else {
      enemy.position = add(enemy.position, scale(
        normalize(sub(enemy.position, sector.origin)),
        runtime?.knockbackWU ?? HEAVY_IMPACT.knockbackPixels,
      ));
    }
  }
  if (killed.size > 0) state.enemies = state.enemies.filter(enemy => !killed.has(enemy.id));
  return events;
}

export function updateDiversitySpell(
  world                ,
  runtime                                                        = null,
)                         {
  const state = world.state;
  const pulseDamage = runtime?.pulseDamage ?? SPELL_CARRIER.damagePerPulse;
  const cooldownTicks = runtime?.standardCooldownTicks ?? SPELL_CARRIER.cooldownTicks;
  const throwDistanceWU = runtime?.throwDistanceWU ?? WEAPON_FEEL.spellDistance;
  const flightTicks = runtime?.flightTicks ?? WEAPON_FEEL.spellFlightTicks;
  const zoneRadiusWU = runtime?.zoneRadiusWU ?? SPELL_CARRIER.radius;
  const pulseIntervalTicks = runtime?.pulseIntervalTicks ?? SPELL_CARRIER.pulseEveryTicks;
  const lifetimeTicks = runtime?.lifetimeTicks ?? SPELL_CARRIER.lifetimeTicks;
  const events                = [];
  const hit = new Set        (), killed = new Set        ();
  // Existing zones age first. A zone created by landing below starts at full lifetime.
  for (const zone of state.zones) {
    zone.remainingTicks -= 1; zone.pulseTicks -= 1;
    if (zone.remainingTicks <= 0 || zone.pulseTicks > 0) continue;
    zone.pulseTicks = pulseIntervalTicks;
    for (const enemy of state.enemies) {
      if (hit.has(enemy.id) || killed.has(enemy.id)) continue;
      if (!circleOverlapsCircle(zone.position, zone.radius, enemy.position, enemy.radius)) continue;
      hit.add(enemy.id); enemy.health -= pulseDamage;
      events.push({ type: 'HIT', tick: state.tick, sourceId: 'SPELL_CARRIER', targetId: enemy.id, ...enemy.position });
      if (enemy.health > 0) continue;
      killed.add(enemy.id); state.kills += 1;
      events.push({ type: 'KILL', tick: state.tick, sourceId: 'SPELL_CARRIER', targetId: enemy.id, ...enemy.position });
    }
  }
  state.zones = state.zones.filter(zone => zone.remainingTicks > 0);
  if (killed.size > 0) state.enemies = state.enemies.filter(enemy => !killed.has(enemy.id));
  world.spellLandings = [];
  for (const flight of world.spellFlights) {
    const progress = Math.min(1, Math.max(0, (state.tick - flight.launchedTick) / flightTicks));
    flight.position = add(flight.origin, scale(sub(flight.destination, flight.origin), progress));
    if (progress < 1) continue;
    const id = `zone-${state.nextEntityId++}`;
    state.zones.push({ id, position: { ...flight.destination }, radius: zoneRadiusWU, remainingTicks: lifetimeTicks, pulseTicks: pulseIntervalTicks });
    world.spellLandings.push({ id, position: { ...flight.destination }, tick: state.tick });
  }
  world.spellFlights = world.spellFlights.filter(flight => state.tick - flight.launchedTick < flightTicks);
  if (state.weaponCooldownTicks === 0) {
    const origin = { ...state.player.position };
    const target = nearestLivingEnemy(world, runtime?.acquireRangeWU);
    if (!target) return events;
    if (runtime !== null && runtime !== undefined &&
      (world.spellFlights.length >= runtime.maxInFlight || state.zones.length >= runtime.maxActiveZones)) {
      return events;
    }
    const targetPositionAtCommit = { ...target.position };
    const facingAtCommit = facing(state.player.facing);
    const direction = facing(sub(targetPositionAtCommit, origin));
    const destination = add(origin, scale(direction, throwDistanceWU));
    world.spellFlights.push({
      id: `spell-flight-${state.nextEntityId++}`,
      origin,
      destination,
      position: { ...origin },
      launchedTick: state.tick,
      targetId: target.id,
      targetPositionAtCommit,
      facingAtCommit,
      initialDirection: { ...direction },
    });
    state.weaponCooldownTicks = cooldownTicks;
    events.push({ type: 'ATTACK', tick: state.tick, sourceId: 'SPELL_CARRIER', targetId: target.id, ...origin });
  }
  return events;
}
