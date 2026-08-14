import React, { useState, useMemo, useEffect } from 'react';
import { auth, db } from './config/firebase';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  deleteDoc 
} from 'firebase/firestore';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';

const DRILLS_LIBRARY = [
  { id: 'd1', title: 'Shoulder Rotator Stability Band Walks', category: 'Pre-hab', reps: '3 sets x 12 reps', checked: false, desc: 'Protects rotator cuff deceleration muscles during explosive release.' },
  { id: 'd2', title: 'Thoracic Extension & Spinal Twist', category: 'Mobility', reps: '5 mins dynamic', checked: false, desc: 'Increases thoracic spine mobility to prevent lumbar compression fractures.' },
  { id: 'd3', title: 'Bottom-Hand Soft Isolation Drives', category: 'Technical', reps: '3 sets x 15 balls', checked: false, desc: 'Teaches soft wrist impact when defending against turning spin deliveries.' }
];

const MASTER_CAPABILITIES_CATALOGUE = [
  { key: 'manage_club_settings', label: 'Manage Club Settings & Codes', category: 'Club & Roster' },
  { key: 'manage_squads', label: 'Create & Manage Sub-Squads', category: 'Club & Roster' },
  { key: 'manage_roster', label: 'Manage Member Roster & Assignments', category: 'Club & Roster' },
  { key: 'configure_roles', label: 'Configure Custom Roles & Capabilities', category: 'Club & Roster' },
  { key: 'create_zone_plans', label: 'Create & Publish Training Plans', category: 'Planner & Allocator' },
  { key: 'edit_zone_plans', label: 'Edit & Delete Training Plans', category: 'Planner & Allocator' },
  { key: 'view_full_schedule', label: 'View Full Club Training Schedule', category: 'Planner & Allocator' },
  { key: 'view_squad_schedule', label: 'View Assigned Squad Schedule & Polls', category: 'Planner & Allocator' },
  { key: 'view_poll_results', label: 'View Live Attendance Poll Results', category: 'Planner & Allocator' },
  { key: 'view_squad_health_matrix', label: 'View Squad Health & ACWR Matrix', category: 'Medical & Workload' },
  { key: 'log_own_workload', label: 'Verify & Log Personal Workload', category: 'Medical & Workload' }
];

const IconShieldAlert = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <line x1="12" y1="8" x2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const IconUsers = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const IconActivity = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
  </svg>
);

const IconCalendar = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const IconGrid = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
  </svg>
);

const IconPlus = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const IconCheckCircle = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const IconUser = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
);

export default function App() {
  const [userProfile, setUserProfile] = useState(null);
  const [authMode, setAuthMode] = useState('SIGNIN');
  const [showAuthModal, setShowAuthModal] = useState(true);
  const [showClubOnboardingModal, setShowClubOnboardingModal] = useState(false);
  const [onboardingTab, setOnboardingTab] = useState('CREATE');
  const [authError, setAuthError] = useState('');

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [discipline, setDiscipline] = useState('Fast Bowler');
  const [bowlingArm, setBowlingArm] = useState('Right-Arm Fast');

  const [newClubName, setNewClubName] = useState('');
  const [newClubCode, setNewClubCode] = useState('');
  const [joinClubCode, setJoinClubCode] = useState('');

  // New Role Creator State for Capability Matrix
  const [newRoleName, setNewRoleName] = useState('');
  const [selectedCapabilities, setSelectedCapabilities] = useState([]);

  // Application Data synchronized with Firestore Collections
  const [clubs, setClubs] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [globalLogs, setGlobalLogs] = useState([]);
  const [zonePlans, setZonePlans] = useState([]);
  const [personalPlans, setPersonalPlans] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [pollResponses, setPollResponses] = useState([]);
  const [drills, setDrills] = useState(DRILLS_LIBRARY);
  const [loading, setLoading] = useState(true);

  // Active Context
  const [activeClubId, setActiveClubId] = useState('club-personal');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [notification, setNotification] = useState(null);
  const [showWorkspaceDropdown, setShowWorkspaceDropdown] = useState(false);
  const [playerScheduleViewMode, setPlayerScheduleViewMode] = useState('spotlight');

  // Verification & Form Modals
  const [completionTarget, setCompletionTarget] = useState(null);
  const [actualBalls, setActualBalls] = useState(36);
  const [actualRPE, setActualRPE] = useState(7);
  const [actualSoreness, setActualSoreness] = useState(2);

  const [showCreatePlanModal, setShowCreatePlanModal] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState(null);
  const [newPlanTitle, setNewPlanTitle] = useState('');
  const [newPlanDate, setNewPlanDate] = useState('2026-08-04');
  const [newPlanTime, setNewPlanTime] = useState('6:00 PM - 7:30 PM');
  const [newPollEnabled, setNewPollEnabled] = useState(true);

  // Personal Form
  const [personalPlanBalls, setPersonalPlanBalls] = useState(36);
  const [personalPlanRPE, setPersonalPlanRPE] = useState(7);
  const [personalPlanNotes, setPersonalPlanNotes] = useState('Focus on delivery rhythm');
  const [personalActivities, setPersonalActivities] = useState(['', '', '', '', '']);

  // Zone Allocator Form State
  const [newNetLanes, setNewNetLanes] = useState([
    { id: 'lane-1', name: 'Lane 1: High Pace Match Sim', batters: '', bowlersText: '' },
    { id: 'lane-2', name: 'Lane 2: Technical Spin & Flight', batters: '', bowlersText: '' }
  ]);
  const [newCustomZones, setNewCustomZones] = useState([
    { id: 'zone-2', title: 'Zone 2: Center Wicket Scenario', activityText: 'T20 Death Overs Match Sim', squadIds: [] },
    { id: 'zone-3', title: 'Zone 3: Fielding & Boundary Relay', activityText: 'High-Ball & Boundary Relay Catching', squadIds: [] }
  ]);

  const todayFormatted = useMemo(() => new Date().toISOString().split('T')[0], []);
  const nextWeekFormatted = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  }, []);

  const triggerNotify = (msg, type = 'info') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  };

  useEffect(() => {
    if (!auth) return;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userSnap = await getDoc(userDocRef);
          if (userSnap.exists()) {
            setUserProfile({ uid: firebaseUser.uid, ...userSnap.data() });
          } else {
            const profileData = {
              uid: firebaseUser.uid,
              name: firebaseUser.displayName || (firebaseUser.email ? firebaseUser.email.split('@')[0] : 'Athlete'),
              email: firebaseUser.email,
              discipline: discipline || 'Fast Bowler',
              bowlingArm: bowlingArm || 'Right-Arm Fast'
            };
            await setDoc(userDocRef, profileData);
            setUserProfile(profileData);
          }
        } catch (err) {
          console.error("Error fetching user profile:", err);
          setUserProfile({
            uid: firebaseUser.uid,
            name: firebaseUser.email ? firebaseUser.email.split('@')[0] : 'Athlete',
            email: firebaseUser.email,
            discipline: discipline,
            bowlingArm: bowlingArm
          });
        }
      } else {
        setUserProfile(null);
      }
    });

    return () => unsubscribe();
  }, [auth]);

  const currentHuman = useMemo(() => {
    if (userProfile) return userProfile;
    if (auth?.currentUser) {
      return {
        uid: auth.currentUser.uid,
        name: auth.currentUser.displayName || auth.currentUser.email?.split('@')[0] || 'Athlete',
        email: auth.currentUser.email,
        discipline: discipline || 'Fast Bowler',
        bowlingArm: bowlingArm || 'Right-Arm Fast'
      };
    }
    return { uid: 'guest-user', name: 'Guest Athlete', email: 'guest@creasecraft.pro', discipline: 'Fast Bowler', bowlingArm: 'Right-Arm Fast' };
  }, [userProfile, discipline, bowlingArm]);

  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }

    const unSubClubs = onSnapshot(collection(db, 'clubs'), (snapshot) => {
      setClubs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, err => console.error("Clubs listener error:", err));

    const unSubMemberships = onSnapshot(collection(db, 'memberships'), (snapshot) => {
      setMemberships(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, err => console.error("Memberships listener error:", err));

    const unSubLogs = onSnapshot(collection(db, 'logs'), (snapshot) => {
      setGlobalLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, err => console.error("Logs listener error:", err));

    const unSubZonePlans = onSnapshot(collection(db, 'zone_plans'), (snapshot) => {
      setZonePlans(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, err => console.error("Zone plans listener error:", err));

    const unSubPersonalPlans = onSnapshot(collection(db, 'personal_plans'), (snapshot) => {
      setPersonalPlans(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, err => console.error("Personal plans listener error:", err));

    const unSubPollResponses = onSnapshot(collection(db, 'poll_responses'), (snapshot) => {
      setPollResponses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, err => console.error("Poll responses listener error:", err));

    const unSubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      setAllUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, err => {
      console.error("Users listener error:", err);
      setLoading(false);
    });

    return () => {
      unSubClubs();
      unSubMemberships();
      unSubLogs();
      unSubZonePlans();
      unSubPersonalPlans();
      unSubPollResponses();
      unSubUsers();
    };
  }, [userProfile]);

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');

    try {
      if (authMode === 'SIGNUP') {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        const profileData = {
          uid: user.uid,
          name: fullName.trim() || email.split('@')[0],
          email: email.trim(),
          discipline: discipline,
          bowlingArm: bowlingArm,
          createdAt: new Date().toISOString()
        };

        await setDoc(doc(db, 'users', user.uid), profileData);
        setUserProfile(profileData);
        triggerNotify('Account registered in Firebase Auth & Firestore!', 'success');
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        triggerNotify('Signed in successfully!', 'success');
      }
      setShowAuthModal(false);
    } catch (err) {
      console.error("Firebase auth error:", err);
      let msg = err.message || 'Authentication failed.';
      if (err.code === 'auth/email-already-in-use') msg = 'Email address is already registered.';
      if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        msg = 'Invalid email or password.';
      }
      if (err.code === 'auth/weak-password') msg = 'Password should be at least 6 characters.';
      setAuthError(msg);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch(err) {
      console.error(err);
    }
    setUserProfile(null);
    setActiveClubId('club-personal');
    setAuthMode('SIGNIN');
    setShowAuthModal(true);
    triggerNotify('Signed out of CreaseCraft.', 'info');
  };

  const isPersonalWorkspace = activeClubId === 'club-personal';
  
  const currentClub = useMemo(() => {
    if (isPersonalWorkspace) {
      return { id: 'club-personal', name: 'Personal / Independent Workspace', code: 'IND', squads: [], customRoles: [] };
    }
    const found = clubs.find(c => c.id === activeClubId);
    if (found) {
      return {
        ...found,
        customRoles: Array.isArray(found.customRoles) ? found.customRoles : [],
        squads: Array.isArray(found.squads) ? found.squads : []
      };
    }
    return clubs[0] || { id: activeClubId, name: 'Cloud Workspace', code: 'CC', squads: [], customRoles: [] };
  }, [clubs, activeClubId, isPersonalWorkspace]);

  const currentUserMembership = useMemo(() => {
    if (isPersonalWorkspace) return null;
    const activeUid = currentHuman.uid || auth.currentUser?.uid;
    return memberships.find(m => m.clubId === activeClubId && (m.userId === activeUid || m.userId === userProfile?.uid));
  }, [memberships, activeClubId, currentHuman, userProfile, isPersonalWorkspace]);

  const can = useMemo(() => {
    return (capabilityKey) => {
      if (isPersonalWorkspace) {
        return ['log_own_workload', 'view_squad_schedule'].includes(capabilityKey);
      }
      if (!currentUserMembership) return false;

      const memberRoles = Array.isArray(currentUserMembership.roles) ? currentUserMembership.roles : ['Player'];
      const clubRolesDefinition = Array.isArray(currentClub.customRoles) ? currentClub.customRoles : [];

      for (const rName of memberRoles) {
        if (rName === 'Admin' || rName === 'Club Admin') return true;
        const foundRoleDef = clubRolesDefinition.find(def => def && def.name === rName);
        if (foundRoleDef && Array.isArray(foundRoleDef.capabilities)) {
          if (foundRoleDef.capabilities.includes('*') || foundRoleDef.capabilities.includes(capabilityKey)) {
            return true;
          }
        }
      }
      return false;
    };
  }, [isPersonalWorkspace, currentUserMembership, currentClub]);

  const userMemberships = useMemo(() => {
    const activeUid = currentHuman.uid || auth.currentUser?.uid;
    return memberships.filter(m => 
      m.userId === activeUid || 
      m.userId === userProfile?.uid || 
      (auth.currentUser && m.userId === auth.currentUser.uid)
    );
  }, [memberships, currentHuman, userProfile]);

  const currentUserAssignedSquadIds = useMemo(() => {
    if (!currentUserMembership) return [];
    const sIds = currentUserMembership.squadIds;
    return Array.isArray(sIds) ? sIds : [sIds].filter(Boolean);
  }, [currentUserMembership]);

  const userPersonalPlans = useMemo(() => {
    const activeUid = currentHuman.uid || auth.currentUser?.uid;
    return personalPlans.filter(p => 
      p.userId === activeUid || 
      p.userId === userProfile?.uid || 
      (auth.currentUser && p.userId === auth.currentUser.uid) ||
      !p.userId
    );
  }, [personalPlans, currentHuman, userProfile]);

  const resolveMemberFullName = (userId) => {
    const foundUser = allUsers.find(u => u.uid === userId || u.id === userId);
    if (foundUser && foundUser.name) return foundUser.name;
    if (userId === currentHuman.uid) return currentHuman.name;
    const fallback = userId.replace('user-', '').split('@')[0];
    return fallback.charAt(0).toUpperCase() + fallback.slice(1);
  };

  const clubRosterList = useMemo(() => {
    const activeMembers = memberships.filter(m => m.clubId === activeClubId);
    
    const roster = activeMembers.map(m => {
      const foundUser = allUsers.find(u => u.uid === m.userId || u.id === m.userId);
      const rolesArray = Array.isArray(m.roles) ? m.roles : [m.roles || 'Player'];
      const squadsArray = Array.isArray(m.squadIds) ? m.squadIds : [m.squadIds || ''];
      const fullName = resolveMemberFullName(m.userId);

      return {
        id: foundUser?.uid || foundUser?.id || m.userId,
        name: fullName,
        roles: rolesArray,
        squadIds: squadsArray,
        roleString: rolesArray.join(', ')
      };
    });

    if (!roster.some(r => r.id === currentHuman.uid) && userMemberships.some(m => m.clubId === activeClubId)) {
      roster.push({ id: currentHuman.uid, name: currentHuman.name, roles: ['Player'], squadIds: [], roleString: 'Player' });
    }

    return roster;
  }, [memberships, allUsers, activeClubId, currentHuman, userMemberships]);

  const handleCreateClub = async (e) => {
    e.preventDefault();
    if (!newClubName.trim() || !newClubCode.trim()) return;
    
    const codeUpper = newClubCode.trim().toUpperCase();
    const activeUid = currentHuman.uid || auth.currentUser?.uid;

    try {
      const defaultSquadId = 'squad-1-' + Date.now();
      const defaultRoles = [
        { name: 'Admin', capabilities: ['*'] },
        { name: 'Player', capabilities: ['view_squad_schedule', 'log_own_workload'] },
        { name: 'Head Coach', capabilities: ['manage_squads', 'manage_roster', 'create_zone_plans', 'edit_zone_plans', 'view_full_schedule', 'view_squad_health_matrix', 'view_poll_results'] }
      ];

      const clubDoc = await addDoc(collection(db, 'clubs'), {
        name: newClubName.trim(),
        code: codeUpper,
        customRoles: defaultRoles,
        squads: [
          { id: defaultSquadId, name: '1st XI Senior' },
          { id: 'squad-2-' + Date.now(), name: '2nd XI Reserves' }
        ],
        createdAt: new Date().toISOString()
      });

      await addDoc(collection(db, 'memberships'), {
        userId: activeUid,
        clubId: clubDoc.id,
        roles: ['Admin'],
        squadIds: [defaultSquadId],
        createdAt: new Date().toISOString()
      });

      setActiveClubId(clubDoc.id);
      setActiveTab('matrix');
      setShowClubOnboardingModal(false);
      setNewClubName('');
      setNewClubCode('');
      triggerNotify('Club created successfully! Assigned default role: Admin.', 'success');
    } catch (err) {
      console.error("Error creating club:", err);
    }
  };

  const handleJoinClub = async (e) => {
    e.preventDefault();
    if (!joinClubCode.trim()) return;
    
    const targetCode = joinClubCode.trim().toUpperCase();
    const foundClub = clubs.find(c => c.code.toUpperCase() === targetCode);
    const activeUid = currentHuman.uid || auth.currentUser?.uid;
    
    if (!foundClub) {
      triggerNotify('No club found with code "' + targetCode + '". Check code and try again.', 'info');
      return;
    }

    const existing = memberships.find(m => (m.userId === activeUid || m.userId === currentHuman.uid) && m.clubId === foundClub.id);
    if (existing) {
      setActiveClubId(foundClub.id);
      setShowClubOnboardingModal(false);
      triggerNotify('Switched to workspace: ' + foundClub.name, 'info');
      return;
    }

    try {
      await addDoc(collection(db, 'memberships'), {
        userId: activeUid,
        clubId: foundClub.id,
        roles: ['Player'],
        squadIds: [],
        createdAt: new Date().toISOString()
      });

      setActiveClubId(foundClub.id);
      setActiveTab('dashboard');
      setShowClubOnboardingModal(false);
      setJoinClubCode('');
      triggerNotify('Successfully joined ' + foundClub.name + ' as Player!', 'success');
    } catch (err) {
      console.error("Error joining club:", err);
    }
  };

  const handleOpenCreateZonePlanModal = (planToEdit = null) => {
    if (planToEdit) {
      setEditingPlanId(planToEdit.id);
      setNewPlanTitle(planToEdit.title || '');
      setNewPlanDate(planToEdit.date || todayFormatted);
      setNewPlanTime(planToEdit.timeSlots?.[0]?.time || '6:00 PM - 7:30 PM');
      setNewPollEnabled(planToEdit.pollEnabled !== false);
      setNewNetLanes(
        planToEdit.timeSlots?.[0]?.netLanes && planToEdit.timeSlots[0].netLanes.length > 0
          ? planToEdit.timeSlots[0].netLanes.map(l => ({
              id: l.id || 'lane-' + Date.now() + '-' + Math.random(),
              name: l.name || 'Lane 1: High Pace',
              batters: typeof l.batters === 'string' ? l.batters : (Array.isArray(l.batters) ? l.batters.join(', ') : ''),
              bowlersText: typeof l.bowlersText === 'string' ? l.bowlersText : (Array.isArray(l.bowlers) ? l.bowlers.map(b => typeof b === 'object' ? `${b.userId || 'Bowler'} (${b.balls || 36}b)` : b).join(', ') : '')
            }))
          : [
              { id: 'lane-1', name: 'Lane 1: High Pace Match Sim', batters: '', bowlersText: '' }
            ]
      );
      if (planToEdit.timeSlots?.[0]?.customZones && planToEdit.timeSlots[0].customZones.length > 0) {
        setNewCustomZones(planToEdit.timeSlots[0].customZones);
      } else {
        setNewCustomZones([
          { id: 'zone-2', title: 'Zone 2: Center Wicket Scenario', activityText: planToEdit.timeSlots?.[0]?.centerWicket?.title || 'T20 Death Overs Match Sim', squadIds: [] },
          { id: 'zone-3', title: 'Zone 3: Fielding & Boundary Relay', activityText: planToEdit.timeSlots?.[0]?.fieldingStation?.title || 'High-Ball & Boundary Relay Catching', squadIds: [] }
        ]);
      }
    } else {
      setEditingPlanId(null);
      setNewPlanTitle('Tuesday Night Main Squad Microcycle');
      setNewPlanDate(todayFormatted);
      setNewPlanTime('6:00 PM - 7:30 PM');
      setNewPollEnabled(true);
      setNewNetLanes([
        { id: 'lane-1', name: 'Lane 1: High Pace Match Sim', batters: '', bowlersText: '' },
        { id: 'lane-2', name: 'Lane 2: Spin & Flight Control', batters: '', bowlersText: '' }
      ]);
      setNewCustomZones([
        { id: 'zone-2', title: 'Zone 2: Center Wicket Scenario', activityText: 'T20 Death Overs Match Sim', squadIds: [] },
        { id: 'zone-3', title: 'Zone 3: Fielding & Boundary Relay', activityText: 'High-Ball & Boundary Relay Catching', squadIds: [] }
      ]);
    }
    setShowCreatePlanModal(true);
  };

  const handleOpenPersonalPlanModal = (planToEdit = null) => {
    if (planToEdit) {
      setEditingPlanId(planToEdit.id);
      setNewPlanTitle(planToEdit.title || '');
      setNewPlanDate(planToEdit.date || todayFormatted);
      setNewPlanTime(planToEdit.time || '4:00 PM - 5:30 PM');
      setPersonalPlanBalls(planToEdit.balls || 36);
      setPersonalPlanRPE(planToEdit.rpe || 7);
      setPersonalPlanNotes(planToEdit.notes || '');
      setPersonalActivities(
        planToEdit.activities && planToEdit.activities.length === 5 
          ? planToEdit.activities 
          : [...(planToEdit.activities || []), '', '', '', '', ''].slice(0, 5)
      );
    } else {
      setEditingPlanId(null);
      setNewPlanTitle('Private Throwdowns & Run-up Rhythm');
      setNewPlanDate(todayFormatted);
      setNewPlanTime('4:00 PM - 5:30 PM');
      setPersonalPlanBalls(36);
      setPersonalPlanRPE(7);
      setPersonalPlanNotes('Solo run-up rhythm and target yorker execution');
      setPersonalActivities([
        'Shoulder & Lower Back Dynamic Warmup',
        'Solo Run-Up Rhythm Drills (6 reps)',
        'Target Yorker Spot Bowling (18 deliveries)',
        'Good Length Outswing Execution (18 deliveries)',
        'Cool-down & Rotator Cuff Mobility Band Exercises'
      ]);
    }
    setShowCreatePlanModal(true);
  };

  const handleSaveZonePlan = async (e) => {
    e.preventDefault();
    const updatedTimeSlots = [
      {
        id: 'slot-1',
        time: newPlanTime || '6:00 PM - 7:30 PM',
        netLanes: newNetLanes,
        customZones: newCustomZones,
        centerWicket: { title: newCustomZones[0]?.activityText || 'Match Scenario', participants: 'Assigned Squads' },
        fieldingStation: { title: newCustomZones[1]?.activityText || 'Fielding Drills', participants: 'Assigned Squads' }
      }
    ];

    try {
      if (editingPlanId) {
        const planRef = doc(db, 'zone_plans', editingPlanId);
        await updateDoc(planRef, {
          title: newPlanTitle || 'Training Night Microcycle',
          date: newPlanDate,
          pollEnabled: newPollEnabled,
          timeSlots: updatedTimeSlots
        });
        triggerNotify('Updated multi-zone training plan & poll in Firestore! ✓', 'success');
      } else {
        await addDoc(collection(db, 'zone_plans'), {
          clubId: activeClubId,
          title: newPlanTitle || 'Training Night Microcycle',
          date: newPlanDate,
          pollEnabled: newPollEnabled,
          timeSlots: updatedTimeSlots,
          createdAt: new Date().toISOString()
        });
        triggerNotify('Published multi-zone plan with attendance poll! ✓', 'success');
      }
    } catch (err) {
      console.error("Error saving zone plan:", err);
    }
    setShowCreatePlanModal(false);
    setEditingPlanId(null);
  };

  const handleSavePersonalPlan = async (e) => {
    e.preventDefault();
    const activeUid = currentHuman.uid || auth.currentUser?.uid;

    try {
      if (editingPlanId) {
        const planRef = doc(db, 'personal_plans', editingPlanId);
        await updateDoc(planRef, {
          title: newPlanTitle || 'Private Session',
          date: newPlanDate,
          time: newPlanTime,
          balls: Number(personalPlanBalls) || 36,
          rpe: Number(personalPlanRPE) || 7,
          notes: personalPlanNotes,
          activities: personalActivities,
        });
        triggerNotify('Updated personal session plan in Firestore! ✓', 'success');
      } else {
        await addDoc(collection(db, 'personal_plans'), {
          userId: activeUid,
          title: newPlanTitle || 'Private Session',
          date: newPlanDate,
          time: newPlanTime,
          balls: Number(personalPlanBalls) || 36,
          rpe: Number(personalPlanRPE) || 7,
          notes: personalPlanNotes,
          activities: personalActivities,
          scope: 'PERSONAL',
          createdAt: new Date().toISOString()
        });
        triggerNotify('Scheduled personal session in Firestore! ✓', 'success');
      }
    } catch (err) {
      console.error("Error saving personal plan:", err);
    }
    setShowCreatePlanModal(false);
    setEditingPlanId(null);
  };

  const computeUserACWR = (userId) => {
    const today = new Date().toISOString();
    const userLogs = globalLogs.filter(l => l.userId === userId || l.userId === currentHuman.uid || (auth.currentUser && l.userId === auth.currentUser.uid));
    
    const processed = userLogs.map(s => {
      const sDate = new Date(s.date);
      const diffDays = Math.max(0, Math.ceil((new Date(today) - sDate) / (1000 * 60 * 60 * 24)));
      return { ...s, diffDays, workloadUnits: (s.balls || 0) * (s.rpe || 1) };
    });

    const acuteLogs = processed.filter(s => s.diffDays < 7);
    const acuteWorkload = acuteLogs.reduce((sum, s) => sum + s.workloadUnits, 0);
    const acuteBalls = acuteLogs.reduce((sum, s) => sum + s.balls, 0);

    const chronicLogs = processed.filter(s => s.diffDays < 28);
    const chronicSum = chronicLogs.reduce((sum, s) => sum + s.workloadUnits, 0);

    const isSpin = currentHuman.discipline.toLowerCase().includes('spin');
    const defaultChronicFloor = isSpin ? 300 : 180;
    const chronicWorkload = chronicLogs.length > 0 ? Math.max(defaultChronicFloor, chronicSum / 4) : defaultChronicFloor;

    const ratio = parseFloat((acuteWorkload / chronicWorkload).toFixed(2));
    const latestSoreness = userLogs.length > 0 ? [...userLogs].sort((a,b) => new Date(b.date) - new Date(a.date))[0].soreness : 0;
    const spikeLimit = isSpin ? 2.2 : 1.5;

    let status = 'Safe';
    let color = 'text-emerald-400';
    let bg = 'bg-emerald-500/10';
    let border = 'border-emerald-500/30';

    if (ratio < 0.8) {
      status = 'Underprepared';
      color = 'text-amber-400';
      bg = 'bg-amber-500/10';
      border = 'border-amber-500/30';
    } else if (ratio > spikeLimit) {
      status = 'CRITICAL SPIKE';
      color = 'text-rose-500';
      bg = 'bg-rose-500/10';
      border = 'border-rose-500/30';
    }

    return { acuteWorkload, chronicWorkload, ratio, acuteBalls, latestSoreness, status, color, bg, border, isSpin, spikeLimit };
  };

  if (!userProfile) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 font-sans antialiased">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-lime-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 mx-auto text-white">
              <IconActivity />
            </div>
            <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-white via-slate-100 to-emerald-400 bg-clip-text text-transparent">
              CREASECRAFT PRO
            </h1>
            <p className="text-xs text-slate-400">Enterprise Cricket Workload & Squad Management</p>
          </div>

          {authError && (
            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-3 rounded-xl text-xs text-center font-bold">
              ⚠️ {authError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800 text-xs font-bold">
            <button
              type="button"
              onClick={() => { setAuthMode('SIGNIN'); setAuthError(''); }}
              className={`py-2 rounded-lg transition-all ${authMode === 'SIGNIN' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}
            >
              🔑 Sign In
            </button>
            <button
              type="button"
              onClick={() => { setAuthMode('SIGNUP'); setAuthError(''); }}
              className={`py-2 rounded-lg transition-all ${authMode === 'SIGNUP' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}
            >
              📝 Register
            </button>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-4">

            {authMode === 'SIGNUP' && (
              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Mitchell Starc"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            )}

            <div>
              <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. m.starc@cricket.au"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            {authMode === 'SIGNUP' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Discipline</label>
                  <select
                    value={discipline}
                    onChange={(e) => setDiscipline(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Fast Bowler">Fast Bowler</option>
                    <option value="Spin Bowler">Spin Bowler</option>
                    <option value="Batter">Batter</option>
                    <option value="Coach">Coach</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Bowling Arm</label>
                  <select
                    value={bowlingArm}
                    onChange={(e) => setBowlingArm(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Right-Arm Fast">Right-Arm Fast</option>
                    <option value="Left-Arm Fast">Left-Arm Fast</option>
                    <option value="Right-Arm Spin">Right-Arm Spin</option>
                    <option value="Left-Arm Spin">Left-Arm Spin</option>
                  </select>
                </div>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs py-3.5 rounded-xl transition-all shadow mt-2"
            >
              {authMode === 'SIGNIN' ? 'Sign In & Launch Workspace ✓' : 'Create Firebase Account ✓'}
            </button>
          </form>

          <div className="text-center pt-2 border-t border-slate-800">
            <button
              onClick={() => {
                setUserProfile({
                  uid: 'demo-starc',
                  name: 'Mitchell Starc (Demo)',
                  email: 'm.starc@cricket.au',
                  discipline: 'Fast Bowler',
                  bowlingArm: 'Left-Arm Fast'
                });
                triggerNotify('Loaded Demo Profile!', 'info');
              }}
              className="text-xs text-slate-400 hover:text-emerald-400 font-bold transition-all"
            >
              🚀 Quick Offline Demo Mode
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased overflow-x-hidden">
      
      {/* TOP NAVIGATION BAR */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col sm:flex-row justify-between items-center gap-3">
          
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-lime-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <IconActivity />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-emerald-400 bg-clip-text text-transparent">
                CREASECRAFT PRO
              </span>
              <p className="text-[10px] text-slate-400">Enterprise Club & Personal Athlete Suite</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                onClick={() => setShowWorkspaceDropdown(!showWorkspaceDropdown)}
                className="bg-slate-950 border border-slate-800 hover:border-slate-700 px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-2.5 transition-all shadow"
              >
                <div className="text-left">
                  <span className="text-[9px] text-slate-400 block uppercase font-bold tracking-wider">Workspace</span>
                  <span className="font-extrabold text-emerald-400">{currentClub.name}</span>
                </div>
                <span className="text-slate-500 text-[10px]">▼</span>
              </button>

              {showWorkspaceDropdown && (
                <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-750 rounded-2xl shadow-2xl p-3 z-50 text-xs space-y-2">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 pt-1 border-b border-slate-800 pb-1">
                    Select Active Workspace
                  </div>

                  {/* FIXED PERSONAL WORKSPACE BUTTON */}
                  <button
                    onClick={() => {
                      setActiveClubId('club-personal');
                      setActiveTab('dashboard');
                      setShowWorkspaceDropdown(false);
                      triggerNotify('Switched to Personal Workspace', 'info');
                    }}
                    className={`w-full text-left p-2.5 rounded-xl border text-xs transition-all flex items-center justify-between ${
                      isPersonalWorkspace ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400 font-bold' : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span>👤</span>
                      <div>
                        <span className="block font-bold">Personal / Independent Workspace</span>
                        <span className="text-[10px] text-slate-400 font-normal">Private throwdowns & self-training</span>
                      </div>
                    </div>
                    {isPersonalWorkspace && <span className="text-xs">✓</span>}
                  </button>

                  <div className="pt-2 border-t border-slate-800">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1 mb-1.5 flex justify-between items-center">
                      <span>My Clubs</span>
                      <span className="bg-slate-800 text-slate-300 text-[9px] px-1.5 py-0.5 rounded-full font-extrabold">{userMemberships.length}</span>
                    </div>
                    
                    {userMemberships.length === 0 ? (
                      <div className="text-[11px] text-slate-500 italic p-2 bg-slate-950 rounded-xl border border-slate-800 text-center">
                        You haven't created or joined any clubs yet.
                      </div>
                    ) : (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {userMemberships.map(m => {
                          const club = clubs.find(c => c.id === m.clubId);
                          if (!club) return null;
                          const isActive = activeClubId === club.id;
                          const primaryRole = m.roles?.[0] || 'Member';

                          return (
                            <button
                              key={m.id}
                              onClick={() => {
                                setActiveClubId(club.id);
                                setActiveTab('dashboard');
                                setShowWorkspaceDropdown(false);
                                triggerNotify(`Switched to club: ${club.name}`, 'info');
                              }}
                              className={`w-full text-left p-2.5 rounded-xl border text-xs transition-all flex items-center justify-between ${
                                isActive ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400 font-bold' : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                              }`}
                            >
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-extrabold text-white">{club.name}</span>
                                  <span className="text-[9px] bg-slate-800 text-slate-300 px-1.5 py-0.2 rounded uppercase font-mono font-bold">{club.code}</span>
                                </div>
                                <span className="text-[10px] text-slate-400 block mt-0.5">Role: <strong className="text-slate-200">{primaryRole}</strong></span>
                              </div>
                              {isActive && <span className="text-xs">✓</span>}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-800">
                    <button
                      onClick={() => {
                        setShowWorkspaceDropdown(false);
                        setShowClubOnboardingModal(true);
                      }}
                      className="w-full bg-slate-950 hover:bg-slate-800 text-emerald-400 border border-slate-800 font-bold p-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all text-xs"
                    >
                      <IconPlus /> Create or Join Another Club
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1 rounded-xl text-xs">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <div className="text-left">
                <span className="font-bold text-slate-100 block text-[11px]">{currentHuman.name}</span>
                <span className="text-[9px] text-slate-400">{currentHuman.discipline}</span>
              </div>
              <button
                onClick={handleSignOut}
                className="ml-2 text-[10px] text-slate-400 hover:text-rose-400 font-bold bg-slate-950 px-2 py-0.5 rounded border border-slate-800"
              >
                Sign Out
              </button>
            </div>
          </div>

        </div>
      </header>

      {notification && (
        <div className="fixed bottom-6 right-6 z-50">
          <div className="p-4 rounded-xl shadow-2xl border flex items-center gap-3 bg-slate-900 border-emerald-500/40 text-slate-100">
            <IconCheckCircle />
            <span className="text-xs font-semibold">{notification.msg}</span>
          </div>
        </div>
      )}

      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        <div className="flex border-b border-slate-800 mb-6 overflow-x-auto">
          {can('view_squad_health_matrix') && (
            <button
              onClick={() => setActiveTab('matrix')}
              className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-xs transition-all ${
                activeTab === 'matrix' ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5' : 'border-transparent text-slate-400'
              }`}
            >
              <IconActivity /> Squad Health Matrix
            </button>
          )}

          {can('create_zone_plans') && (
            <button
              onClick={() => setActiveTab('allocator')}
              className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-xs transition-all ${
                activeTab === 'allocator' ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5' : 'border-transparent text-slate-400'
              }`}
            >
              <IconGrid /> Multi-Zone Net Allocator
            </button>
          )}

          {can('manage_roster') && (
            <button
              onClick={() => setActiveTab('roster')}
              className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-xs transition-all ${
                activeTab === 'roster' ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5' : 'border-transparent text-slate-400'
              }`}
            >
              <IconUsers /> Club Roster & Capability Matrix
            </button>
          )}

          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-xs transition-all ${
              activeTab === 'dashboard' ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5' : 'border-transparent text-slate-400'
            }`}
          >
            <IconActivity /> Personal ACWR Analytics
          </button>

          <button
            onClick={() => setActiveTab('personal-planner')}
            className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-xs transition-all ${
              activeTab === 'personal-planner' ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5' : 'border-transparent text-slate-400'
            }`}
          >
            <IconUser /> Personal Training Planner
          </button>

          {!isPersonalWorkspace && (can('view_squad_schedule') || can('view_full_schedule')) && (
            <button
              onClick={() => setActiveTab('calendar')}
              className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-xs transition-all ${
                activeTab === 'calendar' ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5' : 'border-transparent text-slate-400'
              }`}
            >
              <IconCalendar /> Assigned Club Sessions
            </button>
          )}
        </div>

        {/* TAB 1: PERSONAL ACWR ANALYTICS */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-extrabold text-white">{currentHuman.name}</h2>
                  <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2.5 py-0.5 rounded font-bold border border-emerald-500/20">
                    {currentHuman.discipline}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Workspace: <strong className="text-slate-200">{currentClub.name}</strong> | Arm: {currentHuman.bowlingArm}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setActiveTab('personal-planner');
                    handleOpenPersonalPlanModal();
                  }}
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs px-4 py-2.5 rounded-xl transition-all shadow flex items-center gap-1.5"
                >
                  <IconPlus /> Plan Private Session
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden">
                <h3 className="font-bold text-sm text-slate-300">Unified ACWR Risk Meter</h3>
                
                <div className="flex flex-col items-center justify-center my-6">
                  <div className="relative flex items-center justify-center h-40 w-44">
                    <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                      <circle cx="88" cy="88" r="70" stroke="#1e293b" strokeWidth="12" fill="none" />
                      <circle
                        cx="88" cy="88" r="70"
                        stroke={computeUserACWR(currentHuman.uid).ratio > computeUserACWR(currentHuman.uid).spikeLimit ? '#f43f5e' : computeUserACWR(currentHuman.uid).ratio < 0.8 ? '#f59e0b' : '#10b981'}
                        strokeWidth="12" fill="none" strokeDasharray={440}
                        strokeDashoffset={440 - (440 * Math.min(2.0, computeUserACWR(currentHuman.uid).ratio)) / 2}
                        strokeLinecap="round" className="transition-all duration-1000"
                      />
                    </svg>
                    <div className="text-center z-10">
                      <span className="text-3xl font-black text-white">{computeUserACWR(currentHuman.uid).ratio}</span>
                      <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 block">ACW Ratio</span>
                    </div>
                  </div>

                  <span className={`px-3 py-1 rounded-full text-xs font-bold border ${computeUserACWR(currentHuman.uid).color} ${computeUserACWR(currentHuman.uid).bg} ${computeUserACWR(currentHuman.uid).border}`}>
                    {computeUserACWR(currentHuman.uid).status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-center text-xs pt-3 border-t border-slate-800">
                  <div className="bg-slate-950 p-2 rounded-xl">
                    <span className="text-[10px] text-slate-400 block">Acute (7d Balls)</span>
                    <span className="font-bold text-emerald-400 text-sm">{computeUserACWR(currentHuman.uid).acuteBalls}</span>
                  </div>
                  <div className="bg-slate-950 p-2 rounded-xl">
                    <span className="text-[10px] text-slate-400 block">Latest Soreness</span>
                    <span className="font-bold text-slate-200 text-sm">{computeUserACWR(currentHuman.uid).latestSoreness}/10</span>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                <h3 className="font-bold text-sm text-slate-200">Physio & Conditioning Guidance</h3>
                <div className={`p-4 rounded-xl border text-xs leading-relaxed ${computeUserACWR(currentHuman.uid).bg} ${computeUserACWR(currentHuman.uid).border}`}>
                  <p className={`font-bold mb-1 ${computeUserACWR(currentHuman.uid).color}`}>
                    Current Workload Ratio: {computeUserACWR(currentHuman.uid).ratio}
                  </p>
                  <p className="text-slate-300">
                    {computeUserACWR(currentHuman.uid).ratio > computeUserACWR(currentHuman.uid).spikeLimit
                      ? "CRITICAL SPIKE WARNING: Workload exceeds safe limits! De-load recommended."
                      : "Your acute workload is safely balanced with your chronic baseline. You are clear for high-intensity spells."
                    }
                  </p>
                </div>

                <div className="border-t border-slate-800 pt-4">
                  <h4 className="font-bold text-xs text-slate-300 mb-3">Recent Workload History</h4>
                  <div className="space-y-2">
                    {globalLogs.filter(l => l.userId === currentHuman.uid || l.userId === 'user-starc').slice(0, 4).map(log => (
                      <div key={log.id} className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex justify-between items-center text-xs">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white">{log.type}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${log.scope === 'PERSONAL' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>
                              {log.scope === 'PERSONAL' ? '👤 Personal' : '🏏 Club'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">{log.notes || 'No notes added'}</p>
                        </div>
                        <div className="text-right">
                          <span className="font-extrabold text-emerald-400 text-sm block">{log.balls} Balls</span>
                          <span className="text-[10px] text-slate-400">RPE: {log.rpe}/10 | {log.date}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PERSONAL TRAINING PLANNER */}
        {activeTab === 'personal-planner' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
                  <IconUser /> Personal Training & Private Practice Planner
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Schedule and track self-directed throwdowns, machine sessions, or gym work outside of official club practices.
                </p>
              </div>
              <button
                onClick={() => handleOpenPersonalPlanModal()}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs px-4 py-2.5 rounded-xl transition-all shadow flex items-center gap-1.5"
              >
                <IconPlus /> Plan Private Session
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              <div className="lg:col-span-2 space-y-4">
                <h3 className="font-bold text-sm text-slate-200">Upcoming & Saved Private Sessions</h3>

                {userPersonalPlans.length === 0 ? (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-3">
                    <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto text-xl">
                      🏏
                    </div>
                    <h4 className="font-bold text-sm text-white">No Private Sessions Planned Yet</h4>
                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                      Plan your solo throwdown practices, bowling machine reps, or gym mobility sessions to keep your ACWR workload accurately synced!
                    </p>
                    <button
                      onClick={() => handleOpenPersonalPlanModal()}
                      className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs px-4 py-2 rounded-xl transition-all inline-flex items-center gap-1.5"
                    >
                      <IconPlus /> Create First Private Plan
                    </button>
                  </div>
                ) : (
                  userPersonalPlans.map(plan => {
                    const isPastPlan = plan.date < todayFormatted;
                    const isVerified = globalLogs.some(log => log.notes?.includes(plan.title));
                    return (
                      <div key={plan.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-extrabold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/20">
                                👤 Personal
                              </span>
                              <h4 className="font-bold text-base text-white">{plan.title}</h4>
                            </div>
                            <span className="text-xs text-slate-400 mt-1 block">📅 Date: {plan.date} | ⏰ {plan.time}</span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              onClick={() => {
                                if (isPastPlan) return;
                                handleOpenPersonalPlanModal(plan);
                              }}
                              disabled={isPastPlan}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                isPastPlan 
                                  ? 'bg-slate-950 text-slate-600 border border-slate-800 cursor-not-allowed' 
                                  : 'bg-slate-950 hover:bg-slate-800 text-emerald-400 border border-slate-800'
                              }`}
                            >
                              ✏️ Edit
                            </button>

                            <button
                              onClick={async () => {
                                try {
                                  const duplicatedPlan = {
                                    userId: currentHuman.uid || auth.currentUser?.uid,
                                    title: plan.title + ' (Copy)',
                                    date: nextWeekFormatted,
                                    time: plan.time || '4:00 PM - 5:30 PM',
                                    balls: plan.balls || 36,
                                    rpe: plan.rpe || 7,
                                    notes: plan.notes || '',
                                    activities: plan.activities || [],
                                    scope: 'PERSONAL',
                                    createdAt: new Date().toISOString()
                                  };
                                  await addDoc(collection(db, 'personal_plans'), duplicatedPlan);
                                  triggerNotify('Duplicated session for next week! ✓', 'success');
                                } catch (err) {
                                  console.error("Error duplicating session:", err);
                                }
                              }}
                              className="bg-slate-950 hover:bg-slate-800 text-indigo-400 border border-slate-800 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                            >
                              📋 Duplicate
                            </button>

                            <button
                              onClick={async () => {
                                if (isPastPlan) return;
                                const planRef = doc(db, 'personal_plans', plan.id);
                                await deleteDoc(planRef);
                                triggerNotify('Personal session deleted from Firestore.', 'info');
                              }}
                              disabled={isPastPlan}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                isPastPlan 
                                  ? 'bg-slate-950 text-slate-600 border border-slate-800 cursor-not-allowed' 
                                  : 'bg-slate-950 hover:bg-rose-950/40 text-rose-400 border border-slate-800'
                              }`}
                            >
                              Delete Plan
                            </button>

                            {isPastPlan && (
                              <button
                                onClick={() => {
                                  if (!isVerified) {
                                    setCompletionTarget({
                                      planId: plan.id,
                                      id: plan.id,
                                      title: plan.title,
                                      balls: plan.balls || 36,
                                      rpe: plan.rpe || 7
                                    });
                                    setActualBalls(plan.balls || 36);
                                    setActualRPE(plan.rpe || 7);
                                  }
                                }}
                                disabled={isVerified}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                  isVerified 
                                    ? 'bg-slate-800 text-slate-500 cursor-default' 
                                    : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                                }`}
                              >
                                {isVerified ? '✓ Verified' : '✓ Verify & Log'}
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                            <span className="text-[10px] text-slate-400 uppercase font-bold block">Target Volume</span>
                            <span className="font-bold text-emerald-400 text-sm">{plan.balls || 36} Deliveries</span>
                          </div>
                          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                            <span className="text-[10px] text-slate-400 uppercase font-bold block">Target Effort (RPE)</span>
                            <span className="font-bold text-amber-400 text-sm">RPE {plan.rpe || 7} / 10</span>
                          </div>
                        </div>

                        {plan.activities && plan.activities.some(a => a && a.trim() !== '') && (
                          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5">
                            <span className="text-[10px] text-slate-400 uppercase font-bold block">Planned Session Activities</span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                              {plan.activities.map((act, i) => act && act.trim() ? (
                                <div key={i} className="flex items-center gap-2 bg-slate-900/80 px-2.5 py-1.5 rounded-lg border border-slate-800/80">
                                  <span className="text-[10px] font-extrabold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                    {i + 1}
                                  </span>
                                  <span className="text-slate-200 text-[11px] truncate">{act}</span>
                                </div>
                              ) : null)}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                <h3 className="font-bold text-sm text-slate-200">Recommended Conditioning & Drills</h3>
                <p className="text-xs text-slate-400">Pre-hab and technical routines to complete alongside your workload sessions.</p>

                <div className="space-y-3">
                  {drills.map(drill => (
                    <div
                      key={drill.id}
                      onClick={() => {
                        setDrills(prev => prev.map(d => d.id === drill.id ? { ...d, checked: !d.checked } : d));
                      }}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        drill.checked ? 'bg-emerald-500/10 border-emerald-500/40' : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={drill.checked}
                            onChange={() => {}}
                            className="accent-emerald-500 rounded"
                          />
                          <span className={`text-xs font-bold ${drill.checked ? 'line-through text-slate-400' : 'text-slate-100'}`}>
                            {drill.title}
                          </span>
                        </div>
                        <span className="text-[9px] bg-slate-900 px-2 py-0.5 rounded text-slate-400 font-semibold border border-slate-800">
                          {drill.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 pl-6">{drill.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB 3: ASSIGNED CLUB SESSIONS */}
        {!isPersonalWorkspace && activeTab === 'calendar' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <IconCalendar /> Sessions Assigned by Club Coaching Staff
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Hybrid Spotlight View & Attendance Polls for {currentClub.name}</p>
              </div>

              {can('view_full_schedule') && (
                <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800 text-xs">
                  <button
                    type="button"
                    onClick={() => setPlayerScheduleViewMode('spotlight')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                      playerScheduleViewMode === 'spotlight' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    🎯 Your Squad Spotlight
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlayerScheduleViewMode('all')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                      playerScheduleViewMode === 'all' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    🌐 View Full Club Schedule
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-4">
              {zonePlans.filter(p => p.clubId === activeClubId).length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-xs text-slate-400">
                  No club sessions currently published in Cloud Firestore for this squad.
                </div>
              ) : (
                zonePlans.filter(p => p.clubId === activeClubId).map(plan => {
                  const slot = plan.timeSlots?.[0];
                  const isPastOrToday = plan.date <= todayFormatted;
                  const isVerified = globalLogs.some(log => log.notes?.includes(plan.title));
                  const availableSquads = currentClub.squads || [];
                  const allCustomZones = slot?.customZones || [
                    { id: 'zone-2', title: 'Zone 2: Center Wicket Scenario', activityText: slot?.centerWicket?.title || 'Match Scenario', squadIds: [] },
                    { id: 'zone-3', title: 'Zone 3: Fielding & Boundary Relay', activityText: slot?.fieldingStation?.title || 'Fielding Drills', squadIds: [] }
                  ];

                  const filteredNetLanes = playerScheduleViewMode === 'all' ? (slot?.netLanes || []) : (slot?.netLanes || []).filter(lane => {
                    if (!lane.batters && !lane.bowlersText) return false;
                    return lane.batters?.toLowerCase().includes(currentHuman.name.toLowerCase()) ||
                           lane.bowlersText?.toLowerCase().includes(currentHuman.name.toLowerCase());
                  });

                  const filteredCustomZones = playerScheduleViewMode === 'all' ? allCustomZones : allCustomZones.filter(zone => {
                    const zSquads = zone.squadIds || [];
                    if (zSquads.length === 0) return false;
                    return zSquads.some(sqId => currentUserAssignedSquadIds.includes(sqId));
                  });

                  const hasRelevantContent = playerScheduleViewMode === 'all' || filteredNetLanes.length > 0 || filteredCustomZones.length > 0;

                  if (!hasRelevantContent && playerScheduleViewMode === 'spotlight' && !can('view_full_schedule')) return null;

                  // Poll computations for this session
                  const sessionPollResponses = pollResponses.filter(pr => pr.planId === plan.id);
                  const attendingCount = sessionPollResponses.filter(pr => pr.status === 'ATTENDING').length;
                  const declinedCount = sessionPollResponses.filter(pr => pr.status === 'DECLINED').length;
                  const maybeCount = sessionPollResponses.filter(pr => pr.status === 'MAYBE').length;

                  const activeUserUid = currentHuman.uid || auth.currentUser?.uid;
                  const myPollResponse = sessionPollResponses.find(pr => pr.userId === activeUserUid);

                  // Relevance check for poll in spotlight view:
                  const isInNetLanes = (slot?.netLanes || []).some(lane => 
                    (lane.batters && lane.batters.toLowerCase().includes(currentHuman.name.toLowerCase())) ||
                    (lane.bowlersText && lane.bowlersText.toLowerCase().includes(currentHuman.name.toLowerCase()))
                  );
                  const isAssignedSquadInZones = allCustomZones.some(zone => 
                    (zone.squadIds || []).some(sqId => currentUserAssignedSquadIds.includes(sqId))
                  );
                  const isPlayerRelevantToSession = playerScheduleViewMode === 'all' || isInNetLanes || isAssignedSquadInZones;

                  const showPollWidget = plan.pollEnabled !== false && playerScheduleViewMode === 'spotlight' && isPlayerRelevantToSession;

                  // FIX: Validate whether the session date is strictly in the past (less than today)
                  const isPollClosed = plan.date < todayFormatted;

                  return (
                    <div key={plan.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-800 pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-base text-white">{plan.title}</h3>
                            {playerScheduleViewMode === 'spotlight' && (
                              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-extrabold border border-emerald-500/20">
                                🌟 Assigned to Your Squad
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-slate-400 mt-0.5 block">⏰ Time Slot: {slot?.time || '6:00 PM - 7:30 PM'}</span>
                        </div>
                        <span className="text-xs text-emerald-400 font-bold bg-emerald-500/10 px-3 py-1 rounded-xl border border-emerald-500/20">
                          📅 Date: {plan.date}
                        </span>
                      </div>

                      {/* SESSION ATTENDANCE POLL WIDGET (Disabled if session date is in the past) */}
                      {showPollWidget && (
                        <div className="bg-slate-950 p-4 rounded-xl border border-emerald-500/30 space-y-3">
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                            <div>
                              <span className="font-extrabold text-xs text-emerald-400 block">📊 Session Attendance Poll</span>
                              <p className="text-[11px] text-slate-400">
                                {isPollClosed ? "🔒 Poll Closed (Session Date Passed)" : "Please confirm your availability for this training session."}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 text-[11px]">
                              <span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-bold">✓ Attending: {attendingCount}</span>
                              <span className="bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded font-bold">✕ Declined: {declinedCount}</span>
                              <span className="bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-bold">? Maybe: {maybeCount}</span>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            <button
                              type="button"
                              disabled={isPollClosed}
                              onClick={async () => {
                                if (isPollClosed) return;
                                if (myPollResponse) {
                                  await updateDoc(doc(db, 'poll_responses', myPollResponse.id), { status: 'ATTENDING', updatedAt: new Date().toISOString() });
                                } else {
                                  await addDoc(collection(db, 'poll_responses'), {
                                    planId: plan.id,
                                    clubId: activeClubId,
                                    userId: activeUserUid,
                                    userName: currentHuman.name,
                                    status: 'ATTENDING',
                                    updatedAt: new Date().toISOString()
                                  });
                                }
                                triggerNotify('Attendance marked as Attending! ✓', 'success');
                              }}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                                isPollClosed 
                                  ? 'bg-slate-900 text-slate-600 border-slate-800 cursor-not-allowed opacity-60' 
                                  : myPollResponse?.status === 'ATTENDING' 
                                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow' 
                                    : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
                              }`}
                            >
                              ✓ Attending
                            </button>

                            <button
                              type="button"
                              disabled={isPollClosed}
                              onClick={async () => {
                                if (isPollClosed) return;
                                if (myPollResponse) {
                                  await updateDoc(doc(db, 'poll_responses', myPollResponse.id), { status: 'DECLINED', updatedAt: new Date().toISOString() });
                                } else {
                                  await addDoc(collection(db, 'poll_responses'), {
                                    planId: plan.id,
                                    clubId: activeClubId,
                                    userId: activeUserUid,
                                    userName: currentHuman.name,
                                    status: 'DECLINED',
                                    updatedAt: new Date().toISOString()
                                  });
                                }
                                triggerNotify('Attendance marked as Declined.', 'info');
                              }}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                                isPollClosed 
                                  ? 'bg-slate-900 text-slate-600 border-slate-800 cursor-not-allowed opacity-60' 
                                  : myPollResponse?.status === 'DECLINED' 
                                    ? 'bg-rose-500 text-white border-rose-400 shadow' 
                                    : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
                              }`}
                            >
                              ✕ Declined
                            </button>

                            <button
                              type="button"
                              disabled={isPollClosed}
                              onClick={async () => {
                                if (isPollClosed) return;
                                if (myPollResponse) {
                                  await updateDoc(doc(db, 'poll_responses', myPollResponse.id), { status: 'MAYBE', updatedAt: new Date().toISOString() });
                                } else {
                                  await addDoc(collection(db, 'poll_responses'), {
                                    planId: plan.id,
                                    clubId: activeClubId,
                                    userId: activeUserUid,
                                    userName: currentHuman.name,
                                    status: 'MAYBE',
                                    updatedAt: new Date().toISOString()
                                  });
                                }
                                triggerNotify('Attendance marked as Maybe.', 'info');
                              }}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                                isPollClosed 
                                  ? 'bg-slate-900 text-slate-600 border-slate-800 cursor-not-allowed opacity-60' 
                                  : myPollResponse?.status === 'MAYBE' 
                                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow' 
                                    : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
                              }`}
                            >
                              ? Maybe
                            </button>

                            {can('view_poll_results') && sessionPollResponses.length > 0 && (
                              <div className="ml-auto text-[10px] text-slate-400">
                                <span>Responses: {sessionPollResponses.map(r => `${r.userName} (${r.status})`).join(', ')}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 text-xs">
                        <div className="bg-slate-950 p-3.5 rounded-xl border border-emerald-500/30 space-y-2">
                          <span className="font-extrabold text-xs text-emerald-400 block border-b border-slate-800 pb-1">
                            🏏 Zone 1: Net Lanes & Allocation
                          </span>
                          {filteredNetLanes.length > 0 ? (
                            <div className="space-y-2">
                              {filteredNetLanes.map((lane, idx) => (
                                <div key={lane.id || idx} className="bg-slate-900 p-2 rounded border border-slate-800 text-[11px] space-y-1">
                                  <span className="font-bold text-slate-200 block text-emerald-300">{lane.name}</span>
                                  <div className="text-slate-400">
                                    <span>Batters: <strong className="text-slate-200">{typeof lane.batters === 'string' ? lane.batters : 'Unassigned'}</strong></span>
                                  </div>
                                  <div className="text-slate-400">
                                    <span>Bowlers: <strong className="text-emerald-400">{typeof lane.bowlersText === 'string' ? lane.bowlersText : 'Unassigned'}</strong></span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-500 italic block">No net lanes assigned to you in this session</span>
                          )}
                        </div>

                        {filteredCustomZones.map((zone, zIdx) => {
                          const assignedSquadNames = (zone.squadIds || []).map(sqId => {
                            const foundSq = availableSquads.find(s => s.id === sqId);
                            return foundSq ? foundSq.name : null;
                          }).filter(Boolean);

                          return (
                            <div key={zone.id || zIdx} className="bg-slate-950 p-3.5 rounded-xl border border-indigo-500/30 space-y-2">
                              <span className="font-extrabold text-xs text-indigo-400 block border-b border-slate-800 pb-1">
                                🏟️ {zone.title || `Zone ${zIdx + 2}`}
                              </span>
                              <div className="bg-slate-900 p-2 rounded border border-slate-800 text-[11px] space-y-1">
                                <span className="text-slate-200 font-semibold block">
                                  {zone.activityText || 'No activity specified'}
                                </span>
                                <div className="text-slate-400 pt-1 border-t border-slate-800">
                                  <span>Squads: <strong className="text-emerald-400">{assignedSquadNames.length > 0 ? assignedSquadNames.join(', ') : 'None Assigned'}</strong></span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {isPastOrToday ? (
                        <button
                          onClick={() => {
                            if (!isVerified) {
                              setCompletionTarget({
                                planId: plan.id,
                                id: plan.id,
                                title: plan.title,
                                balls: 36,
                                rpe: 8
                              });
                              setActualBalls(36);
                              setActualRPE(8);
                            }
                          }}
                          disabled={isVerified}
                          className={`w-full font-extrabold text-xs py-2.5 rounded-xl transition-all shadow ${
                            isVerified 
                              ? 'bg-slate-800 text-slate-500 cursor-default' 
                              : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                          }`}
                        >
                          {isVerified ? '✓ Verified & Logged' : 'Complete & Verify Actual Deliveries ✓'}
                        </button>
                      ) : (
                        <div className="w-full bg-slate-950 border border-slate-800 text-slate-400 text-center py-2.5 rounded-xl text-xs font-semibold">
                          📅 Upcoming Session (Verification unlocks on session date)
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 4: SQUAD HEALTH MATRIX */}
        {can('view_squad_health_matrix') && activeTab === 'matrix' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex justify-between items-center">
              <div>
                <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <IconShieldAlert /> Squad Medical & Workload Matrix
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Real-time ACWR fatigue monitoring across {currentClub.name}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {memberships.filter(m => m.clubId === activeClubId).map(m => {
                const acwr = computeUserACWR(m.userId);
                const fullName = resolveMemberFullName(m.userId);
                return (
                  <div key={m.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-sm text-white">{fullName}</span>
                      <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold border ${acwr.color} ${acwr.bg} ${acwr.border}`}>
                        {acwr.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between bg-slate-950 p-3 rounded-xl text-xs">
                      <span className="text-slate-400">Predicted ACWR Ratio:</span>
                      <span className="font-extrabold text-white text-sm">{acwr.ratio}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 5: MULTI-ZONE NET ALLOCATOR (GOVERNED BY `view_poll_results` CAPABILITY) */}
        {can('create_zone_plans') && activeTab === 'allocator' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <IconGrid /> Multi-Zone Net Allocator & Microcycle Planner
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Design Zone 1 net allocations alongside custom zones with live attendance poll tracking.</p>
              </div>
              <button
                onClick={() => handleOpenCreateZonePlanModal()}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs px-4 py-2.5 rounded-xl transition-all shadow flex items-center gap-1.5"
              >
                <IconPlus /> Create Multi-Zone Training Night Plan
              </button>
            </div>

            <div className="space-y-4">
              {zonePlans.filter(p => p.clubId === activeClubId).length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-xs text-slate-400">
                  No club training plans published yet for this workspace.
                </div>
              ) : (
                zonePlans.filter(p => p.clubId === activeClubId).map(plan => {
                  const isPastPlan = plan.date < todayFormatted;
                  const slot = plan.timeSlots?.[0];
                  const availableSquads = currentClub.squads || [];
                  const customZonesList = slot?.customZones || [
                    { id: 'zone-2', title: 'Zone 2: Center Wicket Scenario', activityText: slot?.centerWicket?.title || 'Match Scenario', squadIds: [] },
                    { id: 'zone-3', title: 'Zone 3: Fielding & Boundary Relay', activityText: slot?.fieldingStation?.title || 'Fielding Drills', squadIds: [] }
                  ];

                  const sessionPollResponses = pollResponses.filter(pr => pr.planId === plan.id);
                  const attendingList = sessionPollResponses.filter(pr => pr.status === 'ATTENDING');
                  const declinedList = sessionPollResponses.filter(pr => pr.status === 'DECLINED');
                  const maybeList = sessionPollResponses.filter(pr => pr.status === 'MAYBE');

                  return (
                    <div key={plan.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                      <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                        <div>
                          <h3 className="font-bold text-base text-white">{plan.title}</h3>
                          <span className="text-xs text-emerald-400 font-bold block mt-0.5">📅 Date: {plan.date} | ⏰ {slot?.time || '6:00 PM - 7:30 PM'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {can('edit_zone_plans') && (
                            <button
                              onClick={() => {
                                if (isPastPlan) return;
                                handleOpenCreateZonePlanModal(plan);
                              }}
                              disabled={isPastPlan}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                isPastPlan ? 'bg-slate-950 text-slate-600 border border-slate-800 cursor-not-allowed' : 'bg-slate-950 hover:bg-slate-800 text-emerald-400 border border-slate-800'
                              }`}
                            >
                              ✏️ Edit
                            </button>
                          )}

                          <button
                            onClick={async () => {
                              try {
                                const duplicatedZonePlan = {
                                  clubId: plan.clubId || activeClubId,
                                  title: plan.title + ' (Copy)',
                                  date: nextWeekFormatted,
                                  pollEnabled: plan.pollEnabled !== false,
                                  timeSlots: plan.timeSlots || [],
                                  createdAt: new Date().toISOString()
                                };
                                await addDoc(collection(db, 'zone_plans'), duplicatedZonePlan);
                                triggerNotify('Training night plan duplicated for next week! ✓', 'success');
                              } catch (err) {
                                console.error("Error duplicating zone plan:", err);
                              }
                            }}
                            className="bg-slate-950 hover:bg-slate-800 text-indigo-400 border border-slate-800 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                          >
                            📋 Duplicate
                          </button>

                          {can('edit_zone_plans') && (
                            <button
                              onClick={async () => {
                                if (isPastPlan) return;
                                const planRef = doc(db, 'zone_plans', plan.id);
                                await deleteDoc(planRef);
                                triggerNotify('Training plan deleted from Firestore.', 'info');
                              }}
                              disabled={isPastPlan}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                isPastPlan ? 'bg-slate-950 text-slate-600 border border-slate-800 cursor-not-allowed' : 'bg-slate-950 hover:bg-rose-950/40 text-rose-400 border border-slate-800'
                              }`}
                            >
                              Delete Plan
                            </button>
                          )}
                        </div>
                      </div>

                      {/* COACH POLL RESULTS SUMMARY PANEL (Governed by 'view_poll_results' capability) */}
                      {plan.pollEnabled !== false && can('view_poll_results') && (
                        <div className="bg-slate-950 p-4 rounded-xl border border-emerald-500/30 space-y-3">
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-800 pb-2">
                            <span className="font-extrabold text-xs text-emerald-400">📊 Live Attendance Poll Results</span>
                            <div className="flex items-center gap-2 text-xs">
                              <span className="bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded font-bold">✓ Attending: {attendingList.length}</span>
                              <span className="bg-rose-500/20 text-rose-300 px-2.5 py-0.5 rounded font-bold">✕ Declined: {declinedList.length}</span>
                              <span className="bg-amber-500/20 text-amber-300 px-2.5 py-0.5 rounded font-bold">? Maybe: {maybeList.length}</span>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                            <div className="bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/20 space-y-1">
                              <span className="font-bold text-emerald-400 block">Attending ({attendingList.length})</span>
                              <div className="text-slate-300 text-[11px]">
                                {attendingList.length > 0 ? attendingList.map(a => a.userName).join(', ') : <span className="text-slate-500 italic">No responses yet</span>}
                              </div>
                            </div>

                            <div className="bg-rose-500/5 p-3 rounded-xl border border-rose-500/20 space-y-1">
                              <span className="font-bold text-rose-400 block">Declined ({declinedList.length})</span>
                              <div className="text-slate-300 text-[11px]">
                                {declinedList.length > 0 ? declinedList.map(a => a.userName).join(', ') : <span className="text-slate-500 italic">None</span>}
                              </div>
                            </div>

                            <div className="bg-amber-500/5 p-3 rounded-xl border border-amber-500/20 space-y-1">
                              <span className="font-bold text-amber-400 block">Maybe ({maybeList.length})</span>
                              <div className="text-slate-300 text-[11px]">
                                {maybeList.length > 0 ? maybeList.map(a => a.userName).join(', ') : <span className="text-slate-500 italic">None</span>}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 text-xs">
                        <div className="bg-slate-950 p-3.5 rounded-xl border border-emerald-500/30 space-y-2">
                          <span className="font-extrabold text-xs text-emerald-400 block border-b border-slate-800 pb-1">
                            🏏 Zone 1: Net Lanes & Allocation
                          </span>
                          {slot?.netLanes && slot.netLanes.length > 0 ? (
                            <div className="space-y-2">
                              {slot.netLanes.map((lane, idx) => (
                                <div key={lane.id || idx} className="bg-slate-900 p-2 rounded border border-slate-800 text-[11px] space-y-1">
                                  <span className="font-bold text-slate-200 block text-emerald-300">{lane.name}</span>
                                  <div className="text-slate-400">
                                    <span>Batters: <strong className="text-slate-200">{typeof lane.batters === 'string' ? lane.batters : (Array.isArray(lane.batters) ? lane.batters.join(', ') : 'Unassigned')}</strong></span>
                                  </div>
                                  <div className="text-slate-400">
                                    <span>Bowlers: <strong className="text-emerald-400">{typeof lane.bowlersText === 'string' ? lane.bowlersText : 'Unassigned'}</strong></span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-500 italic block">No net lanes configured</span>
                          )}
                        </div>

                        {customZonesList.map((zone, zIdx) => {
                          const assignedSquadNames = (zone.squadIds || []).map(sqId => {
                            const foundSq = availableSquads.find(s => s.id === sqId);
                            return foundSq ? foundSq.name : null;
                          }).filter(Boolean);

                          return (
                            <div key={zone.id || zIdx} className="bg-slate-950 p-3.5 rounded-xl border border-indigo-500/30 space-y-2">
                              <span className="font-extrabold text-xs text-indigo-400 block border-b border-slate-800 pb-1">
                                🏟️ {zone.title || `Zone ${zIdx + 2}`}
                              </span>
                              <div className="bg-slate-900 p-2 rounded border border-slate-800 text-[11px] space-y-1">
                                <span className="text-slate-200 font-semibold block">
                                  {zone.activityText || 'No activity specified'}
                                </span>
                                <div className="text-slate-400 pt-1 border-t border-slate-800">
                                  <span>Squads: <strong className="text-emerald-400">{assignedSquadNames.length > 0 ? assignedSquadNames.join(', ') : 'None Assigned'}</strong></span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 6: CLUB ROSTER & CAPABILITY MATRIX */}
        {can('manage_roster') && activeTab === 'roster' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-900 border border-emerald-500/30 rounded-2xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/20">
                    CLUB INVITE CODE: <strong className="text-white tracking-widest">{currentClub.code || 'CC2026'}</strong>
                  </span>
                </div>
                <h2 className="text-base font-bold text-white mt-1.5">{currentClub.name} - Member Roster & Dynamic Capability Matrix</h2>
                <p className="text-xs text-slate-400 mt-0.5">Create custom roles and toggle capabilities to tailor what each role can do.</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(currentClub.code || 'CC2026');
                    triggerNotify('Copied Club Code "' + (currentClub.code || 'CC2026') + '" to clipboard!', 'success');
                  }}
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs px-4 py-2.5 rounded-xl transition-all shadow flex items-center gap-2 whitespace-nowrap"
                >
                  📋 Copy Invite Code
                </button>
              </div>
            </div>

            {/* DYNAMIC CAPABILITY MATRIX ROLE BUILDER */}
            {can('configure_roles') && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="border-b border-slate-800 pb-3">
                  <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                    🛠️ Dynamic Role Builder & Capability Matrix
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Create a new custom role and assign precise feature capabilities.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] text-slate-400 font-bold uppercase block">New Role Name</label>
                    <input
                      type="text"
                      value={newRoleName}
                      onChange={(e) => setNewRoleName(e.target.value)}
                      placeholder="e.g. Assistant S&C Coach"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        if (!newRoleName.trim()) return;
                        const roleObj = { name: newRoleName.trim(), capabilities: selectedCapabilities };
                        const clubRef = doc(db, 'clubs', activeClubId);
                        const existingRoles = Array.isArray(currentClub.customRoles) ? currentClub.customRoles : [];
                        await updateDoc(clubRef, {
                          customRoles: [...existingRoles, roleObj]
                        });
                        setNewRoleName('');
                        setSelectedCapabilities([]);
                        triggerNotify(`Created custom role "${roleObj.name}" with ${roleObj.capabilities.length} capabilities!`, 'success');
                      }}
                      className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs py-2.5 rounded-xl transition-all shadow"
                    >
                      + Save Custom Role to Club
                    </button>
                  </div>

                  <div className="md:col-span-2 space-y-2 bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <label className="text-[10px] text-emerald-400 font-extrabold uppercase block mb-2">
                      Select Capabilities for this Role
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {MASTER_CAPABILITIES_CATALOGUE.map(cap => {
                        const isSelected = selectedCapabilities.includes(cap.key);
                        return (
                          <button
                            key={cap.key}
                            type="button"
                            onClick={() => {
                              setSelectedCapabilities(prev => 
                                isSelected ? prev.filter(k => k !== cap.key) : [...prev, cap.key]
                              );
                            }}
                            className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                              isSelected ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 font-bold' : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            <span className="truncate">{cap.label}</span>
                            <span className="text-xs">{isSelected ? '✓' : '+'}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* EXISTING ROLES SUMMARY */}
                <div className="pt-3 border-t border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-2">Active Club Roles & Capabilities</span>
                  <div className="flex flex-wrap gap-2">
                    {(Array.isArray(currentClub.customRoles) ? currentClub.customRoles : []).map((rDef, i) => (
                      <div key={i} className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-xs space-y-1 w-full sm:w-auto">
                        <div className="flex justify-between items-center gap-3">
                          <span className="font-extrabold text-white">🏷️ {rDef.name}</span>
                          {rDef.name !== 'Admin' && rDef.name !== 'Player' && (
                            <button
                              onClick={async () => {
                                const clubRef = doc(db, 'clubs', activeClubId);
                                const updated = (currentClub.customRoles || []).filter(r => r.name !== rDef.name);
                                await updateDoc(clubRef, { customRoles: updated });
                                triggerNotify(`Removed role ${rDef.name}`, 'info');
                              }}
                              className="text-slate-500 hover:text-rose-400 font-bold"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 max-w-xs truncate">
                          Capabilities: {Array.isArray(rDef.capabilities) && rDef.capabilities.includes('*') ? 'Full Admin (*)' : (Array.isArray(rDef.capabilities) ? rDef.capabilities.join(', ') : 'None')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* SQUAD & ROSTER MANAGEMENT */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-800 pb-3">
                <div>
                  <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                    🏟️ Club Squad & Age Group Management
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Create and manage sub-teams (e.g. 1st XI Senior, Under-19 Academy) for {currentClub.name}.</p>
                </div>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  id="custom-squad-input"
                  placeholder="e.g. 3rd XI League, Under-15 Academy"
                  className="flex-grow bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
                <button
                  onClick={async () => {
                    const input = document.getElementById('custom-squad-input');
                    if (!input || !input.value.trim()) return;
                    const squadName = input.value.trim();
                    const newSquadObj = {
                      id: 'squad-' + Date.now(),
                      name: squadName
                    };
                    const clubRef = doc(db, 'clubs', activeClubId);
                    await updateDoc(clubRef, {
                      squads: [...(currentClub.squads || []), newSquadObj]
                    });
                    input.value = '';
                    triggerNotify('Created squad "' + squadName + '" in Firestore!', 'success');
                  }}
                  className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 font-bold border border-emerald-500/40 text-xs px-4 py-2.5 rounded-xl transition-all whitespace-nowrap"
                >
                  + Create Squad
                </button>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                {(currentClub.squads || []).map((sq) => (
                  <span key={sq.id} className="bg-slate-950 text-slate-300 border border-slate-800 text-xs px-3 py-1 rounded-xl flex items-center gap-2 font-semibold">
                    <span className="text-emerald-400">🏏</span> {sq.name}
                    {(currentClub.squads || []).length > 1 && (
                      <button
                        onClick={async () => {
                          const clubRef = doc(db, 'clubs', activeClubId);
                          const updatedSquads = (currentClub.squads || []).filter(s => s.id !== sq.id);
                          await updateDoc(clubRef, { squads: updatedSquads });
                          triggerNotify('Removed squad "' + sq.name + '".', 'info');
                        }}
                        className="text-slate-500 hover:text-rose-400 text-xs font-bold"
                      >
                        ✕
                      </button>
                    )}
                  </span>
                ))}
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                  👥 Active Club Roster ({memberships.filter(m => m.clubId === activeClubId).length} Members)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Assign multiple roles and multiple squads to registered club members.</p>
              </div>

              <div className="space-y-3">
                {memberships.filter(m => m.clubId === activeClubId).map(m => {
                  const displayName = resolveMemberFullName(m.userId);
                  
                  const currentRoles = Array.isArray(m.roles) ? m.roles : [m.roles || 'Player'];
                  const currentSquadIds = Array.isArray(m.squadIds) ? m.squadIds : [m.squadIds || ''];

                  const availableRoleNames = (Array.isArray(currentClub.customRoles) ? currentClub.customRoles : [
                    { name: 'Admin' },
                    { name: 'Player' },
                    { name: 'Head Coach' }
                  ]).map(r => r.name);

                  const availableSquads = currentClub.squads || [];

                  return (
                    <div key={m.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 text-xs">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-sm text-white">{displayName}</span>
                          {currentRoles.map((r, i) => (
                            <span key={i} className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] px-2 py-0.5 rounded font-bold">
                              {r}
                            </span>
                          ))}
                        </div>
                        <span className="text-[11px] text-slate-400 mt-0.5 block">
                          ID: <span className="text-slate-300 font-mono">{m.userId}</span>
                        </span>
                      </div>

                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full lg:w-auto">
                        
                        {/* MULTI-ROLE CHECKBOXES / SELECTOR */}
                        <div className="flex flex-col space-y-1 w-full sm:w-auto">
                          <span className="text-[9px] text-slate-400 uppercase font-bold">Assigned Roles (Multi-select)</span>
                          <div className="flex flex-wrap gap-1.5 max-w-xs">
                            {availableRoleNames.map((roleName, rIdx) => {
                              const isChecked = currentRoles.includes(roleName);
                              return (
                                <button
                                  key={rIdx}
                                  type="button"
                                  onClick={async () => {
                                    let updatedRoles;
                                    if (isChecked) {
                                      if (currentRoles.length === 1) return;
                                      updatedRoles = currentRoles.filter(r => r !== roleName);
                                    } else {
                                      updatedRoles = [...currentRoles, roleName];
                                    }
                                    const memRef = doc(db, 'memberships', m.id);
                                    await updateDoc(memRef, { roles: updatedRoles });
                                    triggerNotify(`Updated roles for ${displayName}`, 'success');
                                  }}
                                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                                    isChecked 
                                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50' 
                                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                                  }`}
                                >
                                  {isChecked ? '✓ ' : '+ '}{roleName}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* MULTI-SQUAD CHECKBOXES / SELECTOR */}
                        <div className="flex flex-col space-y-1 w-full sm:w-auto">
                          <span className="text-[9px] text-slate-400 uppercase font-bold">Assigned Squads (Multi-select)</span>
                          <div className="flex flex-wrap gap-1.5 max-w-xs">
                            {availableSquads.map((squad) => {
                              const isAssigned = currentSquadIds.includes(squad.id);
                              return (
                                <button
                                  key={squad.id}
                                  type="button"
                                  onClick={async () => {
                                    let updatedSquads;
                                    if (isAssigned) {
                                      updatedSquads = currentSquadIds.filter(id => id !== squad.id);
                                    } else {
                                      updatedSquads = [...currentSquadIds, squad.id];
                                    }
                                    const memRef = doc(db, 'memberships', m.id);
                                    await updateDoc(memRef, { squadIds: updatedSquads });
                                    triggerNotify(`Assigned ${displayName} to squad ${squad.name}`, 'success');
                                  }}
                                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                                    isAssigned 
                                      ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50' 
                                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                                  }`}
                                >
                                  {isAssigned ? '✓ ' : '+ '}{squad.name}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* REMOVE MEMBER */}
                        <button
                          onClick={async () => {
                            const memRef = doc(db, 'memberships', m.id);
                            await deleteDoc(memRef);
                            triggerNotify('Removed member from club roster.', 'info');
                          }}
                          className="bg-slate-900 hover:bg-rose-950/40 text-rose-400 border border-slate-800 px-3 py-1.5 rounded-xl font-bold transition-all text-xs whitespace-nowrap"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}

      </main>

      {/* MODAL: CREATE PLAN */}
      {showCreatePlanModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-4 my-8">
            
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                {activeTab === 'allocator' 
                  ? "🏏 Create / Edit Multi-Zone Training Night Plan" 
                  : "👤 Plan Private / Independent Session"}
              </h3>
              <button onClick={() => setShowCreatePlanModal(false)} className="text-slate-400 hover:text-white font-bold text-xs">
                ✕ Close
              </button>
            </div>

            <form onSubmit={activeTab === 'allocator' ? handleSaveZonePlan : handleSavePersonalPlan} className="space-y-4">
              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Session Title</label>
                <input
                  type="text"
                  value={newPlanTitle}
                  onChange={(e) => setNewPlanTitle(e.target.value)}
                  placeholder="e.g. Solo Throwdown & Run-Up Rhythm"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Session Date</label>
                  <input
                    type="date"
                    value={newPlanDate}
                    onChange={(e) => setNewPlanDate(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Time Slot</label>
                  <input
                    type="text"
                    value={newPlanTime}
                    onChange={(e) => setNewPlanTime(e.target.value)}
                    placeholder="e.g. 4:00 PM - 5:30 PM"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {activeTab === 'allocator' ? (
                <div className="space-y-4 pt-2">
                  <div className="bg-slate-950 p-4 rounded-xl border border-emerald-500/30 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="font-extrabold text-xs text-emerald-400">📊 Session Attendance Poll</span>
                      <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 font-bold">
                        <input
                          type="checkbox"
                          checked={newPollEnabled}
                          onChange={(e) => setNewPollEnabled(e.target.checked)}
                          className="accent-emerald-500 rounded h-4 w-4"
                        />
                        Enable Attendance Poll for this Session
                      </label>
                    </div>
                  </div>

                  <div className="bg-slate-950 p-4 rounded-xl border border-emerald-500/30 space-y-3">
                    <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                      <h4 className="font-extrabold text-xs text-emerald-400">🏏 Zone 1: Net Lanes & Allocation</h4>
                      <button
                        type="button"
                        onClick={() => setNewNetLanes(prev => [...prev, { id: 'lane-' + Date.now(), name: 'Lane ' + (prev.length + 1) + ': Custom', batters: '', bowlersText: '' }])}
                        className="bg-emerald-500/20 text-emerald-400 font-bold text-[10px] px-2.5 py-1 rounded-lg border border-emerald-500/40"
                      >
                        + Add Net Lane
                      </button>
                    </div>

                    {newNetLanes.map((lane, index) => (
                      <div key={lane.id || index} className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-2.5">
                        <input
                          type="text"
                          value={lane.name}
                          onChange={(e) => {
                            const val = e.target.value;
                            setNewNetLanes(prev => prev.map((l, idx) => idx === index ? { ...l, name: val } : l));
                          }}
                          className="bg-slate-950 border border-slate-800 text-emerald-300 font-bold text-xs p-2 rounded-lg w-full"
                        />

                        <div className="space-y-1">
                          <label className="text-[9px] text-slate-400 uppercase font-bold block">Assigned Batters (Select from Club Roster)</label>
                          <div className="flex gap-2">
                            <select
                              onChange={(e) => {
                                if (!e.target.value) return;
                                const selected = e.target.value;
                                const current = lane.batters ? lane.batters.split(', ').filter(Boolean) : [];
                                if (!current.includes(selected)) {
                                  const updated = [...current, selected].join(', ');
                                  setNewNetLanes(prev => prev.map((l, idx) => idx === index ? { ...l, batters: updated } : l));
                                }
                                e.target.value = '';
                              }}
                              className="bg-slate-950 border border-slate-800 text-slate-200 text-xs p-2 rounded-xl focus:outline-none focus:border-emerald-500 w-1/2"
                            >
                              <option value="">+ Add Batter from Club Roster...</option>
                              {clubRosterList.map(member => (
                                <option key={member.id} value={member.name}>{member.name} ({member.roleString})</option>
                              ))}
                            </select>
                            <input
                              type="text"
                              value={lane.batters}
                              onChange={(e) => {
                                const val = e.target.value;
                                setNewNetLanes(prev => prev.map((l, idx) => idx === index ? { ...l, batters: val } : l));
                              }}
                              placeholder="Or type batters manually..."
                              className="bg-slate-950 border border-slate-800 text-slate-200 text-xs p-2 rounded-xl focus:outline-none focus:border-emerald-500 flex-grow"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] text-slate-400 uppercase font-bold block">Assigned Bowlers & Quotas</label>
                          <div className="flex gap-2">
                            <select
                              onChange={(e) => {
                                if (!e.target.value) return;
                                const selected = e.target.value;
                                const current = lane.bowlersText ? lane.bowlersText.split(', ').filter(Boolean) : [];
                                const formatted = `${selected} (36b)`;
                                if (!current.some(b => b.includes(selected))) {
                                  const updated = [...current, formatted].join(', ');
                                  setNewNetLanes(prev => prev.map((l, idx) => idx === index ? { ...l, bowlersText: updated } : l));
                                }
                                e.target.value = '';
                              }}
                              className="bg-slate-950 border border-slate-800 text-slate-200 text-xs p-2 rounded-xl focus:outline-none focus:border-emerald-500 w-1/2"
                            >
                              <option value="">+ Add Bowler from Club Roster...</option>
                              {clubRosterList.map(member => (
                                <option key={member.id} value={member.name}>{member.name} ({member.roleString})</option>
                              ))}
                            </select>
                            <input
                              type="text"
                              value={lane.bowlersText}
                              onChange={(e) => {
                                const val = e.target.value;
                                setNewNetLanes(prev => prev.map((l, idx) => idx === index ? { ...l, bowlersText: val } : l));
                              }}
                              placeholder="Or type bowlers & balls (e.g. Pat Cummins (36b))"
                              className="bg-slate-950 border border-slate-800 text-slate-200 text-xs p-2 rounded-xl focus:outline-none focus:border-emerald-500 flex-grow"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-slate-950 p-4 rounded-xl border border-indigo-500/30 space-y-3">
                    <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                      <h4 className="font-extrabold text-xs text-indigo-400">🏟️ Flexible Custom Zones & Activities</h4>
                      <button
                        type="button"
                        onClick={() => {
                          const nextNum = newCustomZones.length + 1;
                          setNewCustomZones(prev => [
                            ...prev, 
                            { id: 'zone-' + Date.now(), title: `Zone ${nextNum}: Custom Activity`, activityText: '', squadIds: [] }
                          ]);
                        }}
                        className="bg-indigo-500/20 text-indigo-300 font-bold text-[10px] px-2.5 py-1 rounded-lg border border-indigo-500/40"
                      >
                        + Add Custom Zone
                      </button>
                    </div>

                    {newCustomZones.map((zone, zIdx) => {
                      const availableSquads = currentClub.squads || [];
                      return (
                        <div key={zone.id || zIdx} className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 space-y-3">
                          <div className="flex justify-between items-center gap-2">
                            <input
                              type="text"
                              value={zone.title}
                              onChange={(e) => {
                                const val = e.target.value;
                                setNewCustomZones(prev => prev.map((z, idx) => idx === zIdx ? { ...z, title: val } : z));
                              }}
                              placeholder="Zone Title (e.g. Zone 2: Center Wicket)"
                              className="bg-slate-950 border border-slate-800 text-indigo-300 font-bold text-xs p-2 rounded-lg flex-grow"
                            />
                            {newCustomZones.length > 1 && (
                              <button
                                type="button"
                                onClick={() => setNewCustomZones(prev => prev.filter((_, idx) => idx !== zIdx))}
                                className="text-slate-500 hover:text-rose-400 text-xs font-bold px-2 py-1"
                              >
                                ✕ Delete Zone
                              </button>
                            )}
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9px] text-slate-400 uppercase font-bold block">Free Text Activity Description</label>
                            <textarea
                              rows="2"
                              value={zone.activityText}
                              onChange={(e) => {
                                const val = e.target.value;
                                setNewCustomZones(prev => prev.map((z, idx) => idx === zIdx ? { ...z, activityText: val } : z));
                              }}
                              placeholder="Describe the activity, scenario, or training focus..."
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9px] text-slate-400 uppercase font-bold block">Assign Multiple Squads to this Activity</label>
                            <div className="flex flex-wrap gap-1.5">
                              {availableSquads.map(sq => {
                                const isAssigned = (zone.squadIds || []).includes(sq.id);
                                return (
                                  <button
                                    key={sq.id}
                                    type="button"
                                    onClick={() => {
                                      const currentSqIds = zone.squadIds || [];
                                      let updatedSqIds;
                                      if (isAssigned) {
                                        updatedSqIds = currentSqIds.filter(id => id !== sq.id);
                                      } else {
                                        updatedSqIds = [...currentSqIds, sq.id];
                                      }
                                      setNewCustomZones(prev => prev.map((z, idx) => idx === zIdx ? { ...z, squadIds: updatedSqIds } : z));
                                    }}
                                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                                      isAssigned 
                                        ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50' 
                                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                                    }`}
                                  >
                                    {isAssigned ? '✓ ' : '+ '}{sq.name}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="space-y-4 pt-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Target Ball Volume</label>
                      <input
                        type="number"
                        value={personalPlanBalls}
                        onChange={(e) => setPersonalPlanBalls(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Target Effort (RPE 1-10)</label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={personalPlanRPE}
                        onChange={(e) => setPersonalPlanRPE(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <label className="text-[10px] text-emerald-400 font-extrabold uppercase block border-b border-slate-800 pb-1">
                      📋 Planned Session Activities (5 Steps)
                    </label>
                    {personalActivities.map((act, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400 w-20">Activity {index + 1}:</span>
                        <input
                          type="text"
                          value={act}
                          onChange={(e) => {
                            const val = e.target.value;
                            setPersonalActivities(prev => prev.map((a, i) => i === index ? val : a));
                          }}
                          className="flex-grow bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                        />
                      </div>
                    ))}
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Technical Notes</label>
                    <textarea
                      rows="2"
                      value={personalPlanNotes}
                      onChange={(e) => setPersonalPlanNotes(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs py-3 rounded-xl transition-all shadow mt-2"
              >
                Save Session Plan to Cloud ✓
              </button>
            </form>

          </div>
        </div>
      )}

      {/* MODAL: CLUB ONBOARDING MODAL */}
      {showClubOnboardingModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                🏏 Club Onboarding Wizard
              </h3>
              <button onClick={() => setShowClubOnboardingModal(false)} className="text-slate-400 hover:text-white font-bold text-xs">
                ✕ Close
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setOnboardingTab('CREATE')}
                className={`py-2 rounded-lg font-bold transition-all ${
                  onboardingTab === 'CREATE' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                ➕ Create New Club
              </button>
              <button
                type="button"
                onClick={() => setOnboardingTab('JOIN')}
                className={`py-2 rounded-lg font-bold transition-all ${
                  onboardingTab === 'JOIN' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                🔑 Join Existing Club
              </button>
            </div>

            {onboardingTab === 'CREATE' ? (
              <form onSubmit={handleCreateClub} className="space-y-3 pt-1">
                <div>
                  <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Club Name</label>
                  <input
                    type="text"
                    value={newClubName}
                    onChange={(e) => setNewClubName(e.target.value)}
                    placeholder="e.g. Geelong Cricket Club"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-semibold"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Club Short Code / Identifier</label>
                  <input
                    type="text"
                    value={newClubCode}
                    onChange={(e) => setNewClubCode(e.target.value)}
                    placeholder="e.g. GCC or MCC"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-mono uppercase font-bold"
                  />
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
                  ℹ️ When creating a club, your role will automatically default to <strong>Admin</strong>.
                </div>

                <button
                  type="submit"
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs py-3 rounded-xl transition-all shadow mt-2"
                >
                  Create Club & Sync to Cloud ✓
                </button>
              </form>
            ) : (
              <form onSubmit={handleJoinClub} className="space-y-3 pt-1">
                <div>
                  <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Enter Club Invite Code</label>
                  <input
                    type="text"
                    value={joinClubCode}
                    onChange={(e) => setJoinClubCode(e.target.value)}
                    placeholder="e.g. MCC or ODCC"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-mono uppercase font-bold text-center tracking-widest text-emerald-400 text-sm"
                  />
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
                  ℹ️ When joining via invite code, your role defaults to <strong>Player</strong> and you will be unassigned from squads until an admin places you.
                </div>

                <button
                  type="submit"
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs py-3 rounded-xl transition-all shadow mt-2"
                >
                  Join Club Workspace ✓
                </button>
              </form>
            )}

          </div>
        </div>
      )}

      {/* MODAL: WORKLOAD VERIFICATION */}
      {completionTarget && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-extrabold text-base text-white">
                ✓ Verify & Log Workload
              </h3>
              <button onClick={() => setCompletionTarget(null)} className="text-slate-400 hover:text-white font-bold text-xs">
                ✕ Cancel
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Completed Session</span>
                <span className="font-bold text-white text-sm">{completionTarget.title}</span>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Actual Deliveries Bowled</label>
                <input
                  type="number"
                  value={actualBalls}
                  onChange={(e) => setActualBalls(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Perceived Exertion (RPE 1-10)</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={actualRPE}
                  onChange={(e) => setActualRPE(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Post-Session Soreness (1-10)</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={actualSoreness}
                  onChange={(e) => setActualSoreness(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white"
                />
              </div>

              <button
                onClick={async () => {
                  try {
                    const logData = {
                      userId: currentHuman.uid,
                      clubId: activeClubId,
                      planId: completionTarget.id,
                      scope: isPersonalWorkspace ? 'PERSONAL' : 'CLUB',
                      date: todayFormatted,
                      balls: Number(actualBalls),
                      rpe: Number(actualRPE),
                      soreness: Number(actualSoreness),
                      type: 'Verified Session',
                      notes: 'Completed "' + completionTarget.title + '"',
                      createdAt: new Date().toISOString()
                    };
                    
                    await addDoc(collection(db, 'logs'), logData);
                    setCompletionTarget(null);
                    triggerNotify('Logged ' + actualBalls + ' deliveries directly to Cloud Firestore ACWR engine! ✓', 'success');
                  } catch (err) {
                    console.error("CRITICAL ERROR logging workload to Firestore:", err);
                  }
                }}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs py-3 rounded-xl transition-all shadow mt-2"
              >
                Confirm & Update Cloud ACWR Engine ✓
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}