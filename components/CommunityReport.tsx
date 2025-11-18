
import React, { useState, useMemo, useRef } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import Papa from 'papaparse';
import { GoogleGenAI } from '@google/genai';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { CommunityWithMetadata, DateRange, DeveloperRecord } from '../types';
import { UsersIcon, DownloadIcon, SparklesIcon, ChartBarIcon, CopyIcon } from './icons';

interface CommunityReportProps {
    communities: CommunityWithMetadata[];
    allDeveloperData: DeveloperRecord[];
    dateRange: DateRange;
}

const formatDate = (date: Date | null) => {
    if (!date) return 'N/A';
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

const ReportCard = ({ title, value, icon, subValue, subValueLabel, subValueColor }: { title: string, value: string | number, icon: React.ReactElement<{ className?: string }>, subValue?: string, subValueLabel?: string, subValueColor?: string }) => (
    <div className="bg-brand-bg p-4 rounded-lg shadow-inner">
        <div className="flex items-center mb-2">
            <div className="p-3 bg-brand-primary/20 rounded-full mr-4 text-brand-primary">
                {React.cloneElement(icon, { className: 'h-6 w-6' })}
            </div>
            <div>
                <p className="text-sm text-brand-text-secondary">{title}</p>
                <p className="text-xl font-bold text-brand-text">{value}</p>
            </div>
        </div>
        {subValue && (
            <div className="ml-12 text-xs">
                <span className={`font-semibold ${subValueColor || 'text-brand-text-secondary'}`}>{subValue}</span>
                <span className="text-brand-text-secondary ml-1">{subValueLabel}</span>
            </div>
        )}
    </div>
);

const downloadListAsCsv = (data: DeveloperRecord[], filename: string) => {
    if (data.length === 0) {
        alert(`No data available to download.`);
        return;
    }
    const dataForCsv = data.map(dev => ({
        'Email': dev.developerId,
        'Code': dev.communityCode,
        'Country': dev.country,
        'Percentage Completed': dev.certificationProgress,
        'Created At': dev.enrollmentDate.toISOString(),
        'Accepted Marketing': dev.subscribed,
        'Accepted Membership': dev.acceptedMembership,
        'Completed At': dev.completedAt ? dev.completedAt.toISOString() : ''
    }));
    const csv = Papa.unparse(dataForCsv);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export const CommunityReport = ({ communities, allDeveloperData, dateRange }: CommunityReportProps) => {
    const [selectedCommunityCode, setSelectedCommunityCode] = useState<string | null>(null);
    const [pricePerCertified, setPricePerCertified] = useState<number>(0);
    const [invoiceDetails, setInvoiceDetails] = useState('');
    const [analysis, setAnalysis] = useState<string | null>(null);
    const [isGeneratingAnalysis, setIsGeneratingAnalysis] = useState(false);
    const [analysisError, setAnalysisError] = useState<string | null>(null);
    const [copyButtonText, setCopyButtonText] = useState('Copy HTML');

    const reportContentRef = useRef<HTMLDivElement>(null);

    const selectedCommunity = useMemo(() => {
        if (!selectedCommunityCode) return null;
        return communities.find(c => c.code === selectedCommunityCode) || null;
    }, [selectedCommunityCode, communities]);
    
    const newCertifiedCount = useMemo(() => {
        if (!selectedCommunity) return 0;
        return selectedCommunity.developers.filter(d => d.certified && d.completedAt).length;
    }, [selectedCommunity]);

    const totalReward = useMemo(() => newCertifiedCount * pricePerCertified, [newCertifiedCount, pricePerCertified]);

    // --- COMPARATIVE LOGIC ---
    
    // 1. Previous Period Calculation
    const previousPeriodStats = useMemo(() => {
        if (!dateRange.from || !dateRange.to || !selectedCommunityCode) return null;

        const duration = dateRange.to.getTime() - dateRange.from.getTime();
        const prevTo = new Date(dateRange.from.getTime() - 1); // 1ms before current start
        const prevFrom = new Date(prevTo.getTime() - duration);

        const prevDevelopers = allDeveloperData.filter(dev => 
            dev.communityCode === selectedCommunityCode &&
            dev.enrollmentDate.getTime() >= prevFrom.getTime() &&
            dev.enrollmentDate.getTime() <= prevTo.getTime()
        );

        const certified = prevDevelopers.filter(d => d.certified).length;
        const count = prevDevelopers.length;
        const avgProgress = count > 0 ? prevDevelopers.reduce((sum, d) => sum + d.certificationProgress, 0) / count : 0;

        return { count, certified, avgProgress, from: prevFrom, to: prevTo };
    }, [allDeveloperData, dateRange, selectedCommunityCode]);

    // 2. Peer Average Calculation (Current Period)
    const peerStats = useMemo(() => {
        if (!selectedCommunityCode) return null;
        const otherCommunities = communities.filter(c => c.code !== selectedCommunityCode);
        if (otherCommunities.length === 0) return null;

        const totalDevs = otherCommunities.reduce((sum, c) => sum + c.developerCount, 0);
        const totalCertified = otherCommunities.reduce((sum, c) => sum + c.certifiedCount, 0);
        const avgProgressSum = otherCommunities.reduce((sum, c) => sum + c.averageProgress, 0);
        
        return {
            avgDevCount: totalDevs / otherCommunities.length,
            avgCertifiedCount: totalCertified / otherCommunities.length,
            avgProgress: avgProgressSum / otherCommunities.length
        };
    }, [communities, selectedCommunityCode]);


    const membershipEvolutionData = useMemo(() => {
        if (!selectedCommunity) return [];
        const sortedDevs = selectedCommunity.developers.sort((a,b) => a.enrollmentDate.getTime() - b.enrollmentDate.getTime());
        const data: { date: string, developers: number, startedCourse: number }[] = [];
        let cumulativeDevelopers = 0;
        let cumulativeStarted = 0;

        sortedDevs.forEach(dev => {
            cumulativeDevelopers++;
            if (dev.certificationProgress > 0) {
                cumulativeStarted++;
            }
            const dateStr = dev.enrollmentDate.toISOString().split('T')[0];
            const existingEntry = data.find(d => d.date === dateStr);
            if (existingEntry) {
                existingEntry.developers = cumulativeDevelopers;
                existingEntry.startedCourse = cumulativeStarted;
            } else {
                data.push({ date: dateStr, developers: cumulativeDevelopers, startedCourse: cumulativeStarted });
            }
        });
        return data;
    }, [selectedCommunity]);
    
    const handleGenerateAnalysis = async () => {
        if (!selectedCommunity) return;
        setIsGeneratingAnalysis(true);
        setAnalysisError(null);
        setAnalysis(null);

        try {
            if (!process.env.API_KEY) {
                throw new Error("API_KEY environment variable not set. Please configure it to use this feature.");
            }
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const prompt = `
                Generate a comprehensive, analytical community report for "${selectedCommunity.code}" formatted as a professional HTML email.

                **Timeframe:** ${formatDate(dateRange.from)} to ${formatDate(dateRange.to)}
                **Previous Period:** ${previousPeriodStats ? `${formatDate(previousPeriodStats.from)} to ${formatDate(previousPeriodStats.to)}` : 'N/A'}

                **Current Metrics:**
                - New Developers: ${selectedCommunity.developerCount}
                - Certified: ${selectedCommunity.certifiedCount}
                - Avg Progress: ${selectedCommunity.averageProgress.toFixed(1)}%

                **Previous Period Metrics:**
                - New Developers: ${previousPeriodStats?.count || 0}
                - Certified: ${previousPeriodStats?.certified || 0}
                - Avg Progress: ${previousPeriodStats?.avgProgress.toFixed(1) || 0}%

                **Peer Benchmark (Avg of other communities in current period):**
                - Avg Developers: ${peerStats?.avgDevCount.toFixed(1) || 0}
                - Avg Certified: ${peerStats?.avgCertifiedCount.toFixed(1) || 0}
                - Avg Progress: ${peerStats?.avgProgress.toFixed(1) || 0}%

                **Instructions:**
                1.  **Format:** HTML string (no markdown code blocks). Use inline CSS for a dark mode theme (bg #1E293B, text #F1F5F9).
                2.  **Comparison:** Compare current performance against BOTH the previous period and the peer average.
                3.  **Sections:**
                    -   **Executive Summary:** Quick overview of growth or decline.
                    -   **Growth Analysis:** Compare developer acquisition vs previous month.
                    -   **Certification & Engagement:** Analyze quality vs peer benchmarks.
                    -   **Strategic Recommendations:** 3 actionable steps to improve stats based on the gaps found.
                4.  **Tone:** Professional, data-driven, encouraging but critical of drops in performance.
            `;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });
            setAnalysis(response.text);

        } catch (err: any) {
            console.error("Error generating analysis:", err);
            setAnalysisError(`Failed to generate analysis. ${err.message || 'Please try again.'}`);
        } finally {
            setIsGeneratingAnalysis(false);
        }
    };

    const handleCopyHtml = () => {
        if (!analysis) return;
        try {
            const blob = new Blob([analysis], { type: 'text/html' });
            const clipboardItem = new ClipboardItem({ 'text/html': blob });
            navigator.clipboard.write([clipboardItem]).then(() => {
                setCopyButtonText('Copied!');
                setTimeout(() => setCopyButtonText('Copy HTML'), 2000);
            }).catch(err => {
                console.error('Failed to copy rendered HTML: ', err);
                alert('Could not copy HTML to clipboard. Your browser might not support this feature.');
            });
        } catch (error) {
            console.error('Error creating ClipboardItem: ', error);
            alert('An error occurred while preparing to copy.');
        }
    };
    
    const handleDownloadPdf = async () => {
        const reportElement = reportContentRef.current;
        if (!reportElement) return;

        const canvas = await html2canvas(reportElement, {
            backgroundColor: '#1E293B',
            scale: 2,
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
            orientation: 'p',
            unit: 'px',
            format: [canvas.width, canvas.height]
        });

        pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
        pdf.save(`community_report_${selectedCommunityCode}_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    const handleDownloadList = (type: 'certified' | 'subscribers') => {
        if (!selectedCommunity) return;

        const list = type === 'certified' 
            ? selectedCommunity.developers.filter(dev => dev.certified)
            : selectedCommunity.developers.filter(dev => dev.subscribed);
        
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `${type}_${selectedCommunity.code}_${timestamp}.csv`;
        
        downloadListAsCsv(list, filename);
    };

    // Helper to calculate percentage change
    const getChange = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? '+100%' : '0%';
        const change = ((current - previous) / previous) * 100;
        return `${change > 0 ? '+' : ''}${change.toFixed(1)}%`;
    };
    
    const getChangeColor = (current: number, previous: number) => {
        if (current > previous) return 'text-green-400';
        if (current < previous) return 'text-red-400';
        return 'text-brand-text-secondary';
    };

    return (
        <div className="bg-brand-surface p-4 rounded-lg shadow-lg space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-center space-y-2 md:space-y-0">
                <div className="w-full md:w-auto mb-2 md:mb-0 md:flex-grow md:mr-4">
                    <select
                        value={selectedCommunityCode || ''}
                        onChange={(e) => {
                            setSelectedCommunityCode(e.target.value);
                            setAnalysis(null);
                        }}
                        className="w-full bg-brand-border text-brand-text rounded-md px-3 py-2"
                    >
                        <option value="">-- Select a Community --</option>
                        {communities.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                    </select>
                </div>
                {selectedCommunity && (
                    <div className="flex items-center flex-wrap gap-2">
                         <button
                            onClick={handleDownloadPdf}
                            className="bg-brand-secondary hover:bg-pink-600 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center transition-colors duration-200"
                        >
                            <DownloadIcon />
                            Download Full Report (PDF)
                        </button>
                    </div>
                )}
            </div>

            {selectedCommunity ? (
                <div>
                    <div ref={reportContentRef} className="p-6 bg-brand-surface rounded-lg">
                        <h2 className="text-2xl font-bold text-brand-text mb-2">Community Report: {selectedCommunity.code}</h2>
                        <p className="text-sm text-brand-text-secondary mb-6">
                            Reporting Period: {formatDate(dateRange.from)} to {formatDate(dateRange.to)}
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            <ReportCard 
                                title="Developers Enrolled" 
                                value={selectedCommunity.developerCount} 
                                icon={<UsersIcon />} 
                                subValue={previousPeriodStats ? getChange(selectedCommunity.developerCount, previousPeriodStats.count) : 'N/A'}
                                subValueLabel="vs prev period"
                                subValueColor={previousPeriodStats ? getChangeColor(selectedCommunity.developerCount, previousPeriodStats.count) : ''}
                            />
                            <ReportCard 
                                title="Certified Members" 
                                value={`${selectedCommunity.certifiedCount} (${((selectedCommunity.certifiedCount / (selectedCommunity.developerCount || 1)) * 100).toFixed(1)}%)`} 
                                icon={<UsersIcon />} 
                                subValue={previousPeriodStats ? getChange(selectedCommunity.certifiedCount, previousPeriodStats.certified) : 'N/A'}
                                subValueLabel="vs prev period"
                                subValueColor={previousPeriodStats ? getChangeColor(selectedCommunity.certifiedCount, previousPeriodStats.certified) : ''}
                            />
                            <ReportCard 
                                title="Avg. Course Progress" 
                                value={`${selectedCommunity.averageProgress.toFixed(1)}%`} 
                                icon={<ChartBarIcon />} 
                                subValue={peerStats ? `${(selectedCommunity.averageProgress - peerStats.avgProgress).toFixed(1)}%` : 'N/A'}
                                subValueLabel={peerStats && (selectedCommunity.averageProgress - peerStats.avgProgress) >= 0 ? 'above peer avg' : 'below peer avg'}
                                subValueColor={peerStats ? getChangeColor(selectedCommunity.averageProgress, peerStats.avgProgress) : ''}
                            />
                        </div>

                         {/* Charts Section */}
                        <div className="bg-brand-bg p-4 rounded-lg border border-brand-border mb-6">
                             <h3 className="text-lg font-bold text-brand-text mb-4">Growth Trajectory</h3>
                             <ResponsiveContainer width="100%" height={250}>
                                <LineChart data={membershipEvolutionData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                    <XAxis dataKey="date" stroke="#9CA3AF" tick={{ fontSize: 12 }} />
                                    <YAxis stroke="#9CA3AF" />
                                    <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }} />
                                    <Legend />
                                    <Line type="monotone" dataKey="developers" name="Total Developers" stroke="#818CF8" strokeWidth={2} dot={false} />
                                    <Line type="monotone" dataKey="startedCourse" name="Started Course" stroke="#F472B6" strokeWidth={2} dot={false} />
                                </LineChart>
                             </ResponsiveContainer>
                        </div>

                        {/* AI Analysis Section - Inside the ref for PDF capture */}
                        <div className="bg-brand-bg p-4 rounded-lg border border-brand-border mb-6">
                            <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
                                <h3 className="text-lg font-bold text-brand-text">AI Comparative Analysis</h3>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handleGenerateAnalysis}
                                        disabled={isGeneratingAnalysis}
                                        className="bg-brand-primary hover:bg-brand-primary-hover text-white font-bold py-1 px-3 rounded-lg flex items-center text-sm disabled:bg-gray-500"
                                        data-html2canvas-ignore="true" // Hide button in PDF
                                    >
                                        <SparklesIcon />
                                        {isGeneratingAnalysis ? 'Generating...' : 'Generate Analysis'}
                                    </button>
                                    {analysis && (
                                        <button
                                            onClick={handleCopyHtml}
                                            className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-1 px-3 rounded-lg flex items-center text-sm"
                                            data-html2canvas-ignore="true" // Hide button in PDF
                                        >
                                            <CopyIcon className="h-4 w-4 mr-2" />
                                            {copyButtonText}
                                        </button>
                                    )}
                                </div>
                            </div>
                            {analysisError && <p className="text-red-400 text-xs">{analysisError}</p>}
                            {isGeneratingAnalysis && (
                                <div className="text-center py-4">
                                    <p className="text-brand-text-secondary text-sm animate-pulse">AI is comparing data against previous periods and peer communities...</p>
                                </div>
                            )}
                            {analysis && (
                                <div className="mt-4 p-4 bg-black/20 rounded-lg border border-brand-border">
                                    <div dangerouslySetInnerHTML={{ __html: analysis }} className="prose prose-invert max-w-none text-sm" />
                                </div>
                            )}
                        </div>
                        
                        <div className="bg-brand-bg p-4 rounded-lg border border-brand-border mb-6" data-html2canvas-ignore="true">
                            <h3 className="text-lg font-bold text-brand-text mb-4">Financials & Rewarding</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                                <div>
                                    <label className="text-sm text-brand-text-secondary block">Price per Certified Member</label>
                                    <input type="number" value={pricePerCertified} onChange={e => setPricePerCertified(parseFloat(e.target.value) || 0)} className="w-full bg-brand-border text-brand-text rounded px-2 py-1.5 mt-1" />
                                </div>
                                <div>
                                    <label className="text-sm text-brand-text-secondary block">Total Certified (in period)</label>
                                    <p className="text-xl font-semibold text-brand-text mt-1">{newCertifiedCount}</p>
                                </div>
                                <div>
                                    <label className="text-sm text-brand-text-secondary block">Total Reward Amount</label>
                                    <p className="text-xl font-semibold text-green-400 mt-1">${totalReward.toFixed(2)}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Data Export Sections */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                        <div className="bg-brand-bg p-4 rounded-lg border border-brand-border">
                            <h3 className="text-lg font-bold text-brand-text mb-2">Certified Members List</h3>
                            <p className="text-sm text-brand-text-secondary mb-4">Export the list of all 100% certified developers in this community.</p>
                            <div className="flex items-center space-x-2">
                                <button onClick={() => handleDownloadList('certified')} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 text-xs rounded-lg flex items-center transition-colors duration-200"><DownloadIcon className="h-4 w-4 mr-1"/> CSV</button>
                            </div>
                        </div>
                         <div className="bg-brand-bg p-4 rounded-lg border border-brand-border">
                            <h3 className="text-lg font-bold text-brand-text mb-2">Subscribers List</h3>
                            <p className="text-sm text-brand-text-secondary mb-4">Export the list of all developers who opted-in for marketing.</p>
                            <div className="flex items-center space-x-2">
                                <button onClick={() => handleDownloadList('subscribers')} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 text-xs rounded-lg flex items-center transition-colors duration-200"><DownloadIcon className="h-4 w-4 mr-1"/> CSV</button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="text-center py-16">
                    <p className="text-brand-text-secondary">Select a community to generate a detailed report.</p>
                </div>
            )}
        </div>
    );
};
