// Original offline candidate tuning. Not formal DF rules or model output.
export const CONFIG_ID='DF-PICKUP-GROWTH-20261018-R01-v1';
export const CFG=Object.freeze({width:720,height:1000,dt:1/60,playerSpeed:224,maxHp:10,invulnerability:54,
 W01:{damage:5,radiusWU:138,cooldownTicks:48,knockbackWU:35,sectorAngleDegrees:100,acquireRangeWU:151},
 W02:{damage:3,cooldownTicks:22,speedWUPerSecond:480,projectileRadiusWU:7,acquireRangeWU:600,maxTravelWU:640,lifetimeTicks:100,maxInFlight:5,pierce:0},
 W03:{pulseDamage:3,standardCooldownTicks:84,acquireRangeWU:600,throwDistanceWU:174,flightTicks:30,zoneRadiusWU:92,pulseIntervalTicks:24,lifetimeTicks:180,maxActiveZones:3,maxInFlight:2},
 growth:{pickupRadius:34,thresholds:[4,6,8,10,12,14],auxSlots:2,emberRadius:70},
 orbit:{radius:68,entityRadius:16,period:144,damage:3,push:48},boss:{hp:180,damage:2,radius:33,telegraph:66,execute:33,recover:105,chargeSpeed:345}});
export const WEAPONS={W01:{name:'裂砧',tag:'近身 · 扇面重击',detail:'靠近最近威胁，提交一次正面扇击。背后与扇面外无伤；命中推开敌人。',color:'#e4bc75'},W02:{name:'贯星',tag:'直线 · 首碰即止',detail:'自动向最近敌人发射直线弹。每弹只命中第一个敌人，不穿透、不追踪。',color:'#80c9d5'},W03:{name:'余烬池',tag:'投掷 · 驻地脉冲',detail:'向最近敌人方向投出固定距离。飞行和落地无伤；落地后周期灼烧，不跟随你。',color:'#c3a6ee'}};
