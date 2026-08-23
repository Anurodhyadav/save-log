import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import {
  getDoc,
  setDoc,
  doc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp
} from 'firebase/firestore';
import { auth, db, trackerRef, depositsRef } from '../firebase';

const AppContext = createContext();

export const useAppContext = () => useContext(AppContext);

export const defaultSettings = {
  goal: 2000000,
  loan: 2000000,
  start: 202000,
  monthlyTarget: 120000
};

export const AppProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(undefined);
  const [loading, setLoading] = useState(true);
  const [syncState, setSyncState] = useState('synced'); // 'synced' | 'syncing' | 'error'
  const [settings, setSettings] = useState(defaultSettings);
  const [entries, setEntries] = useState([]);

  // Listen to Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setEntries([]);
        setLoading(false);
        return;
      }

      // Sync user doc
      const userDocRef = doc(db, 'users', currentUser.uid);
      try {
        await setDoc(userDocRef, {
          email: currentUser.email,
          displayName: currentUser.displayName || '',
          photoURL: currentUser.photoURL || '',
          lastSignIn: serverTimestamp()
        }, { merge: true });

        const snap = await getDoc(userDocRef);
        setIsAdmin(snap.exists() && snap.data().admin === true);
      } catch (err) {
        console.warn('Could not read user profile:', err);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    // Load settings once (and listen if changed)
    const unsubSettings = onSnapshot(trackerRef, (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        setSettings({
          goal: d.goal ?? defaultSettings.goal,
          loan: d.loan ?? defaultSettings.loan,
          start: d.start ?? defaultSettings.start,
          monthlyTarget: d.monthlyTarget ?? defaultSettings.monthlyTarget
        });
      }
    }, (err) => {
      console.error('Error loading settings', err);
      setSyncState('error');
    });

    // Real-time deposits listener
    const q = query(depositsRef, orderBy('date', 'asc'));
    const unsubDeposits = onSnapshot(q, (snapshot) => {
      const docs = [];
      snapshot.forEach((d) => {
        docs.push({ id: d.id, ...d.data() });
      });
      setEntries(docs);
      setSyncState('synced');
    }, (err) => {
      console.error('Deposits listener error', err);
      setSyncState('error');
    });

    return () => {
      unsubSettings();
      unsubDeposits();
    };
  }, [user]);

  const value = {
    user,
    isAdmin,
    loading,
    syncState,
    setSyncState,
    settings,
    setSettings,
    entries,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};
