

import { useState, useEffect, useCallback, useMemo } from 'react';
import { collection, onSnapshot, writeBatch, doc, Timestamp, setDoc, deleteDoc, addDoc, getDoc, updateDoc, query, orderBy, limit } from 'firebase/firestore';
import { signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { db, auth, googleProvider } from '../firebaseConfig';
import { DeveloperRecord, Event, CommunityMetaData, UserProfile, UserRole, Campaign, ManagedCommunity } from '../types';

export const useCloudStorage = () => {
    const [user, setUser] = useState<User | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [allUsers, setAllUsers] = useState<UserProfile[]>([]); // For Super Admin
    const [isConnected, setIsConnected] = useState(false);
    
    const [rawCloudData, setRawCloudData] = useState<DeveloperRecord[]>([]);
    const [rawCloudEvents, setRawCloudEvents] = useState<Event[]>([]);
    const [cloudMetaData, setCloudMetaData] = useState<Record<string, CommunityMetaData>>({});
    const [cloudRegisteredCommunities, setCloudRegisteredCommunities] = useState<string[]>([]);
    const [cloudManagedCommunities, setCloudManagedCommunities] = useState<ManagedCommunity[]>([]); // From Firestore
    const [cloudCampaigns, setCloudCampaigns] = useState<Campaign[]>([]);
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
                setCloudCampaigns([]);
            }
        });
        return () => unsubscribe();
    }, []);

    // Listener for Profile Updates
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

    // 1. Subscribe to Developers
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

    // 3. Subscribe to Campaigns (Real Email History)
    useEffect(() => {
        if (!db || !user) {
            setCloudCampaigns([]);
            return;
        }

        const q = query(collection(db, 'campaigns'), orderBy('createdAt', 'desc'), limit(50));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const campaigns: Campaign[] = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                campaigns.push({
                    id: doc.id,
                    ...data,
                    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date()
                } as Campaign);
            });
            setCloudCampaigns(campaigns);
        });

        return () => unsubscribe();
    }, [user]);

    // 4. Metadata & Managed Communities
    useEffect(() => {
        if (!db || !user) return;
        
        const unsubMeta = onSnapshot(collection(db, 'community_metadata'), (snap) => {
            const meta: Record<string, CommunityMetaData> = {};
            snap.forEach(d => meta[d.id] = d.data() as CommunityMetaData);
            setCloudMetaData(meta);
        });

        // Legacy list support
        const unsubSettings = onSnapshot(doc(db, 'settings', 'communities'), (snap) => {
            if (snap.exists()) setCloudRegisteredCommunities(snap.data().codes || []);
        });

        // NEW: Managed Communities Collection
        const unsubManaged = onSnapshot(collection(db, 'managed_communities'), (snap) => {
            const managed: ManagedCommunity[] = [];
            snap.forEach(d => managed.push(d.data() as ManagedCommunity));
            setCloudManagedCommunities(managed);
        });

        return () => { unsubMeta(); unsubSettings(); unsubManaged(); };
    }, [user]);

    // --- AUTHORIZATION & FILTERING LOGIC ---

    const cloudData = useMemo(() => {
        if (!userProfile) return [];
        if (userProfile.role === 'super_admin') return rawCloudData;
        if (userProfile.role === 'community_admin') {
            return rawCloudData.filter(d => userProfile.allowedCommunities.includes(d.communityCode));
        }
        return []; 
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

    // MERGE: Combine CSV Detected Codes + Manual Codes
    const mergedCommunityList = useMemo(() => {
        const map = new Map<string, ManagedCommunity>();
        
        // 1. Add Manual Entries from Firestore
        cloudManagedCommunities.forEach(c => map.set(c.code, c));

        // 2. Detect from CSV Data (Cloud Data)
        // Only adding if not already present to preserve 'manual' status metadata
        rawCloudData.forEach(dev => {
            if (dev.communityCode && !map.has(dev.communityCode)) {
                map.set(dev.communityCode, {
                    code: dev.communityCode,
                    name: dev.communityCode,
                    source: 'csv',
                    createdAt: new Date() // Transient
                });
            }
        });
        
        return Array.from(map.values()).sort((a, b) => a.code.localeCompare(b.code));
    }, [cloudManagedCommunities, rawCloudData]);


    // --- ADMIN ACTIONS ---

    const updateUserRole = async (uid: string, role: UserRole) => {
        if (!db || userProfile?.role !== 'super_admin') return;
        await updateDoc(doc(db, 'users', uid), { role });
    };

    const updateUserCommunities = async (uid: string, communities: string[]) => {
        if (!db || userProfile?.role !== 'super_admin') return;
        await updateDoc(doc(db, 'users', uid), { allowedCommunities: communities });
    };

    const createManualCommunity = async (code: string, name: string, description?: string) => {
        if (!db || !user || userProfile?.role !== 'super_admin') return;
        await setDoc(doc(db, 'managed_communities', code), {
            code,
            name,
            description,
            source: 'manual',
            createdBy: user.email,
            createdAt: Timestamp.now()
        });
    };

    const deleteManualCommunity = async (code: string) => {
        if (!db || !user || userProfile?.role !== 'super_admin') return;
        await deleteDoc(doc(db, 'managed_communities', code));
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
                    if (userProfile?.role === 'community_admin' && !userProfile.allowedCommunities.includes(dev.communityCode)) {
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

    const createEmailCampaign = useCallback(async (campaignData: Omit<Campaign, 'id' | 'createdAt' | 'createdBy'>) => {
        if (!db || !user) return;
        try {
            await addDoc(collection(db, 'campaigns'), {
                ...campaignData,
                createdBy: user.email,
                createdAt: Timestamp.now()
            });
        } catch (e) {
            console.error("Error creating campaign", e);
            throw e;
        }
    }, [user]);

    return {
        user,
        userProfile,
        allUsers,
        isConnected,
        login,
        logout,
        cloudData,
        cloudEvents,
        cloudMetaData,
        cloudRegisteredCommunities,
        mergedCommunityList, // The unified list of CSV+Manual codes
        cloudCampaigns,
        isLoading,
        uploadBatch,
        saveCloudEvent,
        deleteCloudEvent,
        updateCloudCommunityMeta,
        saveRegisteredCommunities,
        updateUserRole,
        updateUserCommunities,
        createManualCommunity,
        deleteManualCommunity,
        createEmailCampaign
    };
};