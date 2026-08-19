import React, { useState, useEffect, useRef } from 'react';
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import {
  getDoc,
  setDoc,
  addDoc,
  deleteDoc,
  doc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { auth, googleProvider, db, trackerRef, depositsRef } from './firebase';

const defaultSettings = {
  goal: 2000000,
  loan: 2000000,
  start: 202000,
  monthlyTarget: 120000
};

export default function App() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncState, setSyncState] = useState('synced'); // 'synced' | 'syncing' | 'error'

  const [settings, setSettings] = useState(defaultSettings);
  const [entries, setEntries] = useState([]);

  // Form states
  const [date, setDate] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const amountInputRef = useRef(null);

  // Set today's date initially
  const getTodayStr = () => {
    const d = new Date();
    return d.getFullYear() + '-'
      + String(d.getMonth() + 1).padStart(2, '0') + '-'
      + String(d.getDate()).padStart(2, '0');
  };

  useEffect(() => {
    setDate(getTodayStr());
  }, []);

  // Listen to Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setIsAdmin(false);
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
        console.warn('Could not read user profile (defaulting to viewer):', err);
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);


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

  const handleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error('Sign-in error', err);
      alert('Sign-in failed: ' + err.message);
    }
  };

  const handleSignOut = () => {
    signOut(auth);
  };

  // Helper formats
  const fmt = (n) => {
    n = Math.round(n || 0);
    return 'Rs ' + n.toLocaleString('en-IN');
  };

  const monthKey = (dateStr) => dateStr.slice(0, 7);

  console.log("THE ENTRIES", entries)

  // Calculations
  const totalEntries = entries.reduce((s, e) => s + (e.amount || 0), 0);
  const totalSaved = settings.start + totalEntries;
  const pct = settings.goal > 0 ? Math.min(100, (totalSaved / settings.goal) * 100) : 0;
  const remaining = Math.max(0, settings.goal - totalSaved);

  const totalLand = settings.goal + settings.loan;
  const savingsPct = totalLand > 0 ? (settings.goal / totalLand) * 100 : 50;
  const loanPct = 100 - savingsPct;

  const byMonth = {};
  entries.forEach((e) => {
    const k = monthKey(e.date);
    byMonth[k] = (byMonth[k] || 0) + e.amount;
  });
  const monthKeys = Object.keys(byMonth);
  const avg = monthKeys.length > 0 ? totalEntries / monthKeys.length : 0;

  // Render Triangle Border (inline SVG generators)
  const renderTriangles = (flip) => {
    const colors = ['#A8322D', '#D9A404', '#2B4570', '#3F6B4C'];
    const w = 20, h = 12;
    const triangles = [];
    for (let i = 0; i * w < 680; i++) {
      const x = i * w;
      const color = colors[i % colors.length];
      const pts = flip
        ? `${x},0 ${x + w},0 ${x + w / 2},${h}`
        : `${x},${h} ${x + w},${h} ${x + w / 2},0`;
      triangles.push(
        <polygon key={i} points={pts} fill={color} opacity="0.85" />
      );
    }
    return triangles;
  };

  // ETA and Pace calculations
  let etaText = '-';
  let paceNoteText = '';
  if (remaining <= 0) {
    etaText = 'Goal reached';
    paceNoteText = 'You have hit your savings target. Time to talk to the bank about the loan portion.';
  } else if (avg > 0) {
    const monthsLeft = Math.ceil(remaining / avg);
    const d = new Date();
    d.setMonth(d.getMonth() + monthsLeft);
    etaText = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
    if (avg >= settings.monthlyTarget) {
      paceNoteText = `You are saving at or above your ${fmt(settings.monthlyTarget)}/month target. Keep this pace.`;
    } else {
      paceNoteText = `Your average is below the ${fmt(settings.monthlyTarget)}/month target, so this date will slip further behind schedule.`;
    }
  } else {
    const monthsAtTarget = settings.monthlyTarget > 0 ? Math.ceil(remaining / settings.monthlyTarget) : 0;
    const d2 = new Date();
    d2.setMonth(d2.getMonth() + monthsAtTarget);
    etaText = monthsAtTarget > 0 ? d2.toLocaleString('en-US', { month: 'short', year: 'numeric' }) : '-';
    paceNoteText = 'Log your first deposit to start tracking your actual pace.';
  }

  // Update setting handler
  const handleSettingChange = (field, value) => {
    if (!isAdmin) return;
    const parsed = parseFloat(value) || 0;
    const updated = { ...settings, [field]: parsed };
    setSettings(updated);

    setSyncState('syncing');
    setDoc(trackerRef, {
      ...updated,
      updatedAt: serverTimestamp(),
      updatedBy: auth.currentUser ? auth.currentUser.uid : null
    }, { merge: true })
      .then(() => setSyncState('synced'))
      .catch((err) => {
        console.error('Save settings error', err);
        setSyncState('error');
      });
  };

  // Add Transaction
  const handleAddDeposit = (e) => {
    e.preventDefault();
    if (!isAdmin) return;
    const parsedAmt = parseFloat(amount);
    if (!parsedAmt) {
      setErrorMsg('Enter valid amount.');
      return;
    }
    setErrorMsg('');
    setSyncState('syncing');

    addDoc(depositsRef, {
      date: date || getTodayStr(),
      amount: parsedAmt,
      note: note.trim(),
      createdAt: serverTimestamp(),
      createdBy: auth.currentUser ? auth.currentUser.uid : null
    })
      .then(() => {
        setSyncState('synced');
        setAmount('');
        setNote('');
        setDate(getTodayStr());
        amountInputRef.current?.focus();
      })
      .catch((err) => {
        console.error('Add Transaction error', err);
        setSyncState('error');
      });
  };

  // Remove deposit
  const handleRemoveDeposit = (id) => {
    if (!isAdmin) return;
    setSyncState('syncing');
    deleteDoc(doc(depositsRef, id))
      .then(() => setSyncState('synced'))
      .catch((err) => {
        console.error('Remove deposit error', err);
        setSyncState('error');
      });
  };

  // Reset tracker
  const handleReset = async () => {
    if (!isAdmin) return;
    if (!window.confirm('Reset all tracker data? This will delete ALL deposits and restore default settings. This cannot be undone.')) return;

    setSyncState('syncing');
    try {
      const batch = writeBatch(db);
      entries.forEach((e) => {
        batch.delete(doc(depositsRef, e.id));
      });
      await batch.commit();

      await setDoc(trackerRef, {
        ...defaultSettings,
        updatedAt: serverTimestamp(),
        updatedBy: auth.currentUser ? auth.currentUser.uid : null
      });
      setSyncState('synced');
    } catch (err) {
      console.error('Reset error', err);
      setSyncState('error');
    }
  };

  // Grouped entries rendering
  const getGroupedEntries = () => {
    const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
    const groups = [];
    const groupMap = {};

    sorted.forEach((e) => {
      const k = monthKey(e.date);
      if (!groupMap[k]) {
        groupMap[k] = { key: k, entries: [], total: 0 };
        groups.push(groupMap[k]);
      }
      groupMap[k].entries.push(e);
      groupMap[k].total += e.amount;
    });
    return groups;
  };

  const calculateEntries = () => {
    const deposits = entries.filter((e) => e.amount > 0).length;
    const withdrawals = entries.filter((e) => e.amount < 0).length;

    if (deposits === 0 && withdrawals === 0) return '0 transactions';
    if (withdrawals === 0) return `${deposits} ${deposits === 1 ? 'deposit' : 'deposits'}`;
    if (deposits === 0) return `${withdrawals} ${withdrawals === 1 ? 'withdrawal' : 'withdrawals'}`;
    return `${deposits} ${deposits === 1 ? 'deposit' : 'deposits'}, ${withdrawals} ${withdrawals === 1 ? 'withdrawal' : 'withdrawals'}`;
  }

  if (loading) {
    return (
      <div id="lft-loading-overlay">
        <div className="spinner"></div>
        <p>Loading tracker…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <div id="lft-auth-bar">
          <span className="font-mono text-base md:text-xl font-semibold">Saving Fund Tracker</span>
        </div>
        <div id="lft-signin-prompt" className='w-full h-screen flex flex-col justify-center items-center'>
          <div className='text-[10px] font-mono md:text-base'>Sign in to view saving tracker</div>
          <p className='font-mono'>This tracker is private. Please sign in with your Google account to continue.</p>
          <button id="lft-signin-prompt-btn" className='border border-[#D9D3C0] rounded' onClick={handleSignIn}>
            Sign in with Google
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <div id="lft-auth-bar" className="flex items-center justify-between px-4 py-2 bg-[#262220] text-[#EFE9D8] min-h-[46px]">
        <span className="font-semibold tracking-wide text-sm md:text-base opacity-90 font-serif">Saving Fund</span>
        <div className="flex items-center gap-2.5">
          <div id="lft-sync-status" className="flex items-center gap-1.5 text-xs text-[#7A6E5D]">
            <span className={`dot ${syncState !== 'synced' ? syncState : ''}`} id="lft-sync-dot"></span>
            <span id="lft-sync-text">{syncState === 'synced' ? 'Synced' : syncState === 'syncing' ? 'Saving…' : 'Error'}</span>
          </div>
          <span id="lft-role-badge" className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase ${isAdmin ? 'bg-[#3F6B4C] text-[#D8EAE0]' : 'bg-[#4a3f2f] text-[#C4BAA9]'}`}>
            {isAdmin ? 'Admin' : 'Viewer'}
          </span>
          {user.photoURL && <img id="lft-user-avatar" src={user.photoURL} alt="User avatar" className="w-7 h-7 rounded-full object-cover border border-[#7A6E5D]" />}
          <span id="lft-user-name" className="text-xs text-[#C4BAA9] hidden sm:inline">{user.displayName || user.email}</span>
          <button id="lft-signout-btn" className="px-3 py-1 border border-[#4a3f2f] rounded text-xs text-[#7A6E5D] hover:border-[#A8322D] hover:color-[#A8322D] transition-colors" onClick={handleSignOut}>Sign out</button>
        </div>
      </div>

      <div id="lft-main" className="block px-4 py-6 md:py-8">
        <div className="w-full max-w-[680px] mx-auto font-sans text-[#262220]">

          {!isAdmin && (
            <div id="lft-viewer-notice" className="mb-4 p-2.5 bg-[#F0EBD8] border border-[#D9D3C0] border-l-[3px] border-l-[#D9A404] text-xs text-[#7A6E5D]">
              👁 You are viewing in <strong>read-only</strong> mode. Contact the tracker owner to request admin access.
            </div>
          )}

          <div className="flex justify-between items-end mb-1">
            <div>
              <div className="text-[10px] md:text-xs tracking-widest uppercase text-[#7A6E5D]">
                Janakpur land fund
              </div>
              <div className="font-mono text-base md:text-xl font-semibold text-[#262220]">
                Rs 40,00,000
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] md:text-xs text-[#7A6E5D]">Saved so far</div>
              <div className="font-mono text-base md:text-xl font-bold text-[#3F6B4C]" id="lft-saved-total">
                {fmt(totalSaved)}
              </div>
            </div>
          </div>

          <svg width="100%" height="14" viewBox="0 0 680 14" className="block my-2.5 md:my-3">
            <g id="lft-border-top">{renderTriangles(false)}</g>
          </svg>

          <div className="border border-[#262220] p-[2px]">
            <div className="relative flex flex-col md:flex-row h-24 md:h-11 bg-[repeating-linear-gradient(90deg,#EFE9D8,#EFE9D8_33px,#E3DCC7_33px,#E3DCC7_34px)]">


              <div
                id="lft-savings-zone"
                className="relative flex items-center justify-center overflow-hidden border-b-2 md:border-b-0 md:border-r-2 border-dashed border-[#262220] shrink-0"
                style={{ flexBasis: `${savingsPct}%` }}
              >
                <div
                  id="lft-savings-fill"
                  className="absolute inset-0 bg-[#3F6B4C] transition-[width] duration-500 ease"
                  style={{ width: `${pct}%` }}
                ></div>
                <span className="relative z-10 font-mono text-[9px] md:text-[11px] font-bold text-[#1E3324] bg-white/55 px-1.5 py-0.5 rounded">
                  SAVINGS GOAL · {fmt(settings.goal)}
                </span>
              </div>

              {/* Loan zone */}
              <div
                id="lft-loan-zone"
                className="relative flex items-center justify-center bg-[repeating-linear-gradient(45deg,#DDE4E0,#DDE4E0_6px,#C7D2CB_6px,#C7D2CB_12px)] shrink-0"
                style={{ flexBasis: `${loanPct}%` }}
              >
                <span className="font-mono text-[9px] md:text-[11px] font-bold text-[#2B4570] bg-white/55 px-1.5 py-0.5 rounded">
                  LOAN GOAL {fmt(settings.loan)}
                </span>
              </div>

            </div>
          </div>

          <svg width="100%" height="14" viewBox="0 0 680 14" className="block mt-1 mb-5 md:mb-6">
            <g id="lft-border-bottom">{renderTriangles(true)}</g>
          </svg>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5">
            <div className="bg-[#F2EFE4] border border-[#D9D3C0] p-2.5 md:p-3">
              <div className="text-[10px] md:text-xs text-[#7A6E5D]">Progress</div>
              <div className="font-mono text-base md:text-lg font-bold">{Math.round(pct)}%</div>
            </div>
            <div className="bg-[#F2EFE4] border border-[#D9D3C0] p-2.5 md:p-3">
              <div className="text-[10px] md:text-xs text-[#7A6E5D]">Remaining</div>
              <div className="font-mono text-base md:text-lg font-bold">{fmt(remaining)}</div>
            </div>
            <div className="bg-[#F2EFE4] border border-[#D9D3C0] p-2.5 md:p-3">
              <div className="text-[10px] md:text-xs text-[#7A6E5D]">Avg / month</div>
              <div className="font-mono text-base md:text-lg font-bold">{avg > 0 ? fmt(avg) : '-'}</div>
            </div>
            <div className="bg-[#F2EFE4] border border-[#D9D3C0] p-2.5 md:p-3">
              <div className="text-[10px] md:text-xs text-[#7A6E5D]">On track for</div>
              <div className="font-mono text-base md:text-lg font-bold">{etaText}</div>
            </div>
          </div>

          <div id="lft-pace-note" className="text-xs md:text-sm text-[#7A6E5D] -mt-3 mb-5">
            {paceNoteText}
          </div>

          {/* Goal settings */}
          <details className={`lft-editor-only ${!isAdmin ? 'disabled-for-viewer' : ''} mb-5 border border-[#D9D3C0] bg-[#FBF8F0]`}>
            <summary className="cursor-pointer p-2.5 md:p-3 text-xs md:text-sm font-semibold text-[#262220]">
              Goal settings
            </summary>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5 px-3 pb-3">
              <label className="text-[11px] text-[#7A6E5D]">Target savings (Rs)
                <input
                  type="number"
                  value={settings.goal}
                  onChange={(e) => handleSettingChange('goal', e.target.value)}
                  disabled={!isAdmin}
                  step="1000"
                  className="w-full font-mono text-xs px-2 py-1.5 border border-[#D9D3C0] rounded mt-1 bg-white"
                />
              </label>
              <label className="text-[11px] text-[#7A6E5D]">Loan amount (Rs)
                <input
                  type="number"
                  value={settings.loan}
                  onChange={(e) => handleSettingChange('loan', e.target.value)}
                  disabled={!isAdmin}
                  step="1000"
                  className="w-full font-mono text-xs px-2 py-1.5 border border-[#D9D3C0] rounded mt-1 bg-white"
                />
              </label>
              <label className="text-[11px] text-[#7A6E5D]">Starting balance already saved (Rs)
                <input
                  type="number"
                  value={settings.start}
                  onChange={(e) => handleSettingChange('start', e.target.value)}
                  disabled={!isAdmin}
                  step="1000"
                  className="w-full font-mono text-xs px-2 py-1.5 border border-[#D9D3C0] rounded mt-1 bg-white"
                />
              </label>
              <label className="text-[11px] text-[#7A6E5D]">Monthly target (Rs)
                <input
                  type="number"
                  value={settings.monthlyTarget}
                  onChange={(e) => handleSettingChange('monthlyTarget', e.target.value)}
                  disabled={!isAdmin}
                  step="1000"
                  className="w-full font-mono text-xs px-2 py-1.5 border border-[#D9D3C0] rounded mt-1 bg-white"
                />
              </label>
            </div>
          </details>

          {/* Add Transaction form */}
          <form
            onSubmit={handleAddDeposit}
            className={`lft-editor-only ${!isAdmin ? 'disabled-for-viewer' : ''} flex flex-col sm:flex-row items-stretch sm:items-end gap-3 mb-2`}
          >
            <label className="text-[11px] text-[#7A6E5D] flex-1">Date
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={!isAdmin}
                className="w-full font-mono text-xs pl-2.5 pr-8 py-1.5 border border-[#262220] rounded mt-1 bg-white appearance-none"
              />
            </label>
            <label className="text-[11px] text-[#7A6E5D] flex-1">Amount (Rs)
              <input
                type="number"
                ref={amountInputRef}
                value={amount}
                onChange={(e) => { setAmount(e.target.value); setErrorMsg(''); }}
                disabled={!isAdmin}
                step="100"
                placeholder="500"
                className="w-full font-mono text-xs px-2.5 py-1.5 border border-[#262220] rounded mt-1 bg-white"
              />
            </label>
            <label className="text-[11px] text-[#7A6E5D] flex-[1.5]">Note (optional)
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                disabled={!isAdmin}
                placeholder="daily savings, salary top-up..."
                className="w-full text-xs px-2.5 py-1.5 border border-[#262220] rounded mt-1 bg-white"
              />
            </label>
            <button
              type="submit"
              disabled={!isAdmin}
              className="px-4 py-1.5 bg-[#3F6B4C] text-[#F2EFE4] border border-[#262220] rounded text-xs font-semibold hover:bg-[#32563d] transition-colors cursor-pointer self-stretch sm:self-auto h-[32px] mt-1 sm:mt-0"
            >
              Add Transaction
            </button>
          </form>

          {errorMsg && (
            <div id="lft-entry-error" className="text-xs text-[#A8322D] my-1">
              {errorMsg}
            </div>
          )}

          <div className="flex justify-between items-baseline mt-6 mb-2">
            <div className="text-xs md:text-sm font-semibold">Statement</div>
            <div className="text-[11px] md:text-xs text-[#7A6E5D]">
              {calculateEntries()}
            </div>
          </div>

          <div id="lft-entries-wrap" className="max-h-72 overflow-y-auto pr-1 border-t border-[#D9D3C0]">
            {entries.length === 0 ? (
              <div className="text-xs md:text-sm text-[#7A6E5D] py-3.5">
                No deposits logged yet.{isAdmin && ' Add your first one above.'}
              </div>
            ) : (
              getGroupedEntries().map((group) => {
                const dMonth = new Date(group.key + '-01T00:00:00');
                const label = dMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' });

                return (
                  <div key={group.key} className="mb-4">
                    <div className="flex justify-between items-center py-2.5 mt-1 border-b border-[#262220] text-xs font-bold tracking-wider uppercase text-[#262220]">
                      <span>{label}</span>
                      <span className="lft-num font-mono">{fmt(group.total)}</span>
                    </div>

                    {group.entries.map((entry) => {
                      const dEntry = new Date(entry.date + 'T00:00:00');
                      const dayLabel = dEntry.toLocaleString('en-US', { day: '2-digit', month: 'short' });

                      return (
                        <div key={entry.id} className="flex justify-between items-center py-2 border-b border-[#EFE9D8] text-xs md:text-sm">
                          <span className="text-[#262220] flex gap-2.5 items-baseline">
                            <span className="lft-num font-mono text-[11px] md:text-xs text-[#7A6E5D] min-w-[52px]">{dayLabel}</span>
                            {entry.note && <span className="text-[#7A6E5D] text-xs">{entry.note}</span>}
                          </span>
                          <span className="flex items-center gap-2.5">
                            <span className="lft-num font-mono font-semibold">{fmt(entry.amount)}</span>
                            {isAdmin && (
                              <button
                                onClick={() => handleRemoveDeposit(entry.id)}
                                className="bg-none border-none text-[#A8322D] cursor-pointer text-xs px-1.5 py-0.5 hover:underline"
                              >
                                Remove
                              </button>
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              })
            )}
          </div>

          {/* {isAdmin && (
            <div className="mt-4 text-right">
              <button
                onClick={handleReset}
                className="px-3 py-1.5 bg-none border border-[#D9D3C0] text-[#7A6E5D] text-xs cursor-pointer hover:border-[#262220] hover:text-[#262220] transition-colors"
              >
                Reset tracker
              </button>
            </div>
          )} */}

        </div>
      </div>
    </>
  );
}
