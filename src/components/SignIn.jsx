import React from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';

export const SignIn = () => {
    const handleSignIn = async () => {
        try {
            await signInWithPopup(auth, googleProvider);
        } catch (err) {
            console.error('Sign-in error', err);
            alert('Sign-in failed: ' + err.message);
        }
    };

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
    )
}