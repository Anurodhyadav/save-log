import React, { useState } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { useAppContext } from '../context/AppContext';
import { SignIn } from './SignIn';
import { Loader } from './Loader';

export const Layout = () => {
  const { user, isAdmin, loading, syncState } = useAppContext();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut(auth);
    setIsMenuOpen(false);
  };

  const closeMenu = () => setIsMenuOpen(false);

  if (loading) return <Loader />;
  if (!user) return <SignIn />;

  return (
    <div className="flex flex-col min-h-screen">
      <div id="lft-auth-bar" className="flex items-center justify-between px-4 py-2 bg-[#262220] text-[#EFE9D8] min-h-[46px] relative z-20">
        <span className="font-semibold tracking-wide text-sm md:text-base opacity-90 font-serif">
          <Link to="/">Saving Fund</Link>
        </span>
        <div className="flex items-center gap-2.5">
          <div id="lft-sync-status" className="flex items-center gap-1.5 text-xs text-[#7A6E5D]">
            <span className={`dot ${syncState !== 'synced' ? syncState : ''}`} id="lft-sync-dot"></span>
            <span id="lft-sync-text" className="hidden sm:inline">{syncState === 'synced' ? 'Synced' : syncState === 'syncing' ? 'Saving…' : 'Error'}</span>
          </div>
          <span id="lft-role-badge" className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase ${isAdmin ? 'bg-[#3F6B4C] text-[#D8EAE0]' : 'bg-[#4a3f2f] text-[#C4BAA9]'}`}>
            {isAdmin ? 'Admin' : 'Viewer'}
          </span>
          {user.photoURL && <img id="lft-user-avatar" src={user.photoURL} alt="User avatar" className="w-7 h-7 rounded-full object-cover border border-[#7A6E5D]" />}
          <span id="lft-user-name" className="text-xs text-[#C4BAA9] hidden sm:inline">{user.displayName || user.email}</span>

          <button
            className="p-1 focus:outline-none"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>

      {isMenuOpen && (
        <>
          <div className="fixed inset-0 bg-black/20 z-10" onClick={closeMenu}></div>
          <div className="absolute right-2 top-12 flex flex-col justify-center gap-3  w-46 bg-[#FBF8F0] border border-[#D9D3C0] shadow-lg rounded z-20 overflow-hidden">
            <Link to="/" onClick={closeMenu} className="block px-4 py-3 text-sm text-[#262220] border-b border-[#D9D3C0] hover:bg-[#F2EFE4]">Home</Link>
            <Link to="/goal-settings" onClick={closeMenu} className="block px-4 py-3 text-sm text-[#262220] border-b border-[#D9D3C0] hover:bg-[#F2EFE4]">Goal Settings</Link>
            <Link to="/add-transaction" onClick={closeMenu} className="block px-4 py-3 text-sm text-[#262220] border-b border-[#D9D3C0] hover:bg-[#F2EFE4]">Add Transaction</Link>
            <Link to="/statement" onClick={closeMenu} className="block px-4 py-3 text-sm text-[#262220] border-b border-[#D9D3C0] hover:bg-[#F2EFE4]">Statement</Link>
            <button onClick={handleSignOut} className="w-full text-left block px-4 py-3 text-sm text-[#A8322D] hover:bg-[#F2EFE4]">Sign out</button>
          </div>
        </>
      )}

      <div id="lft-main" className="block px-4 py-6 md:py-8 flex-grow">
        <div className="w-full max-w-[680px] mx-auto font-sans text-[#262220]">
          {!isAdmin && (
            <div id="lft-viewer-notice" className="mb-4 p-2.5 bg-[#F0EBD8] border border-[#D9D3C0] border-l-[3px] border-l-[#D9A404] text-xs text-[#7A6E5D]">
              👁 You are viewing in <strong>read-only</strong> mode. Contact the tracker owner to request admin access.
            </div>
          )}
          <Outlet />
        </div>
      </div>

      <footer className="bg-[#262220] text-[#EFE9D8] min-h-[46px] py-4 text-center text-xs mt-auto">
        @2026 and all right reserved
      </footer>
    </div>
  );
};
