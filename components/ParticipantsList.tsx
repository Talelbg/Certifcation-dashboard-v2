
import React, { useState, useMemo } from 'react';
import { DeveloperRecord } from '../types';
import { UsersIcon, AcademicCapIcon, MailIcon, FlagIcon, GlobeIcon } from './icons';

interface ParticipantsListProps {
    data: DeveloperRecord[];
}

const ProgressBar = ({ progress }: { progress: number }) => {
    const bgColor = progress === 100 ? 'bg-green-500' : progress > 50 ? 'bg-blue-500' : 'bg-brand-border';
    return (
        <div className="w-24 bg-brand-border rounded-full h-2">
            <div className={`${bgColor} h-2 rounded-full`} style={{ width: `${progress}%` }}></div>
        </div>
    );
};

export const ParticipantsList = ({ data }: ParticipantsListProps) => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredData = useMemo(() => {
        const term = searchTerm.toLowerCase();
        return data.filter(dev => 
            dev.firstName.toLowerCase().includes(term) ||
            dev.lastName.toLowerCase().includes(term) ||
            dev.developerId.toLowerCase().includes(term) ||
            dev.communityCode.toLowerCase().includes(term) ||
            dev.country.toLowerCase().includes(term)
        );
    }, [data, searchTerm]);

    return (
        <div className="space-y-6">
            <div className="bg-brand-surface p-6 rounded-lg shadow-lg border border-brand-primary/20">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
                    <div className="flex items-center mb-4 md:mb-0">
                        <div className="p-3 bg-teal-500/20 rounded-full mr-4 text-teal-400">
                            <UsersIcon className="h-8 w-8" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-brand-text">Participants Directory</h2>
                            <p className="text-brand-text-secondary">View and search the entire list of enrolled developers.</p>
                        </div>
                    </div>
                    
                    {/* Search Bar */}
                    <div className="relative w-full md:w-72">
                        <input 
                            type="text" 
                            placeholder="Search by name, email, code..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-brand-bg border border-brand-border text-brand-text rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:border-brand-primary transition-colors"
                        />
                        <div className="absolute left-3 top-2.5 text-brand-text-secondary">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-brand-text-secondary">
                        <thead className="text-xs text-brand-text uppercase bg-brand-bg">
                            <tr>
                                <th className="px-6 py-3">Participant</th>
                                <th className="px-6 py-3">Community</th>
                                <th className="px-6 py-3">Country</th>
                                <th className="px-6 py-3">Progress</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3">Joined</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredData.map((dev) => (
                                <tr key={dev.developerId} className="border-b border-brand-border hover:bg-brand-border/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center">
                                            <div className="h-8 w-8 rounded-full bg-brand-primary/20 text-brand-primary flex items-center justify-center font-bold mr-3 text-xs">
                                                {dev.firstName ? dev.firstName.charAt(0) : dev.developerId.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="font-medium text-brand-text">{dev.firstName} {dev.lastName}</div>
                                                <div className="text-xs">{dev.developerId}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="bg-brand-bg border border-brand-border px-2 py-1 rounded text-xs font-medium text-brand-text">
                                            {dev.communityCode}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center text-xs">
                                            <GlobeIcon className="h-3 w-3 mr-1 text-brand-text-secondary" />
                                            {dev.country}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center">
                                            <span className="mr-2 w-8 text-right font-medium text-brand-text">{dev.certificationProgress}%</span>
                                            <ProgressBar progress={dev.certificationProgress} />
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex space-x-2">
                                            {dev.certified && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-900/30 text-green-400 border border-green-900">
                                                    <AcademicCapIcon className="h-3 w-3 mr-1" /> Certified
                                                </span>
                                            )}
                                            {dev.subscribed && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-900/30 text-blue-400 border border-blue-900">
                                                    <MailIcon className="h-3 w-3 mr-1" /> Subscribed
                                                </span>
                                            )}
                                            {!dev.certified && !dev.subscribed && (
                                                 <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-700 text-gray-400">
                                                    Enrolled
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {new Date(dev.enrollmentDate).toLocaleDateString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredData.length === 0 && (
                        <div className="text-center py-12">
                            <p className="text-brand-text-secondary">No participants found matching "{searchTerm}".</p>
                        </div>
                    )}
                    <div className="p-4 text-xs text-brand-text-secondary text-right bg-brand-surface border-t border-brand-border">
                        Showing {filteredData.length} of {data.length} participants
                    </div>
                </div>
            </div>
        </div>
    );
};
