
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
import { CodeManagers } from './components/CodeManagers';
import { ParticipantsList } from './components/ParticipantsList';
import { LandingPage } from './components/LandingPage';
import { TabNavigation } from './components/TabNavigation';
import { FilterControls } from './components/FilterControls';
import { RapidCompletionReport } from './components/RapidCompletionReport';
import { LoadingOverlay } from './components/LoadingOverlay';
import { useFilters } from './hooks/useFilters';
import { useCommunityData } from './hooks/useCommunityData';
import { useDeveloperMetrics } from './hooks/useDeveloperMetrics';
import { useCloudStorage } from './hooks/useCloudStorage';
import { GlobeIcon, ChartBarIcon, FlagIcon } from './components/icons';

export type Tab = 'dashboard' | 'management' | 'participants' | 'email' | 'membership' | 'events' | 'reporting' | 'audits' | 'admin' | 'codes';

function App() {
  const [fileUploadError, setFileUploadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  
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
      mergedCommunityList, // New merged list
      isLoading: isCloudLoading, 
      uploadBatch, 
      saveCloudEvent, 
      deleteCloudEvent,
      updateCloudCommunityMeta,
      saveRegisteredCommunities,
      updateUserRole,
      updateUserCommunities,
      createManualCommunity,
      deleteManualCommunity,
      createEmailCampaign
  } = useCloudStorage();

  const { dateRange, handleDateChange, setInitialDateRange } = useFilters();

  // Source of Truth is always cloudData in Online Mode
  const developerData = cloudData;
  const events = cloudEvents;
  const communityMetaData = cloudMetaData;
  const registeredCommunities = cloudRegisteredCommunities;

  // Initial check: If user logs in but has no role/access, show warning or limited view
  const hasAccess = isConnected && userProfile && userProfile.role !== 'viewer';

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
      saveCloudEvent(updatedEvent, id);
  };

  const handleDeleteEvent = (eventId: string) => {
      deleteCloudEvent(eventId);
  };

  const handleDataLoaded = useCallback((data: DeveloperRecord[]) => {
    if (isConnected) uploadBatch(data);
    setFileUploadError(null);
    setActiveTab('dashboard'); 
  }, [isConnected, uploadBatch]);

  const handleCommunityListLoaded = (codes: string[]) => {
      saveRegisteredCommunities(codes);
  };

  const handleToggleImportant = (communityCode: string) => {
    const currentMeta = communityMetaData[communityCode] || { isImportant: false, followUpDate: null };
    const newMeta = { ...currentMeta, isImportant: !currentMeta.isImportant };
    updateCloudCommunityMeta(communityCode, newMeta);
  };

  const handleSetFollowUp = (communityCode: string, date: string) => {
    const currentMeta = communityMetaData[communityCode] || { isImportant: false, followUpDate: null };
    const newMeta = { ...currentMeta, followUpDate: date };
    updateCloudCommunityMeta(communityCode, newMeta);
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

  if (!isConnected) {
      return <LandingPage onLogin={login} />;
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <LoadingOverlay isLoading={isCloudLoading} message="Syncing with Cloud Database..." />

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
            {userProfile?.role !== 'viewer' ? (
                <>
                    <FileUpload onDataLoaded={handleDataLoaded} setFileUploadError={setFileUploadError} />
                    <p className="text-xs text-brand-text-secondary mt-2 text-center">
                        {userProfile?.role === 'community_admin' 
                            ? 'Scoped Upload: Data will be filtered to your assigned communities.' 
                            : 'Admin Mode: Full database access enabled.'}
                    </p>
                </>
            ) : (
                <div className="text-center py-2 text-red-400">
                    Your account status is "Viewer". You do not have permission to upload data.
                </div>
            )}
            {fileUploadError && <p className="text-red-400 mt-2 text-sm text-center">{fileUploadError}</p>}
        </div>

        {hasAccess ? (
            <div>
                <div className="border-b border-brand-border">
                    <TabNavigation 
                        activeTab={activeTab} 
                        setActiveTab={setActiveTab} 
                        userRole={userProfile?.role || 'viewer'} 
                    />
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
                                {(userProfile?.role === 'super_admin') && (
                                    <div className="md:col-span-1 relative">
                                        <CommunityUpload onListLoaded={handleCommunityListLoaded} />
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
                            <ProgressByCommunityTable data={processedCommunityData} onToggleImportant={handleToggleImportant} onSetFollowUp={handleSetFollowUp} />
                        </div>
                    )}

                    {activeTab === 'participants' && <ParticipantsList data={filteredDeveloperData} />}

                    {activeTab === 'email' && <EmailManager communities={processedCommunityData} developerData={filteredDeveloperData} events={events} />}
                    {activeTab === 'membership' && <MembershipDashboard developerData={filteredDeveloperData} />}
                    {activeTab === 'events' && <EventsDashboard events={events} communities={processedCommunityData} onSave={handleSaveEvent} onDelete={handleDeleteEvent} />}
                    {activeTab === 'reporting' && <CommunityReport communities={processedCommunityData} allDeveloperData={developerData} dateRange={dateRange} />}
                    {activeTab === 'audits' && <RapidCompletionReport developers={rapidCompletions.developers} />}
                    
                    {activeTab === 'codes' && userProfile?.role === 'super_admin' && (
                        <CodeManagers 
                            communities={mergedCommunityList}
                            users={allUsers}
                            onCreateCommunity={createManualCommunity}
                            onDeleteCommunity={deleteManualCommunity}
                            onAssignAdmin={updateUserCommunities}
                        />
                    )}

                    {activeTab === 'admin' && userProfile?.role === 'super_admin' && (
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
                {userProfile?.role === 'viewer' ? (
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
                            No data found. Upload a developer data CSV to begin.
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
