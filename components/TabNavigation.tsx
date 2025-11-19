
import React from 'react';
import { ChartBarIcon, UsersIcon, MailIcon, AcademicCapIcon, CalendarIcon, FlagIcon, ShieldExclamationIcon, GlobeIcon } from './icons';
import { Tab } from '../App';

interface TabNavigationProps {
    activeTab: Tab;
    setActiveTab: (tab: Tab) => void;
    userRole: string;
}

export const TabNavigation = ({ activeTab, setActiveTab, userRole }: TabNavigationProps) => {
    const tabs: { id: Tab; label: string; icon: React.ReactNode; roles: string[] }[] = [
        { id: 'dashboard', label: 'Dashboard', icon: <ChartBarIcon className="w-4 h-4 mr-2"/>, roles: ['super_admin', 'community_admin', 'viewer'] },
        { id: 'participants', label: 'Participants', icon: <UsersIcon className="w-4 h-4 mr-2"/>, roles: ['super_admin', 'community_admin', 'viewer'] },
        { id: 'management', label: 'Community Management', icon: <GlobeIcon className="w-4 h-4 mr-2"/>, roles: ['super_admin', 'community_admin'] },
        { id: 'codes', label: 'Code Managers', icon: <UsersIcon className="w-4 h-4 mr-2"/>, roles: ['super_admin'] },
        { id: 'email', label: 'Email Campaigns', icon: <MailIcon className="w-4 h-4 mr-2"/>, roles: ['super_admin', 'community_admin'] },
        { id: 'membership', label: 'Membership Program', icon: <AcademicCapIcon className="w-4 h-4 mr-2"/>, roles: ['super_admin', 'community_admin'] },
        { id: 'events', label: 'Events', icon: <CalendarIcon className="w-4 h-4 mr-2"/>, roles: ['super_admin', 'community_admin'] },
        { id: 'reporting', label: 'Reporting', icon: <FlagIcon className="w-4 h-4 mr-2"/>, roles: ['super_admin', 'community_admin'] },
        { id: 'audits', label: 'Audits & Security', icon: <ShieldExclamationIcon className="w-4 h-4 mr-2"/>, roles: ['super_admin', 'community_admin'] },
        { id: 'admin', label: 'Admin Panel', icon: <ShieldExclamationIcon className="w-4 h-4 mr-2"/>, roles: ['super_admin'] },
    ];

    return (
        <div className="flex space-x-1 overflow-x-auto pb-2 scrollbar-hide">
            {tabs.filter(t => t.roles.includes(userRole)).map(tab => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                        flex items-center px-4 py-2 rounded-t-lg font-medium text-sm whitespace-nowrap transition-colors
                        ${activeTab === tab.id 
                            ? 'bg-brand-surface text-brand-primary border-b-2 border-brand-primary' 
                            : 'text-brand-text-secondary hover:text-brand-text hover:bg-brand-surface/50'}
                    `}
                >
                    {tab.icon}
                    {tab.label}
                </button>
            ))}
        </div>
    );
};
