import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { serverTimestamp, setDoc } from 'firebase/firestore';
import { trackerRef } from '../firebase';
import { auth } from '../firebase';
import { useAppContext } from '../context/AppContext';
import { Toast } from '../components/Toast';

export const GoalSettings = () => {
  const { settings, setSettings, isAdmin, setSyncState } = useAppContext();
  const [toast, setToast] = useState(null);

  const showToast = (type, message) => {
    setToast({ key: Date.now(), type, message });
  };

  const handleSettingChange = (field, value) => {
    if (!isAdmin) return;
    const parsed = parseFloat(value) || 0;
    setSettings((prev) => ({ ...prev, [field]: parsed }));
  };

  const handleUpdateGoals = () => {
    if (!isAdmin) return;

    setSyncState('syncing');
    setDoc(trackerRef, {
      ...settings,
      updatedAt: serverTimestamp(),
      updatedBy: auth.currentUser ? auth.currentUser.uid : null
    }, { merge: true })
      .then(() => {
        setSyncState('synced');
        showToast('success', 'Goal updated successfully!');
      })
      .catch((err) => {
        console.error('Save settings error', err);
        setSyncState('error');
        showToast('error', 'Failed to update goal. Please try again.');
      });
  };

  return (
    <div className={`mt-4 ${!isAdmin ? 'opacity-70 pointer-events-none' : ''}`}>
      <div className="flex items-center gap-3 mb-6">
        <Link to="/" className="text-[#7A6E5D] hover:text-[#262220] transition-colors p-1" aria-label="Back to home">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
        </Link>
        <h2 className="text-xl font-semibold mb-0">Goal Settings</h2>
      </div>

      <div className="flex flex-col gap-5 px-1 pb-3">
        <label className="text-sm md:text-base text-[#7A6E5D] flex flex-col gap-2">Target savings (Rs)
          <input
            type="number"
            value={settings.goal}
            onChange={(e) => handleSettingChange('goal', e.target.value)}
            disabled={!isAdmin}
            step="1000"
            className="w-full font-mono text-base md:text-lg px-3 py-3 border border-[#D9D3C0] rounded bg-white"
          />
        </label>

        <label className="text-sm md:text-base text-[#7A6E5D] flex flex-col gap-2">Loan amount (Rs)
          <input
            type="number"
            value={settings.loan}
            onChange={(e) => handleSettingChange('loan', e.target.value)}
            disabled={!isAdmin}
            step="1000"
            className="w-full font-mono text-base md:text-lg px-3 py-3 border border-[#D9D3C0] rounded bg-white"
          />
        </label>

        <label className="text-sm md:text-base text-[#7A6E5D] flex flex-col gap-2">Starting balance already saved (Rs)
          <input
            type="number"
            value={settings.start}
            onChange={(e) => handleSettingChange('start', e.target.value)}
            disabled={!isAdmin}
            step="1000"
            className="w-full font-mono text-base md:text-lg px-3 py-3 border border-[#D9D3C0] rounded bg-white"
          />
        </label>

        <label className="text-sm md:text-base text-[#7A6E5D] flex flex-col gap-2">Monthly target (Rs)
          <input
            type="number"
            value={settings.monthlyTarget}
            onChange={(e) => handleSettingChange('monthlyTarget', e.target.value)}
            disabled={!isAdmin}
            step="1000"
            className="w-full font-mono text-base md:text-lg px-3 py-3 border border-[#D9D3C0] rounded bg-white"
          />
        </label>

        <button
          type="button"
          disabled={!isAdmin}
          onClick={handleUpdateGoals}
          className="mt-4 px-4 py-4 bg-[#3F6B4C] text-[#F2EFE4] border border-[#262220] rounded text-base font-semibold hover:bg-[#32563d] transition-colors cursor-pointer"
        >
          Update Goals
        </button>

        {toast && (
          <Toast
            key={toast.key}
            type={toast.type}
            message={toast.message}
            onClose={() => setToast(null)}
          />
        )}
      </div>
    </div>
  );
};