                                                          
import { circleOverlapsCircle } from '../math.js';
                                           

export const SPELL_CARRIER = Object.freeze({
  cooldownTicks: 90,
  radius: 68,
  lifetimeTicks: 144,
  pulseEveryTicks: 20,
  damagePerPulse: 1,
});

export const updateSpellCarrier = (state            )                         => {
  const events                = [];
  const hitEnemyIds = new Set        ();
  const killedEnemyIds = new Set        ();

  for (const zone of state.zones) {
    zone.remainingTicks -= 1;
    zone.pulseTicks -= 1;
    if (zone.remainingTicks <= 0 || zone.pulseTicks > 0) continue;
    zone.pulseTicks = SPELL_CARRIER.pulseEveryTicks;

    for (const enemy of state.enemies) {
      if (hitEnemyIds.has(enemy.id) || killedEnemyIds.has(enemy.id)) continue;
      if (!circleOverlapsCircle(zone.position, zone.radius, enemy.position, enemy.radius)) continue;
      hitEnemyIds.add(enemy.id);
      enemy.health -= SPELL_CARRIER.damagePerPulse;
      events.push({
        tick: state.tick,
        type: 'HIT',
        sourceId: 'SPELL_CARRIER',
        targetId: enemy.id,
        x: enemy.position.x,
        y: enemy.position.y,
      });
      if (enemy.health > 0) continue;
      killedEnemyIds.add(enemy.id);
      state.kills += 1;
      events.push({
        tick: state.tick,
        type: 'KILL',
        sourceId: 'SPELL_CARRIER',
        targetId: enemy.id,
        x: enemy.position.x,
        y: enemy.position.y,
      });
    }
  }

  state.zones = state.zones.filter(({ remainingTicks }) => remainingTicks > 0);
  if (killedEnemyIds.size > 0) {
    state.enemies = state.enemies.filter(({ id }) => !killedEnemyIds.has(id));
  }

  if (state.weaponCooldownTicks === 0) {
    state.zones.push({
      id: `zone-${state.nextEntityId++}`,
      position: structuredClone(state.player.position),
      radius: SPELL_CARRIER.radius,
      remainingTicks: SPELL_CARRIER.lifetimeTicks,
      pulseTicks: SPELL_CARRIER.pulseEveryTicks,
    });
    state.weaponCooldownTicks = SPELL_CARRIER.cooldownTicks;
    events.push({
      tick: state.tick,
      type: 'ATTACK',
      sourceId: 'SPELL_CARRIER',
      targetId: null,
      x: state.player.position.x,
      y: state.player.position.y,
    });
  }

  return events;
};
