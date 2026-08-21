import React, { useState } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { useAppContext } from '../context/AppContext';
import { SignIn } from './SignIn';
import { Loader } from './Loader';

export const Layout = () => {
  const { user, isAdmin, loading, syncState } = useAppContext();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut(auth);
  };


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

          <button onClick={handleSignOut} className="border text-sm cursor-pointer border-[#7A6E5D] rounded text-left block p-2 text-sm text-white hover:text-black hover:bg-[#F2EFE4]">Log out</button>
        </div>
      </div>



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
