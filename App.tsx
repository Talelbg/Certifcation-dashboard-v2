
import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import Papa from 'papaparse';
import { DeveloperRecord, DateRange, CommunityMetaData, Event } from './types';
import { FileUpload } from './components/FileUpload';
import { MetricsDashboard } from './components/MetricsDashboard';
import { ProgressByCommunityTable } from './components/ProgressByCommunityTable';
import { EmailManager } from './components/EmailManager';
import { ReportGenerator } from './components/ReportGenerator';
import { MembershipDashboard } from './components/MembershipDashboard';
import { EventsDashboard } from './components/EventsDashboard';
import { CommunityReport } from './components/CommunityReport';
import { CommunityUpload } from './components/CommunityUpload';
import { CloudConnect } from './components/CloudConnect';
import { AdminPanel } from './components/AdminPanel';
import { useFilters } from './hooks/useFilters';
import { useCommunityData } from './hooks/useCommunityData';
import { useDeveloperMetrics } from './hooks/useDeveloperMetrics';
import { useCloudStorage } from './hooks/useCloudStorage';
import { DownloadIcon, ShieldExclamationIcon, ChartBarIcon, GlobeIcon, FlagIcon } from './components/icons';

const RapidCompletionReport = ({ developers }: { developers: DeveloperRecord[] }) => {
    const reportTableRef = useRef<HTMLTableElement>(null);

    const calculateDuration = (dev: DeveloperRecord): string => {
        if (!dev.completedAt) return 'N/A';
        const diffMs = dev.completedAt.getTime() - dev.enrollmentDate.getTime();
        return (diffMs / (1000 * 60 * 60)).toFixed(2) + ' hours';
    };

    const handleDownload = async (format: 'csv' | 'pdf') => {
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `rapid_completions_${timestamp}`;

        if (format === 'csv') {
            const dataForCsv = developers.map(dev => ({
                'Developer ID': dev.developerId,
                'First Name': dev.firstName,
                'Last Name': dev.lastName,
                'Community': dev.communityCode,
                'Country': dev.country,
                'Enrollment Date': dev.enrollmentDate.toISOString(),
                'Completion Date': dev.completedAt?.toISOString() || 'N/A',
                'Completion Duration': calculateDuration(dev),
            }));
            const csv = Papa.unparse(dataForCsv);
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.setAttribute('download', `${filename}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }

        if (format === 'pdf') {
            const tableElement = reportTableRef.current;
            if (!tableElement) return;

            const canvas = await html2canvas(tableElement, { scale: 2 });
            const imgData = canvas.toDataURL('image/png');
            
            const pdf = new jsPDF({
                orientation: 'landscape',
                unit: 'pt',
                format: [canvas.width, canvas.height]
            });

            pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
            pdf.save(`${filename}.pdf`);
        }
    };

    return (
        <div className="bg-brand-surface p-4 rounded-lg shadow-lg">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center">
                    <ShieldExclamationIcon className="h-6 w-6 mr-3 text-red-400" />
                    <div>
                        <h3 className="font-bold text-lg text-brand-text">Rapid Completion Report</h3>
                        <p className="text-sm text-brand-text-secondary">Developers who completed certification in less than 5 hours.</p>
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <button onClick={() => handleDownload('csv')} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 text-xs rounded-lg flex items-center transition-colors duration-200"><DownloadIcon className="h-4 w-4 mr-1"/> CSV</button>
                    <button onClick={() => handleDownload('pdf')} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-3 text-xs rounded-lg flex items-center transition-colors duration-200"><DownloadIcon className="h-4 w-4 mr-1"/> PDF</button>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table ref={reportTableRef} className="w-full text-sm text-left text-brand-text-secondary bg-brand-surface">
                    <thead className="text-xs text-brand-text uppercase bg-brand-bg">
                        <tr>
                            <th scope="col" className="px-6 py-3">Developer ID</th>
                            <th scope="col" className="px-6 py-3">Name</th>
                            <th scope="col" className="px-6 py-3">Community</th>
                            <th scope="col" className="px-6 py-3">Country</th>
                            <th scope="col" className="px-6 py-3">Enrollment Date</th>
                            <th scope="col" className="px-6 py-3">Completion Date</th>
                            <th scope="col" className="px-6 py-3">Completion Duration</th>
                        </tr>
                    </thead>
                    <tbody>
                        {developers.map((dev) => (
                            <tr key={dev.developerId} className="border-b border-brand-border hover:bg-brand-border/50">
                                <td className="px-6 py-4 font-medium text-brand-text">{dev.developerId}</td>
                                <td className="px-6 py-4">{dev.firstName} {dev.lastName}</td>
                                <td className="px-6 py-4">{dev.communityCode}</td>
                                <td className="px-6 py-4">{dev.country}</td>
                                <td className="px-6 py-4">{new Date(dev.enrollmentDate).toLocaleString()}</td>
                                <td className="px-6 py-4">{dev.completedAt ? new Date(dev.completedAt).toLocaleString() : 'N/A'}</td>
                                <td className="px-6 py-4">{calculateDuration(dev)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {developers.length === 0 && <p className="text-center py-8">No rapid completions detected in the dataset.</p>}
            </div>
        </div>
    );
};

const formatDateForInput = (date: Date | null) => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const FilterControls = ({
  dateRange,
  onDateChange,
}: {
  dateRange: DateRange;
  onDateChange: (e: React.ChangeEvent<HTMLInputElement>, field: 'from' | 'to') => void;
}) => {
    return (
        <div className="flex items-center space-x-4">
            <input 
                type="date" 
                value={formatDateForInput(dateRange.from)} 
                onChange={e => onDateChange(e, 'from')} 
                className="bg-brand-surface border border-brand-border rounded px-2 py-1.5" 
            />
            <span className="text-brand-text-secondary">to</span>
            <input 
                type="date" 
                value={formatDateForInput(dateRange.to)} 
                onChange={e => onDateChange(e, 'to')} 
                className="bg-brand-surface border border-brand-border rounded px-2 py-1.5" 
            />
        </div>
    );
};

type Tab = 'dashboard' | 'management' | 'email' | 'membership' | 'events' | 'reporting' | 'audits' | 'admin';

const TabButton = ({
  label,
  isActive,
  onClick,
  isVisible = true
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
  isVisible?: boolean;
}) => {
  if (!isVisible) return null;
  const activeClasses = 'border-brand-primary text-brand-primary';
  const inactiveClasses = 'border-transparent text-brand-text-secondary hover:text-brand-text hover:border-gray-500';
  return (
    <button
      onClick={onClick}
      className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${isActive ? activeClasses : inactiveClasses}`}
    >
      {label}
    </button>
  );
};

function App() {
  const [localDeveloperData, setLocalDeveloperData] = useState<DeveloperRecord[]>([]);
  const [localRegisteredCommunities, setLocalRegisteredCommunities] = useState<string[]>([]);
  const [localCommunityMetaData, setLocalCommunityMetaData] = useState<Record<string, CommunityMetaData>>({});
  const [fileUploadError, setFileUploadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  
  const [localEvents, setLocalEvents] = useState<Event[]>([
      {id: '1', name: 'Community Leaders Summit', date: '2024-08-15', description: 'Annual summit for all community leaders.', type: 'upcoming', category: 'Summit', communityCode: 'All', link: 'https://meet.google.com'},
      {id: '2', name: 'Q2 Hackathon', date: '2024-06-20', description: 'A week-long virtual hackathon.', type: 'past', category: 'Hackathon', communityCode: 'All', link: ''},
  ]);

  // Cloud Storage Integration (Scoped by Auth)
  const { 
      user,
      userProfile, // Contains Role and Allowed Communities
      allUsers, // For Admin Panel
      isConnected, 
      login, 
      logout, 
      cloudData, 
      cloudEvents, 
      cloudMetaData, 
      cloudRegisteredCommunities,
      isLoading: isCloudLoading, 
      uploadBatch, 
      saveCloudEvent, 
      deleteCloudEvent,
      updateCloudCommunityMeta,
      saveRegisteredCommunities,
      updateUserRole,
      updateUserCommunities
  } = useCloudStorage();

  const { dateRange, handleDateChange, setInitialDateRange } = useFilters();

  // Determine Source of Truth based on connection status
  // NOTE: cloudData is ALREADY FILTERED by the hook based on the user's role!
  const developerData = isConnected ? cloudData : localDeveloperData;
  const events = isConnected ? cloudEvents : localEvents;
  const communityMetaData = isConnected ? cloudMetaData : localCommunityMetaData;
  const registeredCommunities = isConnected ? cloudRegisteredCommunities : localRegisteredCommunities;

  // Initial check: If user logs in but has no role/access, show warning or limited view
  const hasAccess = !isConnected || (userProfile && userProfile.role !== 'viewer');

  useEffect(() => {
      if (isConnected && cloudData.length > 0 && !dateRange.from) {
         setInitialDateRange(cloudData);
      }
  }, [cloudData, isConnected, setInitialDateRange, dateRange.from]);

  const filteredDeveloperData = useMemo(() => {
    return developerData.filter(dev => {
      const devDate = dev.enrollmentDate.getTime();
      const from = dateRange.from?.getTime();
      const to = dateRange.to?.getTime();
      if (from && devDate < from) return false;
      if (to && devDate > to) return false;
      return true;
    });
  }, [developerData, dateRange]);

  const { processedCommunityData, topPerformingCommunities, overallAverageCompletionDays } = useCommunityData(developerData, dateRange, communityMetaData);
  const { potentialFakeAccounts, rapidCompletions } = useDeveloperMetrics(filteredDeveloperData);

  const handleSaveEvent = (event: Omit<Event, 'id'>, id?: string) => {
      const updatedEvent = { ...event, date: event.date || new Date().toISOString().split('T')[0] };
      if (isConnected) saveCloudEvent(updatedEvent, id);
      else setLocalEvents(prev => id ? prev.map(e => e.id === id ? { ...updatedEvent, id } : e) : [...prev, { ...updatedEvent, id: Date.now().toString() }]);
  };

  const handleDeleteEvent = (eventId: string) => {
      if (isConnected) deleteCloudEvent(eventId);
      else setLocalEvents(prev => prev.filter(e => e.id !== eventId));
  };

  const handleDataLoaded = useCallback((data: DeveloperRecord[]) => {
    if (isConnected) uploadBatch(data);
    else {
        setLocalDeveloperData(data);
        setInitialDateRange(data);
    }
    setFileUploadError(null);
    setActiveTab('dashboard'); 
  }, [isConnected, uploadBatch, setInitialDateRange]);

  const handleCommunityListLoaded = (codes: string[]) => {
      if (isConnected) saveRegisteredCommunities(codes);
      else setLocalRegisteredCommunities(codes);
  };

  const handleToggleImportant = (communityCode: string) => {
    const currentMeta = communityMetaData[communityCode] || { isImportant: false, followUpDate: null };
    const newMeta = { ...currentMeta, isImportant: !currentMeta.isImportant };
    if (isConnected) updateCloudCommunityMeta(communityCode, newMeta);
    else setLocalCommunityMetaData(prev => ({ ...prev, [communityCode]: newMeta }));
  };

  const handleSetFollowUp = (communityCode: string, date: string) => {
    const currentMeta = communityMetaData[communityCode] || { isImportant: false, followUpDate: null };
    const newMeta = { ...currentMeta, followUpDate: date };
    if (isConnected) updateCloudCommunityMeta(communityCode, newMeta);
    else setLocalCommunityMetaData(prev => ({ ...prev, [communityCode]: newMeta }));
  };
  
  const formatDate = (date: Date | null) => {
    if (!date) return 'Not set';
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const managementStats = useMemo(() => {
      if (registeredCommunities.length === 0) return null;
      const activeCodes = new Set(processedCommunityData.map(c => c.code));
      const activeCount = activeCodes.size;
      const totalRegistered = registeredCommunities.length;
      const inactiveList = registeredCommunities.filter(code => !activeCodes.has(code));
      const inactiveCount = inactiveList.length;
      const activationRate = (activeCount / totalRegistered) * 100;
      return { totalRegistered, activeCount, inactiveCount, activationRate, inactiveList };
  }, [registeredCommunities, processedCommunityData]);

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <div className="flex flex-col">
              <h1 className="text-3xl font-bold text-brand-text">Hedera Certification Dashboard</h1>
              {userProfile && (
                  <span className="text-xs uppercase tracking-wider font-bold mt-1 px-2 py-0.5 bg-brand-primary/20 rounded w-fit text-brand-primary border border-brand-primary/30">
                      {userProfile.role === 'super_admin' ? 'Super Admin' : userProfile.role === 'community_admin' ? 'Community Admin' : 'Viewer (No Access)'}
                  </span>
              )}
          </div>
          <div className="flex items-center space-x-4">
             <CloudConnect user={user} onLogin={login} onLogout={logout} />
             {hasAccess && <FilterControls dateRange={dateRange} onDateChange={handleDateChange} />}
             {hasAccess && <ReportGenerator data={processedCommunityData} />}
          </div>
        </header>

        <div className="bg-brand-surface p-4 rounded-lg shadow-lg relative">
            {isCloudLoading && (
                <div className="absolute inset-0 bg-brand-surface/80 z-10 flex items-center justify-center">
                    <p className="text-brand-primary font-bold animate-pulse">Syncing with Cloud Database...</p>
                </div>
            )}
            
            {/* FILE UPLOAD: Only show if user has write access or is local */}
            {(isConnected && userProfile?.role !== 'viewer') || !isConnected ? (
                <>
                    <FileUpload onDataLoaded={handleDataLoaded} setFileUploadError={setFileUploadError} />
                    <p className="text-xs text-brand-text-secondary mt-2 text-center">
                        {isConnected 
                            ? userProfile?.role === 'community_admin' 
                                ? 'Scoped Upload: Data will be filtered to your assigned communities.' 
                                : 'Admin Mode: Full database access enabled.' 
                            : 'Offline Mode: Data is local.'}
                    </p>
                </>
            ) : (
                <div className="text-center py-2 text-red-400">
                    Your account status is "Viewer". You do not have permission to upload data.
                </div>
            )}
            {fileUploadError && <p className="text-red-400 mt-2 text-sm text-center">{fileUploadError}</p>}
        </div>

        {/* MAIN CONTENT AREA - Authorization Check */}
        {hasAccess && developerData.length > 0 ? (
            <div>
                <div className="border-b border-brand-border">
                    <nav className="-mb-px flex space-x-8 overflow-x-auto" aria-label="Tabs">
                        <TabButton label="Dashboard" isActive={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
                        <TabButton label="Community Management" isActive={activeTab === 'management'} onClick={() => setActiveTab('management')} />
                        <TabButton label="Email Campaigns" isActive={activeTab === 'email'} onClick={() => setActiveTab('email')} />
                        <TabButton label="Membership Program" isActive={activeTab === 'membership'} onClick={() => setActiveTab('membership')} />
                        <TabButton label="Events" isActive={activeTab === 'events'} onClick={() => setActiveTab('events')} />
                        <TabButton label="Reporting" isActive={activeTab === 'reporting'} onClick={() => setActiveTab('reporting')} />
                        <TabButton label="Audits & Security" isActive={activeTab === 'audits'} onClick={() => setActiveTab('audits')} />
                        <TabButton 
                            label="Admin Panel" 
                            isActive={activeTab === 'admin'} 
                            onClick={() => setActiveTab('admin')} 
                            isVisible={!!(isConnected && userProfile?.role === 'super_admin')}
                        />
                    </nav>
                </div>
                <div className="mt-6">
                    {activeTab === 'dashboard' && <MetricsDashboard data={processedCommunityData} developerData={filteredDeveloperData} topPerformingCommunities={topPerformingCommunities} overallAverageCompletionDays={overallAverageCompletionDays} potentialFakeAccounts={potentialFakeAccounts} rapidCompletionsCount={rapidCompletions.count} />}
                    
                    {activeTab === 'management' && (
                        <div className="space-y-6">
                            <div className="mb-4 p-4 bg-brand-bg rounded-lg border border-brand-border flex justify-between items-center">
                                <p className="text-sm text-brand-text-secondary">
                                    Analysis Period: <span className="font-semibold text-brand-text">{formatDate(dateRange.from)}</span> to <span className="font-semibold text-brand-text">{formatDate(dateRange.to)}</span>
                                </p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                {/* Only Super Admins or Local can upload global community lists */}
                                {(!isConnected || userProfile?.role === 'super_admin') && (
                                    <div className="md:col-span-1 relative">
                                        <CommunityUpload onListLoaded={handleCommunityListLoaded} />
                                        {isConnected && <div className="absolute top-2 right-2 h-2 w-2 bg-green-400 rounded-full animate-pulse" title="Cloud Sync Active"></div>}
                                    </div>
                                )}
                                {managementStats && (
                                    <>
                                        <div className="bg-brand-surface p-4 rounded-lg shadow flex items-center">
                                            <div className="p-3 bg-blue-500/20 rounded-full mr-4 text-blue-500"><GlobeIcon className="h-6 w-6"/></div>
                                            <div>
                                                <p className="text-xs text-brand-text-secondary">Registered</p>
                                                <p className="text-xl font-bold text-brand-text">{managementStats.totalRegistered}</p>
                                            </div>
                                        </div>
                                        <div className="bg-brand-surface p-4 rounded-lg shadow flex items-center">
                                            <div className="p-3 bg-green-500/20 rounded-full mr-4 text-green-500"><ChartBarIcon className="h-6 w-6"/></div>
                                            <div>
                                                <p className="text-xs text-brand-text-secondary">Active</p>
                                                <p className="text-xl font-bold text-brand-text">{managementStats.activeCount}</p>
                                            </div>
                                        </div>
                                        <div className="bg-brand-surface p-4 rounded-lg shadow flex items-center">
                                            <div className="p-3 bg-purple-500/20 rounded-full mr-4 text-purple-500"><FlagIcon className="h-6 w-6"/></div>
                                            <div>
                                                <p className="text-xs text-brand-text-secondary">Activation Rate</p>
                                                <p className="text-xl font-bold text-brand-text">{managementStats.activationRate.toFixed(1)}%</p>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                            {managementStats && managementStats.inactiveCount > 0 && (
                                <div className="bg-brand-surface p-4 rounded-lg shadow border border-red-900/30">
                                    <h3 className="font-bold text-lg mb-3 text-brand-text flex items-center">
                                        <ShieldExclamationIcon className="h-5 w-5 mr-2 text-red-400" />
                                        Inactive Communities ({managementStats.inactiveCount})
                                    </h3>
                                    <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                                        {managementStats.inactiveList.map(code => (
                                            <span key={code} className="bg-red-900/20 text-red-300 px-2 py-1 rounded text-xs border border-red-900/50">
                                                {code}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <ProgressByCommunityTable data={processedCommunityData} onToggleImportant={handleToggleImportant} onSetFollowUp={handleSetFollowUp} />
                        </div>
                    )}
                    {activeTab === 'email' && <EmailManager communities={processedCommunityData} developerData={filteredDeveloperData} events={events} />}
                    {activeTab === 'membership' && <MembershipDashboard developerData={filteredDeveloperData} />}
                    {activeTab === 'events' && <EventsDashboard events={events} communities={processedCommunityData} onSave={handleSaveEvent} onDelete={handleDeleteEvent} />}
                    {activeTab === 'reporting' && <CommunityReport communities={processedCommunityData} allDeveloperData={developerData} dateRange={dateRange} />}
                    {activeTab === 'audits' && <RapidCompletionReport developers={rapidCompletions.developers} />}
                    
                    {/* Admin Panel Tab Content */}
                    {activeTab === 'admin' && isConnected && userProfile?.role === 'super_admin' && (
                        <AdminPanel 
                            users={allUsers} 
                            availableCommunities={registeredCommunities}
                            onUpdateUserRole={updateUserRole}
                            onUpdateUserCommunities={updateUserCommunities}
                        />
                    )}
                </div>
            </div>
        ) : (
            <div className="text-center py-16 bg-brand-surface rounded-lg">
                {isConnected && userProfile?.role === 'viewer' ? (
                    <>
                        <h2 className="text-xl font-semibold text-brand-text">Access Pending</h2>
                        <p className="text-brand-text-secondary mt-2">
                            Your account has been created but does not yet have access to community data.<br/>
                            Please contact a Super Admin to assign you a Role and Community permissions.
                        </p>
                    </>
                ) : (
                    <>
                         <h2 className="text-xl font-semibold text-brand-text">Welcome to Hedera Certification Dashboard</h2>
                        <p className="text-brand-text-secondary mt-2">
                            {isConnected 
                                ? 'No data found. Upload a CSV to begin.' 
                                : 'Upload a developer data CSV or sign in to collaborate.'}
                        </p>
                    </>
                )}
            </div>
        )}
      </div>
    </div>
  );
}

export default App;