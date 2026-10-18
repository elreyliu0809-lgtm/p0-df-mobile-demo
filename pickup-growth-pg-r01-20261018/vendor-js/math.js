import { ARENA } from './constants.js';
                                    

export const add = (a      , b      )       => ({ x: a.x + b.x, y: a.y + b.y });
export const sub = (a      , b      )       => ({ x: a.x - b.x, y: a.y - b.y });
export const scale = (value      , factor        )       => ({
  x: value.x * factor,
  y: value.y * factor,
});
export const length = (value      )         => Math.hypot(value.x, value.y);
export const normalize = (value      )       => {
  const magnitude = length(value);
  return magnitude === 0 ? { x: 0, y: 0 } : scale(value, 1 / magnitude);
};
export const distanceSquared = (a      , b      )         => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
};
export const clampToArena = (position      , radius        )       => ({
  x: Math.min(ARENA.width - radius, Math.max(radius, position.x)),
  y: Math.min(ARENA.height - radius, Math.max(radius, position.y)),
});
export const circleOverlapsCircle = (
  a      ,
  aRadius        ,
  b      ,
  bRadius        ,
)          => distanceSquared(a, b) <= (aRadius + bRadius) ** 2;
export const distancePointToSegment = (
  point      ,
  start      ,
  end      ,
)         => {
  const segment = sub(end, start);
  const segmentLengthSquared = distanceSquared(start, end);
  if (segmentLengthSquared === 0) return Math.sqrt(distanceSquared(point, start));
  const relative = sub(point, start);
  const projection = Math.min(
    1,
    Math.max(0, (relative.x * segment.x + relative.y * segment.y) / segmentLengthSquared),
  );
  const closest = add(start, scale(segment, projection));
  return Math.sqrt(distanceSquared(point, closest));
};
