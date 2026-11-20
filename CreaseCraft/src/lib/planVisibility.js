// Which parts of a club training plan a member should see in their own
// Training Planner.
//
// A plan's first time slot holds net lanes (players named as batters/bowlers)
// and activity zones (each optionally assigned to squads).
//   * A zone assigned to squads is "mine" if I am in one of those squads.
//   * A lane that names players is "mine" if I am named in it.
//   * Zones and lanes with nobody assigned are shared with everyone who sees
//     the session.
//   * A plan with no assignments at all is an open club session.
//   * Otherwise I see the plan only if at least one zone or lane is mine,
//     and then only my zones/lanes plus the shared ones.

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
  const laneAssigned = (l) => laneNames(l).length > 0;
  const laneIsMine = (l) => !!myName && laneNames(l).includes(myName);

  const hasAssignments = zones.some(zoneAssigned) || lanes.some(laneAssigned);
  const hasMine = zones.some(zoneIsMine) || lanes.some(laneIsMine);

  const myZones = zones.filter(z => !zoneAssigned(z) || zoneIsMine(z));
  const myLanes = lanes.filter(l => !laneAssigned(l) || laneIsMine(l));

  return {
    visible: !hasAssignments || hasMine,
    zones: myZones,
    lanes: myLanes,
    hiddenCount: (zones.length - myZones.length) + (lanes.length - myLanes.length),
  };
}
