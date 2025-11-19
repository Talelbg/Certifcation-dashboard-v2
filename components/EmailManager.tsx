
import React, { useState, useMemo } from 'react';
import { EmailTemplate, CommunityWithMetadata, DeveloperRecord, Event, Campaign } from '../types';
import { MailIcon, CalendarIcon, FlagIcon, TrashIcon } from './icons';
import { useCloudStorage } from '../hooks/useCloudStorage';

const initialTemplates: EmailTemplate[] = [
    { 
        id: '1', 
        name: 'Progress Nudge (50% mark)', 
        subject: 'Great Progress, {{first_name}}!', 
        body: 'Hi {{first_name}} {{last_name}},\n\nJust a quick note to say great work on reaching {{completion_percentage}}% in the certification program. Keep up the momentum!\n\nBest,\nCommunity Manager' 
    },
    { 
        id: '2', 
        name: 'Almost There! (80% mark)', 
        subject: 'You\'re so close, {{first_name}}!', 
        body: 'Hi {{first_name}},\n\nWow, you are at {{completion_percentage}}% completion. You are so close to the finish line! Let us know if you need any help with the final modules.\n\nBest,\nCommunity Manager' 
    },
    { 
        id: '3', 
        name: 'Community Event Invitation', 
        subject: 'Join us for {{event_name}}!', 
        body: 'Hi {{first_name}},\n\nWe are excited to invite you to our upcoming event: {{event_name}}.\n\nIt will take place on {{event_date}}.\n\nJoin here: {{event_link}}\n\nSee you there,\nCommunity Manager' 
    },
];

const replaceTags = (text: string, developer: DeveloperRecord, event?: Event): string => {
    if (!text) return '';
    let processed = text
        .replace(/{{first_name}}/g, developer.firstName || '')
        .replace(/{{last_name}}/g, developer.lastName || '')
        .replace(/{{email}}/g, developer.developerId)
        .replace(/{{completion_percentage}}/g, String(developer.certificationProgress))
        .replace(/{{community_code}}/g, developer.communityCode);

    if (event) {
        processed = processed
            .replace(/{{event_name}}/g, event.name)
            .replace(/{{event_date}}/g, new Date(event.date).toLocaleDateString())
            .replace(/{{event_link}}/g, event.link || '#');
    }
    return processed;
};

interface EmailManagerProps {
  communities: CommunityWithMetadata[];
  developerData: DeveloperRecord[];
  events: Event[];
}

export const EmailManager = ({ communities, developerData, events }: EmailManagerProps) => {
    const { createEmailCampaign, cloudCampaigns, isConnected } = useCloudStorage();

    const [apiKey, setApiKey] = useState('');
    const [groupId, setGroupId] = useState('');
    
    const [templates] = useState<EmailTemplate[]>(initialTemplates);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>(templates[0].id);
    const [selectedEventId, setSelectedEventId] = useState<string>('');

    const [filterCommunity, setFilterCommunity] = useState('all');
    const [filterMinProgress, setFilterMinProgress] = useState(0);
    const [filterMaxProgress, setFilterMaxProgress] = useState(100);

    const [isSending, setIsSending] = useState(false);
    const [activeView, setActiveView] = useState<'compose' | 'history'>('compose');

    const selectedTemplate = useMemo(() => {
        return templates.find(t => t.id === selectedTemplateId)!;
    }, [selectedTemplateId, templates]);

    const selectedEvent = useMemo(() => {
        return events.find(e => e.id === selectedEventId);
    }, [selectedEventId, events]);

    const filteredDevelopers = useMemo(() => {
        return developerData.filter(dev => {
            if (!dev.subscribed) return false; // Only email subscribed users
            const inCommunity = filterCommunity === 'all' || dev.communityCode === filterCommunity;
            const inProgressRange = dev.certificationProgress >= filterMinProgress && dev.certificationProgress <= filterMaxProgress;
            return inCommunity && inProgressRange;
        });
    }, [developerData, filterCommunity, filterMinProgress, filterMaxProgress]);

    const handleSendEmails = async () => {
        if (!isConnected) {
            alert("You must be signed in to send campaigns.");
            return;
        }
        if (!apiKey || !groupId) {
            alert('Please provide your MailerLite API Key and Group ID to send emails.');
            return;
        }
        if (filteredDevelopers.length === 0) {
            alert('No subscribed developers match the current filters.');
            return;
        }

        setIsSending(true);

        try {
            // PRODUCTION: Instead of console logging, we write a Campaign Request to Firestore.
            // A backend Cloud Function would listen to this collection and process the dispatch via MailerLite.
            await createEmailCampaign({
                name: `${selectedTemplate.name} - ${new Date().toLocaleDateString()}`,
                templateName: selectedTemplate.name,
                subject: selectedTemplate.subject,
                targetCommunity: filterCommunity,
                targetCount: filteredDevelopers.length,
                status: 'queued' // Status allows backend to pick it up
            });
            
            alert(`Campaign queued successfully! ${filteredDevelopers.length} developers targeted. Check 'History' tab for status.`);
            setActiveView('history');

        } catch (e: any) {
            alert(`Failed to queue campaign: ${e.message}`);
        } finally {
            setIsSending(false);
        }
    };

    const previewDeveloper = filteredDevelopers[0];
    const upcomingEvents = events.filter(e => e.type === 'upcoming');
    
    return (
      <div className="space-y-6">
        <div className="flex space-x-4 border-b border-brand-border pb-2">
            <button onClick={() => setActiveView('compose')} className={`px-4 py-2 font-medium ${activeView === 'compose' ? 'text-brand-primary border-b-2 border-brand-primary' : 'text-brand-text-secondary'}`}>Compose Campaign</button>
            <button onClick={() => setActiveView('history')} className={`px-4 py-2 font-medium ${activeView === 'history' ? 'text-brand-primary border-b-2 border-brand-primary' : 'text-brand-text-secondary'}`}>Campaign History</button>
        </div>

        {activeView === 'compose' ? (
            <>
                <div className="bg-brand-surface p-4 rounded-lg shadow-lg">
                    <h3 className="font-bold text-lg mb-3 text-brand-text">MailerLite Configuration</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="mailerlite-api-key" className="block text-sm font-medium text-brand-text-secondary mb-1">API Key</label>
                            <input type="password" id="mailerlite-api-key" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="Enter your MailerLite API Key" className="w-full bg-brand-border text-brand-text rounded-md px-3 py-2" />
                        </div>
                        <div>
                            <label htmlFor="mailerlite-group-id" className="block text-sm font-medium text-brand-text-secondary mb-1">Group ID</label>
                            <input type="text" id="mailerlite-group-id" value={groupId} onChange={e => setGroupId(e.target.value)} placeholder="Enter the destination Group ID" className="w-full bg-brand-border text-brand-text rounded-md px-3 py-2" />
                        </div>
                    </div>
                </div>

                <div className="bg-brand-surface p-4 rounded-lg shadow-lg">
                    <h3 className="font-bold text-lg mb-3 text-brand-text">Campaign Builder</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="template-select" className="block text-sm font-medium text-brand-text-secondary mb-1">Email Template</label>
                                <select id="template-select" value={selectedTemplateId} onChange={(e) => setSelectedTemplateId(e.target.value)} className="w-full bg-brand-border text-brand-text rounded-md px-3 py-2">
                                    {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            </div>
                            
                            <div>
                                <label htmlFor="event-select" className="block text-sm font-medium text-brand-text-secondary mb-1">Promote Event (Optional)</label>
                                <div className="flex items-center space-x-2">
                                    <CalendarIcon className="text-brand-primary" />
                                    <select id="event-select" value={selectedEventId} onChange={e => setSelectedEventId(e.target.value)} className="w-full bg-brand-border text-brand-text rounded-md px-3 py-2">
                                        <option value="">-- Select an Upcoming Event --</option>
                                        {upcomingEvents.map(e => <option key={e.id} value={e.id}>{e.name} ({new Date(e.date).toLocaleDateString()})</option>)}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label htmlFor="community-filter" className="block text-sm font-medium text-brand-text-secondary mb-1">Target Community</label>
                                <select id="community-filter" value={filterCommunity} onChange={e => setFilterCommunity(e.target.value)} className="w-full bg-brand-border text-brand-text rounded-md px-3 py-2">
                                    <option value="all">All Communities</option>
                                    {communities.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-brand-text-secondary mb-1">Target Progress ({filterMinProgress}% - {filterMaxProgress}%)</label>
                                <div className="flex items-center space-x-2">
                                    <input type="range" min="0" max="100" value={filterMinProgress} onChange={e => setFilterMinProgress(Math.min(parseInt(e.target.value, 10), filterMaxProgress))} className="w-full" />
                                    <input type="range" min="0" max="100" value={filterMaxProgress} onChange={e => setFilterMaxProgress(Math.max(parseInt(e.target.value, 10), filterMinProgress))} className="w-full" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-brand-bg p-4 rounded-lg border border-brand-border">
                            <h4 className="font-bold text-md mb-2 text-brand-text">Live Preview</h4>
                            {previewDeveloper ? (
                                <div className="space-y-3 text-sm">
                                    <div>
                                        <label className="block text-xs font-medium text-brand-text-secondary">Subject</label>
                                        <p className="mt-1 p-2 bg-brand-border rounded-md text-brand-text">{replaceTags(selectedTemplate?.subject, previewDeveloper, selectedEvent)}</p>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-brand-text-secondary">Body</label>
                                        <pre className="mt-1 p-2 bg-brand-border rounded-md text-brand-text whitespace-pre-wrap font-sans">{replaceTags(selectedTemplate?.body, previewDeveloper, selectedEvent)}</pre>
                                    </div>
                                    <p className="text-xs text-brand-text-secondary italic">Preview based on developer: {previewDeveloper.developerId}</p>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center h-full text-brand-text-secondary text-center">
                                    <p>No subscribed developers match the current filters.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="mt-6 border-t border-brand-border pt-4 flex items-center justify-between">
                        <p className="text-brand-text font-semibold">
                            {filteredDevelopers.length} subscribed developers targeted.
                        </p>
                        <button 
                            onClick={handleSendEmails}
                            disabled={isSending || filteredDevelopers.length === 0 || !apiKey || !groupId}
                            className="bg-brand-primary hover:bg-brand-primary-hover text-white font-bold py-2 px-6 rounded-lg flex items-center justify-center transition-colors duration-200 disabled:bg-gray-500 disabled:cursor-not-allowed"
                        >
                            <MailIcon className="h-5 w-5 mr-2" />
                            {isSending ? 'Queueing Campaign...' : 'Send Campaign (Real)'}
                        </button>
                    </div>
                </div>
            </>
        ) : (
            <div className="bg-brand-surface p-6 rounded-lg shadow-lg">
                <h3 className="font-bold text-lg mb-4 text-brand-text">Campaign Execution History</h3>
                {cloudCampaigns.length === 0 ? (
                    <p className="text-brand-text-secondary">No campaigns found.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-brand-text-secondary">
                            <thead className="text-xs text-brand-text uppercase bg-brand-bg">
                                <tr>
                                    <th className="px-6 py-3">Campaign Name</th>
                                    <th className="px-6 py-3">Target</th>
                                    <th className="px-6 py-3">Recipients</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3">Created At</th>
                                </tr>
                            </thead>
                            <tbody>
                                {cloudCampaigns.map(campaign => (
                                    <tr key={campaign.id} className="border-b border-brand-border">
                                        <td className="px-6 py-4 font-medium text-brand-text">{campaign.name}</td>
                                        <td className="px-6 py-4">{campaign.targetCommunity === 'all' ? 'All' : campaign.targetCommunity}</td>
                                        <td className="px-6 py-4">{campaign.targetCount}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded text-xs uppercase font-bold 
                                                ${campaign.status === 'sent' ? 'bg-green-900 text-green-300' : 
                                                  campaign.status === 'queued' ? 'bg-yellow-900 text-yellow-300' : 
                                                  campaign.status === 'processing' ? 'bg-blue-900 text-blue-300' : 'bg-red-900 text-red-300'}`}>
                                                {campaign.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">{new Date(campaign.createdAt).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        )}
      </div>
    );
};
