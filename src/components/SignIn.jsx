import React, { useState, useEffect } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';

export const SignIn = () => {

    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const handleSignIn = async () => {
        try {
            await signInWithPopup(auth, googleProvider);
        } catch (err) {
            console.error('Sign-in error', err);
            alert('Sign-in failed: ' + err.message);
        }
    };

    const fadeUp = (delay = '') =>
        `transition-all duration-500 ease-out ${delay} ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`;

    return (
        <div className="h-screen w-full flex items-center justify-center  md:p-10">
            <div className="w-full max-w-[30rem] h-full md:h-auto md:min-h-[640px] bg-[#f4eeda] flex flex-col overflow-hidden relative md:rounded-2xl md:shadow-[0_30px_60px_-20px_rgba(0,0,0,0.55),0_0_0_1px_rgba(184,146,74,0.25)]">

                <div className="relative bg-gradient-to-br from-[#3F6B4C]  to-[#17342c] px-7 pt-6 pb-5 border-b-[3px] border-double border-[#b8924a]">
                    <p className="relative font-serif font-semibold text-2xl tracking-[0.01em] text-[#efe6cf] [text-shadow:0_1px_0_rgba(0,0,0,0.5),0_-1px_0_rgba(255,255,255,0.05)] m-0">
                        Saving Fund Tracker
                    </p>
                    <p className="relative font-mono text-[10px] tracking-[0.16em] uppercase text-[#b8924a]/85 mt-1.5">
                        Your ledger of progress
                    </p>
                </div>

                <div className="flex-1 relative flex flex-col  border justify-center overflow-hidden  pr-7  pl-12">
                    <div
                        className={`absolute left-12 right-6 top-0 bottom-0 pointer-events-none transition-opacity duration-700 ${mounted ? 'opacity-100' : 'opacity-0'} [background-image:repeating-linear-gradient(to_bottom,transparent_0,transparent_33px,rgba(30,42,58,0.14)_34px,rgba(30,42,58,0.14)_35px)]`}
                    />
                    <div
                        className={`absolute inset-y-0 left-[2.1rem] w-px bg-[#9c3b2e]/35 transition-opacity duration-700 ${mounted ? 'opacity-100' : 'opacity-0'}`}
                    />
                    <div className={`relative z-10 font-mono tracking-[0.14em] uppercase text-[#9c3b2e] font-semibold ${fadeUp('delay-100')}`}>
                        Saving fund
                    </div>
                    <h1 className={`relative z-10 font-mono font-semibold text-3xl text-[#1e2a3a] mt-1.5 mb-2.5 leading-tight ${fadeUp('delay-150')}`}>
                        Open your passbook
                    </h1>
                    <p className={`relative z-10 font-mono text-sm leading-relaxed text-[#5b6572] max-w-[30ch] ${fadeUp('delay-200')}`}>
                        Track deposits, track progress, hit your goal.
                    </p>

                    <div className={`relative z-10 mt-7 flex items-center gap-3.5 ${fadeUp('delay-300')}`}>
                        <button
                            className="px-6 py-3 bg-[#3F6B4C] cursor-pointer border border-[#D9D3C0] text-white rounded shadow-sm hover:bg-[#3F6B4C] hover:text-white transition-colors font-semibold text-center w-full md:w-1/2"
                            onClick={handleSignIn}
                            aria-live="polite"
                        >

                            <span className="inline-flex  items-center justify-center gap-2">
                                <span className="bg-[#f4eeda] rounded-full p-0.5 inline-flex">
                                    <svg width="14" height="14" viewBox="0 0 48 48" aria-hidden="true">
                                        <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z" />
                                        <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.1 18.9 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
                                        <path fill="#4CAF50" d="M24 44c5.5 0 10.4-1.9 14.3-5.1l-6.6-5.4C29.6 35.5 26.9 36.5 24 36.5c-5.2 0-9.6-3.3-11.2-7.9l-6.6 5.1C9.6 39.6 16.2 44 24 44z" />
                                        <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.6l6.6 5.4C39.9 36.9 44 30.9 44 24c0-1.3-.1-2.7-.4-3.5z" />
                                    </svg>
                                </span>
                                Google Sign In
                            </span>

                        </button>

                    </div>
                </div>
            </div>
        </div>
    );
};
export default SignIn;