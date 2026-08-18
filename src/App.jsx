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

  // Listen to Firestore settings and entries
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

  // Add deposit
  const handleAddDeposit = (e) => {
    e.preventDefault();
    if (!isAdmin) return;
    const parsedAmt = parseFloat(amount);
    if (!parsedAmt || parsedAmt <= 0) {
      setErrorMsg('Enter an amount greater than zero.');
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
        console.error('Add deposit error', err);
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
          <span className="auth-brand">Janakpur Land Fund</span>
          <button id="lft-signin-btn" onClick={handleSignIn}>
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" style={{marginRight: 8}}>
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Sign in with Google
          </button>
        </div>
        <div id="lft-signin-prompt" style={{maxWidth: 680, margin: '0 auto', display: 'block'}}>
          <h2>Sign in to view the tracker</h2>
          <p>This tracker is private. Please sign in with your Google account to continue.</p>
          <button id="lft-signin-prompt-btn" onClick={handleSignIn}>
            Sign in with Google
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <div id="lft-auth-bar">
        <span className="auth-brand">Janakpur Land Fund</span>
        <div className="auth-right">
          <div id="lft-sync-status" style={{display: 'flex'}}>
            <span className={`dot ${syncState !== 'synced' ? syncState : ''}`} id="lft-sync-dot"></span>
            <span id="lft-sync-text">{syncState === 'synced' ? 'Synced' : syncState === 'syncing' ? 'Saving…' : 'Error'}</span>
          </div>
          <span id="lft-role-badge" className={`lft-role-badge ${isAdmin ? 'editor' : 'viewer'}`}>
            {isAdmin ? 'Admin' : 'Viewer'}
          </span>
          {user.photoURL && <img id="lft-user-avatar" src={user.photoURL} alt="User avatar" style={{display: 'inline-block'}} />}
          <span id="lft-user-name">{user.displayName || user.email}</span>
          <button id="lft-signout-btn" style={{display: 'block'}} onClick={handleSignOut}>Sign out</button>
        </div>
      </div>

      <div id="lft-main" style={{display: 'block', padding: '24px 16px'}}>
        <div className="lft-root" style={{maxWidth: 680, margin: '0 auto'}}>
          
          {!isAdmin && (
            <div id="lft-viewer-notice" style={{display: 'block'}}>
              👁 You are viewing in <strong>read-only</strong> mode. Contact the tracker owner to request admin access.
            </div>
          )}

          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 4}}>
            <div>
              <div style={{fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#7A6E5D'}}>
                Janakpur land fund
              </div>
              <div className="lft-display" style={{fontSize: 26, fontWeight: 600, color: '#262220'}}>
                5 dhur plot, Rs 40,00,000
              </div>
            </div>
            <div style={{textAlign: 'right'}}>
              <div style={{fontSize: 12, color: '#7A6E5D'}}>Saved so far</div>
              <div className="lft-num" id="lft-saved-total" style={{fontSize: 22, fontWeight: 700, color: '#3F6B4C'}}>
                {fmt(totalSaved)}
              </div>
            </div>
          </div>

          <svg width="100%" height="14" viewBox="0 0 680 14" style={{display: 'block', margin: '10px 0 2px'}}>
            <g id="lft-border-top">{renderTriangles(false)}</g>
          </svg>

          <div style={{border: '1px solid #262220', padding: 2}}>
            <div style={{position: 'relative', height: 46, background: 'repeating-linear-gradient(90deg, #EFE9D8, #EFE9D8 33px, #E3DCC7 33px, #E3DCC7 34px)'}}>
              <div id="lft-savings-zone" style={{position: 'absolute', left: 0, top: 0, height: '100%', width: `${savingsPct}%`, overflow: 'hidden', borderRight: '2px dashed #262220'}}>
                <div id="lft-savings-fill" style={{height: '100%', width: `${pct}%`, background: '#3F6B4C', transition: 'width 0.5s ease'}}></div>
              </div>
              <div id="lft-loan-zone" style={{position: 'absolute', left: `${savingsPct}%`, top: 0, height: '100%', width: `${loanPct}%`, background: 'repeating-linear-gradient(45deg, #DDE4E0, #DDE4E0 6px, #C7D2CB 6px, #C7D2CB 12px)'}}></div>
              <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-around', pointerEvents: 'none'}}>
                <span className="lft-num" style={{fontSize: 11, fontWeight: 700, color: '#1E3324', background: 'rgba(255,255,255,0.55)', padding: '1px 6px'}}>
                  YOUR SAVINGS · {fmt(settings.goal)}
                </span>
                <span className="lft-num" style={{fontSize: 11, fontWeight: 700, color: '#2B4570', background: 'rgba(255,255,255,0.55)', padding: '1px 6px'}}>
                  LOAN · {fmt(settings.loan)}
                </span>
              </div>
            </div>
          </div>

          <svg width="100%" height="14" viewBox="0 0 680 14" style={{display: 'block', margin: '2px 0 18px'}}>
            <g id="lft-border-bottom">{renderTriangles(true)}</g>
          </svg>

          <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 22}}>
            <div style={{background: '#F2EFE4', border: '1px solid #D9D3C0', padding: '10px 12px'}}>
              <div style={{fontSize: 11, color: '#7A6E5D'}}>Progress</div>
              <div className="lft-num" style={{fontSize: 18, fontWeight: 700}}>{Math.round(pct)}%</div>
            </div>
            <div style={{background: '#F2EFE4', border: '1px solid #D9D3C0', padding: '10px 12px'}}>
              <div style={{fontSize: 11, color: '#7A6E5D'}}>Remaining</div>
              <div className="lft-num" style={{fontSize: 18, fontWeight: 700}}>{fmt(remaining)}</div>
            </div>
            <div style={{background: '#F2EFE4', border: '1px solid #D9D3C0', padding: '10px 12px'}}>
              <div style={{fontSize: 11, color: '#7A6E5D'}}>Avg / month</div>
              <div className="lft-num" style={{fontSize: 18, fontWeight: 700}}>{avg > 0 ? fmt(avg) : '-'}</div>
            </div>
            <div style={{background: '#F2EFE4', border: '1px solid #D9D3C0', padding: '10px 12px'}}>
              <div style={{fontSize: 11, color: '#7A6E5D'}}>On track for</div>
              <div className="lft-num" style={{fontSize: 18, fontWeight: 700}}>{etaText}</div>
            </div>
          </div>

          <div id="lft-pace-note" style={{fontSize: 13, color: '#7A6E5D', margin: '-12px 0 20px'}}>
            {paceNoteText}
          </div>

          {/* Goal settings */}
          <details className={`lft-editor-only ${!isAdmin ? 'disabled-for-viewer' : ''}`} style={{marginBottom: 20, border: '1px solid #D9D3C0', background: '#FBF8F0'}}>
            <summary style={{cursor: 'pointer', padding: '10px 12px', fontSize: 13, fontWeight: 600, color: '#262220'}}>
              Goal settings
            </summary>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: '4px 12px 14px'}}>
              <label style={{fontSize: 12, color: '#7A6E5D'}}>Target savings (Rs)
                <input 
                  type="number" 
                  value={settings.goal} 
                  onChange={(e) => handleSettingChange('goal', e.target.value)}
                  disabled={!isAdmin}
                  step="1000"
                  style={{width: '100%', padding: '6px 8px', border: '1px solid #D9D3C0', marginTop: 4}} 
                />
              </label>
              <label style={{fontSize: 12, color: '#7A6E5D'}}>Loan amount (Rs)
                <input 
                  type="number" 
                  value={settings.loan} 
                  onChange={(e) => handleSettingChange('loan', e.target.value)}
                  disabled={!isAdmin}
                  step="1000"
                  style={{width: '100%', padding: '6px 8px', border: '1px solid #D9D3C0', marginTop: 4}} 
                />
              </label>
              <label style={{fontSize: 12, color: '#7A6E5D'}}>Starting balance already saved (Rs)
                <input 
                  type="number" 
                  value={settings.start} 
                  onChange={(e) => handleSettingChange('start', e.target.value)}
                  disabled={!isAdmin}
                  step="1000"
                  style={{width: '100%', padding: '6px 8px', border: '1px solid #D9D3C0', marginTop: 4}} 
                />
              </label>
              <label style={{fontSize: 12, color: '#7A6E5D'}}>Monthly target (Rs)
                <input 
                  type="number" 
                  value={settings.monthlyTarget} 
                  onChange={(e) => handleSettingChange('monthlyTarget', e.target.value)}
                  disabled={!isAdmin}
                  step="1000"
                  style={{width: '100%', padding: '6px 8px', border: '1px solid #D9D3C0', marginTop: 4}} 
                />
              </label>
            </div>
          </details>

          {/* Add deposit form */}
          <form 
            onSubmit={handleAddDeposit} 
            className={`lft-editor-only ${!isAdmin ? 'disabled-for-viewer' : ''}`} 
            style={{display: 'flex', alignItems: 'flex-end', gap: 10, marginBottom: 6, flexWrap: 'wrap'}}
          >
            <label style={{fontSize: 12, color: '#7A6E5D', flex: 1, minWidth: 130}}>Date
              <input 
                type="date" 
                value={date} 
                onChange={(e) => setDate(e.target.value)}
                disabled={!isAdmin}
                style={{width: '100%', padding: '7px 8px', border: '1px solid #262220', marginTop: 4}} 
              />
            </label>
            <label style={{fontSize: 12, color: '#7A6E5D', flex: 1, minWidth: 130}}>Amount (Rs)
              <input 
                type="number" 
                ref={amountInputRef}
                value={amount} 
                onChange={(e) => { setAmount(e.target.value); setErrorMsg(''); }}
                disabled={!isAdmin}
                step="100" 
                placeholder="500"
                style={{width: '100%', padding: '7px 8px', border: '1px solid #262220', marginTop: 4}} 
              />
            </label>
            <label style={{fontSize: 12, color: '#7A6E5D', flex: 1.4, minWidth: 150}}>Note (optional)
              <input 
                type="text" 
                value={note} 
                onChange={(e) => setNote(e.target.value)}
                disabled={!isAdmin}
                placeholder="daily savings, salary top-up..."
                style={{width: '100%', padding: '7px 8px', border: '1px solid #262220', marginTop: 4}} 
              />
            </label>
            <button 
              type="submit" 
              disabled={!isAdmin}
              style={{padding: '8px 16px', background: '#3F6B4C', color: '#F2EFE4', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', height: 34}}
            >
              Add deposit
            </button>
          </form>

          {errorMsg && (
            <div id="lft-entry-error" style={{fontSize: 12, color: '#A8322D', margin: '2px 0 12px', display: 'block'}}>
              {errorMsg}
            </div>
          )}

          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', margin: '22px 0 4px'}}>
            <div style={{fontSize: 13, fontWeight: 600}}>Statement</div>
            <div style={{fontSize: 12, color: '#7A6E5D'}}>
              {entries.length} {entries.length === 1 ? 'deposit' : 'deposits'}
            </div>
          </div>

          <div id="lft-entries-wrap">
            {entries.length === 0 ? (
              <div style={{fontSize: 13, color: '#7A6E5D', padding: '14px 0', borderTop: '1px solid #D9D3C0'}}>
                No deposits logged yet.{isAdmin && ' Add your first one above.'}
              </div>
            ) : (
              getGroupedEntries().map((group) => {
                const dMonth = new Date(group.key + '-01T00:00:00');
                const label = dMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' });

                return (
                  <div key={group.key}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0 4px', marginTop: 6, borderTop: '1px solid #262220', fontSize: 12, fontWeight: 700, letterSpacing: '0.02em', textTransform: 'uppercase', color: '#262220'}}>
                      <span>{label}</span>
                      <span className="lft-num">{fmt(group.total)}</span>
                    </div>

                    {group.entries.map((entry) => {
                      const dEntry = new Date(entry.date + 'T00:00:00');
                      const dayLabel = dEntry.toLocaleString('en-US', { day: '2-digit', month: 'short' });

                      return (
                        <div key={entry.id} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderTop: '1px solid #EFE9D8', fontSize: 13}}>
                          <span style={{color: '#262220', display: 'flex', gap: 8, alignItems: 'baseline'}}>
                            <span className="lft-num" style={{color: '#7A6E5D', fontSize: 12, minWidth: 52}}>{dayLabel}</span>
                            {entry.note && <span style={{color: '#7A6E5D'}}>{entry.note}</span>}
                          </span>
                          <span style={{display: 'flex', alignItems: 'center', gap: 10}}>
                            <span className="lft-num" style={{fontWeight: 600}}>{fmt(entry.amount)}</span>
                            {isAdmin && (
                              <button 
                                onClick={() => handleRemoveDeposit(entry.id)}
                                style={{background: 'none', border: 'none', color: '#A8322D', cursor: 'pointer', fontSize: 12, padding: '2px 6px'}}
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

          {isAdmin && (
            <div style={{marginTop: 18, textAlign: 'right'}}>
              <button 
                onClick={handleReset}
                style={{padding: '6px 12px', background: 'none', border: '1px solid #D9D3C0', color: '#7A6E5D', fontSize: 12, cursor: 'pointer'}}
              >
                Reset tracker
              </button>
            </div>
          )}

        </div>
      </div>
    </>
  );
}
