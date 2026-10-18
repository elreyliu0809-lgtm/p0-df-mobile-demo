import {CFG} from './config.mjs';
import {addEnemy,emit,random,dist,damagePlayer,copy} from './core.mjs';
import {normalize,distancePointToSegment} from './vendor-js/math.js';
const S1=[[1,'PRESSER'],[1,'PRESSER'],[180,'INTERCEPTOR'],[300,'PRESSER'],[420,'CHARGER'],[540,'PRESSER']];
const S2=[[1,'INTERCEPTOR'],[1,'PRESSER'],[150,'CHARGER'],[270,'PRESSER'],[330,'INTERCEPTOR'],[450,'CHARGER',true],[570,'PRESSER'],[630,'INTERCEPTOR']];
export function schedule(g){if(g.phase==='BOSS'){g.scheduleLength=1;if(!g.spawnCursor){g.spawnCursor=1;const b=addEnemy(g,'BOSS',360,260,CFG.boss.hp);b.radius=CFG.boss.radius;b.mode='RECOVER';b.modeTicks=75;b.bossPhase=1;b.cycle=0;emit(g,'BOSS_STARTED',{enemyId:b.id,hp:b.health});}return;}
 const rows=g.phase==='ENCOUNTER_1'?S1:g.phase==='ENCOUNTER_2'?S2:[];g.scheduleLength=rows.length;
 while(g.spawnCursor<rows.length&&rows[g.spawnCursor][0]<=g.stageTick){const [,role,elite]=rows[g.spawnCursor++];const angle=random(g)*Math.PI*2;const p=g.world.state.player.position;const x=Math.max(40,Math.min(680,p.x+Math.cos(angle)*290)),y=Math.max(50,Math.min(950,p.y+Math.sin(angle)*290));addEnemy(g,role,x,y,elite?18:g.phase==='ENCOUNTER_1'?6:8,!!elite);}
}
export function updateBoss(g,b){const p=g.world.state.player;if(b.health<=CFG.boss.hp/2&&b.bossPhase===1){b.bossPhase=2;emit(g,'BOSS_PHASE',{enemyId:b.id,phase:2,hp:b.health});addEnemy(g,'INTERCEPTOR',100,180,6);addEnemy(g,'INTERCEPTOR',620,180,6);}
 b.modeTicks--;
 if(b.mode==='RECOVER'){
  if(b.modeTicks>0)return;b.cycle++;b.attackKind=b.bossPhase===2&&b.cycle%2===0?'BLAST':'CHARGE';b.mode='TELEGRAPH';b.modeTicks=b.bossPhase===2?51:CFG.boss.telegraph;b.lockedDirection=normalize({x:p.position.x-b.position.x,y:p.position.y-b.position.y});b.lockedOrigin=copy(b.position);b.lockedTarget=copy(p.position);emit(g,'BOSS_TELEGRAPH',{enemyId:b.id,kind:b.attackKind,direction:copy(b.lockedDirection),origin:copy(b.lockedOrigin),target:copy(b.lockedTarget),ticks:b.modeTicks});return;
 }
 if(b.mode==='TELEGRAPH'){if(b.modeTicks<=0){b.mode='LOCKED_EXECUTE';b.modeTicks=b.attackKind==='BLAST'?1:CFG.boss.execute;emit(g,'BOSS_LOCKED_EXECUTE',{enemyId:b.id,kind:b.attackKind,direction:copy(b.lockedDirection),origin:copy(b.lockedOrigin),target:copy(b.lockedTarget)});}return;}
 if(b.mode==='LOCKED_EXECUTE'){
  if(b.attackKind==='BLAST'){if(dist(p.position,b.lockedTarget)<=108+14)damagePlayer(g,b.id,'守门者落点爆破',CFG.boss.damage);g.effects.push({kind:'blast',...b.lockedTarget,until:g.world.state.tick+25});}
  else {const old=copy(b.position);b.position={x:Math.max(40,Math.min(680,b.position.x+b.lockedDirection.x*CFG.boss.chargeSpeed/60)),y:Math.max(50,Math.min(950,b.position.y+b.lockedDirection.y*CFG.boss.chargeSpeed/60))};if(distancePointToSegment(p.position,old,b.position)<=b.radius+14)damagePlayer(g,b.id,'守门者锁向冲锋',CFG.boss.damage);}
  if(b.modeTicks<=0||b.attackKind==='BLAST'){b.mode='RECOVER';b.modeTicks=CFG.boss.recover;emit(g,'BOSS_RECOVER',{enemyId:b.id,ticks:b.modeTicks});}return;
 }
}
