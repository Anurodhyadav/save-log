import React, { useEffect, useState } from 'react';

export const Toast = ({ message, type = 'success', onClose, duration = 3000, fixed = false }) => {
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        setIsExiting(false);
        const exitTimer = setTimeout(() => setIsExiting(true), duration - 300);
        const closeTimer = setTimeout(() => onClose(), duration);
        return () => {
            clearTimeout(exitTimer);
            clearTimeout(closeTimer);
        };
    }, [duration, onClose]);

    const handleClose = () => {
        setIsExiting(true);
        setTimeout(onClose, 300);
    };

    const isSuccess = type === 'success';

    return (
        <div
            role="status"
            aria-live="polite"
            className={`flex items-center gap-3 px-4 py-3 rounded-lg border shadow-sm transition-all duration-300 ease-out
        ${fixed
                    ? `fixed left-1/2 -translate-x-1/2 z-50 max-w-[calc(100vw-2rem)] w-full sm:w-auto sm:min-w-[340px] bottom-[calc(env(safe-area-inset-bottom)+1rem)] ${isExiting ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'}`
                    : `w-full ${isExiting ? 'opacity-0 -translate-y-1' : 'opacity-100 translate-y-0'}`}
        ${isSuccess
                    ? 'bg-[#3F6B4C] text-[#F2EFE4] border-[#2c4d36]'
                    : 'bg-[#B3261E] text-[#F8E9E8] border-[#7a1a15]'}
      `}
        >
            {isSuccess ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
            ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
            )}
            <span className="text-sm md:text-base flex-1">{message}</span>
            <button
                type="button"
                onClick={handleClose}
                aria-label="Dismiss"
                className="shrink-0 p-1 -mr-1 opacity-80 hover:opacity-100 transition-opacity"
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        </div>
    );
};