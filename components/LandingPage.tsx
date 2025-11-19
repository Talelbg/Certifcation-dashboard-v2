
import React from 'react';
import { GlobeIcon } from './icons';

interface LandingPageProps {
    onLogin: () => void;
}

export const LandingPage = ({ onLogin }: LandingPageProps) => {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-brand-bg relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-brand-primary/10 blur-[100px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-brand-secondary/10 blur-[100px]"></div>
            </div>

            <div className="z-10 text-center p-8 max-w-md w-full bg-brand-surface/50 backdrop-blur-lg rounded-2xl border border-brand-border shadow-2xl">
                <div className="flex justify-center mb-6">
                    <div className="p-4 bg-brand-surface rounded-xl border border-brand-border shadow-inner">
                        <GlobeIcon className="h-12 w-12 text-brand-primary" />
                    </div>
                </div>
                
                <h1 className="text-3xl font-bold text-brand-text mb-2">Hedera Certification</h1>
                <p className="text-brand-text-secondary mb-8 text-lg">Community Dashboard</p>
                
                <div className="space-y-4">
                    <p className="text-sm text-brand-text-secondary mb-4">
                        Securely sign in to manage developer communities, track certifications, and orchestrate campaigns.
                    </p>
                    
                    <button 
                        onClick={onLogin}
                        className="w-full bg-brand-primary hover:bg-brand-primary-hover text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center transition-all duration-200 shadow-lg shadow-indigo-500/25 hover:scale-[1.02]"
                    >
                        <GlobeIcon className="h-5 w-5 mr-3" />
                        Sign In with Google
                    </button>
                </div>
                
                <div className="mt-8 pt-6 border-t border-brand-border text-xs text-brand-text-secondary">
                    <p>Authorized Personnel Only</p>
                    <p>&copy; {new Date().getFullYear()} Hedera Certification Dashboard</p>
                </div>
            </div>
        </div>
    );
};
