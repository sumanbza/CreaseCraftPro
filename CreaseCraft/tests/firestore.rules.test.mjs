import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, addDoc, collection, query, where, writeBatch } from 'firebase/firestore';

// Run with `npm run test:rules` (starts the Firestore emulator around this script).
const rulesPath = new URL('../firestore.rules', import.meta.url);
const env = await initializeTestEnvironment({ projectId: 'demo-creasecraft', firestore: { rules: readFileSync(rulesPath, 'utf8') } });
const as = (u) => env.authenticatedContext(u).firestore();
const A = as('alice'), B = as('bob'), C = as('carol');
let pass = 0, fail = 0;
const t = async (name, p) => { try { await p; pass++; console.log('ok   ', name); } catch (e) { fail++; console.log('FAIL ', name, '-', e.message.split('\n')[0]); } };
const ok = (n, p) => t(n, assertSucceeds(p));
const no = (n, p) => t(n, assertFails(p));
const byClub = (db, c, id) => query(collection(db, c), where('clubId', '==', id));

await env.withSecurityRulesDisabled(async ctx => { await setDoc(doc(ctx.firestore(), 'users/alice'), { name: 'Alice', email: 'a@x' }); });

// create club as the app does
const roles = [{ name: 'Admin', capabilities: ['*'] }, { name: 'Player', capabilities: ['view_squad_schedule', 'log_own_workload'] }, { name: 'Physio', capabilities: ['view_squad_health_matrix'] }];
const club = doc(collection(A, 'clubs')); const cid = club.id;
const b1 = writeBatch(A);
b1.set(club, { name: 'Club', code: 'ABC', customRoles: roles, squads: [], createdBy: 'alice' });
b1.set(doc(A, 'club_codes/ABC'), { clubId: cid, createdAt: 'x' });
b1.set(doc(A, `memberships/${cid}_alice`), { userId: 'alice', clubId: cid, roles: ['Admin'], caps: ['*'], squadIds: [], userName: 'Alice', discipline: '', createdAt: 'x' });
await ok('founder creates club + code + admin membership in one batch', b1.commit());

const club2 = doc(collection(C, 'clubs'));
const b2 = writeBatch(C);
b2.set(club2, { name: 'Steal', code: 'ABC', createdBy: 'carol' });
b2.set(doc(C, 'club_codes/ABC'), { clubId: club2.id, createdAt: 'x' });
await no('cannot claim an existing invite code', b2.commit());
await no('cannot make yourself admin of an existing club', setDoc(doc(C, `memberships/${cid}_carol`), { userId: 'carol', clubId: cid, roles: ['Admin'], caps: ['*'], squadIds: [] }));
await no('cannot list invite codes', getDocs(collection(C, 'club_codes')));
await ok('can look up one invite code', getDoc(doc(B, 'club_codes/ABC')));

await no('join with wrong code fails', setDoc(doc(B, `memberships/${cid}_bob`), { userId: 'bob', clubId: cid, roles: ['Player'], caps: ['log_own_workload'], squadIds: [], joinCode: 'NOPE' }));
await no('join with escalated caps fails', setDoc(doc(B, `memberships/${cid}_bob`), { userId: 'bob', clubId: cid, roles: ['Player'], caps: ['*'], squadIds: [], joinCode: 'ABC' }));
await ok('join with valid code as Player', setDoc(doc(B, `memberships/${cid}_bob`), { userId: 'bob', clubId: cid, roles: ['Player'], caps: ['view_squad_schedule', 'log_own_workload'], squadIds: [], joinCode: 'ABC', userName: 'Bob', discipline: 'Spin', createdAt: 'x' }));

await ok('member reads club', getDoc(doc(B, `clubs/${cid}`)));
await ok('member reads roster', getDocs(byClub(B, 'memberships', cid)));
await ok('user reads own memberships', getDocs(query(collection(C, 'memberships'), where('userId', '==', 'carol'))));
await no('outsider reads club', getDoc(doc(C, `clubs/${cid}`)));
await no('outsider reads roster', getDocs(byClub(C, 'memberships', cid)));
await no('nobody lists all memberships', getDocs(collection(B, 'memberships')));
await no('member cannot read another user profile', getDoc(doc(B, 'users/alice')));
await ok('user reads own profile', getDoc(doc(A, 'users/alice')));
await no('nobody lists all users', getDocs(collection(A, 'users')));

await no('player cannot promote self', updateDoc(doc(B, `memberships/${cid}_bob`), { roles: ['Admin'], caps: ['*'] }));
await ok('player updates own name', updateDoc(doc(B, `memberships/${cid}_bob`), { userName: 'Bobby' }));
await no('player cannot edit squads', updateDoc(doc(B, `clubs/${cid}`), { squads: [{ id: 's', name: 'x' }] }));
await ok('admin edits squads', updateDoc(doc(A, `clubs/${cid}`), { squads: [{ id: 's', name: 'x' }] }));
await ok('admin edits roles', updateDoc(doc(A, `clubs/${cid}`), { customRoles: roles }));

// logs
await ok('player logs club session', addDoc(collection(B, 'logs'), { userId: 'bob', clubId: cid, balls: 30 }));
await ok('player logs personal session', addDoc(collection(B, 'logs'), { userId: 'bob', clubId: 'club-personal', balls: 10 }));
await no('cannot log for someone else', addDoc(collection(B, 'logs'), { userId: 'alice', clubId: cid, balls: 1 }));
await no('outsider cannot log into club', addDoc(collection(C, 'logs'), { userId: 'carol', clubId: cid, balls: 1 }));
await ok('player reads own logs', getDocs(query(collection(B, 'logs'), where('userId', '==', 'bob'))));
await no('player cannot read club logs', getDocs(byClub(B, 'logs', cid)));
const clubLogs = await getDocs(byClub(A, 'logs', cid));
await t('admin reads club logs (only the club one)', Promise.resolve().then(() => { if (clubLogs.size !== 1) throw new Error('size ' + clubLogs.size); }));
await no('admin cannot read a player\'s personal logs', getDocs(query(collection(A, 'logs'), where('userId', '==', 'bob'))));
await no('nobody lists all logs', getDocs(collection(A, 'logs')));

// roster manager re-syncs caps (Physio role)
await ok('admin assigns role + caps', updateDoc(doc(A, `memberships/${cid}_bob`), { roles: ['Physio'], caps: ['view_squad_health_matrix'] }));
await ok('physio now reads club logs', getDocs(byClub(B, 'logs', cid)));

// plans, announcements, polls
const plan = await addDoc(collection(A, 'zone_plans'), { clubId: cid, title: 'Nets' });
await ok('member reads club plans', getDocs(byClub(B, 'zone_plans', cid)));
await no('outsider reads club plans', getDocs(byClub(C, 'zone_plans', cid)));
await no('physio cannot create plan', addDoc(collection(B, 'zone_plans'), { clubId: cid, title: 'x' }));
await no('physio cannot delete plan', deleteDoc(doc(B, 'zone_plans/' + plan.id)));
await no('physio cannot edit plan', updateDoc(doc(B, 'zone_plans/' + plan.id), { title: 'hack' }));
await ok('admin edits plan', updateDoc(plan, { title: 'Nets 2' }));
await ok('admin posts announcement', addDoc(collection(A, 'announcements'), { clubId: cid, title: 'hi' }));
await ok('member reads announcements', getDocs(byClub(B, 'announcements', cid)));
await no('physio cannot announce', addDoc(collection(B, 'announcements'), { clubId: cid, title: 'x' }));
const pr = await addDoc(collection(B, 'poll_responses'), { clubId: cid, planId: plan.id, userId: 'bob', status: 'ATTENDING' }).then(r => r, e => { fail++; console.log('FAIL  member answers poll', e.message); });
if (pr) { pass++; console.log('ok    member answers poll'); }
await ok('member changes own answer', updateDoc(pr, { status: 'DECLINED' }));
await no('admin cannot change someone else\'s answer', updateDoc(doc(A, `poll_responses/${pr.id}`), { status: 'ATTENDING' }));
await no('outsider cannot answer poll', addDoc(collection(C, 'poll_responses'), { clubId: cid, planId: plan.id, userId: 'carol', status: 'ATTENDING' }));
await ok('member reads poll answers', getDocs(byClub(B, 'poll_responses', cid)));

// personal plans
const pp = await addDoc(collection(B, 'personal_plans'), { userId: 'bob', title: 'mine' });
await ok('owner reads personal plans', getDocs(query(collection(B, 'personal_plans'), where('userId', '==', 'bob'))));
await no('others cannot read personal plans', getDocs(query(collection(A, 'personal_plans'), where('userId', '==', 'bob'))));
await no('cannot hand personal plan to someone else', updateDoc(pp, { userId: 'alice' }));
await ok('owner deletes personal plan', deleteDoc(pp));

await ok('member leaves club', deleteDoc(doc(B, `memberships/${cid}_bob`)));
await no('ex-member reads club', getDoc(doc(B, `clubs/${cid}`)));

console.log(`\n${pass} passed, ${fail} failed`);
await env.cleanup();
process.exit(fail ? 1 : 0);
