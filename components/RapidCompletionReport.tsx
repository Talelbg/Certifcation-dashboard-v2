
import React from 'react';
import { DeveloperRecord } from '../types';
import { FlagIcon } from './icons';

interface RapidCompletionReportProps {
    developers: DeveloperRecord[];
}

export const RapidCompletionReport = ({ developers }: RapidCompletionReportProps) => {
    return (
        <div className="space-y-6">
             <div className="bg-brand-surface p-6 rounded-lg shadow-lg border border-brand-primary/20">
                <div className="flex items-center mb-4">
                    <div className="p-3 bg-red-500/20 rounded-full mr-4 text-red-500">
                        <FlagIcon className="h-8 w-8" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-brand-text">Rapid Completion Audit</h2>
                        <p className="text-brand-text-secondary">
                            Detecting developers who completed the certification in less than 5 hours.
                        </p>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-brand-text-secondary">
                        <thead className="text-xs text-brand-text uppercase bg-brand-bg">
                            <tr>
                                <th className="px-6 py-3">Developer ID</th>
                                <th className="px-6 py-3">Community</th>
                                <th className="px-6 py-3">Enrollment</th>
                                <th className="px-6 py-3">Completion</th>
                                <th className="px-6 py-3">Duration (Hours)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {developers.map(dev => {
                                const duration = dev.completedAt ? (dev.completedAt.getTime() - dev.enrollmentDate.getTime()) / (1000 * 60 * 60) : 0;
                                return (
                                    <tr key={dev.developerId} className="border-b border-brand-border hover:bg-brand-border/50">
                                        <td className="px-6 py-4 font-medium text-brand-text">{dev.developerId}</td>
                                        <td className="px-6 py-4">{dev.communityCode}</td>
                                        <td className="px-6 py-4">{dev.enrollmentDate.toLocaleString()}</td>
                                        <td className="px-6 py-4">{dev.completedAt?.toLocaleString()}</td>
                                        <td className="px-6 py-4 font-bold text-red-400">{duration.toFixed(2)} hrs</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {developers.length === 0 && (
                        <div className="text-center py-12">
                            <p className="text-green-400 font-medium">No rapid completions detected.</p>
                            <p className="text-brand-text-secondary text-xs mt-1">All certifications appear to have valid study durations.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
