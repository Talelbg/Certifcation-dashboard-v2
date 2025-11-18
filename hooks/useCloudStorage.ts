
import { useState, useEffect, useCallback } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, writeBatch, doc, Timestamp, setDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { DeveloperRecord, Event, CommunityMetaData } from '../types';

export const useCloudStorage = () => {
    const [isConnected, setIsConnected] = useState(false);
    const [db, setDb] = useState<any>(null);
    const [cloudData, setCloudData] = useState<DeveloperRecord[]>([]);
    const [cloudEvents, setCloudEvents] = useState<Event[]>([]);
    const [cloudMetaData, setCloudMetaData] = useState<Record<string, CommunityMetaData>>({});
    const [isLoading, setIsLoading] = useState(false);

    // Initialize Firebase
    const connect = useCallback((config: any) => {
        try {
            const app = !getApps().length ? initializeApp(config) : getApp();
            const firestore = getFirestore(app);
            setDb(firestore);
            setIsConnected(true);
            localStorage.setItem('firebaseConfig', JSON.stringify(config));
        } catch (error) {
            console.error("Firebase init error:", error);
            alert("Failed to connect to Firebase. Check console.");
        }
    }, []);

    const disconnect = useCallback(() => {
        setIsConnected(false);
        setDb(null);
        setCloudData([]);
        setCloudEvents([]);
        setCloudMetaData({});
        localStorage.removeItem('firebaseConfig');
    }, []);

    // Auto-connect if config exists
    useEffect(() => {
        const savedConfig = localStorage.getItem('firebaseConfig');
        if (savedConfig) {
            connect(JSON.parse(savedConfig));
        }
    }, [connect]);

    // --- SUBSCRIPTIONS ---

    // 1. Subscribe to Developers
    useEffect(() => {
        if (!db || !isConnected) return;

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
            setCloudData(devs);
            setIsLoading(false);
        }, (error: any) => {
            console.error("Firestore subscription error (Developers):", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [db, isConnected]);

    // 2. Subscribe to Events
    useEffect(() => {
        if (!db || !isConnected) return;

        const unsubscribe = onSnapshot(collection(db, 'events'), (snapshot: any) => {
            const events: Event[] = [];
            snapshot.forEach((doc: any) => {
                const data = doc.data();
                events.push({
                    id: doc.id,
                    ...data
                } as Event);
            });
            setCloudEvents(events);
        }, (error: any) => {
            console.error("Firestore subscription error (Events):", error);
        });

        return () => unsubscribe();
    }, [db, isConnected]);

    // 3. Subscribe to Community Metadata
    useEffect(() => {
        if (!db || !isConnected) return;

        const unsubscribe = onSnapshot(collection(db, 'community_metadata'), (snapshot: any) => {
            const meta: Record<string, CommunityMetaData> = {};
            snapshot.forEach((doc: any) => {
                meta[doc.id] = doc.data() as CommunityMetaData;
            });
            setCloudMetaData(meta);
        }, (error: any) => {
            console.error("Firestore subscription error (Metadata):", error);
        });

        return () => unsubscribe();
    }, [db, isConnected]);


    // --- ACTIONS ---

    // Upload CSV data to Firestore
    const uploadBatch = useCallback(async (data: DeveloperRecord[]) => {
        if (!db) return;
        
        setIsLoading(true);
        // Upload in batches of 500 (Firestore limit)
        const batchSize = 500;
        const chunks = [];
        for (let i = 0; i < data.length; i += batchSize) {
            chunks.push(data.slice(i, i + batchSize));
        }

        let totalUploaded = 0;
        
        try {
            for (const chunk of chunks) {
                const batch = writeBatch(db);
                chunk.forEach(dev => {
                    const ref = doc(db, 'developers', dev.developerId); // Use email as ID
                    batch.set(ref, {
                        ...dev,
                        enrollmentDate: Timestamp.fromDate(dev.enrollmentDate),
                        completedAt: dev.completedAt ? Timestamp.fromDate(dev.completedAt) : null
                    });
                });
                await batch.commit();
                totalUploaded += chunk.length;
            }
            console.log(`Successfully synced ${totalUploaded} records to the cloud.`);
        } catch (e) {
            console.error("Error uploading batch", e);
            alert("Error syncing data to cloud. See console.");
        } finally {
            setIsLoading(false);
        }
    }, [db]);

    // Event Actions
    const saveCloudEvent = useCallback(async (event: Omit<Event, 'id'>, id?: string) => {
        if (!db) return;
        try {
            if (id) {
                await setDoc(doc(db, 'events', id), event);
            } else {
                await addDoc(collection(db, 'events'), event);
            }
        } catch (e) {
            console.error("Error saving event", e);
            alert("Failed to save event to cloud.");
        }
    }, [db]);

    const deleteCloudEvent = useCallback(async (id: string) => {
        if (!db) return;
        try {
            await deleteDoc(doc(db, 'events', id));
        } catch (e) {
            console.error("Error deleting event", e);
            alert("Failed to delete event from cloud.");
        }
    }, [db]);

    // Metadata Actions
    const updateCloudCommunityMeta = useCallback(async (communityCode: string, meta: CommunityMetaData) => {
        if (!db) return;
        try {
            await setDoc(doc(db, 'community_metadata', communityCode), meta, { merge: true });
        } catch (e) {
            console.error("Error updating metadata", e);
        }
    }, [db]);


    return {
        isConnected,
        connect,
        disconnect,
        cloudData,
        cloudEvents,
        cloudMetaData,
        isLoading,
        uploadBatch,
        saveCloudEvent,
        deleteCloudEvent,
        updateCloudCommunityMeta
    };
};
