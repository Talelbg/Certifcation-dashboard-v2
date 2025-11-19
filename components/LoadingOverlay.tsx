
import React from 'react';

interface LoadingOverlayProps {
    isLoading: boolean;
    message?: string;
}

export const LoadingOverlay = ({ isLoading, message = "Loading..." }: LoadingOverlayProps) => {
    if (!isLoading) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-brand-surface p-6 rounded-lg border border-brand-border shadow-2xl flex flex-col items-center">
                <div className="w-12 h-12 border-4 border-brand-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-brand-text font-semibold animate-pulse">{message}</p>
            </div>
        </div>
    );
};
