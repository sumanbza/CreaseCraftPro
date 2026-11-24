// Which parts of a club training plan a member should see in their own
// Training Planner.
//
// A plan's first time slot holds net lanes (players named as batters/bowlers)
// and activity zones (each optionally assigned to squads).
//   * A zone is shown to me only if it is assigned to one of my squads.
//   * A net lane is shown to me if it is assigned to one of my squads or it
//     names me as a batter or bowler.
//   * Zones and lanes assigned to nobody are shown to nobody.
//   * I see the session only if at least one zone or lane is mine, so a plan
//     with no assignments at all appears in no member's Training Planner.
// The full plan is always available in the Club Training Planner.

// "Pat Cummins (36b)" -> "pat cummins"
export const normaliseName = (n) =>
  String(n || '').replace(/\([^)]*\)/g, '').trim().replace(/\s+/g, ' ').toLowerCase();

const namesIn = (str) =>
  (typeof str === 'string' ? str : '').split(',').map(normaliseName).filter(Boolean);

export function getMyPartOfPlan(plan, { squadIds = [], name = '' } = {}) {
  const slot = plan?.timeSlots?.[0] || {};
  const zones = Array.isArray(slot.customZones) ? slot.customZones : [];
  const lanes = Array.isArray(slot.netLanes) ? slot.netLanes : [];
  const mySquads = new Set((Array.isArray(squadIds) ? squadIds : [squadIds]).filter(Boolean));
  const myName = normaliseName(name);

  const zoneAssigned = (z) => Array.isArray(z.squadIds) && z.squadIds.length > 0;
  const zoneIsMine = (z) => zoneAssigned(z) && z.squadIds.some(id => mySquads.has(id));
  const laneNames = (l) => [...namesIn(l.batters), ...namesIn(l.bowlersText)];
  const laneIsMine = (l) =>
    (Array.isArray(l.squadIds) && l.squadIds.some(id => mySquads.has(id)))
    || (!!myName && laneNames(l).includes(myName));

  const myZones = zones.filter(zoneIsMine);
  const myLanes = lanes.filter(laneIsMine);

  return {
    visible: myZones.length > 0 || myLanes.length > 0,
    zones: myZones,
    lanes: myLanes,
    hiddenCount: (zones.length - myZones.length) + (lanes.length - myLanes.length),
  };
}
