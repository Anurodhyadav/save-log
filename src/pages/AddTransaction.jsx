import React, { useState, useRef, useEffect } from 'react';
import { addDoc, serverTimestamp } from 'firebase/firestore';
import { depositsRef, auth } from '../firebase';
import { useAppContext } from '../context/AppContext';
import { useNavigate, Link } from 'react-router-dom';
import { Toast } from '../components/Toast';

export const AddTransaction = () => {
  const { isAdmin, setSyncState } = useAppContext();
  const [date, setDate] = useState('');
  const [amount, setAmount] = useState('');
  const [depositedBy, setDepositedBy] = useState('Anurodh');
  const [bank, setBank] = useState('Manjushree-AN');
  const [note, setNote] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();
  const [toast, setToast] = useState(null);

  const showToast = (type, message) => {
    setToast({ key: Date.now(), type, message });
  };

  const amountInputRef = useRef(null);

  const getTodayStr = () => {
    const d = new Date();
    return d.getFullYear() + '-'
      + String(d.getMonth() + 1).padStart(2, '0') + '-'
      + String(d.getDate()).padStart(2, '0');
  };

  useEffect(() => {
    setDate(getTodayStr());
  }, []);

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
      depositedBy: depositedBy || 'Anurodh',
      bank: bank || 'Manjushree-AN',
      note: note.trim(),
      createdAt: serverTimestamp(),
      createdBy: auth.currentUser ? auth.currentUser.uid : null
    })
      .then(() => {
        showToast('success', 'Transaction added successfully!');
        setSyncState('synced');
        setAmount('');
        setNote('');
        setDate(getTodayStr());
        setDepositedBy('Anurodh');
        setBank('Manjushree-AN');
        setTimeout(() => {
          navigate('/');
        }, 2500)
      })
      .catch((err) => {
        showToast('error', 'Transaction addition failed!');
        console.error('Add Transaction error', err);
        setSyncState('error');
      });
  };

  return (
    <div className={`mt-4 ${!isAdmin ? 'opacity-70 pointer-events-none' : ''}`}>
      <div className="flex items-center gap-3 mb-6">
        <Link to="/" className="text-[#7A6E5D] hover:text-[#262220] transition-colors p-1" aria-label="Back to home">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
        </Link>
        <h2 className="text-xl font-semibold mb-0">Add Transaction</h2>
      </div>

      <form onSubmit={handleAddDeposit} className="flex flex-col gap-5 px-1 pb-3">
        <label className="text-sm md:text-base text-[#7A6E5D] flex flex-col gap-2">Date
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            disabled={!isAdmin}
            className="w-full font-mono text-[#262220] text-base md:text-lg px-3 py-3 border border-[#262220] rounded bg-white appearance-none"
          />
        </label>

        <label className="text-sm md:text-base text-[#7A6E5D] flex flex-col gap-2">Amount (Rs)
          <input
            type="number"
            ref={amountInputRef}
            value={amount}
            onChange={(e) => { setAmount(e.target.value); setErrorMsg(''); }}
            disabled={!isAdmin}
            step="100"
            placeholder="xxx"
            className="w-full font-mono text-[#262220] text-base md:text-lg px-3 py-3 border border-[#262220] rounded bg-white"
          />
        </label>

        <label className="text-sm md:text-base text-[#7A6E5D] flex flex-col gap-2">Deposited By
          <select
            value={depositedBy}
            onChange={(e) => setDepositedBy(e.target.value)}
            disabled={!isAdmin}
            className="w-full font-mono text-[#262220] text-base md:text-lg px-3 py-3 border border-[#262220] rounded bg-white"
          >
            <option value="Anurodh">Anurodh</option>
            <option value="Pramodh">Pramodh</option>
            <option value="Parent">Parent</option>
          </select>
        </label>

        <label className="text-sm md:text-base text-[#7A6E5D] flex flex-col gap-2">Bank
          <select
            value={bank}
            onChange={(e) => setBank(e.target.value)}
            disabled={!isAdmin}
            className="w-full font-mono text-[#262220] text-base md:text-lg px-3 py-3 border border-[#262220] rounded bg-white"
          >
            <option value="Manjushree-AN">Manjushree-AN</option>
            <option value="NBL-RAJ">NBL-RAJ</option>
            <option value="NIC-RITA">NIC-RITA</option>
          </select>
        </label>

        <label className="text-sm md:text-base text-[#7A6E5D] flex flex-col gap-2">Note (optional)
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={!isAdmin}
            placeholder="daily savings, salary top-up..."
            className="w-full text-base text-[#262220] md:text-lg px-3 py-3 border border-[#262220] rounded bg-white"
          />
        </label>

        {errorMsg && (
          <div id="lft-entry-error" className="text-sm text-[#A8322D] my-1">
            {errorMsg}
          </div>
        )}

        <button
          type="submit"
          disabled={!isAdmin}
          className="mt-4 px-4 py-4 bg-[#3F6B4C] text-[#F2EFE4] border border-[#262220] rounded text-base font-semibold hover:bg-[#32563d] transition-colors cursor-pointer"
        >
          Add Transaction
        </button>
      </form>
      {toast && (
        <Toast
          key={toast.key}
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};
