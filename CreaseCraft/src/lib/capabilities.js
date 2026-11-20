// Capability helpers shared by the UI and the security model.
//
// Firestore rules cannot look up a role definition inside a club's
// `customRoles` array, so every membership document carries a denormalised
// `caps` list computed from its roles. The UI keeps the role definitions as the
// source of truth and re-syncs `caps` whenever they drift (see App.jsx).
// Keep this logic in step with functions/scripts/migrate-secure-schema.js.

// Capabilities a member may grant themselves when joining with an invite code.
// firestore.rules only accepts a self-created membership whose caps are a
// subset of this list.
export const JOIN_CAPS = ['view_squad_schedule', 'log_own_workload'];

export const membershipId = (clubId, userId) => `${clubId}_${userId}`;

// Access comes only from the club's permissions matrix (role definitions in
// clubs/{id}.customRoles); role names carry no meaning. A role holding '*' has
// every capability.
export function computeCapabilities(roles, customRoles) {
  const roleList = (Array.isArray(roles) ? roles : [roles]).filter(Boolean);
  const defs = Array.isArray(customRoles) ? customRoles : [];
  const caps = new Set();
  for (const roleName of roleList) {
    const def = defs.find(d => d && d.name === roleName);
    if (def && Array.isArray(def.capabilities)) def.capabilities.forEach(c => caps.add(c));
  }
  if (caps.has('*')) return ['*'];
  return [...caps].sort();
}

export const hasCap = (caps, key) =>
  Array.isArray(caps) && (caps.includes('*') || caps.includes(key));

// Capabilities that open the club's management view ("Managing:" menu).
// The two player capabilities (JOIN_CAPS) only affect the Personal view.
export const PLANNER_CAPS = ['create_zone_plans', 'edit_zone_plans', 'view_full_schedule', 'view_poll_results'];
export const ROSTER_TAB_CAPS = ['manage_roster', 'manage_squads', 'configure_roles'];
export const CLUB_VIEW_CAPS = [
  ...PLANNER_CAPS, ...ROSTER_TAB_CAPS,
  'manage_club_settings', 'broadcast_announcements', 'view_squad_health_matrix',
];
export const hasAnyCap = (caps, keys) => keys.some(k => hasCap(caps, k));

export const sameCaps = (a, b) => {
  const x = [...(a || [])].sort();
  const y = [...(b || [])].sort();
  return x.length === y.length && x.every((v, i) => v === y[i]);
};
