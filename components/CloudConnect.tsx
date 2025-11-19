
import React from 'react';
import { User } from 'firebase/auth';
import { GlobeIcon } from './icons';

interface CloudConnectProps {
    user: User | null;
    onLogin: () => void;
    onLogout: () => void;
}

export const CloudConnect = ({ user, onLogin, onLogout }: CloudConnectProps) => {
    
    if (user) {
        return (
            <div className="flex items-center space-x-3">
                <div className="flex items-center bg-brand-surface border border-green-500/30 px-3 py-1.5 rounded-lg">
                    <div className="relative">
                        {user.photoURL ? (
                            <img src={user.photoURL} alt="Profile" className="h-6 w-6 rounded-full border border-brand-border" />
                        ) : (
                            <div className="h-6 w-6 rounded-full bg-brand-primary flex items-center justify-center text-xs font-bold text-white">
                                {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                            </div>
                        )}
                        <div className="absolute bottom-0 right-0 h-2 w-2 bg-green-400 rounded-full border border-brand-surface"></div>
                    </div>
                    <span className="ml-2 text-xs font-medium text-brand-text hidden sm:block">{user.displayName}</span>
                </div>
                <button 
                    onClick={onLogout}
                    className="text-xs text-brand-text-secondary hover:text-red-400 transition-colors"
                >
                    Sign Out
                </button>
            </div>
        );
    }

    return (
        <button 
            onClick={onLogin}
            className="bg-brand-primary hover:bg-brand-primary-hover text-white font-bold py-2 px-4 rounded-lg flex items-center transition-colors duration-200 text-xs shadow-lg shadow-indigo-500/20"
        >
            <GlobeIcon className="h-4 w-4 mr-2" />
            Sign In with Google
        </button>
    );
};
