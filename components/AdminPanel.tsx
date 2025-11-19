
import React, { useState } from 'react';
import { UserProfile, UserRole } from '../types';
import { ShieldExclamationIcon, UsersIcon, PlusIcon } from './icons';

interface AdminPanelProps {
    users: UserProfile[];
    availableCommunities: string[];
    onUpdateUserRole: (uid: string, role: UserRole) => void;
    onUpdateUserCommunities: (uid: string, communities: string[]) => void;
}

export const AdminPanel = ({ users, availableCommunities, onUpdateUserRole, onUpdateUserCommunities }: AdminPanelProps) => {
    const [editingUser, setEditingUser] = useState<string | null>(null);

    const handleCommunityToggle = (uid: string, currentCommunities: string[], community: string) => {
        const newCommunities = currentCommunities.includes(community)
            ? currentCommunities.filter(c => c !== community)
            : [...currentCommunities, community];
        onUpdateUserCommunities(uid, newCommunities);
    };

    return (
        <div className="space-y-6">
            <div className="bg-brand-surface p-6 rounded-lg shadow-lg border border-brand-primary/20">
                <div className="flex items-center mb-4">
                    <div className="p-3 bg-brand-primary/20 rounded-full mr-4 text-brand-primary">
                        <ShieldExclamationIcon className="h-8 w-8" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-brand-text">Super Admin Console</h2>
                        <p className="text-brand-text-secondary">Manage user access, assign roles, and scope community permissions.</p>
                    </div>
                </div>

                <div className="overflow-x-auto mt-6">
                    <table className="w-full text-sm text-left text-brand-text-secondary">
                        <thead className="text-xs text-brand-text uppercase bg-brand-bg">
                            <tr>
                                <th className="px-6 py-3">User</th>
                                <th className="px-6 py-3">Role</th>
                                <th className="px-6 py-3">Assigned Scope</th>
                                <th className="px-6 py-3">Last Login</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(user => (
                                <tr key={user.uid} className="border-b border-brand-border hover:bg-brand-border/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center">
                                            {user.photoURL ? (
                                                <img src={user.photoURL} alt="" className="h-8 w-8 rounded-full mr-3" />
                                            ) : (
                                                <div className="h-8 w-8 rounded-full bg-brand-primary/50 flex items-center justify-center mr-3 text-white font-bold">
                                                    {user.displayName?.charAt(0)}
                                                </div>
                                            )}
                                            <div>
                                                <div className="font-medium text-brand-text">{user.displayName}</div>
                                                <div className="text-xs">{user.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <select 
                                            value={user.role} 
                                            onChange={(e) => onUpdateUserRole(user.uid, e.target.value as UserRole)}
                                            className={`bg-brand-bg border border-brand-border text-xs rounded p-1.5 ${
                                                user.role === 'super_admin' ? 'text-brand-secondary font-bold' : 
                                                user.role === 'community_admin' ? 'text-brand-primary font-bold' : ''
                                            }`}
                                        >
                                            <option value="viewer">Viewer (No Access)</option>
                                            <option value="community_admin">Community Admin</option>
                                            <option value="super_admin">Super Admin</option>
                                        </select>
                                    </td>
                                    <td className="px-6 py-4">
                                        {user.role === 'super_admin' ? (
                                            <span className="bg-brand-secondary/20 text-brand-secondary px-2 py-1 rounded text-xs border border-brand-secondary/50">
                                                Global Access
                                            </span>
                                        ) : user.role === 'viewer' ? (
                                            <span className="text-gray-500 italic">Restricted</span>
                                        ) : (
                                            <div className="relative">
                                                <button 
                                                    onClick={() => setEditingUser(editingUser === user.uid ? null : user.uid)}
                                                    className="flex items-center text-brand-primary hover:text-white transition-colors"
                                                >
                                                    <span className="mr-2">
                                                        {user.allowedCommunities.length > 0 
                                                            ? `${user.allowedCommunities.length} Communities` 
                                                            : 'Select Communities'}
                                                    </span>
                                                    <PlusIcon className="h-4 w-4" />
                                                </button>
                                                
                                                {/* Community Selector Dropdown */}
                                                {editingUser === user.uid && (
                                                    <div className="absolute z-50 mt-2 w-64 bg-brand-surface border border-brand-border rounded-lg shadow-xl p-2 max-h-60 overflow-y-auto">
                                                        <p className="text-xs font-bold mb-2 px-2">Toggle Access:</p>
                                                        {availableCommunities.length > 0 ? availableCommunities.map(code => (
                                                            <div key={code} className="flex items-center p-2 hover:bg-brand-bg rounded cursor-pointer" onClick={() => handleCommunityToggle(user.uid, user.allowedCommunities, code)}>
                                                                <input 
                                                                    type="checkbox" 
                                                                    checked={user.allowedCommunities.includes(code)} 
                                                                    onChange={() => {}} 
                                                                    className="mr-2 rounded border-gray-600 bg-gray-700 text-brand-primary focus:ring-offset-gray-900"
                                                                />
                                                                <span className="text-sm">{code}</span>
                                                            </div>
                                                        )) : (
                                                            <p className="text-xs text-gray-500 px-2">No registered communities found. Go to "Community Management" to upload a list.</p>
                                                        )}
                                                        <div className="text-right mt-2 border-t border-brand-border pt-2">
                                                            <button onClick={() => setEditingUser(null)} className="text-xs text-blue-400 hover:underline">Done</button>
                                                        </div>
                                                    </div>
                                                )}
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {user.allowedCommunities.slice(0, 3).map(c => (
                                                        <span key={c} className="text-[10px] bg-brand-bg border border-brand-border px-1 rounded">{c}</span>
                                                    ))}
                                                    {user.allowedCommunities.length > 3 && <span className="text-[10px] text-gray-500">+{user.allowedCommunities.length - 3} more</span>}
                                                </div>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        {user.lastLogin?.toDate ? user.lastLogin.toDate().toLocaleDateString() : 'N/A'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};