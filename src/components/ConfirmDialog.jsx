import React, { useEffect, useRef } from 'react';

export const ConfirmDialog = ({
    isOpen,
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    danger = false,
    onConfirm,
    onCancel,
}) => {
    const confirmBtnRef = useRef(null);

    useEffect(() => {
        if (!isOpen) return;
        confirmBtnRef.current?.focus();

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onCancel();
        };
        document.addEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [isOpen, onCancel]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-[1px]"
            onClick={onCancel}
        >
            <div
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="confirm-dialog-title"
                aria-describedby="confirm-dialog-message"
                onClick={(e) => e.stopPropagation()}
                className="w-full sm:max-w-sm bg-[#F2EFE4] border border-[#3F6B4C]] rounded-t-2xl sm:rounded-2xl shadow-xl p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] sm:pb-5"
            >
                <h3 id="confirm-dialog-title" className="text-lg font-semibold text-[#262220] mb-2">
                    {title}
                </h3>
                <p id="confirm-dialog-message" className="text-sm md:text-base text-[#7A6E5D] mb-6">
                    {message}
                </p>
                <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="w-full sm:w-auto px-4 py-3 rounded border border-[#D9D3C0] bg-white text-[#262220] font-semibold hover:bg-[#F8F5EC] transition-colors cursor-pointer"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        type="button"
                        ref={confirmBtnRef}
                        onClick={onConfirm}
                        className={`w-full sm:w-auto px-4 py-3 rounded border font-semibold transition-colors cursor-pointer ${danger
                            ? 'bg-[#B3261E] border-[#7a1a15] text-[#F8E9E8] hover:bg-[#93201a]'
                            : 'bg-[#3F6B4C] border-[#262220] text-[#F2EFE4] hover:bg-[#32563d]'
                            }`}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};