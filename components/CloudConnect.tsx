
import React, { useState } from 'react';
import { GlobeIcon } from './icons';

interface CloudConnectProps {
    onConnect: (config: any) => void;
    isConnected: boolean;
    onDisconnect: () => void;
}

export const CloudConnect = ({ onConnect, isConnected, onDisconnect }: CloudConnectProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [showGuide, setShowGuide] = useState(false);
    const [configJson, setConfigJson] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleConnect = () => {
        try {
            // Allow users to paste the full `const firebaseConfig = { ... }` or just the object `{ ... }`
            let jsonStr = configJson.trim();
            
            // Simple cleanup if they pasted JS code instead of raw JSON
            if (jsonStr.startsWith('const') || jsonStr.startsWith('var') || jsonStr.startsWith('let')) {
                const match = jsonStr.match(/=\{([\s\S]*)\}/);
                if (match) {
                    jsonStr = `{${match[1]}}`;
                }
            }
            // Fix keys not being quoted if pasted from JS object
            // This is a basic regex fix, might not cover all edge cases but helps common copy-pastes
            jsonStr = jsonStr.replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2": ');
            // Fix single quotes to double quotes
            jsonStr = jsonStr.replace(/'/g, '"');
            // Remove trailing commas which JSON.parse hates
            jsonStr = jsonStr.replace(/,(\s*})/g, '$1');

            const config = JSON.parse(jsonStr);
            onConnect(config);
            setIsOpen(false);
            setError(null);
        } catch (e: any) {
            console.error(e);
            setError('Invalid configuration format. Please paste the JSON object from Firebase Console.');
        }
    };

    if (isConnected) {
        return (
            <button 
                onClick={onDisconnect}
                className="bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-600/50 font-bold py-2 px-4 rounded-lg flex items-center transition-colors duration-200 text-xs"
            >
                <div className="h-2 w-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
                Cloud Connected
            </button>
        );
    }

    return (
        <>
            <button 
                onClick={() => setIsOpen(true)}
                className="bg-brand-surface hover:bg-brand-border border border-brand-border text-brand-text-secondary hover:text-brand-text font-bold py-2 px-4 rounded-lg flex items-center transition-colors duration-200 text-xs"
            >
                <GlobeIcon className="h-4 w-4 mr-2" />
                Connect to Cloud
            </button>

            {isOpen && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-brand-surface p-6 rounded-lg shadow-xl w-full max-w-2xl border border-brand-border max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-xl font-bold text-brand-text">Connect to Google Cloud (Firestore)</h3>
                            <button onClick={() => setIsOpen(false)} className="text-brand-text-secondary hover:text-brand-text">✕</button>
                        </div>

                        <p className="text-sm text-brand-text-secondary mb-4">
                            Connect a realtime database to save your data on the server. All team members will see updates instantly.
                        </p>
                        
                        <div className="mb-4">
                            <button 
                                onClick={() => setShowGuide(!showGuide)}
                                className="text-brand-primary text-sm hover:underline flex items-center"
                            >
                                {showGuide ? 'Hide Setup Guide' : 'How to get this? (Step-by-Step Guide)'}
                            </button>
                            
                            {showGuide && (
                                <div className="mt-2 p-4 bg-brand-bg rounded-lg border border-brand-border text-sm text-brand-text-secondary space-y-2">
                                    <p><strong className="text-brand-text">1. Create Project:</strong> Go to <a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">Firebase Console</a> and create a new project.</p>
                                    <p><strong className="text-brand-text">2. Register App:</strong> Click the web icon (<strong>&lt;/&gt;</strong>) on the overview page. Register a nickname (e.g., "Hedera Dashboard").</p>
                                    <p><strong className="text-brand-text">3. Copy Config:</strong> You will see a code block with <code>firebaseConfig</code>. Copy the object inside the braces <code>{`{ ... }`}</code>.</p>
                                    <p><strong className="text-brand-text">4. Create Database:</strong> Go to <strong>Build &gt; Firestore Database</strong> in the left menu. Click <strong>Create Database</strong>.</p>
                                    <p><strong className="text-brand-text">5. Set Rules:</strong> For initial testing, select <strong>Start in test mode</strong> (allows read/write for 30 days). For production, configure proper security rules.</p>
                                    <p><strong className="text-brand-text">6. Paste:</strong> Paste the copied config object into the box below.</p>
                                </div>
                            )}
                        </div>
                        
                        <label className="block text-xs font-bold text-brand-text-secondary mb-1">Firebase Configuration Object</label>
                        <textarea 
                            value={configJson}
                            onChange={(e) => setConfigJson(e.target.value)}
                            placeholder='{ "apiKey": "AIzaSy...", "authDomain": "...", "projectId": "..." }'
                            className="w-full h-32 bg-brand-bg border border-brand-border rounded-md p-3 text-xs text-brand-text font-mono mb-2 focus:border-brand-primary focus:outline-none"
                        />
                        
                        {error && <p className="text-red-400 text-xs mb-4">{error}</p>}
                        
                        <div className="flex justify-end space-x-3 mt-4">
                            <button 
                                onClick={() => setIsOpen(false)}
                                className="text-brand-text-secondary hover:text-brand-text text-sm px-3 py-2"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleConnect}
                                className="bg-brand-primary hover:bg-brand-primary-hover text-white font-bold py-2 px-4 rounded-lg text-sm"
                            >
                                Connect Database
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
