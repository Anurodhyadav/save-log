import React from 'react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

export const Home = () => {
  const { settings, entries } = useAppContext();

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

  return (
    <>
      <div className="flex justify-between items-end mb-1 mt-2">
        <div>
          <div className="text-sm tracking-widest uppercase text-[#7A6E5D]">
            Janakpur land fund
          </div>
          <div className="font-mono text-base md:text-xl font-semibold text-[#262220]">
            Rs 40,00,000
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-[#7A6E5D]">SAVED</div>
          <div className="font-mono text-base md:text-xl font-bold text-[#3F6B4C]" id="lft-saved-total">
            {fmt(totalSaved)}
          </div>
        </div>
      </div>

      <svg width="100%" height="14" viewBox="0 0 680 14" className="block mb-1 mt-5">
        <g id="lft-border-top">{renderTriangles(false)}</g>
      </svg>

      <div className="border border-[#262220] p-[2px]">
        <div className="relative flex flex-col md:flex-row h-30 md:h-16 bg-[repeating-linear-gradient(90deg,#EFE9D8,#EFE9D8_33px,#E3DCC7_33px,#E3DCC7_34px)]">
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
            <span className="relative z-10 font-mono text-xs md:text-sm font-bold text-[#1E3324] bg-white/55 px-1.5 py-0.5 rounded">
              SAVINGS GOAL · {fmt(settings.goal)}
            </span>
          </div>

          <div
            id="lft-loan-zone"
            className="relative flex items-center justify-center bg-[repeating-linear-gradient(45deg,#DDE4E0,#DDE4E0_6px,#C7D2CB_6px,#C7D2CB_12px)] shrink-0"
            style={{ flexBasis: `${loanPct}%` }}
          >
            <span className="font-mono text-xs md:text-sm font-bold text-[#2B4570] bg-white/55 px-1.5 py-0.5 rounded">
              LOAN GOAL {fmt(settings.loan)}
            </span>
          </div>
        </div>
      </div>

      <svg width="100%" height="14" viewBox="0 0 680 14" className="block mt-1 mb-5">
        <g id="lft-border-bottom">{renderTriangles(true)}</g>
      </svg>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5">
        <div className="bg-[#F2EFE4] border border-[#D9D3C0] p-3">
          <div className="text-xs text-[#7A6E5D]">Progress</div>
          <div className="font-mono text-base md:text-lg font-bold">{Math.round(pct)}%</div>
        </div>
        <div className="bg-[#F2EFE4] border border-[#D9D3C0] p-3">
          <div className="text-xs text-[#7A6E5D]">Remaining</div>
          <div className="font-mono text-base md:text-lg font-bold">{fmt(remaining)}</div>
        </div>
        <div className="bg-[#F2EFE4] border border-[#D9D3C0] p-3">
          <div className="text-xs text-[#7A6E5D]">Avg / month</div>
          <div className="font-mono text-base md:text-lg font-bold">{avg > 0 ? fmt(avg) : '-'}</div>
        </div>
        <div className="bg-[#F2EFE4] border border-[#D9D3C0] p-3">
          <div className="text-xs text-[#7A6E5D]">On track for</div>
          <div className="font-mono text-base md:text-lg font-bold">{etaText}</div>
        </div>
      </div>

      <div id="lft-pace-note" className="text-xs md:text-sm text-[#7A6E5D] -mt-3 mb-10">
        *{paceNoteText}
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start gap-5 mt-6">
        <Link
          to="/add-transaction"
          className="px-6 py-3 bg-[#F2EFE4] border border-[#D9D3C0] text-[#262220] rounded shadow-sm hover:bg-[#3F6B4C] hover:text-white transition-colors font-semibold text-center w-full"
        >
          Add Transaction
        </Link>
        <Link
          to="/statement"
          className="px-6 py-3 bg-[#F2EFE4] border border-[#D9D3C0] text-[#262220] rounded shadow-sm hover:bg-[#3F6B4C] hover:text-white transition-colors font-semibold text-center w-full"
        >
          View Statement
        </Link>
        <Link
          to="/goal-settings"
          className="px-6 py-3 bg-[#F2EFE4] border border-[#D9D3C0] text-[#262220] rounded shadow-sm hover:bg-[#3F6B4C] hover:text-white transition-colors font-semibold text-center w-full"
        >
          Goal Settings
        </Link>
      </div>

    </>
  );
};
