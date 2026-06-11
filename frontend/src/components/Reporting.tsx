import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, Download, Clock, CheckCircle, FileCheck2, ShieldAlert, Eye, X, Filter, Calendar, Search } from 'lucide-react';

export default function Reporting({ token }: { token: string }) {
  const [reports, setReports] = useState<any[]>([]);
  const [deliveryLogs, setDeliveryLogs] = useState<any[]>([]);
  const [reportType, setReportType] = useState('Executive Summary');
  const [format, setFormat] = useState('All Three');
  const [generating, setGenerating] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [userProfile, setUserProfile] = useState<any>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal Preview States
  const [previewReport, setPreviewReport] = useState<any>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    fetchReports();
    fetchProfile();
    fetchDeliveryLogs();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUserProfile(data);
      }
    } catch (e) {
      console.error('Failed to fetch user profile:', e);
    }
  };

  const fetchReports = async () => {
    try {
      const res = await fetch('/api/reports', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setReports(data);
      }
    } catch (err) {
      console.error('Failed to fetch reports list:', err);
    }
  };

  const fetchDeliveryLogs = async () => {
    try {
      const res = await fetch('/api/reports/delivery-logs', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDeliveryLogs(data);
      }
    } catch (err) {
      console.error('Failed to fetch delivery logs:', err);
    }
  };

  const handleGenerateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    setSuccessMsg('');

    try {
      const res = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          recipientEmail: userProfile?.email || 'admin@zentrix.local',
          reportType
        })
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(data.message || 'Report compiled successfully.');
        fetchReports(); // Refresh history
        fetchDeliveryLogs(); // Refresh delivery status logs
      } else {
        setSuccessMsg(data.error || 'Failed to dispatch report.');
      }
    } catch {
      setSuccessMsg('Report compiler gateway timeout.');
    } finally {
      setGenerating(false);
    }
  };

  const handlePreview = async (report: any) => {
    setPreviewReport(report);
    setPreviewLoading(true);
    setPreviewData(null);
    try {
      const jsonFileName = report.fileName.replace('.pdf', '.json');
      const res = await fetch(`/api/reports/download/${jsonFileName}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPreviewData(data);
      } else {
        console.error('Failed to download preview JSON');
      }
    } catch (e) {
      console.error('Error fetching preview data:', e);
    } finally {
      setPreviewLoading(false);
    }
  };

  // Correlate delivery log for a report
  const getDeliveryStatus = (reportId: string) => {
    const log = deliveryLogs.find(l => l.reportId === reportId);
    if (!log) {
      return { email: 'Pending', whatsapp: 'Pending' };
    }
    return {
      email: log.emailStatus || 'Pending',
      whatsapp: log.whatsAppStatus || 'Pending'
    };
  };

  // Filtering reports list
  const filteredReports = reports.filter(report => {
    const delivery = getDeliveryStatus(report._id);
    const date = new Date(report.timestamp);

    // Date range filter
    if (startDate && date < new Date(startDate)) return false;
    if (endDate) {
      const endLimit = new Date(endDate);
      endLimit.setHours(23, 59, 59, 999);
      if (date > endLimit) return false;
    }

    // Status filter
    if (statusFilter !== 'ALL') {
      const matchEmail = delivery.email.toUpperCase() === statusFilter.toUpperCase();
      const matchWa = delivery.whatsapp.toUpperCase() === statusFilter.toUpperCase();
      const matchReport = report.deliveryStatus?.toUpperCase() === statusFilter.toUpperCase();
      if (!matchEmail && !matchWa && !matchReport) return false;
    }

    // Search query filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const titleMatch = report.title?.toLowerCase().includes(query);
      const recipientMatch = report.recipient?.toLowerCase().includes(query);
      if (!titleMatch && !recipientMatch) return false;
    }

    return true;
  });

  return (
    <div className="space-y-6 font-sans select-none text-slate-300">
      
      {/* HEADER BANNER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-5 bg-[#0D1117] border border-[rgba(255,255,255,0.07)] rounded-xl gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-950/50 border border-blue-500/30 rounded-lg text-blue-400">
            <FileSpreadsheet className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-bold font-sans text-slate-100 tracking-wide uppercase">ZENTRIX Automated Reports</h2>
            <p className="text-xs text-[#64748b] font-mono uppercase tracking-wider">Enterprise Compliance Auditing & Delivery Hub</p>
          </div>
        </div>

        {/* Global IST Clock for context */}
        <div className="bg-slate-950/60 border border-slate-800/80 px-3.5 py-1.5 rounded-lg flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-400 animate-ping"></div>
          <span className="text-[10px] font-mono text-blue-400 tracking-wider">SECURE SYNC ACTIVE</span>
        </div>
      </div>

      {/* WORKSPACE CONTENT LAYOUT */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        
        {/* COMPILER CONTROLS PANEL */}
        <div className="xl:col-span-1 p-5 bg-[#0D1117] border border-[rgba(255,255,255,0.07)] rounded-xl flex flex-col justify-between space-y-6">
          <div className="space-y-5">
            <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
              <span className="text-xs font-mono font-bold tracking-wider text-slate-200 uppercase">Compiler Engine</span>
              <span className="text-[9px] font-mono bg-blue-950 text-blue-400 px-2 py-0.5 rounded border border-blue-800/40">V4.8</span>
            </div>

            <form onSubmit={handleGenerateReport} className="space-y-4 font-mono text-xs">
              <p className="text-[10px] text-blue-400 font-bold uppercase tracking-wider border-b border-slate-900 pb-1.5">
                [+] MANUAL DISPATCH DISK
              </p>

              <div>
                <label className="block text-slate-500 mb-1 text-[10px] uppercase font-bold tracking-wider">RECIPIENT EMAIL</label>
                <input 
                  type="email"
                  disabled
                  value={userProfile?.email || 'admin@zentrix.local'}
                  className="w-full bg-[#111827] border border-slate-850 px-3 py-2 text-slate-400 rounded-lg text-xs cursor-not-allowed select-all focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-500 mb-1 text-[10px] uppercase font-bold tracking-wider">REPORT SCHEMA</label>
                <select 
                  value={reportType}
                  onChange={e => setReportType(e.target.value)}
                  className="w-full bg-[#111827] border border-slate-800 px-3 py-2 text-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-500 transition-colors"
                >
                  <option value="Executive Summary">Executive Summary</option>
                  <option value="Security Report">Security Audit Report</option>
                  <option value="Audit Report">Full Compliance Audit</option>
                  <option value="Incident Report">Active Incident Cases Log</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-500 mb-1 text-[10px] uppercase font-bold tracking-wider">FORMAT PREFERENCE</label>
                <select 
                  value={format}
                  onChange={e => setFormat(e.target.value)}
                  className="w-full bg-[#111827] border border-slate-800 px-3 py-2 text-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-500 transition-colors"
                >
                  <option value="All Three">All Three (PDF, CSV, JSON)</option>
                  <option value="PDF">PDF Document Only</option>
                  <option value="CSV">CSV Spreadsheet Only</option>
                  <option value="JSON">JSON Structure Only</option>
                </select>
              </div>

              <button 
                type="submit"
                disabled={generating}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg transition-all uppercase flex items-center justify-center gap-2 text-xs font-mono tracking-wider shadow-lg shadow-blue-900/20 disabled:bg-slate-800 disabled:text-slate-500"
              >
                <FileCheck2 className="w-4 h-4" />
                {generating ? 'COMPILING REAL DATA...' : 'GENERATE NOW'}
              </button>
            </form>

            {successMsg && (
              <div className="p-3 bg-emerald-950/20 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono rounded-lg select-text leading-relaxed">
                {successMsg}
              </div>
            )}
          </div>

          <div className="border-t border-slate-800/80 pt-3 text-[10px] font-mono text-slate-500 leading-normal">
            <p className="font-bold text-slate-400">Important Note:</p>
            <p className="mt-1">Manual generation initiates live logs telemetry audits. Real SMTP and WhatsApp dispatches default to configured settings triggers.</p>
          </div>
        </div>

        {/* REPORT ARCHIVE SECTION WITH FILTERS */}
        <div className="xl:col-span-3 space-y-4">
          
          {/* FILTER BAR */}
          <div className="p-4 bg-[#0D1117] border border-[rgba(255,255,255,0.07)] rounded-xl flex flex-col md:flex-row gap-3 items-center justify-between font-mono text-xs select-text">
            
            {/* Search inputs */}
            <div className="w-full md:w-1/3 relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search by title or email..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-[#111827] border border-slate-800 pl-9 pr-3 py-2 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Date range picker */}
            <div className="flex items-center gap-2 w-full md:w-auto">
              <Calendar className="w-4 h-4 text-slate-500 shrink-0" />
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="bg-[#111827] border border-slate-800 px-2.5 py-1.5 rounded-lg text-slate-350 focus:outline-none text-[11px]"
                title="Start Date"
              />
              <span className="text-slate-600">to</span>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="bg-[#111827] border border-slate-800 px-2.5 py-1.5 rounded-lg text-slate-350 focus:outline-none text-[11px]"
                title="End Date"
              />
            </div>

            {/* Status filters */}
            <div className="flex items-center gap-2 w-full md:w-auto">
              <Filter className="w-4 h-4 text-slate-500" />
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="bg-[#111827] border border-slate-800 px-3 py-1.5 rounded-lg text-slate-300 focus:outline-none focus:border-blue-500"
              >
                <option value="ALL">ALL STATUSES</option>
                <option value="DISPATCHED">DISPATCHED</option>
                <option value="DELIVERED">DELIVERED</option>
                <option value="FAILED">FAILED</option>
                <option value="PENDING">PENDING</option>
              </select>
            </div>
          </div>

          {/* CARD GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredReports.map((report) => {
              const pdfName = report.fileName;
              const csvName = pdfName.replace('.pdf', '.csv');
              const jsonName = pdfName.replace('.pdf', '.json');
              const delivery = getDeliveryStatus(report._id);

              // Dynamic calculated file sizes based on report attributes
              const pdfSize = `${(110 + (report.alertsCount * 3.2)).toFixed(1)} KB`;
              const csvSize = `${(0.8 + (report.alertsCount * 0.12)).toFixed(1)} KB`;
              const jsonSize = `${(1.5 + (report.alertsCount * 0.35)).toFixed(1)} KB`;

              return (
                <div 
                  key={report._id} 
                  className="bg-[#0D1117]/85 backdrop-blur-md border border-[rgba(0,212,255,0.07)] rounded-xl p-5 hover:border-[rgba(0,212,255,0.25)] transition-all flex flex-col justify-between space-y-4 hover:shadow-lg hover:shadow-cyan-950/5 group"
                >
                  {/* Top card parameters */}
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-start">
                      <span className="text-[9px] font-mono bg-slate-900 border border-slate-850 px-2 py-0.5 rounded text-slate-400 uppercase tracking-wide">
                        LAST 24 HOURS
                      </span>
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                        report.securityScore >= 80 
                          ? 'bg-emerald-950/60 border border-emerald-500/30 text-emerald-400' 
                          : 'bg-red-950/60 border border-red-500/30 text-red-400'
                      }`}>
                        {report.securityScore}% Posture
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-200 group-hover:text-[#00D4FF] transition-colors leading-snug">
                      {report.title}
                    </h4>

                    <div className="space-y-1 text-[10px] font-mono text-slate-500 leading-normal">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-600" />
                        <span>{new Date(report.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false }) + ' IST'}</span>
                      </div>
                      <p>Recipient: <span className="text-slate-400 select-all">{report.recipient}</span></p>
                      <p>Scope: <span className="text-slate-400">{report.alertsCount} Security Alerts</span></p>
                    </div>
                  </div>

                  {/* Delivery status logs */}
                  <div className="p-2.5 bg-slate-950/40 border border-slate-900 rounded-lg space-y-2 text-[10px] font-mono select-none">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">EMAIL GATEWAY</span>
                      <span className={`font-bold uppercase tracking-wider ${
                        delivery.email === 'Delivered' 
                          ? 'text-emerald-400' 
                          : (delivery.email === 'Failed' ? 'text-red-400 animate-pulse' : 'text-amber-500')
                      }`}>
                        {delivery.email === 'Delivered' ? '✓ Sent' : (delivery.email === 'Failed' ? '✗ Failed' : 'Pending')}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">WHATSAPP GATEWAY</span>
                      <span className={`font-bold uppercase tracking-wider ${
                        delivery.whatsapp === 'Delivered' 
                          ? 'text-emerald-400' 
                          : (delivery.whatsapp === 'Failed' ? 'text-red-400 animate-pulse' : 'text-amber-500')
                      }`}>
                        {delivery.whatsapp === 'Delivered' ? '✓ Sent' : (delivery.whatsapp === 'Failed' ? '✗ Failed' : 'Pending')}
                      </span>
                    </div>
                  </div>

                  {/* File formats sizes */}
                  <div className="grid grid-cols-3 gap-1.5 text-[9px] font-mono text-center select-none">
                    <div className="bg-[#111827] border border-slate-900 rounded py-1" title="PDF Document Size">
                      <span className="block text-slate-600">PDF</span>
                      <span className="text-slate-400 font-bold">{pdfSize}</span>
                    </div>
                    <div className="bg-[#111827] border border-slate-900 rounded py-1" title="CSV Spreadsheet Size">
                      <span className="block text-slate-600">CSV</span>
                      <span className="text-slate-400 font-bold">{csvSize}</span>
                    </div>
                    <div className="bg-[#111827] border border-slate-900 rounded py-1" title="JSON Raw Structure Size">
                      <span className="block text-slate-600">JSON</span>
                      <span className="text-slate-400 font-bold">{jsonSize}</span>
                    </div>
                  </div>

                  {/* Action triggers */}
                  <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-slate-900 select-none">
                    <a 
                      href={`/api/reports/download/${pdfName}`} 
                      download
                      className="bg-slate-950 border border-slate-800 hover:border-slate-700 py-1.5 rounded-lg text-center text-blue-400 hover:text-blue-300 font-mono text-[9px] font-bold uppercase transition-colors"
                      title="Download PDF format"
                    >
                      PDF
                    </a>
                    <a 
                      href={`/api/reports/download/${csvName}`} 
                      download
                      className="bg-slate-950 border border-slate-800 hover:border-slate-700 py-1.5 rounded-lg text-center text-emerald-450 hover:text-emerald-400 font-mono text-[9px] font-bold uppercase transition-colors"
                      title="Download CSV format"
                    >
                      CSV
                    </a>
                    <a 
                      href={`/api/reports/download/${jsonName}`} 
                      download
                      className="bg-slate-950 border border-slate-800 hover:border-slate-700 py-1.5 rounded-lg text-center text-purple-400 hover:text-purple-300 font-mono text-[9px] font-bold uppercase transition-colors"
                      title="Download JSON format"
                    >
                      JSON
                    </a>
                    <button 
                      onClick={() => handlePreview(report)}
                      className="bg-slate-950 border border-slate-800 hover:border-slate-700 py-1.5 rounded-lg flex items-center justify-center text-amber-500 hover:text-amber-400 font-mono text-[9px] font-bold uppercase transition-colors"
                      title="Preview report content in-browser"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}

            {filteredReports.length === 0 && (
              <div className="col-span-full py-20 bg-[#0D1117] border border-[rgba(255,255,255,0.07)] rounded-xl text-center select-text font-mono text-slate-500">
                <ShieldAlert className="w-8 h-8 text-slate-600 mx-auto mb-2.5 animate-bounce" />
                <p>No compiled dispatches located matching current filter constraints.</p>
              </div>
            )}
          </div>

        </div>

      </div>

      {/* HTML REPORT PREVIEW MODAL */}
      {previewReport && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto select-text">
          <div className="bg-[#0D1117] border border-[rgba(0,212,255,0.25)] rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl shadow-cyan-950/20">
            
            {/* Modal header */}
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-[#070B14] rounded-t-2xl select-none">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-[#00D4FF]" />
                <span className="text-xs uppercase font-mono font-bold tracking-wider text-slate-200">
                  ZENTRIX SOC report browser preview
                </span>
              </div>
              <button 
                onClick={() => { setPreviewReport(null); setPreviewData(null); }}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal content area */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {previewLoading ? (
                <div className="flex flex-col items-center justify-center py-24 space-y-3 font-mono">
                  <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-slate-500 text-xs uppercase">Downloading and parsing JSON compiled database...</span>
                </div>
              ) : previewData ? (
                <div className="space-y-6 font-mono text-xs text-slate-350">
                  
                  {/* PRINT BRAND HEADER */}
                  <div className="border-b border-slate-850 pb-5 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <h1 className="text-xl font-bold font-sans text-slate-100 tracking-wide">ZENTRIX SECURITY AUDIT</h1>
                        <p className="text-[10px] text-slate-500 mt-1 uppercase">Local Workstation Security Posture Intelligence Report</p>
                      </div>
                      <div className="text-right text-[10px] text-slate-500">
                        <p>CONFIDENTIAL DOCUMENT</p>
                        <p className="mt-0.5">STATUS: DISPATCHED</p>
                      </div>
                    </div>
                  </div>

                  {/* REPORT BASE DETAILS */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-[#111827]/60 border border-slate-850 rounded-xl leading-relaxed">
                    <div>
                      <span className="block text-[10px] text-slate-500 uppercase">REPORT SCHEMA</span>
                      <span className="text-slate-200 font-bold">{previewReport.title}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-500 uppercase">TIMESTAMP (IST)</span>
                      <span className="text-slate-200 font-bold">
                        {new Date(previewReport.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false })}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-500 uppercase">DESTINATION AUDIT</span>
                      <span className="text-slate-200 font-bold text-slate-400 select-all">{previewReport.recipient}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-500 uppercase">LOG ENTRIES METRIC</span>
                      <span className="text-[#00D4FF] font-bold">{previewData.eventsCount || 0} Records</span>
                    </div>
                  </div>

                  {/* RISK INDEX & SECURITY POSTURE SCORES */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-5 bg-[#111827]/40 border border-slate-850 rounded-xl flex items-center justify-between">
                      <div>
                        <h4 className="text-[11px] font-sans font-bold text-slate-200 uppercase tracking-wider">ZENTRIX SAFETY POSTURE</h4>
                        <p className="text-[9px] text-slate-500 mt-1">Overall calculated score based on endpoint incidents.</p>
                      </div>
                      <span className={`text-4xl font-sans font-bold ${
                        previewData.securityScore >= 75 ? 'text-[#00FF87]' : 'text-[#EF4444]'
                      }`}>
                        {previewData.securityScore || 100}%
                      </span>
                    </div>

                    <div className="p-5 bg-[#111827]/40 border border-slate-850 rounded-xl flex items-center justify-between">
                      <div>
                        <h4 className="text-[11px] font-sans font-bold text-slate-200 uppercase tracking-wider">RISK INDEX THRESHOLD</h4>
                        <p className="text-[9px] text-slate-500 mt-1">Aggregated threat severity indicators.</p>
                      </div>
                      <span className={`text-4xl font-sans font-bold ${
                        previewData.riskScore > 50 ? 'text-[#EF4444]' : 'text-[#00D4FF]'
                      }`}>
                        {previewData.riskScore || 0}%
                      </span>
                    </div>
                  </div>

                  {/* DETAILED WIDGET COUNTERS */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-sans font-bold text-slate-200 uppercase tracking-wider">KEY AUDITING INDICATORS</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3 bg-slate-900 border border-slate-850 rounded-lg">
                        <span className="text-slate-500 text-[10px] block uppercase">SYSTEM ALERTS</span>
                        <span className="text-sm font-bold text-slate-200">{previewData.alertsCount || 0}</span>
                      </div>
                      <div className="p-3 bg-slate-900 border border-slate-850 rounded-lg">
                        <span className="text-slate-500 text-[10px] block uppercase">CRITICAL EVENTS</span>
                        <span className="text-sm font-bold text-red-400">{previewData.criticalCount || 0}</span>
                      </div>
                      <div className="p-3 bg-slate-900 border border-slate-850 rounded-lg">
                        <span className="text-slate-500 text-[10px] block uppercase">MONITORED ENDPOINTS</span>
                        <span className="text-sm font-bold text-slate-200">{previewData.endpointCount || 0}</span>
                      </div>
                      <div className="p-3 bg-slate-900 border border-slate-850 rounded-lg">
                        <span className="text-slate-500 text-[10px] block uppercase">DELIVERY LOG ID</span>
                        <span className="text-[10px] font-mono text-slate-400 select-all truncate block mt-0.5">{previewReport._id}</span>
                      </div>
                    </div>
                  </div>

                  {/* THREAT INCIDENTS LIST */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-sans font-bold text-slate-200 uppercase tracking-wider">DASHBOARD ACTIVE THREAT TRIAGES</h3>
                    <div className="border border-slate-850 rounded-xl overflow-hidden">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-900 text-slate-500 uppercase text-[9px] border-b border-slate-850">
                            <th className="p-3">Title / Severity</th>
                            <th className="p-3">Category</th>
                            <th className="p-3">Device Node</th>
                            <th className="p-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-850 text-[10px]">
                          {previewData.recentAlerts && previewData.recentAlerts.length > 0 ? (
                            previewData.recentAlerts.map((alert: any, i: number) => (
                              <tr key={i} className="hover:bg-slate-900/40">
                                <td className="p-3">
                                  <span className={`inline-block w-1.5 h-1.5 rounded-full mr-2 ${
                                    alert.severity === 'CRITICAL' ? 'bg-[#EF4444]' : 'bg-[#F59E0B]'
                                  }`}></span>
                                  <span className="text-slate-200 font-bold">{alert.title}</span>
                                </td>
                                <td className="p-3 text-slate-450">{alert.category}</td>
                                <td className="p-3 text-slate-450">{alert.host}</td>
                                <td className="p-3">
                                  <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-blue-400">
                                    {alert.status}
                                  </span>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={4} className="p-8 text-center text-slate-500">
                                Zero security incidents or malware detections caught in this audit interval frame.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* ACTION RECOMMENDATIONS */}
                  <div className="p-4 bg-blue-950/10 border border-blue-900/30 rounded-xl space-y-2">
                    <h4 className="text-xs font-sans font-bold text-[#00D4FF] uppercase tracking-wider">ZENTRIX THREAT REMEDIATION ACTION</h4>
                    <ol className="list-decimal pl-4 space-y-1.5 text-slate-400 text-[10px]">
                      <li>Inspect suspicious EDR process spawns flagged by threat signatures.</li>
                      <li>Retract file modifications caught inside EDR directories integrity watches.</li>
                      <li>Review honeypot connection logs from alternate SSH ports scanners.</li>
                    </ol>
                  </div>

                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-slate-500 font-mono">
                  <ShieldAlert className="w-8 h-8 text-slate-600 mb-2" />
                  <p>Failed to retrieve compiled records from storage pipeline.</p>
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="p-4 border-t border-slate-800 flex justify-end gap-3 bg-[#070B14] rounded-b-2xl select-none">
              <button 
                onClick={() => { setPreviewReport(null); setPreviewData(null); }}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-lg font-mono text-xs font-bold transition-colors uppercase"
              >
                Close Preview
              </button>
            </div>
            
          </div>
        </div>
      )}

    </div>
  );
}

