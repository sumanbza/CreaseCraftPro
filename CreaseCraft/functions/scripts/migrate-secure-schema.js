#!/usr/bin/env node
/**
 * One-off migration to the data layout that firestore.rules expects.
 *
 *   memberships/{randomId}  ->  memberships/{clubId}_{userId}
 *                               + caps      (capabilities from roles)
 *                               + userName / discipline (copied from users/)
 *   clubs/{id}              ->  + createdBy (first Admin member)
 *   club_codes/{CODE}       ->  created for every club code
 *
 * Run it BEFORE deploying firestore.rules. It is safe to run more than once.
 *
 *   cd CreaseCraft/functions
 *   npm install
 *   gcloud auth application-default login       # or set GOOGLE_APPLICATION_CREDENTIALS
 *   node scripts/migrate-secure-schema.js       # dry run: prints the plan
 *   node scripts/migrate-secure-schema.js --apply
 *
 * Set GCLOUD_PROJECT to target another project (default: creasecraft-23140).
 * Keep computeCapabilities in step with src/lib/capabilities.js.
 */
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const APPLY = process.argv.includes('--apply');
const projectId = process.env.GCLOUD_PROJECT || 'creasecraft-23140';

initializeApp({ projectId });
const db = getFirestore();

const isPrivilegedRoleName = (name) => {
  const lower = String(name || '').toLowerCase();
  return lower.includes('admin') || lower.includes('coach') || lower.includes('head');
};

function computeCapabilities(roles, customRoles) {
  const roleList = (Array.isArray(roles) ? roles : [roles]).filter(Boolean);
  if (roleList.some(isPrivilegedRoleName)) return ['*'];
  const defs = Array.isArray(customRoles) ? customRoles : [];
  const caps = new Set();
  for (const roleName of roleList) {
    const def = defs.find(d => d && d.name === roleName);
    if (def && Array.isArray(def.capabilities)) def.capabilities.forEach(c => caps.add(c));
  }
  if (caps.has('*')) return ['*'];
  return [...caps].sort();
}

const asList = (v) => (Array.isArray(v) ? v : [v]).filter(Boolean);
const union = (lists) => [...new Set(lists.flat())];
const sameFields = (current, wanted) =>
  Object.keys(wanted).every(k => JSON.stringify(current[k]) === JSON.stringify(wanted[k]));

async function main() {
  console.log(`Project: ${projectId}   Mode: ${APPLY ? 'APPLY' : 'DRY RUN (pass --apply to write)'}\n`);

  const [clubsSnap, membershipsSnap, usersSnap, codesSnap] = await Promise.all([
    db.collection('clubs').get(),
    db.collection('memberships').get(),
    db.collection('users').get(),
    db.collection('club_codes').get(),
  ]);

  const clubs = new Map(clubsSnap.docs.map(d => [d.id, d.data()]));
  const users = new Map(usersSnap.docs.map(d => [d.id, d.data()]));
  const codes = new Map(codesSnap.docs.map(d => [d.id, d.data()]));
  const ops = []; // { describe, run(batch) }
  const problems = [];

  // ---- memberships: group by club + user ----------------------------------
  const groups = new Map();
  for (const d of membershipsSnap.docs) {
    const m = d.data();
    if (!m.clubId || !m.userId) {
      problems.push(`membership ${d.id} has no clubId/userId - left untouched`);
      continue;
    }
    const key = `${m.clubId}_${m.userId}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ id: d.id, ...m });
  }

  const adminByClub = new Map();
  for (const [targetId, docs] of groups) {
    const { clubId, userId } = docs[0];
    const club = clubs.get(clubId);
    if (!club) problems.push(`membership ${targetId} points at missing club ${clubId}`);

    const roles = union(docs.map(m => asList(m.roles)));
    const merged = {
      userId,
      clubId,
      roles: roles.length ? roles : ['Player'],
      squadIds: union(docs.map(m => asList(m.squadIds))),
      caps: computeCapabilities(roles, club && club.customRoles),
      userName: (users.get(userId) || {}).name || docs.find(m => m.userName)?.userName || '',
      discipline: (users.get(userId) || {}).discipline || docs.find(m => m.discipline)?.discipline || '',
      createdAt: docs.map(m => m.createdAt).filter(Boolean).sort()[0] || new Date().toISOString(),
    };
    if (merged.roles.some(r => String(r).toLowerCase().includes('admin'))) {
      if (!adminByClub.has(clubId) || merged.createdAt < adminByClub.get(clubId).createdAt) {
        adminByClub.set(clubId, merged);
      }
    }

    const stale = docs.filter(m => m.id !== targetId);
    const current = docs.find(m => m.id === targetId);
    if (current && stale.length === 0 && sameFields(current, merged)) continue; // already migrated
    ops.push({
      describe: `membership ${targetId}: roles=${merged.roles.join('/')} caps=${merged.caps.join(',') || '-'}`
        + (stale.length ? `  (replaces ${stale.map(m => m.id).join(', ')})` : ''),
      run: (batch) => {
        batch.set(db.doc(`memberships/${targetId}`), merged);
        stale.forEach(m => batch.delete(db.doc(`memberships/${m.id}`)));
      },
    });
  }

  // ---- clubs: createdBy + invite codes -------------------------------------
  for (const [clubId, club] of clubs) {
    if (!club.createdBy) {
      const founder = adminByClub.get(clubId);
      if (founder) {
        ops.push({
          describe: `club ${clubId} (${club.name}): createdBy=${founder.userId}`,
          run: (batch) => batch.update(db.doc(`clubs/${clubId}`), { createdBy: founder.userId }),
        });
      } else {
        problems.push(`club ${clubId} (${club.name}) has no Admin member; createdBy not set`);
      }
    }

    const code = String(club.code || '').trim().toUpperCase();
    if (!code) {
      problems.push(`club ${clubId} (${club.name}) has no invite code; members cannot join it`);
      continue;
    }
    if (code.includes('/')) {
      problems.push(`club ${clubId} code "${code}" contains "/" and cannot be used as a document id`);
      continue;
    }
    const existing = codes.get(code);
    if (existing && existing.clubId !== clubId) {
      problems.push(`code "${code}" is used by both ${existing.clubId} and ${clubId}; change one club's code`);
      continue;
    }
    if (!existing) {
      codes.set(code, { clubId });
      ops.push({
        describe: `club_codes/${code} -> ${clubId} (${club.name})`,
        run: (batch) => batch.set(db.doc(`club_codes/${code}`), { clubId, createdAt: new Date().toISOString() }),
      });
    }
  }

  ops.forEach(op => console.log('  ' + op.describe));
  console.log(`\n${ops.length} change(s) planned.`);
  if (problems.length) {
    console.log(`\n${problems.length} item(s) need attention:`);
    problems.forEach(p => console.log('  ! ' + p));
  }

  if (!APPLY) {
    console.log('\nDry run only. Re-run with --apply to write these changes.');
    return;
  }

  // Each op writes at most a handful of documents; 100 ops stays well under
  // the 500-write batch limit.
  for (let i = 0; i < ops.length; i += 100) {
    const batch = db.batch();
    ops.slice(i, i + 100).forEach(op => op.run(batch));
    await batch.commit();
  }
  console.log('\nMigration applied.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
