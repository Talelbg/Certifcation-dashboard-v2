
import { useState, useEffect, useCallback, useMemo } from 'react';
import { collection, onSnapshot, writeBatch, doc, Timestamp, setDoc, deleteDoc, addDoc, getDoc, updateDoc } from 'firebase/firestore';
import { signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { db, auth, googleProvider } from '../firebaseConfig';
import { DeveloperRecord, Event, CommunityMetaData, UserProfile, UserRole } from '../types';

export const useCloudStorage = () => {
    const [user, setUser] = useState<User | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [allUsers, setAllUsers] = useState<UserProfile[]>([]); // For Super Admin
    const [isConnected, setIsConnected] = useState(false);
    
    const [rawCloudData, setRawCloudData] = useState<DeveloperRecord[]>([]);
    const [rawCloudEvents, setRawCloudEvents] = useState<Event[]>([]);
    const [cloudMetaData, setCloudMetaData] = useState<Record<string, CommunityMetaData>>({});
    const [cloudRegisteredCommunities, setCloudRegisteredCommunities] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // --- AUTHENTICATION & PROFILE MANAGEMENT ---
    useEffect(() => {
        if (!auth) return;
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            setIsConnected(!!currentUser);
            
            if (currentUser && db) {
                // 1. Fetch or Create User Profile in Firestore
                const userRef = doc(db, 'users', currentUser.uid);
                const userSnap = await getDoc(userRef);

                if (userSnap.exists()) {
                    // Update last login
                    await updateDoc(userRef, { lastLogin: Timestamp.now() });
                    setUserProfile(userSnap.data() as UserProfile);
                } else {
                    // First time login logic
                    // Check if this is the VERY first user in the system to make them Super Admin automatically
                    // (Simplified logic for demo purposes - real production apps use Admin SDK scripts)
                    // Ideally, you'd query the collection size, but we'll check if the allUsers state is empty later or assume viewer.
                    
                    // For now, default to 'viewer'. The first manual update in DB makes someone admin, 
                    // OR specific hardcoded emails could be super_admin.
                    const isFirstUser = false; // Toggle this to true if you want the next login to be admin
                    
                    const newProfile: UserProfile = {
                        uid: currentUser.uid,
                        email: currentUser.email || '',
                        displayName: currentUser.displayName || 'User',
                        photoURL: currentUser.photoURL || undefined,
                        role: isFirstUser ? 'super_admin' : 'viewer', 
                        allowedCommunities: [],
                        createdAt: Timestamp.now(),
                        lastLogin: Timestamp.now()
                    };
                    await setDoc(userRef, newProfile);
                    setUserProfile(newProfile);
                }
            } else {
                setUserProfile(null);
                setRawCloudData([]);
                setRawCloudEvents([]);
                setAllUsers([]);
            }
        });
        return () => unsubscribe();
    }, []);

    // Listener for Profile Updates (e.g., if an admin changes your role while you are logged in)
    useEffect(() => {
        if (!user || !db) return;
        const unsub = onSnapshot(doc(db, 'users', user.uid), (doc) => {
            if (doc.exists()) {
                setUserProfile(doc.data() as UserProfile);
            }
        });
        return () => unsub();
    }, [user]);

    // Listener for ALL Users (Only if Super Admin)
    useEffect(() => {
        if (!user || !db || userProfile?.role !== 'super_admin') {
            setAllUsers([]);
            return;
        }
        const unsub = onSnapshot(collection(db, 'users'), (snap) => {
            const users: UserProfile[] = [];
            snap.forEach(d => users.push(d.data() as UserProfile));
            setAllUsers(users);
        });
        return () => unsub();
    }, [user, userProfile?.role]);


    const login = async () => {
        if (!auth) {
            alert("Firebase is not configured. Please update firebaseConfig.ts with your credentials.");
            return;
        }
        try {
            await signInWithPopup(auth, googleProvider);
        } catch (error) {
            console.error("Login failed", error);
        }
    };

    const logout = async () => {
        if (!auth) return;
        try {
            await signOut(auth);
            setUserProfile(null);
        } catch (error) {
            console.error("Logout failed", error);
        }
    };

    // --- DATA SYNCING (SCOPED) ---

    // 1. Subscribe to Developers (Fetch All, Filter in Memory for simplicity in React)
    // In a high-volume production app, you would use Firestore Queries (where 'communityCode', 'in', allowedCommunities)
    useEffect(() => {
        if (!db || !user || !userProfile) {
            setRawCloudData([]);
            return;
        }

        setIsLoading(true);
        const unsubscribe = onSnapshot(collection(db, 'developers'), (snapshot: any) => {
            const devs: DeveloperRecord[] = [];
            snapshot.forEach((doc: any) => {
                const data = doc.data();
                devs.push({
                    ...data,
                    enrollmentDate: data.enrollmentDate?.toDate ? data.enrollmentDate.toDate() : new Date(data.enrollmentDate),
                    completedAt: data.completedAt?.toDate ? data.completedAt.toDate() : (data.completedAt ? new Date(data.completedAt) : null),
                } as DeveloperRecord);
            });
            setRawCloudData(devs);
            setIsLoading(false);
        }, (error: any) => {
            console.error("Firestore subscription error (Developers):", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [user, userProfile]);

    // 2. Subscribe to Events
    useEffect(() => {
        if (!db || !user || !userProfile) {
            setRawCloudEvents([]);
            return;
        }

        const unsubscribe = onSnapshot(collection(db, 'events'), (snapshot: any) => {
            const events: Event[] = [];
            snapshot.forEach((doc: any) => {
                events.push({ id: doc.id, ...doc.data() } as Event);
            });
            setRawCloudEvents(events);
        }, (error: any) => {
            console.error("Firestore subscription error (Events):", error);
        });

        return () => unsubscribe();
    }, [user, userProfile]);

    // 3. Metadata & Settings
    useEffect(() => {
        if (!db || !user) return;
        const unsubMeta = onSnapshot(collection(db, 'community_metadata'), (snap) => {
            const meta: Record<string, CommunityMetaData> = {};
            snap.forEach(d => meta[d.id] = d.data() as CommunityMetaData);
            setCloudMetaData(meta);
        });
        const unsubSettings = onSnapshot(doc(db, 'settings', 'communities'), (snap) => {
            if (snap.exists()) setCloudRegisteredCommunities(snap.data().codes || []);
        });
        return () => { unsubMeta(); unsubSettings(); };
    }, [user]);

    // --- AUTHORIZATION & FILTERING LOGIC ---

    const cloudData = useMemo(() => {
        if (!userProfile) return [];
        if (userProfile.role === 'super_admin') return rawCloudData;
        if (userProfile.role === 'community_admin') {
            return rawCloudData.filter(d => userProfile.allowedCommunities.includes(d.communityCode));
        }
        return []; // Viewer sees nothing by default, or you can change this
    }, [rawCloudData, userProfile]);

    const cloudEvents = useMemo(() => {
        if (!userProfile) return [];
        if (userProfile.role === 'super_admin') return rawCloudEvents;
        if (userProfile.role === 'community_admin') {
            return rawCloudEvents.filter(e => 
                e.communityCode === 'All' || userProfile.allowedCommunities.includes(e.communityCode)
            );
        }
        return [];
    }, [rawCloudEvents, userProfile]);


    // --- ADMIN ACTIONS ---

    const updateUserRole = async (uid: string, role: UserRole) => {
        if (!db || userProfile?.role !== 'super_admin') return;
        await updateDoc(doc(db, 'users', uid), { role });
    };

    const updateUserCommunities = async (uid: string, communities: string[]) => {
        if (!db || userProfile?.role !== 'super_admin') return;
        await updateDoc(doc(db, 'users', uid), { allowedCommunities: communities });
    };

    // --- DATA ACTIONS ---

    const uploadBatch = useCallback(async (data: DeveloperRecord[]) => {
        if (!db || !user) return;
        setIsLoading(true);
        const batchSize = 500;
        const chunks = [];
        for (let i = 0; i < data.length; i += batchSize) chunks.push(data.slice(i, i + batchSize));

        try {
            for (const chunk of chunks) {
                const batch = writeBatch(db);
                chunk.forEach(dev => {
                    // SECURITY: Community Admin should strictly only upload for their allowed communities.
                    // This check is UI side; Firestore Security Rules should enforce it server side.
                    if (userProfile?.role === 'community_admin' && !userProfile.allowedCommunities.includes(dev.communityCode)) {
                        console.warn(`Skipping upload for ${dev.communityCode} - Not permitted.`);
                        return;
                    }

                    const ref = doc(db, 'developers', dev.developerId);
                    batch.set(ref, {
                        ...dev,
                        enrollmentDate: Timestamp.fromDate(dev.enrollmentDate),
                        completedAt: dev.completedAt ? Timestamp.fromDate(dev.completedAt) : null,
                        uploadedBy: user.email,
                        lastUpdated: Timestamp.now()
                    });
                });
                await batch.commit();
            }
        } catch (e) {
            console.error("Error uploading batch", e);
            alert("Error syncing data. Check console.");
        } finally {
            setIsLoading(false);
        }
    }, [user, userProfile]);

    // ... (Rest of the actions: saveCloudEvent, deleteCloudEvent etc. remain similar but use db)
    const saveCloudEvent = useCallback(async (event: Omit<Event, 'id'>, id?: string) => {
        if (!db || !user) return;
        try {
            if (id) await setDoc(doc(db, 'events', id), { ...event, updatedBy: user.email }, { merge: true });
            else await addDoc(collection(db, 'events'), { ...event, createdBy: user.email });
        } catch (e) { console.error(e); }
    }, [user]);

    const deleteCloudEvent = useCallback(async (id: string) => {
        if (!db || !user) return;
        try { await deleteDoc(doc(db, 'events', id)); } catch (e) { console.error(e); }
    }, [user]);

    const updateCloudCommunityMeta = useCallback(async (communityCode: string, meta: CommunityMetaData) => {
        if (!db || !user) return;
        try { await setDoc(doc(db, 'community_metadata', communityCode), { ...meta, updatedBy: user.email }, { merge: true }); } catch (e) { console.error(e); }
    }, [user]);

    const saveRegisteredCommunities = useCallback(async (codes: string[]) => {
        if (!db || !user) return;
        try { await setDoc(doc(db, 'settings', 'communities'), { codes, updatedBy: user.email }); } catch (e) { console.error(e); }
    }, [user]);

    return {
        user,
        userProfile,
        allUsers,
        isConnected,
        login,
        logout,
        cloudData, // This is now SCOPED based on role
        cloudEvents, // This is now SCOPED based on role
        cloudMetaData,
        cloudRegisteredCommunities,
        isLoading,
        uploadBatch,
        saveCloudEvent,
        deleteCloudEvent,
        updateCloudCommunityMeta,
        saveRegisteredCommunities,
        updateUserRole,
        updateUserCommunities
    };
};