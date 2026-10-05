import React, { useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { depositsRef } from '../firebase';
import { useAppContext } from '../context/AppContext';
import { Toast } from './Toast';

const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const EditIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

export const EditTransactionModal = ({ entry, onClose }) => {
  const { isAdmin, setSyncState } = useAppContext();

  const [date, setDate] = useState('');
  const [amount, setAmount] = useState('');
  const [depositedBy, setDepositedBy] = useState('Anurodh');
  const [bank, setBank] = useState('Manjushree-AN');
  const [note, setNote] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [toast, setToast] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (entry) {
      setDate(entry.date || '');
      setAmount(entry.amount !== undefined ? String(entry.amount) : '');
      setDepositedBy(entry.depositedBy || 'Anurodh');
      setBank(entry.bank || 'Manjushree-AN');
      setNote(entry.note || '');
      setErrorMsg('');
    }
  }, [entry]);

  const showToast = (type, message) => {
    setToast({ key: Date.now(), type, message });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAdmin || !entry) return;

    const parsedAmt = parseFloat(amount);
    if (!parsedAmt && parsedAmt !== 0) {
      setErrorMsg('Enter a valid amount.');
      return;
    }
    setErrorMsg('');
    setSaving(true);
    setSyncState('syncing');

    try {
      await updateDoc(doc(depositsRef, entry.id), {
        date: date,
        amount: parsedAmt,
        depositedBy: depositedBy || 'Anurodh',
        bank: bank || 'Manjushree-AN',
        note: note.trim(),
      });
      setSyncState('synced');
      showToast('success', 'Transaction updated!');
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err) {
      console.error('Edit transaction error', err);
      setSyncState('error');
      showToast('error', 'Failed to update. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const isOpen = !!entry;

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(38,34,32,0.45)',
          backdropFilter: 'blur(2px)',
          zIndex: 200,
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'opacity 0.28s ease',
        }}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Edit Transaction"
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 201,
          background: '#F4EDDA',
          borderTopLeftRadius: '20px',
          borderTopRightRadius: '20px',
          boxShadow: '0 -8px 40px rgba(38,34,32,0.18)',
          transform: isOpen ? 'translateY(0)' : 'translateY(110%)',
          transition: 'transform 0.32s cubic-bezier(0.32, 0.72, 0, 1)',
          maxHeight: '90dvh',
          overflowY: 'auto',
          padding: '0 1rem 2rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '12px', paddingBottom: '4px' }}>
          <div style={{ width: '40px', height: '4px', borderRadius: '99px', background: '#C9BFA8' }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 4px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ color: '#3F6B4C' }}><EditIcon /></span>
            <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#262220' }}>Edit Transaction</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close edit modal"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#7A6E5D',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#e8e0cc')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
          >
            <CloseIcon />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem', paddingBottom: '0.5rem' }}>
          <label style={{ fontSize: '0.875rem', color: '#7A6E5D', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            Date
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={!isAdmin || saving}
              style={{
                width: '100%', fontFamily: 'monospace', color: '#262220',
                fontSize: '1rem', padding: '12px', border: '1.5px solid #262220',
                borderRadius: '8px', background: '#fff', boxSizing: 'border-box',
              }}
            />
          </label>

          <label style={{ fontSize: '0.875rem', color: '#7A6E5D', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            Amount (Rs)
            <input
              type="number"
              value={amount}
              onChange={(e) => { setAmount(e.target.value); setErrorMsg(''); }}
              disabled={!isAdmin || saving}
              step="100"
              placeholder="e.g. 5000 or -1000"
              style={{
                width: '100%', fontFamily: 'monospace', color: '#262220',
                fontSize: '1rem', padding: '12px', border: '1.5px solid #262220',
                borderRadius: '8px', background: '#fff', boxSizing: 'border-box',
              }}
            />
            <span style={{ fontSize: '0.75rem', color: '#9A8E7D' }}>Use a negative value for withdrawals.</span>
          </label>

          <label style={{ fontSize: '0.875rem', color: '#7A6E5D', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            Deposited By
            <select
              value={depositedBy}
              onChange={(e) => setDepositedBy(e.target.value)}
              disabled={!isAdmin || saving}
              style={{
                width: '100%', fontFamily: 'monospace', color: '#262220',
                fontSize: '1rem', padding: '12px', border: '1.5px solid #262220',
                borderRadius: '8px', background: '#fff', boxSizing: 'border-box',
              }}
            >
              <option value="Anurodh">Anurodh</option>
              <option value="Pramodh">Pramodh</option>
              <option value="Parent">Parent</option>
            </select>
          </label>

          <label style={{ fontSize: '0.875rem', color: '#7A6E5D', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            Bank
            <select
              value={bank}
              onChange={(e) => setBank(e.target.value)}
              disabled={!isAdmin || saving}
              style={{
                width: '100%', fontFamily: 'monospace', color: '#262220',
                fontSize: '1rem', padding: '12px', border: '1.5px solid #262220',
                borderRadius: '8px', background: '#fff', boxSizing: 'border-box',
              }}
            >
              <option value="Manjushree-AN">Manjushree-AN</option>
              <option value="NBL-RAJ">NBL-RAJ</option>
              <option value="NIC-RITA">NIC-RITA</option>
            </select>
          </label>

          <label style={{ fontSize: '0.875rem', color: '#7A6E5D', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            Note (optional)
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={!isAdmin || saving}
              placeholder="daily savings, salary top-up..."
              style={{
                width: '100%', color: '#262220', fontSize: '1rem',
                padding: '12px', border: '1.5px solid #262220',
                borderRadius: '8px', background: '#fff', boxSizing: 'border-box',
              }}
            />
          </label>

          {errorMsg && (
            <div style={{ fontSize: '0.875rem', color: '#A8322D', marginTop: '-4px' }}>{errorMsg}</div>
          )}

          <button
            type="submit"
            disabled={!isAdmin || saving}
            style={{
              marginTop: '8px', padding: '14px',
              background: saving ? '#7AA98A' : '#3F6B4C',
              color: '#F2EFE4', border: '1.5px solid #262220',
              borderRadius: '10px', fontSize: '1rem', fontWeight: 700,
              cursor: saving ? 'not-allowed' : 'pointer',
              transition: 'background 0.18s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            }}
          >
            {saving ? (
              <>
                <span style={{
                  width: '16px', height: '16px', border: '2px solid #F2EFE4',
                  borderTopColor: 'transparent', borderRadius: '50%',
                  display: 'inline-block', animation: 'editModalSpin 0.7s linear infinite',
                }} />
                Saving…
              </>
            ) : 'Save Changes'}
          </button>
        </form>
      </div>

      {toast && (
        <Toast
          key={toast.key}
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
          fixed
        />
      )}

      <style>{`@keyframes editModalSpin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
};
