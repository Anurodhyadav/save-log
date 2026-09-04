import React, { useState, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { doc, deleteDoc } from 'firebase/firestore';
import { depositsRef } from '../firebase';
import { useAppContext } from '../context/AppContext';
import { Toast } from '../components/Toast';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { RenderAmount } from '../components/RenderAmount';

const DownArrow = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" style={{ display: 'inline-block', flexShrink: 0 }} aria-hidden="true">
    <polygon points="5,10 0,0 10,0" fill="#C0392B" />
  </svg>
);


const UpArrow = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" style={{ display: 'inline-block', flexShrink: 0 }} aria-hidden="true">
    <polygon points="5,0 10,10 0,10" fill="#27AE60" />
  </svg>
);


const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);

const ChevronIcon = ({ isOpen }) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    style={{
      transition: 'transform 0.3s ease',
      transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
      flexShrink: 0,
    }}
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

export const Statement = () => {
  const { entries, isAdmin, setSyncState } = useAppContext();
  const location = useLocation();
  const isChartView = location.pathname === '/statement-chart';

  const [pendingDelete, setPendingDelete] = useState(null); // entry object awaiting confirmation
  const [toast, setToast] = useState(null); // { key, type, message }

  // Current month key (e.g. "2026-09")
  const currentMonthKey = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  // Track which month sections are open; current month is open by default
  const [openMonths, setOpenMonths] = useState({ [currentMonthKey]: true });

  const toggleMonth = (key) => {
    setOpenMonths((prev) => ({ ...prev, [key]: !prev[key] }));
  };


  const fmt = (n) => 'Rs:\u2009' + n;

  const monthKey = (dateStr) => dateStr.slice(0, 7);

  const showToast = (type, message) => {
    setToast({ key: Date.now(), type, message });
  };

  const handleRemoveDeposit = (entry) => {
    if (!isAdmin) return;
    setPendingDelete(entry);
  };

  const cancelRemoveDeposit = () => {
    setPendingDelete(null);
  };

  const confirmRemoveDeposit = () => {
    if (!pendingDelete) return;
    const entry = pendingDelete;
    setPendingDelete(null);

    setSyncState('syncing');
    deleteDoc(doc(depositsRef, entry.id))
      .then(() => {
        setSyncState('synced');
        showToast('success', 'Entry removed successfully!');
      })
      .catch((err) => {
        console.error('Remove deposit error', err);
        setSyncState('error');
        showToast('error', 'Failed to remove entry. Please try again.');
      });
  };

  const getGroupedEntries = () => {
    const getTime = (e) => {
      if (!e.createdAt) return 0;
      const secs = e.createdAt.seconds ?? 0;
      const nanos = e.createdAt.nanoseconds ?? 0;
      return secs * 1000 + nanos / 1e6;
    };

    const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date) || getTime(b) - getTime(a));
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

  const renderEntriesCount = () => {
    const deposits = entries.filter((e) => e.amount > 0).length;
    const withdrawals = entries.filter((e) => e.amount < 0).length;

    if (deposits === 0 && withdrawals === 0) {
      return <span>0 transactions</span>;
    }

    return (
      <div className="flex flex-col items-end leading-tight">
        {deposits > 0 && (
          <span>{deposits} {deposits === 1 ? 'deposit' : 'deposits'}</span>
        )}
        {withdrawals > 0 && (
          <span>{withdrawals} {withdrawals === 1 ? 'withdrawal' : 'withdrawals'}</span>
        )}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100dvh - 46px - 46px - 64px)', marginTop: '1rem' }}>

      <div style={{ flexShrink: 0, paddingBottom: '0.5rem' }}>
        <div className="flex justify-between items-end mb-4">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-[#7A6E5D] hover:text-[#262220] transition-colors" aria-label="Back to home">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
            </Link>

            <div
              role="tablist"
              aria-label="Statement view"
              className="flex items-center bg-[#3F6B4C] rounded-2xl p-1 text-xs font-bold tracking-wider uppercase"
            >
              <Link
                to="/statement"
                role="tab"
                aria-selected={!isChartView}
                className={`px-3 py-1.5 rounded-full transition-colors ${!isChartView ? 'bg-[#262220] text-white' : 'text-[#7A6E5D] hover:text-[#262220]'}`}
              >
                List
              </Link>
              <Link
                to="/statement-chart"
                role="tab"
                aria-selected={isChartView}
                className="px-3 py-1.5 rounded-full text-white transition-colors hover:text-[#262220] hover:bg-[#f4eeda]"
              >
                Report
              </Link>
            </div>
          </div>
          <div className="text-sm text-[#7A6E5D] text-right">
            {renderEntriesCount()}
          </div>
        </div>
      </div>

      <div id="lft-entries-wrap" style={{ flex: 1, overflowY: 'auto', paddingBottom: '2rem' }}>
        {entries.length === 0 ? (
          <div className="text-sm text-[#7A6E5D] py-3.5">
            No deposit.
          </div>
        ) : (
          getGroupedEntries().map((group) => {
            const dMonth = new Date(group.key + '-01T00:00:00');
            const label = dMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' });
            const isOpen = !!openMonths[group.key];

            return (
              <div key={group.key} className="mb-6">
                <div className='rounded-md bg-[#FDF1E3] px-2 py-1  shadow-xl '>
                  <div
                    className={`flex justify-between font-mono items-center py-2 mt-1 ${isOpen ? 'border-b-2 border-[#262220]' : ''} text-sm md:text-base font-bold tracking-wider text-[#262220] cursor-pointer select-none`}
                    onClick={() => toggleMonth(group.key)}
                    role="button"
                    aria-expanded={isOpen}
                    aria-controls={`month-entries-${group.key}`}
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleMonth(group.key); } }}
                  >
                    <span className="flex items-center gap-1">
                      <span>{label}</span>
                      {
                        !isOpen && <span className="text-[#7A6E5D] text-xs font-normal" style={{ fontFamily: 'inherit' }}>
                          ({group.entries.length})
                        </span>
                      }
                    </span>
                    <span className="flex items-center gap-2">
                      <RenderAmount parentCss amount={group.total} />
                      <ChevronIcon isOpen={isOpen} />
                    </span>
                  </div>

                  <div
                    id={`month-entries-${group.key}`}
                    style={{
                      overflow: 'hidden',
                      maxHeight: isOpen ? `${group.entries.length * 60}px` : '0px',
                      transition: 'max-height 0.35s ease',
                    }}
                  >
                    {group.entries.map((entry) => {
                      const dEntry = new Date(entry.date + 'T00:00:00');
                      const dayLabel = dEntry.toLocaleString('en-US', { day: '2-digit', month: 'short' });
                      const isNegative = entry.amount < 0;

                      return (
                        <div key={entry.id} className="flex justify-between items-center py-2 border-b border-black/10 border-[#3F6B4C] text-sm">
                          <span className="text-[#262220] flex gap-3 items-end">
                            <span className="lft-num font-mono text-xs md:text-sm text-[#7A6E5D] min-w-[52px]">{dayLabel}</span>
                            {entry.note && <span className="text-[#7A6E5D] text-xs md:text-sm">{entry.note}</span>}
                          </span>
                          <span className="flex items-center gap-2">
                            <span style={{ display: 'flex', alignItems: 'center' }}>
                              {isNegative ? <DownArrow /> : <UpArrow />}
                            </span>
                            <span
                              className="lft-num font-mono text-xs md:text-sm font-semibold"
                              style={{ color: isNegative ? '#C0392B' : '#27AE60', letterSpacing: 0 }}
                            >
                              <RenderAmount parentCss amount={entry.amount} />
                            </span>
                            {isAdmin && (
                              <button
                                onClick={() => handleRemoveDeposit(entry)}
                                aria-label="Remove entry"
                                title="Remove entry"
                                className='bg-bone cursor-pointer text-[#A8322D] text-xs p-1 flex items-center justify-center rounded-sm'
                                style={{
                                  transition: 'background 0.15s',
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = '#f0ece0')}
                                onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                              >
                                <TrashIcon />
                              </button>
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                </div>

              </div>
            );
          })
        )}
      </div>

      <ConfirmDialog
        isOpen={!!pendingDelete}
        title="Remove this entry?"
        message={
          pendingDelete
            ? `This will permanently remove the ${pendingDelete.amount < 0 ? 'withdrawal' : 'deposit'} of ${fmt(Math.abs(pendingDelete.amount))} made on ${new Date(pendingDelete.date + 'T00:00:00').toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}.`
            : ''
        }
        confirmLabel="Remove"
        cancelLabel="Cancel"
        danger
        onConfirm={confirmRemoveDeposit}
        onCancel={cancelRemoveDeposit}
      />

      {toast && (
        <Toast
          key={toast.key}
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
          fixed
        />
      )}
    </div>
  );
};