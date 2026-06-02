import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, Download, Clock, CheckCircle, FileCheck2, ShieldAlert } from 'lucide-react';

export default function Reporting({ token }: any) {
  const [reports, setReports] = useState<any[]>([]);
  const [reportType, setReportType] = useState('Executive Summary');
  const [generating, setGenerating] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    fetchReports();
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUserProfile(data);
      }
    } catch (e) {
      // Ignore
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
        fetchReports(); // Refresh history table
      }
    } catch {
      setSuccessMsg('Report compiler gateway timeout.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
      
      {/* 1. LEFT COLUMN: REPORT COMPILER CONTROLS */}
      <div className="lg:col-span-1 p-5 bg-[#111625] border border-slate-800 rounded-lg h-[650px] flex flex-col justify-between overflow-y-auto">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-blue-500" />
            <div>
              <span className="text-xs uppercase font-mono font-bold tracking-wider text-slate-200">ZENTRIX Report Compiler</span>
              <p className="text-[10px] text-[#64748b] leading-tight font-mono">12-HOUR CRON SCHEDULER</p>
            </div>
          </div>

          {/* Form to manual generate report */}
          <form onSubmit={handleGenerateReport} className="space-y-3 p-3 bg-slate-950/40 border border-slate-850 rounded font-mono text-[10px]">
            <p className="text-[9px] text-blue-500 font-bold uppercase border-b border-slate-900 pb-1">[+] MANUAL DISPATCH FORM</p>
            
            <div>
              <label className="block text-slate-500 mb-1">RECIPIENT EMAIL</label>
              <input 
                type="email"
                disabled
                value={userProfile?.email || 'admin@zentrix.local'}
                className="w-full bg-[#050811] border border-slate-800 px-2.5 py-1.5 text-slate-400 rounded text-xs select-all cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-slate-500 mb-1">REPORT SCHEMA TYPE</label>
              <select 
                value={reportType}
                onChange={e => setReportType(e.target.value)}
                className="w-full bg-[#050811] border border-slate-800 px-2 py-1.5 text-slate-350 rounded text-xs focus:outline-none"
              >
                <option value="Executive Summary">Executive Summary</option>
                <option value="Security Report">Security Audit Report</option>
                <option value="Audit Report">Full Compliance Audit</option>
                <option value="Incident Report">Active Incident Cases Log</option>
              </select>
            </div>

            <button 
              type="submit"
              disabled={generating}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded transition-all uppercase flex items-center justify-center gap-1.5 text-xs font-mono"
            >
              <FileCheck2 className="w-4 h-4" />
              {generating ? 'COMPILING REAL DATA...' : 'DISPATCH REPORT SECURE'}
            </button>
          </form>

          {successMsg && (
            <div className="p-3 bg-emerald-950/30 border border-emerald-500/20 text-emerald-400 text-xs font-mono rounded select-text">
              {successMsg}
            </div>
          )}
        </div>

        <div className="border-t border-slate-800 pt-3 text-[10px] font-mono text-slate-500">
          <span>COMPILER: ZENTRIX Report Engine v4.8</span>
        </div>
      </div>

      {/* 2. RIGHT PANEL: EMAIL DISPATCH LOGS & FILE DIRECTORIES */}
      <div className="lg:col-span-2 space-y-6 h-[650px] overflow-y-auto pr-1">
        
        {/* Table list of reports */}
        <div className="p-5 bg-[#111625] border border-slate-800 rounded-lg">
          <div>
            <span className="text-xs uppercase font-mono font-bold tracking-wider text-slate-200">ZENTRIX Reports Directory Queue</span>
            <p className="text-[10px] text-[#64748b] leading-tight font-mono mb-4">SMTP & WHATSAPP DISPATCH VERIFICATIONS</p>
          </div>

          <div className="overflow-x-auto select-text">
            <table className="w-full text-left border-collapse text-xs font-sans">
              <thead>
                <tr className="bg-slate-950/40 text-[#64748b] border-b border-slate-800 uppercase font-mono text-[9px]">
                  <th className="p-2.5">Date Ingestion</th>
                  <th className="p-2.5">Title</th>
                  <th className="p-2.5">Security Score</th>
                  <th className="p-2.5">Cases Count</th>
                  <th className="p-2.5">Formats (Download)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-slate-350">
                {reports.map((report) => {
                  const pdfName = report.fileName;
                  const csvName = pdfName.replace('.pdf', '.csv');
                  const jsonName = pdfName.replace('.pdf', '.json');
                  return (
                    <tr key={report._id} className="hover:bg-slate-900/60 transition-colors">
                      <td className="p-2.5 text-slate-400 whitespace-nowrap">
                        {new Date(report.timestamp).toLocaleString()}
                      </td>
                      <td className="p-2.5 text-slate-200 font-bold truncate max-w-[150px]">{report.title}</td>
                      <td className="p-2.5 text-blue-400 font-bold">{report.securityScore}% Posture</td>
                      <td className="p-2.5 text-slate-400">{report.alertsCount} Alerts</td>
                      <td className="p-2.5 whitespace-nowrap">
                        <div className="flex gap-2">
                          <a 
                            href={`/api/reports/download/${pdfName}`} 
                            download
                            className="bg-slate-950 border border-slate-800 hover:border-slate-700 px-2 py-1 rounded inline-block text-blue-400 hover:text-blue-300 font-mono text-[9px] uppercase font-bold"
                            title="Download PDF format"
                          >
                            PDF
                          </a>
                          <a 
                            href={`/api/reports/download/${csvName}`} 
                            download
                            className="bg-slate-950 border border-slate-800 hover:border-slate-700 px-2 py-1 rounded inline-block text-emerald-450 hover:text-emerald-405 font-mono text-[9px] uppercase font-bold"
                            title="Download CSV format"
                          >
                            CSV
                          </a>
                          <a 
                            href={`/api/reports/download/${jsonName}`} 
                            download
                            className="bg-slate-950 border border-slate-800 hover:border-slate-700 px-2 py-1 rounded inline-block text-purple-400 hover:text-purple-355 font-mono text-[9px] uppercase font-bold"
                            title="Download JSON format"
                          >
                            JSON
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {reports.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500 font-mono">
                      No compiled dispatches located on local registries.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  );
}
