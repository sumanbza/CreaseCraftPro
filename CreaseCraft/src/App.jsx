import React, { useState, useMemo, useEffect } from 'react';
import { auth, db } from './config/firebase';
import { getToken } from "firebase/messaging";
import { messaging } from "./config/firebase"; // Make sure 'messaging' is exported from your config file
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
  { key: 'broadcast_announcements', label: 'Broadcast Club & Squad Announcements', category: 'Communication' },
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

const IconGrid = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
  </svg>
);

const IconMegaphone = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 2L11 13" /><path d="M22 2l-7 20-4-9-9-4 20-7z" />
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
  const [onboardingError, setOnboardingError] = useState('');
  const [expandedMembers, setExpandedMembers] = useState({});
  const [expandedRoles, setExpandedRoles] = useState({});
  const [lastReadAnnouncementTime, setLastReadAnnouncementTime] = useState(() => {
    return localStorage.getItem('last_read_announcements') || '1970-01-01T00:00:00.000Z';
  });

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  const [newClubName, setNewClubName] = useState('');
  const [newClubAbbr, setNewClubAbbr] = useState('');
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
  const [announcements, setAnnouncements] = useState([]);
  const [drills, setDrills] = useState(DRILLS_LIBRARY);
  const [loading, setLoading] = useState(true);

  // Active Context
  const [activeClubId, setActiveClubId] = useState('club-personal');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [notification, setNotification] = useState(null);

  // Unified Training Hub Filtering & Pagination State
  const [trainingFeedPage, setTrainingFeedPage] = useState(1);
  const [clubPlansPage, setClubPlansPage] = useState(1);
  const [unifiedDateJump, setUnifiedDateJump] = useState('');
  const [trainingFilterType, setTrainingFilterType] = useState('ALL');
  const [expandedUnifiedSessionIds, setExpandedUnifiedSessionIds] = useState({});
  const [expandedClubPlanIds, setExpandedClubPlanIds] = useState({});
  const ITEMS_PER_PAGE = 5;

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
  const [newVisibleToPlayers, setNewVisibleToPlayers] = useState(true);

  // Announcement Modal State
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [newAnnTitle, setNewAnnTitle] = useState('');
  const [newAnnMessage, setNewAnnMessage] = useState('');
  const [newAnnTargetSquadId, setNewAnnTargetSquadId] = useState('ALL');

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
              discipline: 'Fast Bowler',
              bowlingArm: 'Right-Arm Fast'
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
            discipline: 'Fast Bowler',
            bowlingArm: 'Right-Arm Fast'
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
        discipline: 'Fast Bowler',
        bowlingArm: 'Right-Arm Fast'
      };
    }
    return { uid: 'guest-user', name: 'Guest Athlete', email: 'guest@creasecraft.pro', discipline: 'Fast Bowler', bowlingArm: 'Right-Arm Fast' };
  }, [userProfile]);

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

    const unSubAnnouncements = onSnapshot(collection(db, 'announcements'), (snapshot) => {
      const docsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAnnouncements(docsList);
    }, err => console.error("Announcements listener error:", err));

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
      unSubAnnouncements();
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
          discipline: 'Fast Bowler',
          bowlingArm: 'Right-Arm Fast',
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
    setActiveTab('dashboard');
    setAuthMode('SIGNIN');
    setShowAuthModal(true);
    triggerNotify('Signed out of CreaseCraft.', 'info');
  };

	  const requestPushNotifications = async () => {
	  if (!('Notification' in window)) {
		triggerNotify('This browser does not support push notifications.', 'info');
		return;
	  }
	  try {
		const permission = await Notification.requestPermission();
		if (permission === 'granted') {
		  triggerNotify('Push notification permissions granted! ✓', 'success');

		  // 1. Fetch the actual FCM device token
		  // Note: If you use a VAPID key in your web config, pass it as the second argument: getToken(messaging, { vapidKey: 'YOUR_VAPID_KEY' })
		  const currentToken = await getToken(messaging);

		  if (currentToken && auth?.currentUser) {
			// 2. Save both fcmPushEnabled and the actual fcmToken string to Firestore
			await updateDoc(doc(db, 'users', auth.currentUser.uid), {
			  fcmPushEnabled: true,
			  fcmToken: currentToken,
			  updatedAt: new Date().toISOString()
			});
			console.log("FCM Token saved successfully:", currentToken);
		  }
		} else {
		  triggerNotify('Notification permission denied.', 'info');
		}
	  } catch (err) {
		console.error("Error requesting push permission or token:", err);
	  }
	};

  const isPersonalWorkspace = activeClubId === 'club-personal';
  
  const currentClub = useMemo(() => {
    if (isPersonalWorkspace) {
      return { id: 'club-personal', name: 'Personal', code: 'IND', squads: [], customRoles: [] };
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
      if (!currentUserMembership) return true;

      const memberRoles = Array.isArray(currentUserMembership.roles) ? currentUserMembership.roles : [currentUserMembership.roles];
      const normalizedRoles = memberRoles.map(r => String(r || '').toLowerCase());

      if (normalizedRoles.some(r => r.includes('admin') || r.includes('coach') || r.includes('head'))) {
        return true;
      }

      const clubRolesDefinition = Array.isArray(currentClub.customRoles) ? currentClub.customRoles : [];
      for (const rName of memberRoles) {
        const foundRoleDef = clubRolesDefinition.find(def => def && def.name === rName);
        if (foundRoleDef && Array.isArray(foundRoleDef.capabilities)) {
          if (foundRoleDef.capabilities.includes('*') || foundRoleDef.capabilities.includes(capabilityKey)) {
            return true;
          }
        }
      }
      return true;
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

  const userAdminOrCoachClubs = useMemo(() => {
    return userMemberships.map(m => {
      const club = clubs.find(c => c.id === m.clubId);
      if (!club) return null;

      const roles = Array.isArray(m.roles) ? m.roles : [m.roles];
      const hasPrivilege = roles.some(r => {
        const lower = String(r || '').toLowerCase();
        return lower.includes('admin') || lower.includes('coach') || lower.includes('head');
      });

      return hasPrivilege ? club : null;
    }).filter(Boolean);
  }, [userMemberships, clubs]);

  const currentUserAssignedSquadIds = useMemo(() => {
    // If inside a specific club workspace, use that membership's squads
    if (!isPersonalWorkspace && currentUserMembership) {
      const sIds = currentUserMembership.squadIds;
      return Array.isArray(sIds) ? sIds : [sIds].filter(Boolean);
    }
    
    // If in Personal Mode, collect ALL squad IDs across ALL user memberships
    const allSquads = [];
    userMemberships.forEach(m => {
      if (Array.isArray(m.squadIds)) {
        allSquads.push(...m.squadIds);
      } else if (m.squadIds) {
        allSquads.push(m.squadIds);
      }
    });
    return [...new Set(allSquads)]; // Unique list of all squads the user belongs to
  }, [isPersonalWorkspace, currentUserMembership, userMemberships]);

  const unifiedTrainingFeed = useMemo(() => {
    const activeUid = currentHuman.uid || auth.currentUser?.uid;
    
    const rawPersonal = personalPlans.filter(p => 
      p.userId === activeUid || 
      p.userId === userProfile?.uid || 
      (auth.currentUser && p.userId === auth.currentUser.uid) ||
      !p.userId
    ).map(p => ({
      ...p,
      sourceType: 'PERSONAL',
      tagLabel: 'Personal',
      badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    }));

    const userClubIds = userMemberships.map(m => m.clubId);
    const isPlanCreatorOrAdmin = can('create_zone_plans') || can('edit_zone_plans');

    const rawClubPlans = zonePlans.filter(p => {
      if (!userClubIds.includes(p.clubId)) return false;
      if (p.visibleToPlayers === false && !isPlanCreatorOrAdmin) return false;
      return true;
    }).map(p => {
      const parentClub = clubs.find(c => c.id === p.clubId);
      const abbr = parentClub ? (parentClub.abbreviation || parentClub.code || 'CLUB') : 'CLUB';
      return {
        ...p,
        sourceType: 'CLUB',
        clubId: p.clubId,
        tagLabel: abbr,
        badgeColor: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
      };
    });

    let combined = [...rawPersonal, ...rawClubPlans];
    combined.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (trainingFilterType === 'PERSONAL') {
      combined = combined.filter(item => item.sourceType === 'PERSONAL');
    } else if (trainingFilterType !== 'ALL') {
      combined = combined.filter(item => item.sourceType === 'CLUB' && item.clubId === trainingFilterType);
    }

    if (unifiedDateJump) {
      combined = combined.filter(item => item.date === unifiedDateJump);
    }

    return combined;
  }, [personalPlans, zonePlans, userMemberships, clubs, currentHuman, userProfile, trainingFilterType, unifiedDateJump, can]);

  const paginatedUnifiedFeed = useMemo(() => {
    const start = (trainingFeedPage - 1) * ITEMS_PER_PAGE;
    return unifiedTrainingFeed.slice(start, start + ITEMS_PER_PAGE);
  }, [unifiedTrainingFeed, trainingFeedPage]);

  // Paginated Club Training Plans for Club Workspace
  const clubWorkspacePlans = useMemo(() => {
    return zonePlans.filter(p => p.clubId === activeClubId);
  }, [zonePlans, activeClubId]);

  const paginatedClubWorkspacePlans = useMemo(() => {
    const start = (clubPlansPage - 1) * ITEMS_PER_PAGE;
    return clubWorkspacePlans.slice(start, start + ITEMS_PER_PAGE);
  }, [clubWorkspacePlans, clubPlansPage]);

  // Announcements list
 const unifiedAnnouncements = useMemo(() => {
    // Get all club IDs the user is a member of
    const userClubIds = userMemberships.map(m => m.clubId);

    let list = announcements.filter(ann => {
      // If in a specific club management view, restrict to that club
      if (!isPersonalWorkspace) {
        return ann.clubId === activeClubId;
      }
      
      // In Personal Mode, only show announcements from clubs the user belongs to
      return userClubIds.includes(ann.clubId);
    });

    // Now filter by squad eligibility (Entire Club OR user's assigned squads)
    list = list.filter(ann => {
      const target = ann.targetSquadId || ann.squadId;
      if (!target || target.toUpperCase() === 'ALL' || target === '') {
        return true; // Club-wide broadcast
      }
      return currentUserAssignedSquadIds && currentUserAssignedSquadIds.includes(target);
    });

    list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    return list;
  }, [isPersonalWorkspace, announcements, activeClubId, userMemberships, currentUserAssignedSquadIds]);

  // Unread badge count (announcements created after lastReadAnnouncementTime)
  const unreadAnnouncementsCount = useMemo(() => {
    return unifiedAnnouncements.filter(ann => new Date(ann.createdAt || 0) > new Date(lastReadAnnouncementTime)).length;
  }, [unifiedAnnouncements, lastReadAnnouncementTime]);

  const handleOpenAnnouncementsTab = () => {
    setActiveTab('announcements');
    const nowISO = new Date().toISOString();
    setLastReadAnnouncementTime(nowISO);
    localStorage.setItem('last_read_announcements', nowISO);
  };

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
    if (!newClubName.trim() || !newClubCode.trim() || !newClubAbbr.trim()) return;
    
    const codeUpper = newClubCode.trim().toUpperCase();
    const abbrUpper = newClubAbbr.trim().toUpperCase();
    const activeUid = currentHuman.uid || auth.currentUser?.uid;

    try {
      const defaultSquadId = 'squad-1-' + Date.now();
      const defaultRoles = [
        { name: 'Admin', capabilities: ['*'] },
        { name: 'Player', capabilities: ['view_squad_schedule', 'log_own_workload'] },
        { name: 'Head Coach', capabilities: ['manage_squads', 'manage_roster', 'create_zone_plans', 'edit_zone_plans', 'view_full_schedule', 'view_squad_health_matrix', 'view_poll_results', 'broadcast_announcements'] }
      ];

      const clubDoc = await addDoc(collection(db, 'clubs'), {
        name: newClubName.trim(),
        abbreviation: abbrUpper,
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
      setActiveTab('allocator');
      setShowClubOnboardingModal(false);
      setNewClubName('');
      setNewClubAbbr('');
      setNewClubCode('');
      triggerNotify('Club created successfully! Assigned default role: Admin.', 'success');
    } catch (err) {
      console.error("Error creating club:", err);
    }
  };

  const handleJoinClub = async (e) => {
    e.preventDefault();
    setOnboardingError('');
    if (!joinClubCode.trim()) return;
    
    const targetCode = joinClubCode.trim().toUpperCase();
    const foundClub = clubs.find(c => c.code.toUpperCase() === targetCode);
    const activeUid = currentHuman.uid || auth.currentUser?.uid;
    
    if (!foundClub) {
      setOnboardingError('No club found with code "' + targetCode + '". Check code and try again.');
      return;
    }

    const existing = memberships.find(m => (m.userId === activeUid || m.userId === currentHuman.uid) && m.clubId === foundClub.id);
    if (existing) {
      setOnboardingError('You are already a member of this club!');
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
      setOnboardingError('');
      triggerNotify('Successfully joined ' + foundClub.name + ' as Player!', 'success');
    } catch (err) {
      console.error("Error joining club:", err);
      setOnboardingError('Failed to join club. Please try again.');
    }
  };

  const handleOpenCreateZonePlanModal = (planToEdit = null) => {
    if (planToEdit) {
      setEditingPlanId(planToEdit.id);
      setNewPlanTitle(planToEdit.title || '');
      setNewPlanDate(planToEdit.date || todayFormatted);
      setNewPlanTime(planToEdit.timeSlots?.[0]?.time || '6:00 PM - 7:30 PM');
      setNewPollEnabled(planToEdit.pollEnabled !== false);
      setNewVisibleToPlayers(planToEdit.visibleToPlayers !== false);
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
      setNewVisibleToPlayers(true);
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
      setNewPlanTitle('Personal Throwdowns & Run-up Rhythm');
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
          visibleToPlayers: newVisibleToPlayers,
          timeSlots: updatedTimeSlots
        });
        triggerNotify('Updated club training plan & player visibility! ✓', 'success');
      } else {
        await addDoc(collection(db, 'zone_plans'), {
          clubId: activeClubId,
          title: newPlanTitle || 'Training Night Microcycle',
          date: newPlanDate,
          pollEnabled: newPollEnabled,
          visibleToPlayers: newVisibleToPlayers,
          timeSlots: updatedTimeSlots,
          createdAt: new Date().toISOString()
        });
        triggerNotify('Published club training plan with player visibility flag! ✓', 'success');
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
          title: newPlanTitle || 'Personal Session',
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
          title: newPlanTitle || 'Personal Session',
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

  const handleSaveAnnouncement = async (e) => {
    e.preventDefault();
    if (!newAnnTitle.trim() || !newAnnMessage.trim()) return;

    try {
      await addDoc(collection(db, 'announcements'), {
        clubId: activeClubId,
        title: newAnnTitle.trim(),
        message: newAnnMessage.trim(),
        targetSquadId: newAnnTargetSquadId,
        authorName: currentHuman.name,
        createdAt: new Date().toISOString()
      });
      setNewAnnTitle('');
      setNewAnnMessage('');
      setNewAnnTargetSquadId('ALL');
      setShowAnnouncementModal(false);
      triggerNotify('Broadcast announcement published to Firestore! ✓', 'success');
    } catch (err) {
      console.error("Error publishing announcement:", err);
    }
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

    const athleteDiscipline = currentHuman.discipline || '';
    const isSpin = athleteDiscipline.toLowerCase().includes('spin');
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
            <p className="text-xs text-slate-400">Enterprise Club & Personal Athlete Suite</p>
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

            <button
              type="submit"
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs py-3.5 rounded-xl transition-all shadow mt-2"
            >
              {authMode === 'SIGNIN' ? "Let's Play" : 'I Love Cricket'}
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
            
            {userAdminOrCoachClubs.length > 0 && (
              <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl text-xs">
                <span className="text-[10px] text-slate-400 font-bold uppercase">MANAGING:</span>
                <select
                  value={activeClubId}
                  onChange={(e) => {
                    setActiveClubId(e.target.value);
                    if (e.target.value !== 'club-personal') {
                      setActiveTab('allocator');
                    } else {
                      setActiveTab('dashboard');
                    }
                    triggerNotify('Switched management workspace context.', 'info');
                  }}
                  className="bg-slate-900 text-emerald-400 font-extrabold focus:outline-none cursor-pointer"
                >
                  <option value="club-personal">Personal Mode</option>
                  {userAdminOrCoachClubs.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.abbreviation || c.code})</option>
                  ))}
                </select>
              </div>
            )}

            <button
              onClick={() => {
                setShowClubOnboardingModal(true);
                setOnboardingError('');
              }}
              className="bg-slate-950 hover:bg-slate-800 text-emerald-400 border border-slate-800 font-bold px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition-all text-xs shadow"
            >
              <IconPlus /> Manage / Join Club
            </button>

            <button
              onClick={requestPushNotifications}
              className="bg-slate-950 hover:bg-slate-800 text-indigo-400 border border-slate-800 font-bold px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition-all text-xs shadow"
            >
              🔔 Enable Push
            </button>

            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1 rounded-xl text-xs">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <div className="text-left">
                <span className="font-bold text-slate-100 block text-[11px]">{currentHuman.name}</span>
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
        
        {/* CONTEXTUAL NAVIGATION TABS */}
        <div className="flex border-b border-slate-800 mb-6 overflow-x-auto">
          {isPersonalWorkspace ? (
            <>
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
                <IconUser /> Training Planner
              </button>

              <button
                onClick={handleOpenAnnouncementsTab}
                className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-xs transition-all relative ${
                  activeTab === 'announcements' ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5' : 'border-transparent text-slate-400'
                }`}
              >
                <IconMegaphone /> Announcements & Notices
                {unreadAnnouncementsCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-[9px] font-black bg-rose-500 text-white rounded-full animate-pulse">
                    {unreadAnnouncementsCount}
                  </span>
                )}
              </button>
            </>
          ) : (
            <>
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
                  <IconGrid /> Club Training Planner
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
                onClick={handleOpenAnnouncementsTab}
                className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-xs transition-all relative ${
                  activeTab === 'announcements' ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5' : 'border-transparent text-slate-400'
                }`}
              >
                <IconMegaphone /> Announcements & Notices
                {unreadAnnouncementsCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-[9px] font-black bg-rose-500 text-white rounded-full animate-pulse">
                    {unreadAnnouncementsCount}
                  </span>
                )}
              </button>
            </>
          )}
        </div>

        {/* TAB 1: PERSONAL ACWR ANALYTICS */}
        {isPersonalWorkspace && activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-extrabold text-white">{currentHuman.name}</h2>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Athlete Suite | Arm: {currentHuman.bowlingArm}
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
                  <IconPlus /> Plan Personal Session
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

        {/* TAB 2: UNIFIED TRAINING PLANNER */}
        {isPersonalWorkspace && activeTab === 'personal-planner' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
                  <IconUser /> Training Planner & Club Schedule Hub
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Manage your personal workouts and view assigned club training sessions in one unified feed.
                </p>
              </div>
              <button
                onClick={() => handleOpenPersonalPlanModal()}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs px-4 py-2.5 rounded-xl transition-all shadow flex items-center gap-1.5"
              >
                <IconPlus /> Plan Personal Session
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              <div className="lg:col-span-2 space-y-4">
                
                {/* FILTER CONTROLS BAR: Radio Filters + Date Jumper */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3 text-xs">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <span className="font-bold text-slate-200">
                      Training Sessions Found ({unifiedTrainingFeed.length})
                    </span>

                    {/* CALENDAR DATE JUMPER */}
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 font-semibold">📅 Jump to Date:</span>
                      <input
                        type="date"
                        value={unifiedDateJump}
                        onChange={(e) => {
                          setUnifiedDateJump(e.target.value);
                          setTrainingFeedPage(1);
                        }}
                        className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                      {unifiedDateJump && (
                        <button
                          onClick={() => { setUnifiedDateJump(''); setTrainingFeedPage(1); }}
                          className="bg-slate-950 hover:bg-slate-800 text-emerald-400 border border-slate-800 px-3 py-1.5 rounded-xl font-bold"
                        >
                          Show All
                        </button>
                      )}
                    </div>
                  </div>

                  {/* RADIO BUTTON FILTERS */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800">
                    <span className="text-slate-400 font-semibold mr-2">Filter By:</span>
                    
                    <label className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border cursor-pointer transition-all ${trainingFilterType === 'ALL' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 font-bold' : 'bg-slate-950 text-slate-300 border-slate-800'}`}>
                      <input
                        type="radio"
                        name="trainingFilter"
                        checked={trainingFilterType === 'ALL'}
                        onChange={() => { setTrainingFilterType('ALL'); setTrainingFeedPage(1); }}
                        className="accent-emerald-500"
                      />
                      All
                    </label>

                    <label className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border cursor-pointer transition-all ${trainingFilterType === 'PERSONAL' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 font-bold' : 'bg-slate-950 text-slate-300 border-slate-800'}`}>
                      <input
                        type="radio"
                        name="trainingFilter"
                        checked={trainingFilterType === 'PERSONAL'}
                        onChange={() => { setTrainingFilterType('PERSONAL'); setTrainingFeedPage(1); }}
                        className="accent-emerald-500"
                      />
                      Personal
                    </label>

                    {userMemberships.map(m => {
                      const c = clubs.find(cl => cl.id === m.clubId);
                      if (!c) return null;
                      const isSelected = trainingFilterType === c.id;
                      return (
                        <label key={c.id} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border cursor-pointer transition-all ${isSelected ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 font-bold' : 'bg-slate-950 text-slate-300 border-slate-800'}`}>
                          <input
                            type="radio"
                            name="trainingFilter"
                            checked={isSelected}
                            onChange={() => { setTrainingFilterType(c.id); setTrainingFeedPage(1); }}
                            className="accent-emerald-500"
                          />
                          {c.abbreviation || c.code || c.name}
                        </label>
                      );
                    })}
                  </div>
                </div>

                {unifiedTrainingFeed.length === 0 ? (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-3">
                    <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto text-xl">
                      🏏
                    </div>
                    <h4 className="font-bold text-sm text-white">No Training Sessions Found</h4>
                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                      {unifiedDateJump ? `No sessions found for date ${unifiedDateJump}.` : "No sessions available for the selected filter."}
                    </p>
                    {unifiedDateJump && (
                      <button
                        onClick={() => setUnifiedDateJump('')}
                        className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs px-4 py-2 rounded-xl transition-all inline-flex items-center gap-1.5"
                      >
                        Clear Date Filter
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {paginatedUnifiedFeed.map(item => {
                      const isPersonal = item.sourceType === 'PERSONAL';
                      const isPastPlan = item.date < todayFormatted;
                      const isVerified = globalLogs.some(log => log.notes?.includes(item.title));
                      const isExpanded = !!expandedUnifiedSessionIds[item.id];

                      const slot = item.timeSlots?.[0];
                      const availableSquads = clubs.find(c => c.id === item.clubId)?.squads || [];
                      const allCustomZones = slot?.customZones || [];
                      const sessionPollResponses = pollResponses.filter(pr => pr.planId === item.id);
                      const attendingCount = sessionPollResponses.filter(pr => pr.status === 'ATTENDING').length;
                      const declinedCount = sessionPollResponses.filter(pr => pr.status === 'DECLINED').length;
                      const maybeCount = sessionPollResponses.filter(pr => pr.status === 'MAYBE').length;
                      const activeUserUid = currentHuman.uid || auth.currentUser?.uid;
                      const myPollResponse = sessionPollResponses.find(pr => pr.userId === activeUserUid);
                      const isPollClosed = item.date < todayFormatted;

                      return (
                        <div 
                          key={item.id} 
                          className={`border rounded-2xl p-4 transition-all ${
                            isPastPlan 
                              ? 'bg-slate-900/60 border-slate-800/80 text-slate-400' 
                              : 'bg-slate-900 border-slate-800 text-slate-100'
                          }`}
                        >
                          {/* COLLAPSIBLE HEADER (Date is BIGGER and BOLDER) */}
                          <div 
                            onClick={() => setExpandedUnifiedSessionIds(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                            className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 cursor-pointer select-none"
                          >
                            <div className="flex items-center gap-3">
                              <span className={`text-xs font-bold px-2 py-0.5 rounded border ${isPastPlan ? 'bg-slate-800 text-slate-500 border-slate-700' : item.badgeColor}`}>
                                {isPersonal ? '👤 Personal' : `🏏 ${item.tagLabel}`}
                              </span>
                              <div>
                                <h3 className={`font-black text-base tracking-tight ${isPastPlan ? 'text-slate-300' : 'text-white'}`}>
                                  📅 {item.date}
                                </h3>
                                <h4 className={`font-semibold text-xs mt-0.5 ${isPastPlan ? 'text-slate-400' : 'text-slate-200'}`}>
                                  {item.title} — <span className="text-slate-400">⏰ {isPersonal ? item.time : (slot?.time || '6:00 PM - 7:30 PM')}</span>
                                </h4>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 ml-auto sm:ml-0">
                              <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${isPastPlan ? 'bg-slate-800/60 text-slate-400' : 'bg-slate-950 text-slate-300 border border-slate-800'}`}>
                                {isExpanded ? '▲ Collapse' : '▼ Expand'}
                              </span>
                            </div>
                          </div>

                          {/* COLLAPSIBLE BODY CONTENT */}
                          {isExpanded && (
                            <div className="space-y-4 pt-4 mt-3 border-t border-slate-800/80 animate-fadeIn">
                              {isPersonal ? (
                                <>
                                  <div className="flex flex-wrap items-center gap-2 justify-end">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (isPastPlan) return;
                                        handleOpenPersonalPlanModal(item);
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
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        try {
                                          const duplicatedPlan = {
                                            userId: currentHuman.uid || auth.currentUser?.uid,
                                            title: item.title + ' (Copy)',
                                            date: nextWeekFormatted,
                                            time: item.time || '4:00 PM - 5:30 PM',
                                            balls: item.balls || 36,
                                            rpe: item.rpe || 7,
                                            notes: item.notes || '',
                                            activities: item.activities || [],
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
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        if (isPastPlan) return;
                                        const planRef = doc(db, 'personal_plans', item.id);
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
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (!isVerified) {
                                            setCompletionTarget({
                                              planId: item.id,
                                              id: item.id,
                                              title: item.title,
                                              balls: item.balls || 36,
                                              rpe: item.rpe || 7
                                            });
                                            setActualBalls(item.balls || 36);
                                            setActualRPE(item.rpe || 7);
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

                                  <div className="grid grid-cols-2 gap-3 text-xs">
                                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Target Volume</span>
                                      <span className="font-bold text-emerald-400 text-sm">{item.balls || 36} Deliveries</span>
                                    </div>
                                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Target Effort (RPE)</span>
                                      <span className="font-bold text-amber-400 text-sm">RPE {item.rpe || 7} / 10</span>
                                    </div>
                                  </div>

                                  {item.activities && item.activities.some(a => a && a.trim() !== '') && (
                                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5">
                                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Planned Session Activities</span>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                        {item.activities.map((act, i) => act && act.trim() ? (
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
                                </>
                              ) : (
                                <>
                                  {/* CLUB SESSION DETAILS */}
                                  {item.pollEnabled !== false && (
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
                                          onClick={async (e) => {
                                            e.stopPropagation();
                                            if (isPollClosed) return;
                                            if (myPollResponse) {
                                              await updateDoc(doc(db, 'poll_responses', myPollResponse.id), { status: 'ATTENDING', updatedAt: new Date().toISOString() });
                                            } else {
                                              await addDoc(collection(db, 'poll_responses'), {
                                                planId: item.id,
                                                clubId: item.clubId,
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
                                          onClick={async (e) => {
                                            e.stopPropagation();
                                            if (isPollClosed) return;
                                            if (myPollResponse) {
                                              await updateDoc(doc(db, 'poll_responses', myPollResponse.id), { status: 'DECLINED', updatedAt: new Date().toISOString() });
                                            } else {
                                              await addDoc(collection(db, 'poll_responses'), {
                                                planId: item.id,
                                                clubId: item.clubId,
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
                                          onClick={async (e) => {
                                            e.stopPropagation();
                                            if (isPollClosed) return;
                                            if (myPollResponse) {
                                              await updateDoc(doc(db, 'poll_responses', myPollResponse.id), { status: 'MAYBE', updatedAt: new Date().toISOString() });
                                            } else {
                                              await addDoc(collection(db, 'poll_responses'), {
                                                planId: item.id,
                                                clubId: item.clubId,
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
                                                <span>Batters: <strong className="text-slate-200">{typeof lane.batters === 'string' ? lane.batters : 'Unassigned'}</strong></span>
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

                                    {allCustomZones.map((zone, zIdx) => (
                                      <div key={zone.id || zIdx} className="bg-slate-950 p-3.5 rounded-xl border border-indigo-500/30 space-y-2">
                                        <span className="font-extrabold text-xs text-indigo-400 block border-b border-slate-800 pb-1">
                                          🏟️ {zone.title || `Zone ${zIdx + 2}`}
                                        </span>
                                        <div className="bg-slate-900 p-2 rounded border border-slate-800 text-[11px] space-y-1">
                                          <span className="text-slate-200 font-semibold block">
                                            {zone.activityText || 'No activity specified'}
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>

                                  {isPastPlan ? (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (!isVerified) {
                                          setCompletionTarget({
                                            planId: item.id,
                                            id: item.id,
                                            title: item.title,
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
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* PAGINATION CONTROLS */}
                    {unifiedTrainingFeed.length > ITEMS_PER_PAGE && (
                      <div className="flex justify-between items-center bg-slate-900 border border-slate-800 p-3 rounded-xl text-xs">
                        <span className="text-slate-400 font-semibold">
                          Showing page {trainingFeedPage} of {Math.ceil(unifiedTrainingFeed.length / ITEMS_PER_PAGE)}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setTrainingFeedPage(p => Math.max(1, p - 1))}
                            disabled={trainingFeedPage === 1}
                            className={`px-3 py-1.5 rounded-lg font-bold border transition-all ${
                              trainingFeedPage === 1 ? 'bg-slate-950 text-slate-600 border-slate-800 cursor-not-allowed' : 'bg-slate-950 text-slate-200 border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            ← Previous
                          </button>
                          <button
                            onClick={() => setTrainingFeedPage(p => (p * ITEMS_PER_PAGE < unifiedTrainingFeed.length ? p + 1 : p))}
                            disabled={trainingFeedPage * ITEMS_PER_PAGE >= unifiedTrainingFeed.length}
                            className={`px-3 py-1.5 rounded-lg font-bold border transition-all ${
                              trainingFeedPage * ITEMS_PER_PAGE >= unifiedTrainingFeed.length ? 'bg-slate-950 text-slate-600 border-slate-800 cursor-not-allowed' : 'bg-slate-950 text-slate-200 border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            Next →
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
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

        {/* TAB 3: SQUAD HEALTH MATRIX */}
        {!isPersonalWorkspace && activeTab === 'matrix' && (
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

        {/* TAB 4: CLUB TRAINING PLANNER */}
        {!isPersonalWorkspace && activeTab === 'allocator' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <IconGrid /> Club Training Planner & Net Allocations
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Design multi-zone training sessions, net lanes, and live attendance tracking for {currentClub.name}.</p>
              </div>
              <button
                onClick={() => handleOpenCreateZonePlanModal()}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs px-4 py-2.5 rounded-xl transition-all shadow flex items-center gap-1.5"
              >
                <IconPlus /> Create Club Training Plan
              </button>
            </div>

            <div className="space-y-4">
              {clubWorkspacePlans.length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-xs text-slate-400">
                  No club training plans published yet for {currentClub.name}. Click the button above to create your first session!
                </div>
              ) : (
                <div className="space-y-4">
                  {paginatedClubWorkspacePlans.map(plan => {
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

                    const isVisibleToPlayers = plan.visibleToPlayers !== false;
                    const isExpanded = !!expandedClubPlanIds[plan.id];

                    return (
                      <div key={plan.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                        
                        <div 
                          onClick={() => setExpandedClubPlanIds(prev => ({ ...prev, [plan.id]: !prev[plan.id] }))}
                          className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 cursor-pointer select-none"
                        >
                          <div>
                            <h3 className="font-black text-base text-white tracking-tight">
                              📅 {plan.date}
                            </h3>
                            <h4 className="font-semibold text-xs text-slate-200 mt-0.5">
                              {plan.title} — <span className="text-slate-400">⏰ {slot?.time || '6:00 PM - 7:30 PM'}</span>
                            </h4>
                          </div>

                          <div className="flex items-center gap-3 ml-auto sm:ml-0">
                            <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold border ${isVisibleToPlayers ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                              {isVisibleToPlayers ? '👁️ Visible to Players' : '🔒 Hidden from Players'}
                            </span>
                            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-950 text-slate-300 border border-slate-800">
                              {isExpanded ? '▲ Collapse' : '▼ Expand'}
                            </span>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="space-y-4 pt-4 mt-3 border-t border-slate-800 animate-fadeIn">
                            <div className="flex flex-wrap items-center gap-2 justify-end">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
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

                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  try {
                                    const duplicatedZonePlan = {
                                      clubId: plan.clubId || activeClubId,
                                      title: plan.title + ' (Copy)',
                                      date: nextWeekFormatted,
                                      pollEnabled: plan.pollEnabled !== false,
                                      visibleToPlayers: true,
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

                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
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
                            </div>

                            {plan.pollEnabled !== false && (
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
                        )}

                      </div>
                    );
                  })}

                  {clubWorkspacePlans.length > ITEMS_PER_PAGE && (
                    <div className="flex justify-between items-center bg-slate-900 border border-slate-800 p-3 rounded-xl text-xs">
                      <span className="text-slate-400 font-semibold">
                        Showing page {clubPlansPage} of {Math.ceil(clubWorkspacePlans.length / ITEMS_PER_PAGE)}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setClubPlansPage(p => Math.max(1, p - 1))}
                          disabled={clubPlansPage === 1}
                          className={`px-3 py-1.5 rounded-lg font-bold border transition-all ${
                            clubPlansPage === 1 ? 'bg-slate-950 text-slate-600 border-slate-800 cursor-not-allowed' : 'bg-slate-950 text-slate-200 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          ← Previous
                        </button>
                        <button
                          onClick={() => setClubPlansPage(p => (p * ITEMS_PER_PAGE < clubWorkspacePlans.length ? p + 1 : p))}
                          disabled={clubPlansPage * ITEMS_PER_PAGE >= clubWorkspacePlans.length}
                          className={`px-3 py-1.5 rounded-lg font-bold border transition-all ${
                            clubPlansPage * ITEMS_PER_PAGE >= clubWorkspacePlans.length ? 'bg-slate-950 text-slate-600 border-slate-800 cursor-not-allowed' : 'bg-slate-950 text-slate-200 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          Next →
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        
        {/* TAB 5: ANNOUNCEMENTS & NOTICES */}
        {activeTab === 'announcements' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                  <IconMegaphone /> Club & Squad Announcements Board
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isPersonalWorkspace 
                    ? "Important notices and broadcasts across all your clubs." 
                    : `Important notices, weather updates, and broadcasts for ${currentClub.name}.`}
                </p>
              </div>

              {can('broadcast_announcements') && (
                <button
                  onClick={() => setShowAnnouncementModal(true)}
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs px-4 py-2.5 rounded-xl transition-all shadow flex items-center gap-1.5"
                >
                  <IconPlus /> Post Broadcast Notice
                </button>
              )}
            </div>

            <div className="space-y-4">
              {(() => {
				  console.log("DEBUG ANNOUNCEMENTS FEED:", {
					  unifiedAnnouncements,
					  currentUserAssignedSquadIds,
					  isPersonalWorkspace,
					  userMemberships
					});
                const filteredAnnouncements = unifiedAnnouncements.filter(ann => {
				  const target = ann.targetSquadId || ann.squadId;
				  
				  // 1. Club-wide broadcasts are visible to everyone
				  if (!target || target.toUpperCase() === 'ALL' || target === '') {
					return true;
				  }
				  
				  // 2. Admins and Coaches should see all squad announcements within their club workspace
				  // (Check if current user has admin/coach capability or if they are managing the club)
				  if (!isPersonalWorkspace && can('broadcast_announcements')) {
					return true;
				  }
				  
				  // 3. Regular players only see it if they belong to that specific squad
				  return typeof currentUserAssignedSquadIds !== 'undefined' && currentUserAssignedSquadIds.includes(target);
				});

                return filteredAnnouncements.length === 0 ? (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-xs text-slate-400">
                    No announcements found.
                  </div>
                ) : (
                  filteredAnnouncements.map(ann => {
                    const parentClub = clubs.find(c => c.id === ann.clubId);
                    const clubAbbr = parentClub ? (parentClub.abbreviation || parentClub.code) : '';
                    const targetSquadName = ann.targetSquadId === 'ALL' ? 'Entire Club' : (parentClub?.squads?.find(s => s.id === ann.targetSquadId)?.name || 'Targeted Squad');
                    
                    return (
                      <div key={ann.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-800 pb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-extrabold text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded border border-indigo-500/20">
                                {isPersonalWorkspace && clubAbbr ? `🏏 ${clubAbbr} — ` : ''}📢 {targetSquadName}
                              </span>
                              <h3 className="font-bold text-base text-white">{ann.title}</h3>
                            </div>
                            <span className="text-xs text-slate-400 mt-1 block">Posted by <strong className="text-slate-200">{ann.authorName}</strong> | 📅 {ann.createdAt?.split('T')[0]}</span>
                          </div>

                          {can('broadcast_announcements') && (
                            <button
                              onClick={async () => {
                                await deleteDoc(doc(db, 'announcements', ann.id));
                                triggerNotify('Announcement deleted.', 'info');
                              }}
                              className="bg-slate-950 hover:bg-rose-950/40 text-rose-400 border border-slate-800 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                            >
                              Delete Notice
                            </button>
                          )}
                        </div>

                        <p className="text-xs text-slate-200 leading-relaxed bg-slate-950 p-4 rounded-xl border border-slate-800">
                          {ann.message}
                        </p>
                      </div>
                    );
                  })
                );
              })()}
            </div>
          </div>
        )}

{/* TAB 6: CLUB ROSTER & CAPABILITY MATRIX */}
{!isPersonalWorkspace && can('manage_roster') && activeTab === 'roster' && (
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

    {/* DYNAMIC CAPABILITY MATRIX ROLE BUILDER (ALPHABETICAL STACKED CARDS) */}
    {can('configure_roles') && (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
        
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-slate-800 pb-5">
          <div>
            <h3 className="font-extrabold text-sm text-slate-100 flex items-center gap-2">
              🛠️ Dynamic Role Builder & Capability Matrix
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Create custom roles and toggle capabilities directly on each role card below.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full lg:w-auto">
            <input
              type="text"
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              placeholder="New Role Name (e.g. S&C Coach)"
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 w-full sm:w-60"
            />
            <button
              type="button"
              onClick={async () => {
                if (!newRoleName.trim()) return;
                const roleObj = { name: newRoleName.trim(), capabilities: [] };
                const clubRef = doc(db, 'clubs', activeClubId);
                const existingRoles = Array.isArray(currentClub.customRoles) ? currentClub.customRoles : [];
                await updateDoc(clubRef, {
                  customRoles: [...existingRoles, roleObj]
                });
                setNewRoleName('');
                triggerNotify(`Created custom role "${roleObj.name}"! Now assign capabilities below.`, 'success');
              }}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs px-4 py-2 rounded-xl transition-all shadow whitespace-nowrap"
            >
              + Create Role
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
            Active Club Roles & Full Capability Audit Matrix (Alphabetical Order)
          </span>

          <div className="space-y-3">
            {(Array.isArray(currentClub.customRoles) ? currentClub.customRoles : [])
              .slice()
              .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
              .map((rDef, index) => {
                const isProtectedRole = rDef.name === 'Admin' || rDef.name === 'Player';
                const isAdminRole = rDef.name === 'Admin';
                const isRoleExpanded = expandedRoles[rDef.name] ?? false;

                return (
                  <div key={index} className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-lg transition-all">
                    
                    {/* Role Header (Click to Toggle Collapse) */}
                    <div 
                      className="flex justify-between items-center cursor-pointer select-none"
                      onClick={() => {
                        setExpandedRoles(prev => ({ ...prev, [rDef.name]: !isRoleExpanded }));
                      }}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-extrabold text-sm text-white">🏷️ {rDef.name}</h4>
                          {isProtectedRole && (
                            <span className="text-[9px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/20 font-bold">
                              System Role
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {isAdminRole ? 'Full system administrator access (*)' : `${Array.isArray(rDef.capabilities) ? rDef.capabilities.length : 0} of ${MASTER_CAPABILITIES_CATALOGUE.length} capabilities assigned`}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-xs text-indigo-400 bg-indigo-500/10 px-3 py-1.5 rounded-xl border border-indigo-500/20 font-bold transition-all hover:bg-indigo-500/20">
                          {isRoleExpanded ? '▲ Collapse Matrix' : '▼ Expand Matrix'}
                        </span>

                        {!isProtectedRole && (
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              const clubRef = doc(db, 'clubs', activeClubId);
                              const updated = currentClub.customRoles.filter(r => r.name !== rDef.name);
                              await updateDoc(clubRef, { customRoles: updated });
                              triggerNotify(`Removed role "${rDef.name}"`, 'info');
                            }}
                            className="text-slate-500 hover:text-rose-400 font-bold text-xs bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800 transition-all"
                          >
                            🗑️ Delete
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Collapsible Capability Grid */}
                    {isRoleExpanded && (
                      <div className="border-t border-slate-800/80 pt-4 space-y-3 animate-fadeIn">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">
                          {isAdminRole ? 'All Permissions Enabled' : 'Click capability chips to toggle permissions:'}
                        </span>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
                          {MASTER_CAPABILITIES_CATALOGUE.map(cap => {
                            const hasCap = isAdminRole || (Array.isArray(rDef.capabilities) && rDef.capabilities.includes(cap.key));

                            return (
                              <button
                                key={cap.key}
                                type="button"
                                disabled={isAdminRole}
                                onClick={async () => {
                                  if (isAdminRole) return;

                                  const currentCaps = Array.isArray(rDef.capabilities) ? rDef.capabilities : [];
                                  let newCaps;
                                  if (hasCap) {
                                    newCaps = currentCaps.filter(c => c !== cap.key);
                                  } else {
                                    newCaps = [...currentCaps, cap.key];
                                  }

                                  const updatedRoles = currentClub.customRoles.map(r => r.name === rDef.name ? { ...r, capabilities: newCaps } : r);
                                  const clubRef = doc(db, 'clubs', activeClubId);
                                  await updateDoc(clubRef, { customRoles: updatedRoles });
                                  triggerNotify(`Updated capabilities for "${rDef.name}" ✓`, 'success');
                                }}
                                className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                                  isAdminRole 
                                    ? 'bg-emerald-500/10 text-emerald-300/80 border-emerald-500/30 cursor-default' 
                                    : hasCap 
                                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 font-bold shadow' 
                                      : 'bg-slate-900 text-slate-500 border-slate-800 hover:border-slate-700'
                                }`}
                              >
                                <span className="truncate pr-2">{cap.label}</span>
                                <span className="text-xs font-mono font-bold">{hasCap ? '✓' : '+'}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                  </div>
                );
              })}
          </div>
        </div>

      </div>
    )}

    {/* SQUAD & ROSTER MANAGEMENT */}
    <div className="space-y-6">
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
        <div className="border-b border-slate-800 pb-3 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
              👥 Active Club Roster ({memberships.filter(m => m.clubId === activeClubId).length} Members)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Sorted alphabetically. Click to expand controls for roles and squads.</p>
          </div>
        </div>

        <div className="space-y-3">
          {memberships
            .filter(m => m.clubId === activeClubId)
            .slice()
            .sort((a, b) => {
              const nameA = resolveMemberFullName(a.userId) || '';
              const nameB = resolveMemberFullName(b.userId) || '';
              return nameA.localeCompare(nameB);
            })
            .map(m => {
              const displayName = resolveMemberFullName(m.userId);
              const isExpanded = expandedMembers[m.id] ?? false;
              
              const currentRoles = Array.isArray(m.roles) ? m.roles : [m.roles || 'Player'];
              const currentSquadIds = Array.isArray(m.squadIds) ? m.squadIds : [m.squadIds || ''];

              const availableRoleNames = (Array.isArray(currentClub.customRoles) ? currentClub.customRoles : [
                { name: 'Admin' },
                { name: 'Player' },
                { name: 'Head Coach' }
              ]).map(r => r.name);

              const availableSquads = currentClub.squads || [];

              return (
                <div key={m.id} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-4 transition-all">
                  
                  <div 
                    className="flex justify-between items-center cursor-pointer select-none"
                    onClick={() => {
                      setExpandedMembers(prev => ({ ...prev, [m.id]: !isExpanded }));
                    }}
                  >
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-sm text-white">{displayName}</span>
                        {currentRoles.map((r, i) => (
                          <span key={i} className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] px-2 py-0.5 rounded font-bold">
                            {r}
                          </span>
                        ))}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                        {m.email || 'Email: N/A'}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs text-indigo-400 bg-indigo-500/10 px-3 py-1.5 rounded-xl border border-indigo-500/20 font-bold transition-all hover:bg-indigo-500/20">
                        {isExpanded ? '▲ Collapse' : '▼ Expand Controls'}
                      </span>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-slate-800/80 pt-4 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 text-xs">
                      
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full lg:w-auto">
                        
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

                      </div>

                      <button
                        onClick={async () => {
                          const memRef = doc(db, 'memberships', m.id);
                          await deleteDoc(memRef);
                          triggerNotify('Removed member from club roster.', 'info');
                        }}
                        className="bg-slate-900 hover:bg-rose-950/40 text-rose-400 border border-slate-800 px-3 py-1.5 rounded-xl font-bold transition-all text-xs whitespace-nowrap self-end lg:self-center"
                      >
                        Remove Member
                      </button>

                    </div>
                  )}

                </div>
              );
            })}
        </div>
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
                🏏 Create / Edit Club Training Plan
              </h3>
              <button onClick={() => setShowCreatePlanModal(false)} className="text-slate-400 hover:text-white font-bold text-xs">
                ✕ Close
              </button>
            </div>

            <form onSubmit={handleSaveZonePlan} className="space-y-4">
              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Session Title</label>
                <input
                  type="text"
                  value={newPlanTitle}
                  onChange={(e) => setNewPlanTitle(e.target.value)}
                  placeholder="e.g. Tuesday Night Main Squad Microcycle"
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
                    placeholder="e.g. 6:00 PM - 7:30 PM"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <div className="bg-slate-950 p-4 rounded-xl border border-emerald-500/30 space-y-3">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-3">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-200 font-bold">
                      <input
                        type="checkbox"
                        checked={newPollEnabled}
                        onChange={(e) => setNewPollEnabled(e.target.checked)}
                        className="accent-emerald-500 rounded h-4 w-4"
                      />
                      Enable Attendance Poll for this Session
                    </label>

                    <label className={`flex items-center gap-2 cursor-pointer text-xs font-bold ${newPlanDate < todayFormatted ? 'opacity-50 cursor-not-allowed' : 'text-emerald-400'}`}>
                      <input
                        type="checkbox"
                        disabled={newPlanDate < todayFormatted}
                        checked={newVisibleToPlayers}
                        onChange={(e) => setNewVisibleToPlayers(e.target.checked)}
                        className="accent-emerald-500 rounded h-4 w-4"
                      />
                      👁️ Visible to Players
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

              <button
                type="submit"
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs py-3 rounded-xl transition-all shadow mt-2"
              >
                Save club training plan ✓
              </button>
            </form>

          </div>
        </div>
      )}

      {/* MODAL: POST ANNOUNCEMENT MODAL */}
      {showAnnouncementModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                📢 Broadcast Notice
              </h3>
              <button onClick={() => setShowAnnouncementModal(false)} className="text-slate-400 hover:text-white font-bold text-xs">
                ✕ Close
              </button>
            </div>

            <form onSubmit={handleSaveAnnouncement} className="space-y-3 pt-1 text-xs">
              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Notice Title</label>
                <input
                  type="text"
                  value={newAnnTitle}
                  onChange={(e) => setNewAnnTitle(e.target.value)}
                  placeholder="e.g. Wet Weather Training Shift"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white font-semibold"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Target Audience</label>
                <select
                  value={newAnnTargetSquadId}
                  onChange={(e) => setNewAnnTargetSquadId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white"
                >
                  <option value="ALL">Entire Club (All Squads)</option>
                  {(currentClub.squads || []).map(sq => (
                    <option key={sq.id} value={sq.id}>{sq.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Message</label>
                <textarea
                  rows="4"
                  value={newAnnMessage}
                  onChange={(e) => setNewAnnMessage(e.target.value)}
                  placeholder="Type your broadcast message here..."
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white leading-relaxed"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs py-3 rounded-xl transition-all shadow mt-2"
              >
                Broadcast Notice to Club Members ✓
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
                onClick={() => { setOnboardingTab('CREATE'); setOnboardingError(''); }}
                className={`py-2 rounded-lg font-bold transition-all ${
                  onboardingTab === 'CREATE' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                ➕ Create New Club
              </button>
              <button
                type="button"
                onClick={() => { setOnboardingTab('JOIN'); setOnboardingError(''); }}
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
                  <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Club Abbreviation (Tag)</label>
                  <input
                    type="text"
                    value={newClubAbbr}
                    onChange={(e) => setNewClubAbbr(e.target.value)}
                    placeholder="e.g. UTSC"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-mono uppercase font-bold"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Club Invite Code</label>
                  <input
                    type="text"
                    value={newClubCode}
                    onChange={(e) => setNewClubCode(e.target.value)}
                    placeholder="e.g. UTSC123"
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
                  Create club
                </button>
              </form>
            ) : (
              <form onSubmit={handleJoinClub} className="space-y-3 pt-1">
                {onboardingError && (
                  <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-3 rounded-xl text-xs font-bold text-center">
                    ⚠️ {onboardingError}
                  </div>
                )}

                <div>
                  <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Enter Club Invite Code</label>
                  <input
                    type="text"
                    value={joinClubCode}
                    onChange={(e) => { setJoinClubCode(e.target.value); setOnboardingError(''); }}
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
                  Join club
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