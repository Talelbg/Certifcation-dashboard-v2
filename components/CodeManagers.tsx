
import React, { useState, useMemo } from 'react';
import { ManagedCommunity, UserProfile } from '../types';
import { ShieldExclamationIcon, UsersIcon, PlusIcon, TrashIcon, GlobeIcon } from './icons';

interface CodeManagersProps {
    communities: ManagedCommunity[];
    users: UserProfile[];
    onCreateCommunity: (code: string, name: string, description?: string) => void;
    onDeleteCommunity: (code: string) => void;
    onAssignAdmin: (uid: string, communities: string[]) => void;
}

export const CodeManagers = ({ communities, users, onCreateCommunity, onDeleteCommunity, onAssignAdmin }: CodeManagersProps) => {
    const [search, setSearch] = useState('');
    const [filterSource, setFilterSource] = useState<'all' | 'csv' | 'manual'>('all');
    const [isCreating, setIsCreating] = useState(false);
    const [newCode, setNewCode] = useState('');
    const [newName, setNewName] = useState('');
    const [newDesc, setNewDesc] = useState('');

    const filteredCommunities = useMemo(() => {
        return communities.filter(c => {
            const matchesSearch = c.code.toLowerCase().includes(search.toLowerCase()) || 
                                  (c.name && c.name.toLowerCase().includes(search.toLowerCase()));
            const matchesSource = filterSource === 'all' || c.source === filterSource;
            return matchesSearch && matchesSource;
        });
    }, [communities, search, filterSource]);

    // Helper to find admins assigned to a specific code
    const getAdminsForCommunity = (code: string) => {
        return users.filter(u => u.allowedCommunities.includes(code));
    };

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        if (newCode) {
            onCreateCommunity(newCode, newName || newCode, newDesc);
            setIsCreating(false);
            setNewCode('');
            setNewName('');
            setNewDesc('');
        }
    };

    const handleRemoveAdmin = (uid: string, code: string) => {
        const user = users.find(u => u.uid === uid);
        if (user) {
            const newCodes = user.allowedCommunities.filter(c => c !== code);
            onAssignAdmin(uid, newCodes);
        }
    };

    const handleAddAdmin = (code: string, uid: string) => {
        if (!uid) return;
        const user = users.find(u => u.uid === uid);
        if (user && !user.allowedCommunities.includes(code)) {
            const newCodes = [...user.allowedCommunities, code];
            onAssignAdmin(uid, newCodes);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-brand-surface p-6 rounded-lg shadow-lg border border-brand-primary/20">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
                    <div className="flex items-center mb-4 md:mb-0">
                        <div className="p-3 bg-indigo-500/20 rounded-full mr-4 text-indigo-400">
                            <UsersIcon className="h-8 w-8" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-brand-text">Code Managers</h2>
                            <p className="text-brand-text-secondary">Assign Admins to Community Codes and manage manual entries.</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => setIsCreating(true)}
                        className="bg-brand-primary hover:bg-brand-primary-hover text-white font-bold py-2 px-4 rounded-lg flex items-center transition-colors"
                    >
                        <PlusIcon className="mr-2 h-5 w-5" />
                        Add Manual Code
                    </button>
                </div>

                {/* Filters */}
                <div className="flex flex-col md:flex-row gap-4 mb-6 bg-brand-bg p-4 rounded-lg">
                    <div className="flex-grow">
                        <input 
                            type="text" 
                            placeholder="Search codes or names..." 
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-brand-border text-brand-text rounded px-3 py-2"
                        />
                    </div>
                    <select 
                        value={filterSource}
                        onChange={(e) => setFilterSource(e.target.value as any)}
                        className="bg-brand-border text-brand-text rounded px-3 py-2"
                    >
                        <option value="all">All Sources</option>
                        <option value="csv">Detected from CSV</option>
                        <option value="manual">Manually Added</option>
                    </select>
                </div>

                {/* Create Form Modal/Inline */}
                {isCreating && (
                    <div className="mb-6 p-4 bg-indigo-900/20 border border-indigo-500/30 rounded-lg">
                        <h3 className="font-bold text-brand-text mb-3">Add New Community Code</h3>
                        <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                            <div>
                                <label className="block text-xs text-brand-text-secondary mb-1">Code *</label>
                                <input 
                                    type="text" 
                                    value={newCode} 
                                    onChange={(e) => setNewCode(e.target.value)} 
                                    className="w-full bg-brand-border text-brand-text rounded px-3 py-2" 
                                    required 
                                    placeholder="e.g., HEDERA-NY"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-brand-text-secondary mb-1">Name</label>
                                <input 
                                    type="text" 
                                    value={newName} 
                                    onChange={(e) => setNewName(e.target.value)} 
                                    className="w-full bg-brand-border text-brand-text rounded px-3 py-2" 
                                    placeholder="Friendly Name"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-brand-text-secondary mb-1">Description</label>
                                <input 
                                    type="text" 
                                    value={newDesc} 
                                    onChange={(e) => setNewDesc(e.target.value)} 
                                    className="w-full bg-brand-border text-brand-text rounded px-3 py-2" 
                                    placeholder="Optional"
                                />
                            </div>
                            <div className="flex gap-2">
                                <button type="submit" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-bold flex-grow">Save</button>
                                <button type="button" onClick={() => setIsCreating(false)} className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded font-bold">Cancel</button>
                            </div>
                        </form>
                    </div>
                )}

                {/* List */}
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-brand-text-secondary">
                        <thead className="text-xs text-brand-text uppercase bg-brand-bg">
                            <tr>
                                <th className="px-6 py-3">Code</th>
                                <th className="px-6 py-3">Source</th>
                                <th className="px-6 py-3">Assigned Admins</th>
                                <th className="px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredCommunities.map((community) => {
                                const assignedAdmins = getAdminsForCommunity(community.code);
                                return (
                                    <tr key={community.code} className="border-b border-brand-border hover:bg-brand-border/50">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-brand-text">{community.code}</div>
                                            {community.name && community.name !== community.code && (
                                                <div className="text-xs text-brand-text-secondary">{community.name}</div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {community.source === 'csv' ? (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                                    <GlobeIcon className="mr-1 h-3 w-3" /> CSV
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                                    <UsersIcon className="mr-1 h-3 w-3" /> Manual
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-2 mb-2">
                                                {assignedAdmins.map(admin => (
                                                    <div key={admin.uid} className="flex items-center bg-brand-bg border border-brand-border rounded-full px-2 py-1">
                                                        {admin.photoURL && <img src={admin.photoURL} className="w-4 h-4 rounded-full mr-1" alt="" />}
                                                        <span className="text-xs mr-1">{admin.displayName}</span>
                                                        <button 
                                                            onClick={() => handleRemoveAdmin(admin.uid, community.code)}
                                                            className="text-red-400 hover:text-red-600"
                                                        >
                                                            &times;
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                            <select 
                                                className="text-xs bg-brand-bg border border-brand-border rounded px-2 py-1 text-brand-text-secondary hover:text-brand-text w-40"
                                                onChange={(e) => {
                                                    handleAddAdmin(community.code, e.target.value);
                                                    e.target.value = "";
                                                }}
                                            >
                                                <option value="">+ Assign Admin</option>
                                                {users.filter(u => !u.allowedCommunities.includes(community.code)).map(u => (
                                                    <option key={u.uid} value={u.uid}>{u.displayName} ({u.email})</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {community.source === 'manual' && (
                                                <button 
                                                    onClick={() => onDeleteCommunity(community.code)}
                                                    className="text-red-400 hover:text-red-600 transition-colors p-2"
                                                    title="Delete Manual Code"
                                                >
                                                    <TrashIcon className="h-5 w-5" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {filteredCommunities.length === 0 && (
                        <div className="text-center py-8 text-brand-text-secondary">No communities matching your filters.</div>
                    )}
                </div>
            </div>
        </div>
    );
};
