import React from 'react';
import { Link } from 'react-router-dom';
import { doc, deleteDoc } from 'firebase/firestore';
import { depositsRef } from '../firebase';
import { useAppContext } from '../context/AppContext';

export const Statement = () => {
  const { entries, isAdmin, setSyncState } = useAppContext();

  const fmt = (n) => {
    n = Math.round(n || 0);
    return 'Rs ' + n.toLocaleString('en-IN');
  };

  const monthKey = (dateStr) => dateStr.slice(0, 7);

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
    console.log("THE GROUPS", groups)
    return groups;
  };

  const calculateEntriesCount = () => {
    const deposits = entries.filter((e) => e.amount > 0).length;
    const withdrawals = entries.filter((e) => e.amount < 0).length;

    if (deposits === 0 && withdrawals === 0) return '0 transactions';
    if (withdrawals === 0) return `${deposits} ${deposits === 1 ? 'deposit' : 'deposits'}`;
    if (deposits === 0) return `${withdrawals} ${withdrawals === 1 ? 'withdrawal' : 'withdrawals'}`;
    return `${deposits} ${deposits === 1 ? 'deposit' : 'deposits'}, ${withdrawals} ${withdrawals === 1 ? 'withdrawal' : 'withdrawals'}`;
  };

  return (
    <div className="mt-4">
      <div className="flex justify-between items-end mb-6">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-[#7A6E5D] hover:text-[#262220] transition-colors" aria-label="Back to home">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
          </Link>
          <h2 className="text-xl font-semibold mb-0">Statement</h2>
        </div>
        <div className="text-sm text-[#7A6E5D]">
          {calculateEntriesCount()}
        </div>
      </div>

      <div id="lft-entries-wrap" className="pb-8">
        {entries.length === 0 ? (
          <div className="text-sm text-[#7A6E5D] py-3.5">
            No deposit.
          </div>
        ) : (
          getGroupedEntries().map((group) => {
            const dMonth = new Date(group.key + '-01T00:00:00');
            const label = dMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' });

            return (
              <div key={group.key} className="mb-6">
                <div className="flex justify-between items-center py-2.5 mt-1 border-b-2 border-[#262220] text-sm font-bold tracking-wider uppercase text-[#262220]">
                  <span>{label}</span>
                  <span className="lft-num font-mono">{fmt(group.total)}</span>
                </div>

                {group.entries.map((entry) => {
                  const dEntry = new Date(entry.date + 'T00:00:00');
                  const dayLabel = dEntry.toLocaleString('en-US', { day: '2-digit', month: 'short' });

                  return (
                    <div key={entry.id} className="flex justify-between items-center py-3 border-b border-[#3F6B4C] text-sm md:text-base">
                      <span className="text-[#262220] flex gap-3 items-end">
                        <span className="lft-num font-mono text-xs md:text-sm text-[#7A6E5D] min-w-[52px]">{dayLabel}</span>
                        {entry.note && <span className="text-[#7A6E5D] text-sm">{entry.note}</span>}
                      </span>
                      <span className="flex items-center gap-3">
                        <span className="lft-num font-mono font-semibold">{fmt(entry.amount)}</span>
                        {isAdmin && (
                          <button
                            onClick={() => handleRemoveDeposit(entry.id)}
                            className="bg-none border-none text-[#A8322D] cursor-pointer text-xs px-2 py-1 hover:underline"
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
    </div>
  );
};
